// Rasterises the site mark (public/favicon.svg, the same drawing as SiteMark in src/components/marks.tsx) into the icons the pages, the web manifest and browsers probing fixed paths ask for: mark-32.png, mark-64.webp, mark-192.png and mark-512.png; apple-touch-icon.png (180px, from a full-bleed variant, as iOS rounds the corners itself); and favicon.ico, an ICO holding 16px and 32px PNGs.
//
// Run it again after changing public/favicon.svg, and commit what it writes:
//
//     cd apps/web && node scripts/site-icons.ts
//
// The mark-* files carry the year-long cache rule in public/_headers, so a new drawing should also get new file names there, in src/routes/__root.tsx and in public/site.webmanifest; favicon.ico and apple-touch-icon.png keep their names, as browsers probe those paths.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const PUBLIC = join(import.meta.dirname, '../public');
const svg = await readFile(join(PUBLIC, 'favicon.svg'), 'utf8');
// iOS draws its own rounded corners, so the touch icon fills its square.
const fullBleed = svg.replace('rx="9"', 'rx="0"');
if (fullBleed === svg) throw new Error('favicon.svg: the tile corner (rx 9) was not found');

// The SVG is 32 units wide; rendering it at a density that gives at least the target size keeps every icon sharp rather than enlarged.
function render(source: string, size: number) {
	const density = Math.max(384, Math.ceil((72 * size) / 32));
	return sharp(Buffer.from(source), { density }).resize(size, size);
}

async function png(source: string, size: number): Promise<Buffer> {
	return render(source, size).png({ compressionLevel: 9 }).toBuffer();
}

await writeFile(join(PUBLIC, 'mark-32.png'), await png(svg, 32));
await writeFile(join(PUBLIC, 'mark-64.webp'), await render(svg, 64).webp({ lossless: true }).toBuffer());
await writeFile(join(PUBLIC, 'mark-192.png'), await png(svg, 192));
await writeFile(join(PUBLIC, 'mark-512.png'), await png(svg, 512));
await writeFile(join(PUBLIC, 'apple-touch-icon.png'), await png(fullBleed, 180));

// An ICO is a 6-byte header (reserved 0, type 1 for icons, the image count), one 16-byte entry per image (width, height, colour count 0, reserved 0, planes 1, 32 bits per pixel, the image's byte size and its offset in the file), then the images, which may be whole PNG files.
const images = [await png(svg, 16), await png(svg, 32)];
const sizes = [16, 32];
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

console.log('wrote mark-32.png, mark-64.webp, mark-192.png, mark-512.png, apple-touch-icon.png and favicon.ico');
