import { describe, expect, it } from 'vitest';
import { LANGS, type Text } from './lang';
import { CatalogError, Reader, unique } from './validate';

const TEXT = Object.fromEntries(LANGS.map((lang) => [lang, `A kit (${lang}).`])) as Text;
const LINE_BREAKS = ['\n', '\r', String.fromCharCode(0x2028), String.fromCharCode(0x2029)];
const WRAP_CONTROLS = [0x200b, 0x2060, 0xfeff].map((code) => String.fromCharCode(code));

describe('Reader', () => {
	const read = (entry: Record<string, unknown>) => () => {
		const r = new Reader('games/kit.json', entry);
		r.only(['name', 'url', 'kind', 'summary']);
		return [r.str('name'), r.url('url'), r.oneOf('kind', ['play', 'source']), r.text('summary')];
	};
	const ok = { name: 'Kit', url: 'https://x.dev', kind: 'play', summary: TEXT };

	it('accepts a well-formed entry', () => {
		expect(read(ok)).not.toThrow();
	});

	it('names the file, the entry and the field of each mistake', () => {
		expect(read({ ...ok, url: 'http://x.dev' })).toThrow(/^games\/kit.json \(Kit\): url must be an https link, got "http:\/\/x.dev"$/);
		expect(read({ ...ok, kind: 'electron' })).toThrow(/kind must be one of play, source, got "electron"/);
		expect(read({ ...ok, descripton: 'typo' })).toThrow(/descripton is not a known field \(name, url, kind, summary\)/);
		expect(read({ ...ok, name: ' ' })).toThrow(CatalogError);
		expect(read({ ...ok, name: 3 })).toThrow(/name must be a non-empty string/);
	});

	it('rejects a string padded with spaces', () => {
		expect(read({ ...ok, name: 'Kit ' })).toThrow(/name must not start or end with a space/);
		expect(read({ ...ok, name: ' Kit' })).toThrow(/name must not start or end with a space/);
		expect(read({ ...ok, summary: { ...TEXT, de: 'Ein Kit. ' } })).toThrow(/summary.de must not start or end with a space/);
	});

	it('rejects line breaks and invisible wrap controls in any string', () => {
		for (const lineBreak of LINE_BREAKS) {
			expect(read({ ...ok, name: `Two${lineBreak}lines` })).toThrow(/name must be a single line/);
			expect(read({ ...ok, summary: { ...TEXT, en: `A kit.${lineBreak}On two lines.` } })).toThrow(/summary.en must be a single line/);
		}
		for (const control of WRAP_CONTROLS) {
			expect(read({ ...ok, name: `Two${control}parts` })).toThrow(/name must not contain invisible wrap controls/);
			expect(read({ ...ok, summary: { ...TEXT, ja: `A kit.${control}Hidden.` } })).toThrow(/summary.ja must not contain invisible wrap controls/);
		}
	});

	it('wants a text in English, in any other site language, and in no other language', () => {
		const { en: _english, ...rest } = TEXT;
		expect(read({ ...ok, summary: rest })).toThrow(/summary\.en is required/);
		expect(read({ ...ok, summary: { en: 'A kit.' } })).not.toThrow();
		for (const lang of LANGS) expect(read({ ...ok, summary: { ...TEXT, [lang]: ' ' } }), lang).toThrow(new RegExp(`summary\\.${lang} must be a non-empty string`));
		expect(read({ ...ok, summary: { ...TEXT, it: 'Un kit.' } })).toThrow(/summary.it is not a site language \(en, zh-CN, zh-TW, ja, ko, es, fr, de, pt-BR, ru\)/);
		expect(read({ ...ok, summary: 'A kit.' })).toThrow(/summary must be an object of texts by language/);
		expect(read({ ...ok, summary: [TEXT] })).toThrow(/summary must be an object of texts by language/);
		expect(new Reader('games/kit.json', {}).optText('pitch')).toBeUndefined();
		expect(new Reader('games/kit.json', { pitch: TEXT }).optText('pitch')).toBe(TEXT);
	});

	it('reads whole numbers of at least a minimum', () => {
		const int = (likes: unknown, min?: number) => () => new Reader('games/kit.json', { likes }).int('likes', min);
		expect(int(0)()).toBe(0);
		expect(int(14382)()).toBe(14382);
		expect(int(1, 1)()).toBe(1);
		for (const bad of [-1, 1.5, '12', null, undefined, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53]) expect(int(bad), String(bad)).toThrow(/likes must be a whole number of at least 0/);
		expect(int(0, 1)).toThrow(/likes must be a whole number of at least 1/);
	});

	it('reports a nested object under its dotted path, with the entry name', () => {
		const r = new Reader('games/kit.json', { name: 'Kit', link: { type: 'play', url: 'ftp://x.dev', extra: 1 }, list: [], word: 'x' });
		const link = r.obj('link');
		expect(link.str('type')).toBe('play');
		expect(() => link.url('url')).toThrow(/^games\/kit.json \(Kit\): link.url must be an https link/);
		expect(() => link.only(['type', 'url'])).toThrow(/^games\/kit.json \(Kit\): link.extra is not a known field \(type, url\)$/);
		for (const field of ['list', 'word', 'missing']) expect(() => r.obj(field), field).toThrow(new RegExp(`${field} must be an object`));
		expect(r.optObj('missing')).toBeUndefined();
		expect(r.optObj('link')?.raw).toEqual({ type: 'play', url: 'ftp://x.dev', extra: 1 });
	});

	it('reads optional links only when present', () => {
		const r = new Reader('games/kit.json', { home: 'https://x.dev', bad: 'x.dev' });
		expect(r.optUrl('home')).toBe('https://x.dev');
		expect(r.optUrl('missing')).toBeUndefined();
		expect(() => r.optUrl('bad')).toThrow(/bad must be an https link/);
	});
});

describe('unique', () => {
	it('rejects two entries with the same value', () => {
		expect(() => unique('games', [{ slug: 'a' }, { slug: 'b' }], 'slug', (x) => x.slug)).not.toThrow();
		expect(() => unique('games', [{ slug: 'a' }, { slug: 'a' }], 'slug', (x) => x.slug)).toThrow(/^games\/: two entries have slug "a"$/);
	});
});
