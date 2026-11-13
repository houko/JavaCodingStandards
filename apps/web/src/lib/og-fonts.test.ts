import { readFileSync } from 'node:fs';
import { GAMES } from '@vibe-arcade/catalog';
import { describe, expect, it } from 'vitest';
import { CJK, type CjkFonts, cjkChars } from '../../og/cjk';

const FONTS = new URL('../../og/fonts/', import.meta.url);
const list: CjkFonts = JSON.parse(readFileSync(new URL('cjk.json', FONTS), 'utf8'));

describe("the share cards' CJK fonts", () => {
	// A failure here means a game's name, handle or model has a Chinese, Japanese or Korean character the subsets were not made for, so its card would show a box: run pnpm --filter @vibe-arcade/web og-fonts and commit what it writes.
	it('hold every CJK character the cards print', () => {
		const missing = cjkChars(GAMES).filter((c) => !list.chars.includes(c));
		expect(missing, 'run pnpm --filter @vibe-arcade/web og-fonts').toEqual([]);
	});

	it('are listed with files that exist', () => {
		for (const [, file] of list.files) expect(readFileSync(new URL(file, FONTS)).length, file).toBeGreaterThan(0);
		if (list.chars) expect(list.files.length).toBeGreaterThan(0);
	});

	it('tell CJK characters from Latin ones', () => {
		expect([...'雾鎖山門ひらカナ한글、！'].every((c) => CJK.test(c))).toBe(true);
		expect([...'Saltline é ü ß — 5.2'].some((c) => CJK.test(c))).toBe(false);
		expect(cjkChars([{ name: 'Kit 雾 Racer 雾', creator: 'a', model: 'b' }])).toEqual(['雾']);
	});
});
