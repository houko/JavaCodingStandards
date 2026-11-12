// Subsets the Noto families the share cards set non-Latin text in (an app named 留白, an author with a Korean name) to the characters the catalog's app names and authors hold, from Google Fonts, into apps/web/og/fonts, with noto.json listing what each subset holds. The build then reads them instead of asking Google Fonts, which it still does, with a warning, for a character no subset holds yet.
//
// Run it again when an app brings characters no subset holds, as the build's warning says, and commit what it writes. It is not run on submissions, as two of them adding characters would conflict over the same font files; until it runs, the build fetches those characters:
//
//     node apps/web/scripts/og-fonts.ts
//
// The fonts are under the SIL Open Font License 1.1, in og/fonts/OFL-noto.txt.

import { existsSync } from 'node:fs';
import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type NotoIndex, WEIGHTS, familiesOf, googleFace, notoFile } from '../og/noto.ts';

const ROOT = join(import.meta.dirname, '../../..');
const APPS = join(ROOT, 'packages/catalog/data/apps');
const FONTS = join(ROOT, 'apps/web/og/fonts');

const chars = new Map<string, Set<string>>();
for (const name of (await readdir(APPS)).filter((n) => n.endsWith('.json'))) {
	const app = JSON.parse(await readFile(join(APPS, name), 'utf8')) as { name?: unknown; author?: unknown };
	for (const text of [app.name, app.author]) {
		if (typeof text !== 'string') continue;
		for (const [family, cs] of familiesOf(text)) {
			const set = chars.get(family) ?? new Set<string>();
			for (const c of cs) set.add(c);
			chars.set(family, set);
		}
	}
}

// A subset that already holds just these characters is kept as it is, so a run that adds nothing changes no file: Google Fonts may encode the same subset differently from one day to the next.
const before: NotoIndex = existsSync(join(FONTS, 'noto.json')) ? JSON.parse(await readFile(join(FONTS, 'noto.json'), 'utf8')) : {};
const index: NotoIndex = {};
for (const family of [...chars.keys()].sort()) {
	const text = [...(chars.get(family) ?? [])].sort().join('');
	const kept = before[family];
	if (kept?.text === text && WEIGHTS.every((w) => kept.files[String(w)] && existsSync(join(FONTS, kept.files[String(w)])))) {
		index[family] = kept;
		continue;
	}
	const files: Record<string, string> = {};
	for (const weight of WEIGHTS) {
		const file = notoFile(family, weight);
		await writeFile(join(FONTS, file), new Uint8Array(await googleFace(family, weight, text)));
		files[String(weight)] = file;
	}
	index[family] = { text, files };
	console.log(`${family}: ${text}`);
}

// Subsets of families no app needs any more.
const used = new Set(Object.values(index).flatMap((f) => Object.values(f.files)));
for (const name of await readdir(FONTS)) if (name.startsWith('noto-') && name.endsWith('.ttf') && !used.has(name)) await rm(join(FONTS, name));
await writeFile(join(FONTS, 'noto.json'), `${JSON.stringify(index, null, '\t')}\n`);
