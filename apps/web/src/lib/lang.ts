import { DEFAULT_LANG, LANG_STORAGE_KEY, type LangCode, type RootSearch, type Translations, t } from '@awesome-nsgo/catalog';
import { type SearchMiddleware, useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback } from 'react';

// The root route's search middleware: a destination that does not set `lang` keeps the current one, except the default language. The site never writes ?lang=zh-CN (Simplified Chinese is the bare URL), so a page reached through an explicit one links to the bare canonical URLs instead of spreading the duplicate to every href. A destination that names lang itself is left as it is: `search: true`, which the server and client canonical-URL checks use and which passes the current search through with its lang set, so ?lang=zh-CN itself is not redirected; and the language menu and useSetLang, which set it, to undefined for Simplified Chinese. That last case only shows in the metadata (router-core applySearchMiddleware), whose `explicit` is the destination's own search, so like retainSearchParams this asks next for it: the plain result cannot tell, as the validator always returns both keys.
export const retainLang: SearchMiddleware<RootSearch> = ({ search, next }) => {
	const { search: result, meta } = (next as unknown as (s: RootSearch, collectMeta: true) => { search: RootSearch; meta: { explicit?: object } })(search, true);
	if (result.lang !== undefined || (meta.explicit && 'lang' in meta.explicit)) return result;
	return { ...result, lang: search.lang === DEFAULT_LANG ? undefined : search.lang };
};

export function useLang(): LangCode {
	const search = useSearch({ strict: false }) as RootSearch;
	return search.lang ?? DEFAULT_LANG;
}

export function useT(): Translations {
	return t(useLang());
}

export function useSetLang(): (lang: LangCode) => void {
	const navigate = useNavigate();
	return useCallback(
		(lang: LangCode) => {
			try {
				localStorage.setItem(LANG_STORAGE_KEY, lang);
			} catch {
				// Storage can be unavailable (private mode); the URL still carries the choice.
			}
			void navigate({
				to: '.',
				search: (prev: RootSearch): RootSearch => ({ ...prev, lang: lang === DEFAULT_LANG ? undefined : lang }),
				replace: true,
				resetScroll: false,
			});
		},
		[navigate],
	);
}
