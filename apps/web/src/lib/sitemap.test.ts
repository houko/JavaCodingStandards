import { GAMES, LANGS, LAST_UPDATED, SITE_URL } from '@vibe-arcade/catalog';
import { describe, expect, it } from 'vitest';
import { sitemapXml } from './sitemap';

const xml = sitemapXml();
const count = (needle: string) => xml.split(needle).length - 1;

describe('sitemapXml', () => {
	it('has one url per page and language', () => {
		expect(count('<url>')).toBe((GAMES.length + 1) * LANGS.length);
		expect(count('</url>')).toBe(count('<url>'));
	});

	it('lists the home page and every game in every language', () => {
		expect(xml).toContain(`<loc>${SITE_URL}/</loc>`);
		for (const lang of LANGS.filter((l) => l !== 'en')) expect(xml).toContain(`<loc>${SITE_URL}/?lang=${lang}</loc>`);
		for (const g of GAMES) {
			expect(xml).toContain(`<loc>${SITE_URL}/games/${g.slug}</loc>`);
			expect(xml).toContain(`<loc>${SITE_URL}/games/${g.slug}?lang=ru</loc>`);
		}
	});

	it('gives every url its ten alternates and x-default', () => {
		expect(count('<xhtml:link rel="alternate"')).toBe(count('<url>') * (LANGS.length + 1));
		expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/games/saltline"/>`);
		expect(xml).toContain(`<xhtml:link rel="alternate" hreflang="pt-BR" href="${SITE_URL}/games/saltline?lang=pt-BR"/>`);
	});

	it('dates the home page by the last change to the data and a game by its post', () => {
		const saltline = GAMES.find((g) => g.slug === 'saltline');
		expect(xml).toContain(`<loc>${SITE_URL}/</loc>\n\t\t<lastmod>${LAST_UPDATED}</lastmod>`);
		expect(xml).toContain(`<loc>${SITE_URL}/games/saltline</loc>\n\t\t<lastmod>${saltline?.postedAt.slice(0, 10)}</lastmod>`);
		expect(count('<lastmod>')).toBe(count('<url>'));
	});

	it('attaches each game cover and is well-formed at its edges', () => {
		expect(count('<image:loc>')).toBe(GAMES.length * LANGS.length);
		expect(xml).toContain(`<image:loc>${SITE_URL}/covers/saltline.webp</image:loc>`);
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset ')).toBe(true);
		expect(xml.endsWith('</urlset>\n')).toBe(true);
		expect(xml).not.toMatch(/&(?!amp;)/);
	});
});
