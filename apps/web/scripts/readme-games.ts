// Redraws the list of games in the repository's READMEs from the catalog, between the games:start and games:end markers (src/lib/readme.ts). Run it after adding, renaming or removing a game, and commit what it writes; the tests fail while a README is behind the data.
//
//     cd apps/web && node scripts/readme-games.ts
//
// The catalog loads its data with Vite's import.meta.glob, which Node cannot run, so the module is loaded through Vite's module runner, as scripts/banner.ts does.

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runnerImport } from 'vite';

const WEB = join(import.meta.dirname, '..');
const ROOT = join(WEB, '../..');

const { module } = await runnerImport<typeof import('../src/lib/readme.ts')>(join(WEB, 'src/lib/readme.ts'), { root: WEB, configFile: false });
for (const [name, lang] of Object.entries(module.READMES)) {
	const file = join(ROOT, name);
	const before = await readFile(file, 'utf8');
	const after = module.withGamesSection(before, lang);
	if (after !== before) await writeFile(file, after);
	console.log(`${after === before ? 'unchanged' : 'written  '} ${name}`);
}
