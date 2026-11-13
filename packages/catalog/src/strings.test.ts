import { describe, expect, it } from 'vitest';
import { GENRES, GENRE_KEYS } from './games';
import { LANGS, type LangCode, fill } from './lang';
import { CURATOR_HANDLE, SITE_NAME } from './site';
import { LOCALES, type StringKey } from './strings';
import { t } from './translate';

const KEYS = Object.keys(LOCALES.en).sort() as StringKey[];
const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
const BREAKS_AND_WRAPS = [0x0a, 0x0d, 0x2028, 0x2029, 0x200b, 0x2060, 0xfeff];

describe('UI copy', () => {
	it('has every string in every language, with exactly the keys of English', () => {
		expect(Object.keys(LOCALES).sort()).toEqual([...LANGS].sort());
		for (const lang of LANGS) expect(Object.keys(LOCALES[lang]).sort(), lang).toEqual(KEYS);
	});

	it('leaves no string empty or padded', () => {
		for (const lang of LANGS) {
			for (const key of KEYS) {
				const value = LOCALES[lang][key];
				expect(typeof value, `${lang} ${key}`).toBe('string');
				expect(value.trim(), `${lang} ${key}`).not.toBe('');
				expect(value, `${lang} ${key}`).toBe(value.trim());
			}
		}
	});

	it('keeps the placeholders of English in every language', () => {
		for (const lang of LANGS) for (const key of KEYS) expect(holes(LOCALES[lang][key]), `${lang} ${key}`).toBe(holes(LOCALES.en[key]));
	});

	it('uses the placeholders the site fills', () => {
		const withHoles = Object.fromEntries(KEYS.filter((key) => holes(LOCALES.en[key])).map((key) => [key, holes(LOCALES.en[key])]));
		expect(withHoles).toEqual({ a2: '{models}', gameDescription: '{genre},{model},{summary}', gameTitle: '{creator},{name}', madeBy: '{maker}', gamesBy: '{c}', linkDownNote: '{date}', moreIn: '{g}', nGames: '{n}', showing: '{a},{b}' });
	});

	it('is free of manual line breaks and invisible wrap hints', () => {
		for (const lang of LANGS) for (const key of KEYS) expect([...LOCALES[lang][key]].filter((c) => BREAKS_AND_WRAPS.includes(c.codePointAt(0)!)), `${lang} ${key}`).toEqual([]);
	});

	it('is translated: no language repeats English for a whole sentence', () => {
		// Short labels can legitimately coincide (Details, Menu, Post); copy with a space in it and more than 24 characters cannot.
		for (const lang of LANGS) {
			if (lang === 'en') continue;
			for (const key of KEYS) if (LOCALES.en[key].length > 24 && LOCALES.en[key].includes(' ')) expect(LOCALES[lang][key], `${lang} ${key}`).not.toBe(LOCALES.en[key]);
		}
	});

	it('keeps the meta description within what a search result shows', () => {
		for (const lang of LANGS) expect([...LOCALES[lang].siteDescription].length, lang).toBeLessThanOrEqual(160);
	});

	it('names the site in every title, and the curator and the maker where the answers do', () => {
		for (const lang of LANGS) {
			expect(LOCALES[lang].siteTitle, lang).toContain(SITE_NAME);
			expect(LOCALES[lang].gameTitle, lang).toContain(SITE_NAME);
			expect(LOCALES[lang].a3, lang).toContain(`@${CURATOR_HANDLE}`);
			expect(LOCALES[lang].a5, lang).toContain(`@${CURATOR_HANDLE}`);
		}
	});

	it('labels every genre in every language', () => {
		for (const lang of LANGS) expect(new Set(GENRES.map((genre) => LOCALES[lang][GENRE_KEYS[genre]])).size, lang).toBe(GENRES.length);
		expect(GENRES.map((genre) => LOCALES.en[GENRE_KEYS[genre]])).toEqual([...GENRES]);
	});

	it('fills a game page title and description', () => {
		expect(fill(t('en').gameTitle, { name: 'Saltline', creator: 'felixrieseberg' })).toBe('Saltline by @felixrieseberg — Vibe Arcade');
		expect(fill(t('en').gameDescription, { summary: 'A one-shot FPS.', model: 'Claude Fable 5.2', genre: 'Shooter' })).toBe('A one-shot FPS. Built with Claude Fable 5.2. Shooter.');
		expect(fill(t('en').showing, { a: 3, b: 38 })).toBe('Showing 3 of 38');
	});
});

describe('t', () => {
	it('returns the dictionary of each language', () => {
		for (const lang of LANGS) expect(t(lang)).toBe(LOCALES[lang]);
	});

	it('falls back to the default language for a value that is not a site language', () => {
		expect(t('it' as LangCode)).toBe(LOCALES.en);
		expect(t('' as LangCode).notFoundTitle).toBe(LOCALES.en.notFoundTitle);
	});
});
