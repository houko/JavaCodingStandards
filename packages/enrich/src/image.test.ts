import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type Downloaded, writeIcon, writeShot, writeShotCollage, writeTextCard } from './image.ts';
import { sniffImage } from './source.ts';

const run = promisify(execFile);
const pixel: Downloaded = {
	bytes: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
	format: 'png',
};

// A blank PNG of the given size, drawn by ImageMagick as the workflow's runner has it.
async function blank(width: number, height: number): Promise<Downloaded> {
	const args = ['-size', `${width}x${height}`, 'xc:#336699', 'png:-'];
	const { stdout } = await run('magick', args, { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 }).catch(() => run('convert', args, { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 }));
	return { bytes: new Uint8Array(stdout), format: 'png' };
}

async function dimensions(file: string): Promise<string> {
	try {
		return (await run('magick', [file, '-format', '%w %h', 'info:'])).stdout.trim();
	} catch {
		return (await run('identify', ['-format', '%w %h', file])).stdout.trim();
	}
}

describe('generated catalog images', () => {
	let dir: string;
	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'enrich-image-test-'));
	});
	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it('draws a project card even without an avatar', async () => {
		const out = join(dir, 'card.webp');
		await writeTextCard('gone/project', out);
		expect(sniffImage(await readFile(out))).toBe('webp');
		expect(await dimensions(out)).toBe('1200 630');
	});

	it('composes at most three project panels into a landscape screenshot', async () => {
		const out = join(dir, 'collage.webp');
		expect(await writeShotCollage([], out)).toBe(false);
		expect(existsSync(out)).toBe(false);
		expect(await writeShotCollage([pixel, pixel, pixel, pixel], out)).toBe(true);
		expect(sniffImage(await readFile(out))).toBe('webp');
		expect(await dimensions(out)).toBe('1200 750');
	});

	it('only upscales a tiny avatar when the caller opts into it', async () => {
		const out = join(dir, 'icon.webp');
		expect(await writeIcon(pixel, out)).toBe(false);
		expect(existsSync(out)).toBe(false);
		expect(await writeIcon(pixel, out, 1)).toBe(true);
		expect(sniffImage(await readFile(out))).toBe('webp');
		expect(await dimensions(out)).toBe('128 128');
	});

	it('makes the directory it writes into, as the site may have no icons or shots yet', async () => {
		const icon = join(dir, 'public', 'icons', 'app.webp');
		expect(await writeIcon(pixel, icon, 1)).toBe(true);
		expect(sniffImage(await readFile(icon))).toBe('webp');
		const card = join(dir, 'public', 'shots', 'card.webp');
		await writeTextCard('owner/app', card);
		expect(sniffImage(await readFile(card))).toBe('webp');
	});

	it('keeps a portrait phone screenshot and turns down a whole scrolled page', async () => {
		const phone = join(dir, 'shots', 'phone.webp');
		expect(await writeShot(await blank(1179, 2556), phone)).toBe('ok');
		expect(await dimensions(phone)).toBe('1179 2556');
		const page = join(dir, 'shots', 'page.webp');
		expect(await writeShot(await blank(800, 4000), page)).toBe('tall');
		expect(existsSync(page)).toBe(false);
		expect(await writeShot(await blank(1024, 1024), page)).toBe('square');
	});
});
