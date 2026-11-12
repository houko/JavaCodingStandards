export interface LangDef {
	code: LangCode;
	native: string;
	short: string;
	// Western scripts animate the hero headline word by word; CJK scripts character by character.
	words: boolean;
}

export const LANGS = [
	{ code: 'zh-CN', native: '简体中文', short: '简', words: false },
	{ code: 'zh-TW', native: '繁體中文', short: '繁', words: false },
	{ code: 'en', native: 'English', short: 'EN', words: true },
	{ code: 'ja', native: '日本語', short: '日', words: false },
	{ code: 'ko', native: '한국어', short: '한', words: true },
] as const satisfies readonly { code: string; native: string; short: string; words: boolean }[];

export type LangCode = (typeof LANGS)[number]['code'];

// Text of a catalog entry, keyed by language. English is required; a missing language falls back to it.
export type Text = { en: string } & Partial<Record<LangCode, string>>;

// Simplified Chinese lives at the bare URL; every other language is addressed with `?lang=<code>`.
export const DEFAULT_LANG = 'zh-CN' satisfies LangCode;

export const LANG_STORAGE_KEY = 'awesome-nsgo-lang';

export function isLangCode(value: unknown): value is LangCode {
	return typeof value === 'string' && LANGS.some((l) => l.code === value);
}

// Search params owned by the site's root route. `lang` is carried across navigation (apps/web/src/lib/lang.ts retainLang); `app` (the open detail drawer) is not, so moving to another page closes it.
export interface RootSearch {
	lang?: LangCode;
	app?: string;
}

// Both keys are always returned, undefined when invalid: TanStack merges the validated object over the raw parsed search (router-core matchRoutes: `{ ...parentSearch, ...strictSearch }`), so a key left out kept its raw value (?lang=fr) and reached useLang and every head, which crashed the render with a 500. With the key overridden, the server's canonical-URL check redirects ?lang=fr, ?lang=EN or a repeated lang to the same URL without it. An explicit ?lang=zh-CN is valid and kept, so that URL is neither redirected nor sent away by the inline language script. The query decoder turns all-digit values into numbers, so a slug such as ?app=2048 arrives as 2048.
export function validateRootSearch(search: Record<string, unknown>): RootSearch {
	const app = typeof search.app === 'number' ? String(search.app) : search.app;
	return {
		lang: isLangCode(search.lang) ? search.lang : undefined,
		app: typeof app === 'string' && /^[a-z0-9-]{1,64}$/.test(app) ? app : undefined,
	};
}

export function langIndex(code: LangCode): number {
	return LANGS.findIndex((l) => l.code === code);
}

export function langDef(code: LangCode): LangDef {
	return LANGS[langIndex(code)];
}

export function pick(text: Text, code: LangCode): string {
	return text[code] || text.en;
}

// User agents that never get the browser-language redirect: search and AI crawlers, link-preview fetchers and audit tools. A crawler is shown exactly the language the URL declares, so the zh-CN bare URLs (also the hreflang x-default) are not seen as redirects to their ?lang= twins. Several Google fetchers (Google-InspectionTool, GoogleOther) have no "bot" in the UA, hence the explicit names. Brand names that also appear in browser UAs are left out: DuckDuckGo's mobile browsers and the NAVER app's in-app browser carry "DuckDuckGo/7" and "NAVER(inapp; …)", while their crawlers, DuckDuckBot and Yeti, are already matched.
export const CRAWLER_UA = /bot|crawl|spider|slurp|google|bing|baidu|yandex|sogou|petal|yeti|bytespider|applebot|facebookexternalhit|twitterbot|slackbot|discordbot|linkedinbot|telegrambot|whatsapp|preview|lighthouse/i;

// The site's language for one browser language tag, or null for a language the site does not speak. Chinese goes by script, then region: Hans is Simplified wherever it is used, Hant and the regions that write Traditional (Taiwan, Hong Kong, Macau) are Traditional, and everything else is Simplified.
export function langOfTag(tag: string): LangCode | null {
	const t = tag.toLowerCase();
	if (t.startsWith('zh')) return t.includes('hans') ? 'zh-CN' : /hant|tw|hk|mo/.test(t) ? 'zh-TW' : 'zh-CN';
	if (t.startsWith('ja')) return 'ja';
	if (t.startsWith('ko')) return 'ko';
	if (t.startsWith('en')) return 'en';
	return null;
}

// The language a visit on a bare URL should switch to (the default language means stay). A crawler always stays, so search engines see each URL in the language it declares. A choice the visitor saved on the site wins next. Otherwise the browser's languages are tried in its order of preference (navigator.languages), whichever way the visitor arrived, a shared link or a search result included; a browser with none of the site's languages gets English, the one most visitors who read neither Chinese, Japanese nor Korean can read.
export function negotiateLang(saved: string | null, browser: readonly string[] | null | undefined, userAgent = ''): LangCode {
	if (CRAWLER_UA.test(userAgent)) return DEFAULT_LANG;
	if (isLangCode(saved)) return saved;
	for (const tag of browser ?? []) {
		const lang = langOfTag(tag);
		if (lang) return lang;
	}
	return 'en';
}

export function fill(template: string, values: { x?: string; n?: number | string }): string {
	let out = template;
	if (values.x !== undefined) out = out.replace('{x}', values.x);
	if (values.n !== undefined) out = out.replace('{n}', String(values.n));
	return out;
}

// The same choice as negotiateLang, as an inline <head> script: it runs before React hydrates, so a first visit on a bare URL is sent to its ?lang= page by the server instead of switching language mid-hydration (which made React report hydration mismatches and flashed the Chinese page first). Any explicit valid ?lang=, the default language included, is final. Kept in sync with negotiateLang by the tests.
export function langRedirectScript(): string {
	const codes = JSON.stringify(LANGS.map((l) => l.code));
	return `(function(){var C=${codes},D=${JSON.stringify(DEFAULT_LANG)},u=new URL(location.href),q=u.searchParams.get('lang');if(q&&C.indexOf(q)>=0)return;if(${CRAWLER_UA}.test(navigator.userAgent||''))return;var s=null;try{s=localStorage.getItem(${JSON.stringify(LANG_STORAGE_KEY)})}catch(e){}var w=null;if(s&&C.indexOf(s)>=0)w=s;else{var L=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||''];for(var i=0;i<L.length&&!w;i++){var n=String(L[i]||'').toLowerCase();w=n.indexOf('zh')===0?(n.indexOf('hans')>=0?'zh-CN':/hant|tw|hk|mo/.test(n)?'zh-TW':'zh-CN'):n.indexOf('ja')===0?'ja':n.indexOf('ko')===0?'ko':n.indexOf('en')===0?'en':null}w=w||'en'}if(w===D)return;u.searchParams.set('lang',w);location.replace(u.toString())})()`;
}
