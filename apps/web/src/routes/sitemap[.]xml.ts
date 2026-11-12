import { APPS, DEFAULT_LANG, LANGS } from '@awesome-nsgo/catalog';
import { createFileRoute } from '@tanstack/react-router';
import { type AppPath, SITE_PATHS, type SitePath, appPath, pageUrl, rasterShot } from '../lib/seo';

const esc = (s: string) => s.replace(/&/g, '&amp;');

// When a page last changed, for <lastmod>. An app page dates from when the app joined the showcase; the home page and the showcase list every app, so they change with the newest one. The other pages have no date to go by and leave lastmod out, as search engines stop trusting a site's lastmod once it is wrong.
const NEWEST_ADDED = APPS.reduce((max, a) => (a.added && a.added > max ? a.added : max), '');
const LASTMOD: Partial<Record<SitePath, string>> = NEWEST_ADDED ? { '/': NEWEST_ADDED, '/showcase': NEWEST_ADDED } : {};

// One <url> per page and language, each listing its language alternates, so search engines pair the translations, its lastmod when it has one, and an app page's screenshot. Every element sits on its own indented line so the file stays readable when opened directly.
function entry(path: SitePath | AppPath, lastmod?: string, image?: string): string {
	const alternates = [...LANGS.map((l) => `\t\t<xhtml:link rel="alternate" hreflang="${l.code}" href="${esc(pageUrl(path, l.code))}"/>`), `\t\t<xhtml:link rel="alternate" hreflang="x-default" href="${esc(pageUrl(path, DEFAULT_LANG))}"/>`].join('\n');
	const mod = lastmod ? `\n\t\t<lastmod>${lastmod}</lastmod>` : '';
	const img = image ? `\n\t\t<image:image>\n\t\t\t<image:loc>${esc(image)}</image:loc>\n\t\t</image:image>` : '';
	return LANGS.map((l) => `\t<url>\n\t\t<loc>${esc(pageUrl(path, l.code))}</loc>${mod}\n${alternates}${img}\n\t</url>`).join('\n');
}

export function sitemapXml(): string {
	const urls = [...SITE_PATHS.map((p) => entry(p, LASTMOD[p])), ...APPS.map((a) => entry(appPath(a.slug), a.added, rasterShot(a)))];
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`;
}

export const Route = createFileRoute('/sitemap.xml')({
	server: {
		handlers: {
			GET: () => new Response(sitemapXml(), { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } }),
		},
	},
});
