import type { App } from './catalog';
import { DEFAULT_LANG, type LangCode, fill, isLangCode, pick } from './lang';
import { LOCALES, type Translations } from './strings';

// The whole UI dictionary of one language. Anything that is not a site language (a raw ?lang= value that slipped through) gets the default language.
export function t(lang: LangCode): Translations {
	return LOCALES[isLangCode(lang) ? lang : DEFAULT_LANG];
}

// The meta description of an app's own page: its one-line summary, then who made it and with what, as many summaries alone are too short for a search snippet and name neither Go nor NSGo. A summary ending in a full-width stop needs no space before the next sentence; one in English (also the fallback for a missing language) does.
export function appDescription(app: App, lang: LangCode): string {
	const summary = pick(app.desc, lang);
	return `${summary}${summary.endsWith('。') ? '' : ' '}${fill(t(lang).app_desc_tail, { x: app.author })}`;
}
