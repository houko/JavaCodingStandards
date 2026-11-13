import { DEFAULT_LANG, GAMES, LANGS, LAST_UPDATED, SITE_URL } from '@vibe-arcade/catalog';
import { type GamePath, gamePath, pageUrl } from './seo';

const esc = (s: string) => s.replace(/&/g, '&amp;');

// One <url> per page and language, each listing its language alternates, so search engines pair the translations, with the day the page last changed and, for a game, its cover. Every element sits on its own indented line so the file stays readable when opened directly.
function entry(path: '/' | GamePath, lastmod: string, image?: string): string {
	const alternates = [...LANGS.map((l) => `\t\t<xhtml:link rel="alternate" hreflang="${l}" href="${esc(pageUrl(path, l))}"/>`), `\t\t<xhtml:link rel="alternate" hreflang="x-default" href="${esc(pageUrl(path, DEFAULT_LANG))}"/>`].join('\n');
	const img = image ? `\n\t\t<image:image>\n\t\t\t<image:loc>${esc(image)}</image:loc>\n\t\t</image:image>` : '';
	return LANGS.map((l) => `\t<url>\n\t\t<loc>${esc(pageUrl(path, l))}</loc>\n\t\t<lastmod>${lastmod}</lastmod>\n${alternates}${img}\n\t</url>`).join('\n');
}

// The home page changes whenever the data does, a game added or the like counts refreshed; a game's page dates from its post.
export function sitemapXml(): string {
	const urls = [entry('/', LAST_UPDATED), ...GAMES.map((g) => entry(gamePath(g.slug), g.postedAt.slice(0, 10), `${SITE_URL}${g.cover}`))];
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`;
}
