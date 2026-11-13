import { GAMES, LANGS, SITE_URL } from '@vibe-arcade/catalog';
import { describe, expect, it } from 'vitest';
import { OG_LOCALE, gameHead, homeHead, ogLocaleAlternates, pagePath, pageUrl } from './seo';

type Meta = Record<string, unknown>;
const metaOf = (head: { meta: unknown[] }, key: 'name' | 'property', value: string) => (head.meta as Meta[]).find((m) => m[key] === value)?.content;
const titleOf = (head: { meta: unknown[] }) => (head.meta as Meta[]).find((m) => 'title' in m)?.title;
const ldOf = (head: { meta: unknown[] }) => (head.meta as Meta[]).filter((m) => 'script:ld+json' in m).map((m) => m['script:ld+json'] as Record<string, unknown>);

describe('pageUrl', () => {
	it('puts English at the bare path and other languages behind ?lang=', () => {
		expect(pageUrl('/', 'en')).toBe(`${SITE_URL}/`);
		expect(pageUrl('/', 'ja')).toBe(`${SITE_URL}/?lang=ja`);
		expect(pageUrl('/games/saltline', 'pt-BR')).toBe(`${SITE_URL}/games/saltline?lang=pt-BR`);
		expect(pagePath('/games/saltline', 'en')).toBe('/games/saltline');
	});
});

describe('homeHead', () => {
	it('builds the English head', () => {
		const head = homeHead(undefined);
		expect(titleOf(head)).toBe('Vibe Arcade — games vibe-coded with AI');
		expect(metaOf(head, 'name', 'description')).toMatch(/^A curated index of games/);
		expect(metaOf(head, 'property', 'og:url')).toBe(`${SITE_URL}/`);
		expect(metaOf(head, 'property', 'og:locale')).toBe('en_US');
		expect(metaOf(head, 'property', 'og:image')).toBe(`${SITE_URL}/og-site-v2-1200x630.png`);
		expect(metaOf(head, 'name', 'twitter:card')).toBe('summary_large_image');
		expect(metaOf(head, 'name', 'twitter:image')).toBe(`${SITE_URL}/og-site-v2-1200x630.png`);
		expect(head.links[0]).toEqual({ rel: 'canonical', href: `${SITE_URL}/` });
	});

	it('builds the Japanese head with its own canonical and locale', () => {
		const head = homeHead('ja');
		expect(titleOf(head)).not.toBe(titleOf(homeHead('en')));
		expect(metaOf(head, 'property', 'og:locale')).toBe('ja_JP');
		expect(head.links[0]).toEqual({ rel: 'canonical', href: `${SITE_URL}/?lang=ja` });
	});

	it('lists an alternate for each of the ten languages and x-default', () => {
		const alternates = homeHead('de').links.filter((l) => l.rel === 'alternate') as { hrefLang: string; href: string }[];
		expect(alternates.map((l) => l.hrefLang)).toEqual([...LANGS, 'x-default']);
		expect(alternates.find((l) => l.hrefLang === 'x-default')?.href).toBe(`${SITE_URL}/`);
		expect(alternates.find((l) => l.hrefLang === 'zh-TW')?.href).toBe(`${SITE_URL}/?lang=zh-TW`);
	});

	it('describes the site and lists every game in JSON-LD', () => {
		const [site, list] = ldOf(homeHead('ko'));
		expect(site).toMatchObject({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Vibe Arcade', url: `${SITE_URL}/`, inLanguage: 'ko' });
		expect(list).toMatchObject({ '@type': 'ItemList', numberOfItems: GAMES.length });
		const items = list.itemListElement as { position: number; url: string }[];
		expect(items).toHaveLength(GAMES.length);
		expect(items[0]).toMatchObject({ position: 1, url: `${SITE_URL}/games/${GAMES[0].slug}?lang=ko` });
	});
});

const FEATURED = GAMES.find((g) => g.slug === 'saltline')!;

describe('the site in JSON-LD', () => {
	it('names its publisher and how to search it, in the page language', () => {
		const [site] = ldOf(homeHead('en'));
		expect(site.publisher).toEqual({ '@type': 'Organization', name: 'Wiz Games', url: 'https://wiz.games' });
		expect((site.potentialAction as { target: { urlTemplate: string } }).target.urlTemplate).toBe(`${SITE_URL}/?q={search_term_string}`);
		const [ja] = ldOf(homeHead('ja'));
		expect((ja.potentialAction as { target: { urlTemplate: string } }).target.urlTemplate).toBe(`${SITE_URL}/?lang=ja&q={search_term_string}`);
	});

	it('credits the curator on X in every share', () => {
		expect(metaOf(homeHead('en'), 'name', 'twitter:site')).toBe('@suzukaze_haduki');
		expect(metaOf(gameHead(FEATURED, 'de'), 'name', 'twitter:site')).toBe('@suzukaze_haduki');
	});
});

describe('gameHead', () => {
	it('builds a game page head in English', () => {
		const head = gameHead(FEATURED, 'en');
		expect(titleOf(head)).toBe('Saltline by @felixrieseberg — Vibe Arcade');
		expect(metaOf(head, 'name', 'description')).toBe(`${FEATURED.summary.en} Built with ${FEATURED.model}. Shooter.`);
		expect(metaOf(head, 'property', 'og:image')).toBe(`${SITE_URL}/og/v2/saltline.png`);
		expect(metaOf(head, 'property', 'og:url')).toBe(`${SITE_URL}/games/saltline`);
		expect(head.links[0]).toEqual({ rel: 'canonical', href: `${SITE_URL}/games/saltline` });
		expect(head.links.filter((l) => l.rel === 'alternate')).toHaveLength(LANGS.length + 1);
	});

	it('builds the same page in Simplified Chinese', () => {
		const head = gameHead(FEATURED, 'zh-CN');
		expect(metaOf(head, 'name', 'description')).toContain(FEATURED.summary['zh-CN']);
		expect(metaOf(head, 'property', 'og:locale')).toBe('zh_CN');
		expect(head.links[0]).toEqual({ rel: 'canonical', href: `${SITE_URL}/games/saltline?lang=zh-CN` });
	});

	it('describes the game and its breadcrumb trail in JSON-LD', () => {
		const [game, crumbs] = ldOf(gameHead(FEATURED, 'fr'));
		expect(game).toMatchObject({
			'@type': 'VideoGame',
			name: 'Saltline',
			url: `${SITE_URL}/games/saltline?lang=fr`,
			image: `${SITE_URL}/covers/saltline.webp`,
			datePublished: FEATURED.postedAt,
			author: { '@type': 'Person', name: '@felixrieseberg', url: 'https://x.com/felixrieseberg' },
			sameAs: [FEATURED.link.url, FEATURED.postUrl],
		});
		expect(crumbs['@type']).toBe('BreadcrumbList');
		expect((crumbs.itemListElement as { item: string }[]).map((c) => c.item)).toEqual([`${SITE_URL}/?lang=fr`, `${SITE_URL}/games/saltline?lang=fr`]);
	});

	it('offers the clip of a game that has one, and none otherwise', () => {
		const head = gameHead(FEATURED, 'en');
		expect(metaOf(head, 'property', 'og:video')).toBe(`${SITE_URL}/videos/saltline.mp4`);
		expect(metaOf(head, 'property', 'og:video:type')).toBe('video/mp4');
		expect(ldOf(head)[0].trailer).toMatchObject({ '@type': 'VideoObject', contentUrl: `${SITE_URL}/videos/saltline.mp4`, thumbnailUrl: `${SITE_URL}/covers/saltline.webp`, uploadDate: FEATURED.postedAt });
		expect((ldOf(head)[0].author as { image?: string }).image).toBe(`${SITE_URL}/avatars/felixrieseberg.webp`);
		const still = GAMES.find((g) => !g.video);
		if (!still) return;
		expect(metaOf(gameHead(still, 'en'), 'property', 'og:video')).toBeUndefined();
		expect(ldOf(gameHead(still, 'en'))[0].trailer).toBeUndefined();
	});

	it('names a watch-only game once in sameAs, as its link is its post', () => {
		const watch = GAMES.find((g) => g.link.url === g.postUrl);
		if (!watch) return;
		const [game] = ldOf(gameHead(watch, 'en'));
		expect(game.sameAs).toEqual([watch.postUrl]);
	});
});

describe('OG locales', () => {
	it('has one per language, and the alternates leave out the page own', () => {
		expect(Object.keys(OG_LOCALE).sort()).toEqual([...LANGS].sort());
		expect(ogLocaleAlternates('ja')).toHaveLength(LANGS.length - 1);
		expect(ogLocaleAlternates('ja')).not.toContain('ja_JP');
	});
});
