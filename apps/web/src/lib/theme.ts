import { createIsomorphicFn } from '@tanstack/react-start';
import { getCookie } from '@tanstack/react-start/server';

// The site has two looks over the same pages, links and copy: the original look (the default, light or dark by the system setting, and what crawlers get, since they send no cookie) and a retro desktop. The choice lives in a cookie rather than the URL, so it never splits a page into two URLs; the server reads it to render the chosen look and load only its stylesheet, so nothing flashes on load.
export const THEMES = ['original', 'retro'] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = 'original';
export const THEME_COOKIE = 'nsgo-theme';

export function isTheme(value: unknown): value is Theme {
	return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

function fromCookieHeader(header: string): string | undefined {
	for (const part of header.split(';')) {
		const [k, ...v] = part.trim().split('=');
		if (k === THEME_COOKIE) return v.join('=');
	}
	return undefined;
}

export const readTheme = createIsomorphicFn()
	.server((): Theme => {
		const v = getCookie(THEME_COOKIE);
		return isTheme(v) ? v : DEFAULT_THEME;
	})
	.client((): Theme => {
		const v = fromCookieHeader(document.cookie);
		return isTheme(v) ? v : DEFAULT_THEME;
	});

// Saves the choice for a year and reloads, so the server renders the other look with its own stylesheet instead of swapping styles under a live page.
export function switchTheme(theme: Theme): void {
	document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
	location.reload();
}
