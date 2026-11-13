// Rasterises the site mark (public/favicon.svg: the lime cat-terminal on a dark rounded tile) into the icons the pages, the web manifest and browsers probing fixed paths ask for: favicon.ico (an ICO holding 16px and 32px PNGs), icon-192.png, icon-512.png, icon-maskable-512.png and apple-touch-icon.png (180px).
//
// Run it again after changing public/favicon.svg, and commit what it writes:
//
//     cd apps/web && node scripts/site-icons.ts

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const PUBLIC = join(import.meta.dirname, '../public');
const svg = await readFile(join(PUBLIC, 'favicon.svg'), 'utf8');

function swap(source: string, from: string, to: string): string {
	const out = source.replace(from, to);
	if (out === source) throw new Error(`favicon.svg: ${from} was not found`);
	return out;
}

// iOS and Android cut the icon's corners themselves, so the touch and maskable icons fill their square.
const fullBleed = swap(svg, 'rx="14"', 'rx="0"');
// A maskable icon may be cropped to a circle 80% of its width, so the mark is drawn smaller there: at 0.64 its farthest point (the foot) is 34% of the width from the centre.
const maskable = swap(fullBleed, 'scale(0.78)', 'scale(0.64)');

// The SVG is 64 units wide; rendering it at the density that gives the target size keeps every icon sharp rather than enlarged.
function png(source: string, size: number): Promise<Buffer> {
	return sharp(Buffer.from(source), { density: (72 * size) / 64 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
}

await writeFile(join(PUBLIC, 'icon-192.png'), await png(svg, 192));
await writeFile(join(PUBLIC, 'icon-512.png'), await png(svg, 512));
await writeFile(join(PUBLIC, 'icon-maskable-512.png'), await png(maskable, 512));
await writeFile(join(PUBLIC, 'apple-touch-icon.png'), await png(fullBleed, 180));

// An ICO is a 6-byte header (reserved 0, type 1 for icons, the image count), one 16-byte entry per image (width, height, colour count 0, reserved 0, planes 1, 32 bits per pixel, the image's byte size and its offset in the file), then the images, which may be whole PNG files.
const sizes = [16, 32];
const images = await Promise.all(sizes.map((size) => png(svg, size)));
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((img, i) => {
	const at = 6 + 16 * i;
	header.writeUInt8(sizes[i], at);
	header.writeUInt8(sizes[i], at + 1);
	header.writeUInt8(0, at + 2);
	header.writeUInt8(0, at + 3);
	header.writeUInt16LE(1, at + 4);
	header.writeUInt16LE(32, at + 6);
	header.writeUInt32LE(img.length, at + 8);
	header.writeUInt32LE(offset, at + 12);
	offset += img.length;
});
await writeFile(join(PUBLIC, 'favicon.ico'), Buffer.concat([header, ...images]));

console.log('wrote favicon.ico, icon-192.png, icon-512.png, icon-maskable-512.png and apple-touch-icon.png');
