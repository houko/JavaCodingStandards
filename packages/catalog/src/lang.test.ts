import { describe, expect, it } from 'vitest';
import { DEFAULT_LANG, LANGS, LANG_LABELS, LANG_STORAGE_KEY, type LangCode, fill, isLangCode, langOfTag, langRedirectScript, negotiateLang, pick, validateRootSearch } from './lang';

const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

// Browser language tags and the site language each must get.
const TAGS: [string, LangCode][] = [
	['en', 'en'],
	['en-US', 'en'],
	['en-GB', 'en'],
	['zh', 'zh-CN'],
	['zh-CN', 'zh-CN'],
	['zh-SG', 'zh-CN'],
	['zh-Hans', 'zh-CN'],
	['zh-Hans-HK', 'zh-CN'],
	['zh-Hans-TW', 'zh-CN'],
	['zh-TW', 'zh-TW'],
	['zh-HK', 'zh-TW'],
	['zh-MO', 'zh-TW'],
	['zh-Hant', 'zh-TW'],
	['zh-Hant-MO', 'zh-TW'],
	['zh-Hant-CN', 'zh-TW'],
	['ja', 'ja'],
	['ja-JP', 'ja'],
	['ko', 'ko'],
	['ko-KR', 'ko'],
	['es', 'es'],
	['es-ES', 'es'],
	['es-419', 'es'],
	['es-MX', 'es'],
	['fr', 'fr'],
	['fr-CA', 'fr'],
	['de', 'de'],
	['de-AT', 'de'],
	['pt', 'pt-BR'],
	['pt-BR', 'pt-BR'],
	['pt-PT', 'pt-BR'],
	['ru', 'ru'],
	['ru-RU', 'ru'],
];
// Languages the site does not speak, some of which begin with the letters of one it does.
const UNKNOWN_TAGS = ['it', 'nl-NL', 'ar', 'hi-IN', 'tr', 'fil-PH', 'frr', 'kok-IN', 'est', 'den', 'rup', 'jam', 'zhx', 'enm', ''];

describe('the languages', () => {
	it('are ten, each with a name of its own, English first and the default', () => {
		expect(LANGS).toEqual(['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'es', 'fr', 'de', 'pt-BR', 'ru']);
		expect(Object.keys(LANG_LABELS)).toEqual([...LANGS]);
		expect(new Set(Object.values(LANG_LABELS)).size).toBe(LANGS.length);
		expect(DEFAULT_LANG).toBe('en');
		expect(LANG_STORAGE_KEY).toBe('avg-lang');
	});

	it('are told from other values', () => {
		for (const lang of LANGS) expect(isLangCode(lang)).toBe(true);
		for (const other of ['EN', 'zh-cn', 'pt', 'it', '', 3, null, undefined, ['en']]) expect(isLangCode(other), String(other)).toBe(false);
	});
});

describe('langOfTag', () => {
	it('maps every browser tag of a site language, whatever its case', () => {
		for (const [tag, lang] of TAGS) {
			expect(langOfTag(tag), tag).toBe(lang);
			expect(langOfTag(tag.toUpperCase()), tag).toBe(lang);
			expect(langOfTag(tag.toLowerCase()), tag).toBe(lang);
		}
	});

	it('reaches every site language', () => {
		expect(new Set(TAGS.map(([tag]) => langOfTag(tag)))).toEqual(new Set(LANGS));
	});

	it('knows no other language', () => {
		for (const tag of UNKNOWN_TAGS) expect(langOfTag(tag), tag).toBeNull();
	});
});

describe('negotiateLang', () => {
	it('prefers a saved choice', () => {
		for (const lang of LANGS) expect(negotiateLang(lang, ['it-IT'])).toBe(lang);
		expect(negotiateLang('ja', ['en-US'])).toBe('ja');
	});

	it('ignores a saved value that is not a site language', () => {
		expect(negotiateLang('it', ['ko-KR'])).toBe('ko');
		expect(negotiateLang('', ['de'])).toBe('de');
	});

	it("takes the browser's first language the site speaks", () => {
		expect(negotiateLang(null, ['it-IT', 'nl', 'ja-JP', 'en-US'])).toBe('ja');
		expect(negotiateLang(null, ['en-GB', 'zh-CN'])).toBe('en');
		expect(negotiateLang(null, ['pt-PT', 'es'])).toBe('pt-BR');
		for (const [tag, lang] of TAGS) expect(negotiateLang(null, ['xx', tag, 'ru']), tag).toBe(lang);
	});

	it('falls back to English when the browser has none of the site languages', () => {
		expect(negotiateLang(null, ['it-IT', 'nl'])).toBe('en');
		expect(negotiateLang(null, [])).toBe('en');
		expect(negotiateLang(null, undefined)).toBe('en');
		expect(negotiateLang(null, null)).toBe('en');
	});

	it('keeps crawlers on the language the URL declares', () => {
		const crawlers = [
			'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
			'Mozilla/5.0 (compatible; Google-InspectionTool/1.0)',
			'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36',
			'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/534+ (KHTML, like Gecko) BingPreview/1.0b',
			'Mozilla/5.0 (compatible; Baiduspider-render/2.0; +http://www.baidu.com/search/spider.html)',
			'Sogou web spider/4.0(+http://www.sogou.com/docs/help/webmasters.htm#07)',
			'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
			'Mozilla/5.0 (Linux; Android 7.0;) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; PetalBot;+https://webmaster.petalsearch.com/site/petalbot)',
			'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)',
			'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)',
			'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
			'Twitterbot/1.0',
			'WhatsApp/2.23.20.0',
			'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse',
		];
		for (const userAgent of crawlers) {
			expect(negotiateLang(null, ['ja-JP'], userAgent), userAgent).toBe('en');
			expect(negotiateLang('ko', ['ja-JP'], userAgent), userAgent).toBe('en');
		}
		expect(negotiateLang(null, ['ja-JP'], CHROME)).toBe('ja');
	});

	it('treats browsers that carry a search brand in their UA as browsers', () => {
		const browsers: [string, string][] = [
			['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 DuckDuckGo/5', 'de-DE'],
			['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 DuckDuckGo/7 Safari/605.1.15', 'fr-FR'],
			['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NAVER(inapp; search; 2000; 12.10.0; 15PRO)', 'ko-KR'],
			['Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 NAVER(inapp; search; 2000; 12.10.0)', 'ko-KR'],
			['Mozilla/5.0 (Linux; Android 12; P1 Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/97.0.4692.98 Mobile Safari/537.36 T7/13.59 SP-engine/2.98.0 baiduboxapp/13.59.0.10 (Baidu; P1 12)', 'zh-CN'],
			['Mozilla/5.0 (Linux; Android 13; 2211133C Build/TKQ1.220905.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 SogouMSE,SogouMobileBrowser/5.25.8', 'zh-CN'],
			['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BingSapphire/27.5.410000000', 'es-MX'],
			['Mozilla/5.0 (Linux; Android 11; CUBOT NOTE 20 PRO) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36', 'ru-RU'],
			['Mozilla/5.0 (Linux; Android 11; CUBOT_X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36', 'pt-PT'],
		];
		for (const [userAgent, browser] of browsers) expect(negotiateLang(null, [browser], userAgent), userAgent).toBe(langOfTag(browser));
	});
});

describe('langRedirectScript', () => {
	// Runs the inline script against a fake page and returns where it redirected, or null. A browser is its navigator.languages; a string is an old browser with navigator.language only. storageThrows is a browser that blocks storage and throws on reading it.
	const run = (href: string, saved: string | null, browser: readonly string[] | string, userAgent = CHROME, storageThrows = false) => {
		let to: string | null = null;
		const location = { href, replace: (u: string) => (to = u) };
		const localStorage = {
			getItem: (key: string) => {
				if (storageThrows) throw new Error('storage is blocked');
				return key === LANG_STORAGE_KEY ? saved : null;
			},
		};
		const navigator = typeof browser === 'string' ? { language: browser, userAgent } : { languages: browser, language: browser[0], userAgent };
		new Function('location', 'localStorage', 'navigator', langRedirectScript())(location, localStorage, navigator);
		return to as string | null;
	};
	const langOf = (to: string | null) => (to ? new URL(to).searchParams.get('lang') : DEFAULT_LANG);

	it('picks the same language as negotiateLang, for every tag, saved choice and kind of visitor', () => {
		const browsers: string[][] = [...TAGS.map(([tag]) => [tag]), ...UNKNOWN_TAGS.map((tag) => [tag]), ['it-IT', 'ko-KR', 'en'], ['nl', 'pt-PT', 'zh-TW'], ['it', 'nl'], []];
		const saves = [null, ...LANGS, 'it', 'EN', ''];
		for (const browser of browsers) {
			for (const saved of saves) {
				for (const userAgent of [CHROME, GOOGLEBOT]) {
					expect(langOf(run('https://example.test/games/saltline?game=roost', saved, browser, userAgent)), `${browser} ${saved} ${userAgent}`).toBe(negotiateLang(saved, browser, userAgent));
				}
			}
		}
	});

	it('reaches every site language', () => {
		for (const lang of LANGS) {
			const tag = TAGS.find(([, l]) => l === lang)![0];
			expect(run('https://example.test/', null, [tag]), lang).toBe(lang === 'en' ? null : `https://example.test/?lang=${lang}`);
		}
	});

	it('reads navigator.language when the browser has no navigator.languages', () => {
		expect(run('https://example.test/', null, 'ja-JP')).toBe('https://example.test/?lang=ja');
		expect(run('https://example.test/', null, 'en-US')).toBeNull();
	});

	it('keeps the path and other parameters', () => {
		expect(run('https://example.test/games/saltline?game=roost', null, ['de-DE'])).toBe('https://example.test/games/saltline?game=roost&lang=de');
	});

	it('leaves a page that already names a language, the default included', () => {
		expect(run('https://example.test/?lang=ja', null, ['de-DE'])).toBeNull();
		expect(run('https://example.test/?lang=en', null, ['de-DE'])).toBeNull();
		expect(run('https://example.test/?lang=en', 'ja', ['de-DE'])).toBeNull();
	});

	it('replaces a ?lang= that is not a site language', () => {
		expect(run('https://example.test/?lang=it', null, ['de-DE'])).toBe('https://example.test/?lang=de');
	});

	it('does not redirect crawlers', () => {
		expect(run('https://example.test/', null, ['ja-JP'], GOOGLEBOT)).toBeNull();
		expect(run('https://example.test/', 'ko', ['ja-JP'], GOOGLEBOT)).toBeNull();
	});

	it('goes by the browser when reading the saved choice throws', () => {
		expect(run('https://example.test/', 'ko', ['ja-JP'], CHROME, true)).toBe('https://example.test/?lang=ja');
	});
});

describe('validateRootSearch', () => {
	it('drops a lang that is not a site language, so it never reaches the render', () => {
		for (const lang of ['it', 'EN', 'zh-cn', 'pt', '', 123, ['en', 'ja'], null]) {
			const v = validateRootSearch({ lang });
			// The key must be present (as undefined) to override the raw value TanStack merges the result over.
			expect('lang' in v, JSON.stringify(lang)).toBe(true);
			expect(v.lang, JSON.stringify(lang)).toBeUndefined();
		}
		for (const lang of LANGS) expect(validateRootSearch({ lang }).lang).toBe(lang);
	});

	it('owns no other parameter', () => {
		expect(validateRootSearch({ lang: 'ja', game: 'saltline', q: 'x' })).toEqual({ lang: 'ja' });
	});
});

describe('pick and fill', () => {
	it('picks the text of a language', () => {
		const text = Object.fromEntries(LANGS.map((lang) => [lang, `text in ${lang}`])) as Record<LangCode, string>;
		for (const lang of LANGS) expect(pick(text, lang)).toBe(`text in ${lang}`);
	});

	it('fills any named placeholder, every time it appears', () => {
		expect(fill('Showing {a} of {b}', { a: 3, b: 38 })).toBe('Showing 3 of 38');
		expect(fill('More {g}', { g: 'Racing' })).toBe('More Racing');
		expect(fill('{name} by @{creator}', { name: 'Saltline', creator: 'felixrieseberg' })).toBe('Saltline by @felixrieseberg');
		expect(fill('{x} and {x}', { x: 'again' })).toBe('again and again');
		expect(fill('{n} games', { n: 0 })).toBe('0 games');
	});

	it('leaves a placeholder it has no value for, and inserts values as they are', () => {
		expect(fill('{a} of {b}', { a: 1 })).toBe('1 of {b}');
		expect(fill('{name}', { name: '{creator} $& $1', creator: 'no' })).toBe('{creator} $& $1');
		expect(fill('{toString} {constructor}', {})).toBe('{toString} {constructor}');
	});
});
