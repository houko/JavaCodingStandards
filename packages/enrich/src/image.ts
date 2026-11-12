import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { type ShotProblem, iconCut, shotProblem, sniffImage } from './source.ts';

// Icons and screenshots as the site keeps them: a 128 px WebP icon filling its square, and a WebP screenshot at most 1200 px wide. The largest icon tile on the site is 96 px, so 128 px keeps it sharp on a high-density display without shipping 256–1024 px source images to small cards. ImageMagick does the work; the runner has it, so the bot needs no image library.

const run = promisify(execFile);
const MAX_BYTES = 10 * 1024 * 1024;
const ICON_MIN = 128;

// ImageMagick 7 is `magick`; the Ubuntu runners ship 6, where the same work is `convert`.
let im: Promise<string> | undefined;
function imageMagick(): Promise<string> {
	im ??= run('magick', ['-version']).then(
		() => 'magick',
		() => 'convert',
	);
	return im;
}

async function magick(args: string[]): Promise<string> {
	const { stdout } = await run(await imageMagick(), args, { timeout: 60_000, maxBuffer: 1024 * 1024 });
	return stdout.trim();
}

// Makes the directory out goes in, as apps/web/public/icons or shots may not exist yet on a site with no entry of that kind.
const outDir = (out: string) => mkdir(dirname(out), { recursive: true });

export interface Downloaded {
	bytes: Uint8Array;
	format: 'png' | 'jpeg' | 'webp' | 'gif';
}

// The file at url when it is a supported raster image no larger than 10 MB, judged by its bytes; undefined otherwise.
export async function downloadImage(url: string): Promise<Downloaded | undefined> {
	const img = await fetchImage(url);
	return typeof img === 'string' ? undefined : img;
}

// An image, or why it could not be had, for the report. A server that asks to be asked again within a minute (429 with Retry-After, as GitHub's social preview cards do) is, once.
export async function fetchImage(url: string): Promise<Downloaded | string> {
	let res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30_000) });
	const wait = Number(res.headers.get('retry-after'));
	if (res.status === 429 && wait > 0 && wait <= 60) {
		await new Promise((r) => setTimeout(r, wait * 1000));
		res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30_000) });
	}
	if (!res.ok) return `HTTP ${res.status}`;
	if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) return 'over 10 MB';
	const bytes = new Uint8Array(await res.arrayBuffer());
	if (bytes.length > MAX_BYTES) return 'over 10 MB';
	const format = sniffImage(bytes);
	return format ? { bytes, format } : 'not a PNG, JPEG, WebP or GIF';
}

// The fonts a drawn card's text can use, the first that exists: DejaVu on the Ubuntu runners, Helvetica or Arial on a Mac.
const CARD_FONTS = ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Helvetica.ttc', '/Library/Fonts/Arial.ttf'];

// A screenshot of last resort, drawn here when a project has no image of its own and GitHub's card cannot be had: the owner's avatar over owner/name on a dark ground, at the size of a social preview (1200 × 630), so a card on the site is never blank. Without any of the fonts the label is left out.
export async function writeCard(avatar: Downloaded, label: string, out: string): Promise<void> {
	const font = CARD_FONTS.find((f) => existsSync(f));
	await outDir(out);
	await withInput(avatar, (input) =>
		magick([
			'-size', '1200x630', 'xc:#0b1220',
			'(', input, '-resize', '240x240^', '-gravity', 'center', '-extent', '240x240', ')',
			'-gravity', 'center', '-geometry', '+0-50', '-composite',
			...(font ? ['-font', font, '-fill', '#e6edf3', '-pointsize', '46', '-gravity', 'center', '-annotate', '+0+140', label] : []),
			'-strip', '-quality', '82', '-define', 'webp:method=6', `webp:${out}`,
		]),
	);
}

// A repository card when even the owner's avatar is unavailable, such as a deleted repository owned by a deleted account. It keeps the catalog from rendering an empty media area and is marked as a stand-in by the caller.
export async function writeTextCard(label: string, out: string): Promise<void> {
	const font = CARD_FONTS.find((f) => existsSync(f));
	await outDir(out);
	await magick([
		'-size', '1200x630', 'xc:#0b1220',
		...(font ? ['-font', font, '-fill', '#3fd3f5', '-pointsize', '140', '-gravity', 'center', '-annotate', '+0-60', label.charAt(0).toUpperCase(), '-fill', '#e6edf3', '-pointsize', '46', '-annotate', '+0+105', label] : []),
		'-strip', '-quality', '82', '-define', 'webp:method=6', `webp:${out}`,
	]);
}

// Runs fn on the image written to a temporary file, named with its real format so ImageMagick reads it as nothing else, in a directory fn may also write to.
async function withInput<T>(img: Downloaded, fn: (input: string, dir: string) => Promise<T>): Promise<T> {
	const dir = await mkdtemp(join(tmpdir(), 'enrich-'));
	try {
		const file = join(dir, `in.${img.format}`);
		await writeFile(file, img.bytes);
		return await fn(`${img.format}:${file}[0]`, dir);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

const size = (input: string) => magick(['-ping', input, '-format', '%w %h', 'info:']);

// Writes the icon to out as the site's 128 px WebP. A macOS icon sits on a plate inside transparent margins with a faint shadow; the box around its mostly opaque pixels is that plate, so the icon is cut to it and centred on a square, as the official icons in apps/web/public/icons are. Returns false for an icon smaller than min; callers use the 128 px default for project icons, while a last-resort owner avatar may opt into upscaling a smaller source.
export async function writeIcon(img: Downloaded, out: string, min = ICON_MIN): Promise<boolean> {
	return withInput(img, async (input) => {
		const [w, h] = (await size(input)).split(' ').map(Number);
		if (Math.min(w, h) < min) return false;
		const { crop, side } = iconCut(await magick([input, '-alpha', 'extract', '-threshold', '50%', '-format', '%@', 'info:']), w, h);
		if (side < min) return false;
		await outDir(out);
		await magick([input, ...(crop ? ['-crop', crop, '+repage'] : []), '-background', 'none', '-gravity', 'center', '-extent', `${side}x${side}`, '-resize', '128x128', '-strip', '-quality', '82', '-define', 'webp:method=6', `webp:${out}`]);
		return true;
	});
}

// Writes the screenshot to out as WebP, scaled down to 1200 px wide when larger, and says 'ok'. An image too narrow to be a screenshot, a square one (an icon or a logo at the top of the README), one far taller than a phone screen or a banner is not written (shotProblem): 'narrow', 'square', 'tall' or 'banner' says why. A portrait phone screenshot is written as it is.
export async function writeShot(img: Downloaded, out: string): Promise<'ok' | ShotProblem> {
	return withInput(img, async (input) => {
		const [w, h] = (await size(input)).split(' ').map(Number);
		const problem = shotProblem(w, h);
		if (problem) return problem;
		await outDir(out);
		await magick([input, '-resize', '1200x>', '-strip', '-quality', '82', '-define', 'webp:method=6', `webp:${out}`]);
		return 'ok';
	});
}

// Writes up to three narrow or very tall project screenshots as one landscape contact sheet. Tray apps often document real UI only as small panels; keeping those panels is more useful than replacing them with a generic repository card.
export async function writeShotCollage(images: readonly Downloaded[], out: string): Promise<boolean> {
	if (!images.length) return false;
	const dir = await mkdtemp(join(tmpdir(), 'enrich-collage-'));
	try {
		await outDir(out);
		const inputs: string[] = [];
		for (const [i, img] of images.slice(0, 3).entries()) {
			const file = join(dir, `${i}.${img.format}`);
			await writeFile(file, img.bytes);
			inputs.push(`${img.format}:${file}[0]`);
		}
		await magick([
			...inputs.flatMap((input) => ['(', input, '-resize', '340x640>', '-background', 'none', '-gravity', 'center', '-extent', '360x660', ')']),
			'+append', '-background', '#0b1220', '-gravity', 'center', '-extent', '1200x750', '-strip', '-quality', '82', '-define', 'webp:method=6', `webp:${out}`,
		]);
		return true;
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}
