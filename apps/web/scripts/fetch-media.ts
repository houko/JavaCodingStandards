// Fetches the moving pictures and faces the site shows beside the covers, all from each game's X post: a short silent clip of the post's video, videos/<slug>.mp4 (640x400, what a card plays under the pointer and the game's own page shows), and a larger one, videos/hero/<slug>.mp4 (960x540), for the games the hero screen rotates through, both uploaded to the R2 bucket the Worker serves them from (wrangler.jsonc) and kept in apps/web/.media, which git ignores; and the creator's avatar into public/avatars/<handle>.webp (96x96), when the post is the creator's own. It then writes packages/catalog/data/media.json, the list of what exists, which is how the site knows which games have a clip and which creators a face; a clip listed there is taken to be in the bucket.
//
//     cd apps/web && node scripts/fetch-media.ts [--force] [slug...]
//
// Without slugs it walks every game in packages/catalog/data/games. A clip already listed in media.json and an avatar already on disk are kept unless --force is given. The post is read from X's syndication endpoint (the one embedded posts use). A post without a video simply gets no clip, and the card shows its cover alone; nothing is faked. Clips are cut with ffmpeg, which must be on the PATH, and uploaded with wrangler, which needs a Cloudflare login or CLOUDFLARE_API_TOKEN. Commit what the script writes.

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);

const GAMES_DIR = join(import.meta.dirname, '../../../packages/catalog/data/games');
const MEDIA_FILE = join(import.meta.dirname, '../../../packages/catalog/data/media.json');
const MEDIA_DIR = join(import.meta.dirname, '../.media');
const HERO_DIR = join(MEDIA_DIR, 'videos/hero');
const BUCKET = 'vibe-arcade-media';
const ACCOUNT_ID = 'e2b27aea5f599efdbe0a7016a2580d05';
const UPLOAD_TIMEOUT_MS = 120_000;
const AVATARS_DIR = join(import.meta.dirname, '../public/avatars');
// How many games the hero screen rotates through: the most liked ones that have a video (HERO_GAMES in the catalog's games.ts).
const HERO_COUNT = 6;
const CARD = { width: 640, height: 400, seconds: 6, crf: 30 };
const HERO = { width: 960, height: 540, seconds: 10, crf: 29 };
const AVATAR = 96;
// A clip starts a little way into the video, past a title card or a fade-in, but never far.
const SKIP_SHARE = 0.15;
const SKIP_MAX_SECONDS = 8;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const TIMEOUT_MS = 20_000;
const FFMPEG_TIMEOUT_MS = 120_000;
const PAUSE_MS = 1000;

const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'));
for (const f of flags) if (f !== '--force') throw new Error(`unknown option ${f}`);
const force = flags.has('--force');

interface Variant {
	url: string;
	height: number;
}

interface Post {
	// The post's mp4 renditions, smallest first, and the video's length.
	variants: Variant[];
	seconds: number;
	// The avatar and handle of whoever posted, who is not always the game's creator.
	avatar?: string;
	author?: string;
}

const get = (url: string) => fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });

// The token the embed widget sends with a post id.
const token = (id: string) => ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');

// A rendition's height, read from the WIDTHxHEIGHT part of its URL.
const heightOf = (url: string) => Number(url.match(/\/(\d+)x(\d+)\//)?.[2] ?? 0);

async function readPost(id: string): Promise<Post | string> {
	const res = await get(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${token(id)}&lang=en`);
	if (res.status === 404) return 'post not found';
	if (!res.ok) return `HTTP ${res.status}`;
	const post = await res.json();
	if (post.__typename !== 'Tweet') return post.__typename ?? 'no post';
	const info = (post.mediaDetails as { video_info?: { duration_millis?: number; variants: { content_type: string; url: string }[] } }[] | undefined)?.find((m) => m.video_info)?.video_info;
	const variants = (info?.variants ?? [])
		.filter((v) => v.content_type === 'video/mp4')
		.map((v) => ({ url: v.url, height: heightOf(v.url) }))
		.sort((a, b) => a.height - b.height);
	return { variants, seconds: (info?.duration_millis ?? 0) / 1000, avatar: post.user?.profile_image_url_https, author: post.user?.screen_name };
}

// The smallest rendition at least as tall as the clip, or the largest there is.
const pickVariant = (variants: Variant[], height: number) => variants.find((v) => v.height >= height) ?? variants[variants.length - 1];

// Cuts a silent, cropped clip that starts playing before it has fully loaded (faststart).
async function cut(post: Post, shape: typeof CARD, out: string): Promise<string> {
	const source = pickVariant(post.variants, shape.height);
	const start = post.seconds > shape.seconds * 2 ? Math.min(post.seconds * SKIP_SHARE, SKIP_MAX_SECONDS) : 0;
	const filter = `scale=${shape.width}:${shape.height}:force_original_aspect_ratio=increase,crop=${shape.width}:${shape.height},fps=24`;
	await run('ffmpeg', ['-v', 'error', '-ss', start.toFixed(2), '-t', String(shape.seconds), '-i', source.url, '-an', '-vf', filter, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(shape.crf), '-pix_fmt', 'yuv420p', '-profile:v', 'main', '-movflags', '+faststart', '-y', out], { timeout: FFMPEG_TIMEOUT_MS });
	return `${Math.round((await stat(out)).size / 1024)} KB`;
}

// The avatar at 200 px (the post names the 48 px one), squared down to what the site shows at twice its size.
async function saveAvatar(url: string, out: string): Promise<void> {
	const res = await get(url.replace(/_normal(\.\w+)$/, '_200x200$1'));
	if (!res.ok) throw new Error(`avatar HTTP ${res.status}`);
	await writeFile(out, await sharp(Buffer.from(await res.arrayBuffer())).resize(AVATAR, AVATAR, { fit: 'cover' }).webp({ quality: 80 }).toBuffer());
}

interface GameFile {
	slug: string;
	post: string;
	creator: string;
	likes: number;
}

const names = (await readdir(GAMES_DIR)).filter((f) => f.endsWith('.json')).sort();
const games: GameFile[] = await Promise.all(names.map(async (f) => JSON.parse(await readFile(join(GAMES_DIR, f), 'utf8'))));
const unknown = wanted.filter((s) => !games.some((g) => g.slug === s));
if (unknown.length) throw new Error(`no such game: ${unknown.join(', ')}`);

await mkdir(HERO_DIR, { recursive: true });
await mkdir(AVATARS_DIR, { recursive: true });

const cardKey = (slug: string) => `videos/${slug}.mp4`;
const heroKey = (slug: string) => `videos/hero/${slug}.mp4`;
const local = (key: string) => join(MEDIA_DIR, key);

// What media.json listed before this run: the clips in the bucket.
const listed: { videos: string[]; heroVideos: string[] } = existsSync(MEDIA_FILE) ? JSON.parse(await readFile(MEDIA_FILE, 'utf8')) : { videos: [], heroVideos: [] };
const inBucket = new Set([...listed.videos.map(cardKey), ...listed.heroVideos.map(heroKey)]);

// Cuts a clip into .media and uploads it under its key.
async function cutAndUpload(post: Post, shape: typeof CARD, key: string): Promise<string> {
	const size = await cut(post, shape, local(key));
	await run('pnpm', ['exec', 'wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`, '--file', local(key), '--content-type', 'video/mp4', '--remote'], { timeout: UPLOAD_TIMEOUT_MS, env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID } });
	inBucket.add(key);
	return size;
}
const avatarFile = (handle: string) => join(AVATARS_DIR, `${handle.toLowerCase()}.webp`);

// The first pass cuts the cards' clips and saves the avatars; the hero's games are only known once it is clear which games have a video at all.
const posts = new Map<string, Post>();
const rows: { slug: string; clip: string; avatar: string; note: string }[] = [];
for (const game of wanted.length ? games.filter((g) => wanted.includes(g.slug)) : games) {
	const row = { slug: game.slug, clip: '', avatar: '', note: '' };
	rows.push(row);
	const needClip = force || !inBucket.has(cardKey(game.slug));
	const needAvatar = force || !existsSync(avatarFile(game.creator));
	if (!needClip && !needAvatar) {
		row.clip = 'kept';
		row.avatar = 'kept';
		continue;
	}
	try {
		const post = await readPost(game.post);
		if (typeof post === 'string') row.note = post;
		else {
			posts.set(game.slug, post);
			if (!needClip) row.clip = 'kept';
			else if (post.variants.length === 0) row.clip = 'no video';
			else row.clip = await cutAndUpload(post, CARD, cardKey(game.slug));
			if (!needAvatar) row.avatar = 'kept';
			else if (!post.avatar) row.avatar = 'none';
			// A post made by someone else about the game would give that person's face to the creator.
			else if (post.author?.toLowerCase() !== game.creator.toLowerCase()) row.avatar = `none (posted by @${post.author})`;
			else {
				await saveAvatar(post.avatar, avatarFile(game.creator));
				row.avatar = 'written';
			}
		}
	} catch (err) {
		// A network failure on one game is that game's result, not the end of the run.
		row.note = `failed: ${(err as Error).message.split('\n')[0]}`;
	}
	console.log(`${game.slug}: clip ${row.clip || '-'}, avatar ${row.avatar || '-'}${row.note ? `  (${row.note})` : ''}`);
	await new Promise((r) => setTimeout(r, PAUSE_MS));
}

const withClip = games.filter((g) => inBucket.has(cardKey(g.slug)));
const heroGames = [...withClip].sort((a, b) => b.likes - a.likes || (a.slug < b.slug ? -1 : 1)).slice(0, HERO_COUNT);
for (const game of heroGames) {
	if (!force && inBucket.has(heroKey(game.slug))) continue;
	try {
		let post = posts.get(game.slug);
		if (!post) {
			const read = await readPost(game.post);
			if (typeof read === 'string') throw new Error(read);
			post = read;
		}
		console.log(`${game.slug}: hero clip ${await cutAndUpload(post, HERO, heroKey(game.slug))}`);
	} catch (err) {
		console.error(`${game.slug}: hero clip failed: ${(err as Error).message.split('\n')[0]}`);
	}
}

const media = {
	videos: withClip.map((g) => g.slug).sort(),
	heroVideos: heroGames.filter((g) => inBucket.has(heroKey(g.slug))).map((g) => g.slug).sort(),
	avatars: [...new Set(games.map((g) => g.creator.toLowerCase()))].filter((h) => existsSync(avatarFile(h))).sort(),
};
await writeFile(MEDIA_FILE, `${JSON.stringify(media, null, '\t')}\n`);

console.table(rows);
console.log(`${media.videos.length} of ${games.length} games have a clip, ${media.heroVideos.length} a hero clip; ${media.avatars.length} creators have an avatar`);
const missingHero = heroGames.filter((g) => !media.heroVideos.includes(g.slug));
if (missingHero.length) {
	console.error(`no hero clip for: ${missingHero.map((g) => g.slug).join(', ')}`);
	process.exit(1);
}
