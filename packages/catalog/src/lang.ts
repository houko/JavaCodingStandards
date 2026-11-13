// The site's languages, in the order the language menu lists them.
export const LANGS = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'es', 'fr', 'de', 'pt-BR', 'ru'] as const;

export type LangCode = (typeof LANGS)[number];

// Each language's name in itself, as the language menu shows it.
export const LANG_LABELS: Record<LangCode, string> = {
	en: 'English',
	'zh-CN': '简体中文',
	'zh-TW': '繁體中文',
	ja: '日本語',
	ko: '한국어',
	es: 'Español',
	fr: 'Français',
	de: 'Deutsch',
	'pt-BR': 'Português',
	ru: 'Русский',
};

// Text written in English and in any of the other site languages: a game's summary, say. A language it is not written in shows the English.
export type Text = { en: string } & Partial<Record<LangCode, string>>;

// English lives at the bare URL; every other language is addressed with `?lang=<code>`.
export const DEFAULT_LANG = 'en' satisfies LangCode;

export const LANG_STORAGE_KEY = 'avg-lang';

export function isLangCode(value: unknown): value is LangCode {
	return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

// The search param owned by the site's root route, carried across navigation.
export interface RootSearch {
	lang?: LangCode;
}

// The key is always returned, undefined when invalid: TanStack merges the validated object over the raw parsed search (router-core matchRoutes: `{ ...parentSearch, ...strictSearch }`), so a key left out would keep its raw value (?lang=xx) and reach every head and render. With the key overridden, the server's canonical-URL check can redirect ?lang=xx, ?lang=EN or a repeated lang to the same URL without it. An explicit ?lang=en is valid and kept, so that URL is neither redirected nor sent away by the inline language script.
export function validateRootSearch(search: Record<string, unknown>): RootSearch {
	return { lang: isLangCode(search.lang) ? search.lang : undefined };
}

export function pick(text: Text, lang: LangCode): string {
	return text[lang] ?? text.en;
}

// Fills a UI string's `{name}` placeholders from vars; a placeholder with no value is left as written.
export function fill(template: string, vars: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (hole, name: string) => (Object.hasOwn(vars, name) ? String(vars[name]) : hole));
}

// User agents that never get the browser-language redirect: search and AI crawlers, link-preview fetchers and audit tools. A crawler is shown exactly the language the URL declares, so the English bare URLs (also the hreflang x-default) are not seen as redirects to their ?lang= twins. Several Google fetchers (Google-InspectionTool, GoogleOther) have no "bot" in the UA, hence the explicit names. Brand names that also appear in browser UAs are left out: DuckDuckGo's mobile browsers, the NAVER, Baidu and Bing apps and the Sogou browser carry "DuckDuckGo/7", "NAVER(inapp; …)", "baiduboxapp", "BingSapphire" and "SogouMobileBrowser", while their crawlers (DuckDuckBot, Yeti, Baiduspider, bingbot, BingPreview, Sogou web spider) are already matched. "bot" does not count after "cu", for the phones of the Cubot brand; that is spelled without a lookbehind, which Safari before 16.4 cannot parse and which would stop the whole inline script there.
export const CRAWLER_UA = /(?:^|[^u]|[^c]u)bot|crawl|spider|slurp|google|yandex|petal|yeti|bytespider|applebot|facebookexternalhit|twitterbot|slackbot|discordbot|linkedinbot|telegrambot|whatsapp|preview|lighthouse/i;

// Which site language a browser language tag means: the first rule whose pattern matches the lowercased tag wins. Chinese goes by script, then region: Hans is Simplified wherever it is used, Hant and the regions that write Traditional (Taiwan, Hong Kong, Macau) are Traditional, and everything else is Simplified. Every Portuguese is served pt-BR, the only Portuguese the site has. This one table drives both langOfTag and the inline script of langRedirectScript, so the two cannot drift.
const TAG_RULES: readonly (readonly [pattern: string, lang: LangCode])[] = [
	['^zh\\b.*\\bhans\\b', 'zh-CN'],
	['^zh\\b.*\\b(hant|tw|hk|mo)\\b', 'zh-TW'],
	['^zh\\b', 'zh-CN'],
	['^en\\b', 'en'],
	['^ja\\b', 'ja'],
	['^ko\\b', 'ko'],
	['^es\\b', 'es'],
	['^fr\\b', 'fr'],
	['^de\\b', 'de'],
	['^pt\\b', 'pt-BR'],
	['^ru\\b', 'ru'],
];

// The site's language for one browser language tag, or null for a language the site does not speak.
export function langOfTag(tag: string): LangCode | null {
	const t = tag.toLowerCase();
	const rule = TAG_RULES.find(([pattern]) => new RegExp(pattern).test(t));
	return rule ? rule[1] : null;
}

// The language a visit on a bare URL should switch to (the default language means stay). A crawler always stays, so search engines see each URL in the language it declares. A choice the visitor saved on the site wins next. Otherwise the browser's languages are tried in its order of preference (navigator.languages), whichever way the visitor arrived, a shared link or a search result included; a browser with none of the site's languages gets the default.
export function negotiateLang(saved: string | null, browser: readonly string[] | null | undefined, userAgent = ''): LangCode {
	if (CRAWLER_UA.test(userAgent)) return DEFAULT_LANG;
	if (isLangCode(saved)) return saved;
	for (const tag of browser ?? []) {
		const lang = langOfTag(tag);
		if (lang) return lang;
	}
	return DEFAULT_LANG;
}

// The same choice as negotiateLang, as an inline <head> script: it runs before React hydrates, so a first visit on a bare URL is sent to its ?lang= page by the server instead of switching language mid-hydration. Any explicit valid ?lang=, the default language included, is final. Reading localStorage is the one call wrapped in try/catch, as a browser that blocks storage throws on it. The tests run this script against negotiateLang.
export function langRedirectScript(): string {
	return `(function(){var C=${JSON.stringify(LANGS)},R=${JSON.stringify(TAG_RULES)},D=${JSON.stringify(DEFAULT_LANG)},u=new URL(location.href),q=u.searchParams.get('lang');if(q&&C.indexOf(q)>=0)return;if(${CRAWLER_UA}.test(navigator.userAgent||''))return;var s=null;try{s=localStorage.getItem(${JSON.stringify(LANG_STORAGE_KEY)})}catch(e){}var w=null;if(s&&C.indexOf(s)>=0)w=s;else{var L=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||''];for(var i=0;i<L.length&&!w;i++){var n=String(L[i]||'').toLowerCase();for(var j=0;j<R.length&&!w;j++)if(new RegExp(R[j][0]).test(n))w=R[j][1]}w=w||D}if(w===D)return;u.searchParams.set('lang',w);location.replace(u.toString())})()`;
}
