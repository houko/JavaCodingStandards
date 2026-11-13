// Fetches each game's cover from the media of its X post into public/covers/<slug>.webp (960x600, 16:10), and with --likes refreshes the like counts in the game files from the same answer; when a count changes, the day in data/meta.json, the site's "last updated", moves to today.
//
//     cd apps/web && node scripts/fetch-covers.ts [--force] [--likes] [slug...]
//
// Without slugs it walks every game in packages/catalog/data/games. A cover that already exists is kept unless --force is given. The post is read from X's syndication endpoint (the one embedded posts use), then from fxtwitter if that gave no media. A game whose post has no media ends without a cover and the script exits non-zero: nothing is faked here. Every game must have a cover (the catalog's tests check the file exists), so make that one by hand, a 960x600 <slug>.webp; the fallback the site draws only stands in for a cover that fails to load. A frame that is nearly black or nearly white, a fade-in or a screenshot of something else, gets a note to look at it. Commit what the script writes.

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const GAMES_DIR = join(import.meta.dirname, '../../../packages/catalog/data/games');
const META_FILE = join(import.meta.dirname, '../../../packages/catalog/data/meta.json');
const COVERS_DIR = join(import.meta.dirname, '../public/covers');
const WIDTH = 960;
const HEIGHT = 600;
const QUALITY = 78;
// Mean brightness (0 to 255) outside which a frame is probably not a picture of the game.
const DARK = 20;
const BRIGHT = 240;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const TIMEOUT_MS = 20_000;
const PAUSE_MS = 1000;

const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'));
for (const f of flags) if (f !== '--force' && f !== '--likes') throw new Error(`unknown option ${f}`);
const force = flags.has('--force');
const withLikes = flags.has('--likes');

interface Post {
	source: 'syndication' | 'fxtwitter';
	image?: string;
	likes?: number;
}

interface Row {
	slug: string;
	cover: 'written' | 'kept' | 'MISSING';
	source: string;
	size: string;
	likes: string;
	note: string;
}

const get = (url: string) => fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });

// The token the embed widget sends with a post id.
const token = (id: string) => ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');

// The post as the syndication endpoint tells it, or a note saying why it gave nothing. A deleted or protected post answers 404 or a TweetTombstone.
async function fromSyndication(id: string): Promise<Post | string> {
	const res = await get(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${token(id)}&lang=en`);
	if (res.status === 404) return 'syndication: not found';
	if (!res.ok) return `syndication: HTTP ${res.status}`;
	const post = await res.json();
	if (post.__typename !== 'Tweet') return `syndication: ${post.__typename ?? 'no post'}`;
	return { source: 'syndication', image: post.mediaDetails?.[0]?.media_url_https ?? post.video?.poster ?? post.photos?.[0]?.url, likes: post.favorite_count };
}

async function fromFxtwitter(id: string): Promise<Post | string> {
	const res = await get(`https://api.fxtwitter.com/status/${id}`);
	if (res.status === 404) return 'fxtwitter: not found';
	if (!res.ok) return `fxtwitter: HTTP ${res.status}`;
	const { tweet } = await res.json();
	if (!tweet) return 'fxtwitter: no post';
	return { source: 'fxtwitter', image: tweet.media?.videos?.[0]?.thumbnail_url ?? tweet.media?.photos?.[0]?.url, likes: tweet.likes };
}

// The image at X's "large" rendition (up to 2048 px wide), which the media host serves when the extension moves into the query; the URL as the post gave it (1200 px wide) if that form is refused.
async function download(url: string): Promise<Buffer> {
	const sized = url.match(/^(https:\/\/pbs\.twimg\.com\/.+)\.(jpg|png)$/);
	if (sized) {
		const res = await get(`${sized[1]}?format=${sized[2]}&name=large`);
		if (res.ok) return Buffer.from(await res.arrayBuffer());
	}
	const res = await get(url);
	if (!res.ok) throw new Error(`image HTTP ${res.status}`);
	return Buffer.from(await res.arrayBuffer());
}

// Rewrites the likes number where it stands, so the file keeps its tabs and key order.
async function setLikes(file: string, text: string, likes: number): Promise<void> {
	const next = text.replace(/^(\t"likes": )\d+/m, `$1${likes}`);
	if (next === text) throw new Error(`${file}: no "likes" line to rewrite`);
	await writeFile(file, next);
}

async function run(slug: string): Promise<Row> {
	const row: Row = { slug, cover: 'MISSING', source: '', size: '', likes: '', note: '' };
	const file = join(GAMES_DIR, `${slug}.json`);
	const text = await readFile(file, 'utf8');
	const game: { post: string; likes: number } = JSON.parse(text);
	const out = join(COVERS_DIR, `${slug}.webp`);
	const need = force || !existsSync(out);
	if (!need) row.cover = 'kept';
	if (!need && !withLikes) return row;

	const notes: string[] = [];
	let post: Post | undefined;
	const first = await fromSyndication(game.post);
	if (typeof first === 'string') notes.push(first);
	else post = first;
	if (!post || (need && !post.image)) {
		const second = await fromFxtwitter(game.post);
		if (typeof second === 'string') notes.push(second);
		else post = { ...second, likes: post?.likes ?? second.likes };
	}

	if (withLikes && typeof post?.likes === 'number' && post.likes !== game.likes) {
		await setLikes(file, text, post.likes);
		row.likes = `${game.likes} -> ${post.likes}`;
	}
	if (need && post) {
		row.source = post.source;
		if (!post.image) notes.push('post has no media');
		else {
			const source = await download(post.image);
			const meta = await sharp(source).metadata();
			if (meta.width < WIDTH) notes.push(`source only ${meta.width} px wide`);
			const webp = await sharp(source).resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' }).webp({ quality: QUALITY }).toBuffer();
			await writeFile(out, webp);
			const { channels } = await sharp(webp).stats();
			const brightness = (channels[0].mean + channels[1].mean + channels[2].mean) / 3;
			if (brightness < DARK || brightness > BRIGHT) notes.push(`frame is nearly ${brightness < DARK ? 'black' : 'white'}, check it shows the game`);
			row.cover = 'written';
			row.size = `${meta.width}x${meta.height} -> ${Math.round(webp.length / 1024)} KB`;
		}
	}
	row.note = notes.join('; ');
	return row;
}

const all = (await readdir(GAMES_DIR)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
const unknown = wanted.filter((s) => !all.includes(s));
if (unknown.length) throw new Error(`no such game: ${unknown.join(', ')}`);
const slugs = wanted.length ? wanted : all;

await mkdir(COVERS_DIR, { recursive: true });
const rows: Row[] = [];
for (const slug of slugs) {
	// A network failure on one game (a timeout, a refused connection) is that game's result, not the end of the run.
	const row = await run(slug).catch((err: Error): Row => ({ slug, cover: existsSync(join(COVERS_DIR, `${slug}.webp`)) ? 'kept' : 'MISSING', source: '', size: '', likes: '', note: `failed: ${err.message}` }));
	rows.push(row);
	console.log(`${row.cover.padEnd(8)} ${slug}${row.note ? `  (${row.note})` : ''}`);
	if (withLikes || row.cover !== 'kept') await new Promise((r) => setTimeout(r, PAUSE_MS));
}

console.table(rows);
const changed = rows.filter((r) => r.likes);
// Only the day moves; the rest of meta.json (the week's picks) is kept as it is.
if (changed.length) await writeFile(META_FILE, `${JSON.stringify({ ...JSON.parse(await readFile(META_FILE, 'utf8')), updated: new Date().toISOString().slice(0, 10) }, null, '\t')}\n`);
if (withLikes) console.log(changed.length ? `likes changed in ${changed.length} games:\n${changed.map((r) => `  ${r.slug}: ${r.likes}`).join('\n')}` : 'likes: no changes');
const missing = rows.filter((r) => r.cover === 'MISSING');
if (missing.length) {
	console.error(`${missing.length} of ${rows.length} games have no cover: ${missing.map((r) => r.slug).join(', ')}`);
	process.exit(1);
}
