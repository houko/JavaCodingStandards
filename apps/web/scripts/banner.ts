// Draws the repository's banner, .github/assets/banner.png (2560x840, shown at half that in the README), and its social preview, .github/assets/social-preview.png (2560x1280, uploaded by hand in the repository's settings), with the site card's drawing code (og/card.ts): the mark, the name, the headline and the most-liked games' covers.
//
// Run it again when the covers or the look change, and commit what it writes:
//
//     cd apps/web && node scripts/banner.ts
//
// The catalog loads its data with Vite's import.meta.glob, which Node cannot run, so card.ts is loaded through Vite's module runner, as the site's build loads its config (--configLoader runner).

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runnerImport } from 'vite';

const WEB = join(import.meta.dirname, '..');
const OUT = join(WEB, '../../.github/assets/banner.png');

const { module } = await runnerImport<typeof import('../og/card.ts')>(join(WEB, 'og/card.ts'), { root: WEB, configFile: false });
const paths = { publicDir: join(WEB, 'public'), fontDir: join(WEB, 'og/fonts') };
await mkdir(join(OUT, '..'), { recursive: true });
for (const [file, render] of [
	['banner.png', module.renderBanner],
	['social-preview.png', module.renderSocialPreview],
] as const) {
	const png = await render(paths);
	await writeFile(join(OUT, '..', file), png);
	console.log(`wrote .github/assets/${file} (${Math.round(png.length / 1024)} KB)`);
}
