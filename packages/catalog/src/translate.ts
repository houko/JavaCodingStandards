import { DEFAULT_LANG, type LangCode, isLangCode } from './lang';
import { LOCALES, type Translations } from './strings';

// The whole UI dictionary of one language. Anything that is not a site language (a raw ?lang= value that slipped through) gets the default language.
export function t(lang: LangCode): Translations {
	return LOCALES[isLangCode(lang) ? lang : DEFAULT_LANG];
}
