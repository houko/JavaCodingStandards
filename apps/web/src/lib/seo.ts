import { CURATOR_HANDLE, DEFAULT_LANG, GAMES, GENRE_KEYS, type Game, LANGS, type LangCode, MAKER_NAME, MAKER_URL, SITE_NAME, SITE_URL, creatorByHandle, fill, pick, t } from '@vibe-arcade/catalog';
import type { MetaDescriptor } from '@tanstack/react-router';
import type { JSX } from 'react';
import { SITE_CARD_PATH, gameCardPath } from '../../og/paths';

export const OG_LOCALE: Record<LangCode, string> = { en: 'en_US', 'zh-CN': 'zh_CN', 'zh-TW': 'zh_TW', ja: 'ja_JP', ko: 'ko_KR', es: 'es_ES', fr: 'fr_FR', de: 'de_DE', 'pt-BR': 'pt_BR', ru: 'ru_RU' };

// The site as every page's JSON-LD names it. Google resolves an @id only within one page, so a game's page embeds this node in isPartOf instead of pointing at the home page's.
const WEBSITE = { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url: `${SITE_URL}/` };

export type GamePath = `/games/${string}`;
export const gamePath = (slug: string): GamePath => `/games/${slug}`;

// The path and query of a page in a language: English lives at the bare path, the other languages at ?lang=…. Any other query (the home page's filters, its ?game= dialog, utm tags) is left out, so every view of the home page shares one canonical URL and a game's canonical page is its /games/<slug> page.
export function pagePath(path: '/' | GamePath, lang: LangCode): string {
	return `${path}${lang !== DEFAULT_LANG ? `?lang=${lang}` : ''}`;
}

export function pageUrl(path: '/' | GamePath, lang: LangCode): string {
	return `${SITE_URL}${pagePath(path, lang)}`;
}

// The og:locale values of the page's other languages. TanStack keeps one meta per property, so these repeated tags are rendered by the root document rather than through a route head.
export const ogLocaleAlternates = (lang: LangCode): string[] => LANGS.filter((l) => l !== lang).map((l) => OG_LOCALE[l]);

// TanStack renders { 'script:ld+json': data } as an escaped <script type="application/ld+json">. The payload is typed with router-core's MetaDescriptor, which lists that form, but react-router types a route head's meta as plain <meta> props, hence the cast.
type LdJson = Extract<MetaDescriptor, { 'script:ld+json': unknown }>['script:ld+json'];
const ldJson = (data: LdJson) => ({ 'script:ld+json': { '@context': 'https://schema.org', ...data } }) as unknown as JSX.IntrinsicElements['meta'];

interface HeadTags {
	lang: LangCode;
	path: '/' | GamePath;
	title: string;
	desc: string;
	// The path of a 1200×630 PNG on the site.
	image: string;
	// Localized, for og:image:alt and twitter:image:alt.
	imageAlt: string;
	// The path of the page's clip, a 640×400 MP4, for the platforms that play one in a share.
	video?: string;
	jsonLd: LdJson[];
}

// The size and length scripts/fetch-media.ts cuts a game's clip to.
const CLIP = { width: 640, height: 400, duration: 'PT6S' };

function headTags(h: HeadTags) {
	const url = pageUrl(h.path, h.lang);
	const image = `${SITE_URL}${h.image}`;
	return {
		meta: [
			{ title: h.title },
			{ name: 'description', content: h.desc },
			{ name: 'robots', content: 'index, follow, max-image-preview:large' },
			{ property: 'og:type', content: 'website' },
			{ property: 'og:site_name', content: SITE_NAME },
			{ property: 'og:title', content: h.title },
			{ property: 'og:description', content: h.desc },
			{ property: 'og:url', content: url },
			{ property: 'og:locale', content: OG_LOCALE[h.lang] },
			{ property: 'og:image', content: image },
			{ property: 'og:image:type', content: 'image/png' },
			{ property: 'og:image:width', content: '1200' },
			{ property: 'og:image:height', content: '630' },
			{ property: 'og:image:alt', content: h.imageAlt },
			...(h.video === undefined
				? []
				: [
						{ property: 'og:video', content: `${SITE_URL}${h.video}` },
						{ property: 'og:video:type', content: 'video/mp4' },
						{ property: 'og:video:width', content: String(CLIP.width) },
						{ property: 'og:video:height', content: String(CLIP.height) },
					]),
			{ name: 'twitter:card', content: 'summary_large_image' },
			{ name: 'twitter:site', content: `@${CURATOR_HANDLE}` },
			{ name: 'twitter:title', content: h.title },
			{ name: 'twitter:description', content: h.desc },
			{ name: 'twitter:image', content: image },
			{ name: 'twitter:image:alt', content: h.imageAlt },
			...h.jsonLd.map(ldJson),
		],
		links: [
			{ rel: 'canonical', href: url },
			...LANGS.map((l) => ({ rel: 'alternate', hrefLang: l, href: pageUrl(h.path, l) })),
			{ rel: 'alternate', hrefLang: 'x-default', href: pageUrl(h.path, DEFAULT_LANG) },
		],
	};
}

// The home page's head: the site itself, with who publishes it and how to search it (the ?q= filter), and the list of every game, each pointing at its own page, which carries the game's full data.
export function homeHead(langParam: LangCode | undefined) {
	const lang = langParam ?? DEFAULT_LANG;
	const tr = t(lang);
	const jsonLd: LdJson[] = [
		{
			...WEBSITE,
			inLanguage: lang,
			description: tr.siteDescription,
			publisher: { '@type': 'Organization', name: MAKER_NAME, url: MAKER_URL },
			potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${pageUrl('/', lang)}${lang === DEFAULT_LANG ? '?' : '&'}q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
		},
		{ '@type': 'ItemList', name: tr.allH, numberOfItems: GAMES.length, itemListElement: GAMES.map((g, i) => ({ '@type': 'ListItem', position: i + 1, name: g.name, url: pageUrl(gamePath(g.slug), lang) })) },
	];
	return headTags({ lang, path: '/', title: tr.siteTitle, desc: tr.siteDescription, image: SITE_CARD_PATH, imageAlt: tr.ogAlt, jsonLd });
}

// The head of a game's own page.
export function gameHead(game: Game, langParam: LangCode | undefined) {
	const lang = langParam ?? DEFAULT_LANG;
	const tr = t(lang);
	const path = gamePath(game.slug);
	const url = pageUrl(path, lang);
	const summary = pick(game.summary, lang);
	const genre = tr[GENRE_KEYS[game.genre]];
	const title = fill(tr.gameTitle, { name: game.name, creator: game.creator });
	const desc = fill(tr.gameDescription, { summary, model: game.model, genre });
	const avatar = creatorByHandle(game.creator)?.avatar;
	const jsonLd: LdJson[] = [
		{
			'@type': 'VideoGame',
			name: game.name,
			url,
			description: summary,
			image: `${SITE_URL}${game.cover}`,
			genre,
			inLanguage: lang,
			gamePlatform: 'Web browser',
			applicationCategory: 'Game',
			operatingSystem: 'Any',
			datePublished: game.postedAt,
			author: { '@type': 'Person', name: `@${game.creator}`, url: game.creatorUrl, ...(avatar && { image: `${SITE_URL}${avatar}` }) },
			// The clip cut from the creator's post, dated as the post is.
			...(game.video && { trailer: { '@type': 'VideoObject', name: game.name, description: summary, thumbnailUrl: `${SITE_URL}${game.cover}`, contentUrl: `${SITE_URL}${game.video}`, uploadDate: game.postedAt, duration: CLIP.duration, width: CLIP.width, height: CLIP.height } }),
			sameAs: [...new Set([game.link.url, game.postUrl])],
			interactionStatistic: { '@type': 'InteractionCounter', interactionType: { '@type': 'LikeAction' }, userInteractionCount: game.likes },
			isPartOf: WEBSITE,
		},
		{
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: tr.allH, item: pageUrl('/', lang) },
				{ '@type': 'ListItem', position: 2, name: game.name, item: url },
			],
		},
	];
	return headTags({ lang, path, title, desc, image: gameCardPath(game.slug), imageAlt: `${game.name} — ${tr.coverAlt}`, video: game.video, jsonLd });
}
