// Fetches the Noto Sans subsets the share cards need for the Chinese, Japanese and Korean characters in the games' names, handles and models (og/cjk.ts), into og/fonts, and writes og/fonts/cjk.json, the list card.ts loads. Run it after adding or renaming a game whose name has such characters, and commit what it writes; the site's tests fail while a character is missing.
//
//     cd apps/web && node scripts/og-cjk-fonts.ts
//
// Google Fonts' css2 API subsets a family to the characters given in `text`, and answers a client that is not a browser with static TrueType files, which satori reads. Noto Sans SC and KR are SIL OFL, like the other fonts here (OFL-noto-sans.txt).

import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CJK, type CjkFonts, HANGUL, cjkChars } from '../og/cjk.ts';

const GAMES_DIR = join(import.meta.dirname, '../../../packages/catalog/data/games');
const FONT_DIR = join(import.meta.dirname, '../og/fonts');
const WEIGHTS = [500, 800] as const;
const FAMILIES = [
	{ name: 'Noto Sans SC', slug: 'noto-sans-sc', takes: (c: string) => !HANGUL.test(c) },
	{ name: 'Noto Sans KR', slug: 'noto-sans-kr', takes: (c: string) => HANGUL.test(c) },
];

const games = await Promise.all((await readdir(GAMES_DIR)).filter((f) => f.endsWith('.json')).map(async (f) => JSON.parse(await readFile(join(GAMES_DIR, f), 'utf8'))));
const chars = cjkChars(games);
const files: CjkFonts['files'] = [];

for (const family of FAMILIES) {
	const text = chars.filter(family.takes).join('');
	for (const weight of WEIGHTS) {
		const file = `${family.slug}-${weight}.ttf`;
		if (!text) {
			await rm(join(FONT_DIR, file), { force: true });
			continue;
		}
		const css = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family.name)}:wght@${weight}&text=${encodeURIComponent(text)}`, { headers: { 'User-Agent': 'curl/8' } });
		if (!css.ok) throw new Error(`${family.name} ${weight}: css2 answered ${css.status}`);
		const url = (await css.text()).match(/src: url\((\S+?)\) format\('truetype'\)/)?.[1];
		if (!url) throw new Error(`${family.name} ${weight}: no TrueType file in the css2 answer`);
		const font = await fetch(url);
		if (!font.ok) throw new Error(`${family.name} ${weight}: the font answered ${font.status}`);
		await writeFile(join(FONT_DIR, file), Buffer.from(await font.arrayBuffer()));
		files.push([family.name, file, weight]);
		console.log(`wrote og/fonts/${file} (${text.length} characters)`);
	}
}

const list: CjkFonts = { chars: chars.join(''), files };
await writeFile(join(FONT_DIR, 'cjk.json'), `${JSON.stringify(list, null, '\t')}\n`);
console.log(`og/fonts/cjk.json: ${chars.length} characters${chars.length ? `: ${chars.join('')}` : ''}`);
if (chars.some((c) => !CJK.test(c))) throw new Error('a listed character is not CJK');
