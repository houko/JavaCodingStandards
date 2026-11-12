import { type App, APPS, DEFAULT_LANG, LANGS, type LangCode, SITE_URL, type StringKey, appDescription, appSource, authorProfile, pick, t } from '@awesome-nsgo/catalog';
import type { MetaDescriptor } from '@tanstack/react-router';
import type { JSX } from 'react';

export const SITE_NAME = 'Awesome NSGo';
const OG_IMAGE = `${SITE_URL}/og-site-v2-1200x630.png`;
const OG_LOCALE: Record<LangCode, string> = { 'zh-CN': 'zh_CN', 'zh-TW': 'zh_TW', en: 'en_US', ja: 'ja_JP', ko: 'ko_KR' };
// The site as every page's JSON-LD names it. Google resolves an @id only within one page, so the other pages embed this node in isPartOf instead of pointing at the home page's. There is no publisher Organization: the owner, yldm-tech, has no site or logo of its own to describe it with, and the Awesome NSGo mark belongs to the site, not to an organization.
const WEBSITE = { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url: `${SITE_URL}/` };

export type SitePath = '/' | '/ui' | '/state' | '/templates' | '/ai' | '/plugins' | '/showcase' | '/learn';
export const SITE_PATHS: readonly SitePath[] = ['/', '/ui', '/state', '/templates', '/ai', '/plugins', '/showcase', '/learn'];

// Each page's <meta name="keywords">: the phrasings people search for Go cross-platform and native UI development in the page's language (golang gui 框架, golang gui framework, go gui アプリ, golang gui 추천…). Google ignores the tag; Baidu and Bing still read it a little. NSGo always comes with Go or Golang, as the name alone is a new word few search for yet and matches unrelated projects.
const PAGE_KEYWORDS: Record<SitePath, StringKey> = { '/': 'kw_home', '/ui': 'kw_ui', '/state': 'kw_state', '/templates': 'kw_templates', '/ai': 'kw_ai', '/plugins': 'kw_plugins', '/showcase': 'kw_showcase', '/learn': 'kw_learn' };

// An app's own page.
export type AppPath = `/apps/${string}`;
export const appPath = (slug: string): AppPath => `/apps/${slug}`;

// An app's share card, a 1200×630 PNG built with the site (apps/web/og). Under /og/v3/ since the cards took on the home page's decoration: /og/* is cached for a year (public/_headers), so the cards at an old path would keep their old look; the next change to the cards' look moves them to v4.
export const appCardPath = (slug: string) => `/og/v3/${slug}.png`;

// The Markdown of the README badge an app's author can add: the badge (/badge.svg, built with the site in apps/web/og) linking to the app's page here. Readers of the project's README find the showcase from it; GitHub marks README links nofollow, so it is a way in for people rather than for search ranking.
export const appBadgeMarkdown = (slug: string) => `[![Listed on Awesome NSGo](${SITE_URL}/badge.svg)](${SITE_URL}${appPath(slug)})`;

// Simplified Chinese lives at the bare path, other languages at ?lang=…. Any other query (?app= for the retro look's quick-view window, utm tags…) is left out of canonical URLs: an app's canonical page is its /apps/<slug> page.
export function pageUrl(path: SitePath | AppPath, lang: LangCode): string {
	return `${SITE_URL}${path}${lang !== DEFAULT_LANG ? `?lang=${lang}` : ''}`;
}

// The og:locale values of the page's other languages. TanStack keeps one meta per property, so these repeated tags are rendered by the root document rather than through a route head.
export const ogLocaleAlternates = (lang: LangCode): string[] => LANGS.filter((l) => l.code !== lang).map((l) => OG_LOCALE[l.code]);

// TanStack renders { 'script:ld+json': data } as an escaped <script type="application/ld+json">. The payload is typed with router-core's MetaDescriptor, which lists that form, but react-router types a route head's meta as plain <meta> props (RouteMatchExtensions in Matches.tsx), hence the cast.
type LdJson = Extract<MetaDescriptor, { 'script:ld+json': unknown }>['script:ld+json'];
const ldJson = (data: LdJson) => ({ 'script:ld+json': { '@context': 'https://schema.org', ...data } }) as unknown as JSX.IntrinsicElements['meta'];

const breadcrumbs = (crumbs: { name: string; item: string }[]): LdJson => ({ '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, ...c })) });

// A screenshot as a share image; SVG is left out, as share cards and image search do not take it.
export const rasterShot = (app: App): string | undefined => (app.image && !app.image.endsWith('.svg') ? `${SITE_URL}${app.image}` : undefined);

interface PageSeo {
	lang: LangCode | undefined;
	path: SitePath;
	// The topic of the <title>, which is followed by the site name; null for the home page, whose whole title is title_home.
	title: StringKey | null;
	desc: StringKey;
	// The page's visible heading, which names it in the breadcrumb trail.
	name: StringKey;
}

export function pageHead(p: PageSeo) {
	const lang = p.lang ?? DEFAULT_LANG;
	const tr = t(lang);
	const url = pageUrl(p.path, lang);
	const title = p.title ? `${tr[p.title]} · ${SITE_NAME}` : tr.title_home;
	const desc = tr[p.desc];

	const jsonLd: LdJson[] = [];
	if (p.path === '/') {
		jsonLd.push({ ...WEBSITE, inLanguage: lang, description: desc });
	} else {
		// Every section page is a curated collection one level under home.
		const collection: LdJson = { '@type': 'CollectionPage', url, name: title, description: desc, inLanguage: lang, isPartOf: WEBSITE };
		// The showcase's list only points at each app's own page, which carries the app's full SoftwareApplication data.
		if (p.path === '/showcase') collection.mainEntity = { '@type': 'ItemList', itemListElement: APPS.map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: pageUrl(appPath(a.slug), lang) })) };
		jsonLd.push(
			collection,
			breadcrumbs([
				{ name: tr.nav_home, item: pageUrl('/', lang) },
				{ name: tr[p.name], item: url },
			]),
		);
	}

	return headTags({ lang, path: p.path, title, desc, keywords: tr[PAGE_KEYWORDS[p.path]], imageAlt: tr.og_alt, jsonLd });
}

// The head of an app's own page. The title stays short: the name and a localized descriptor, as an app's name says little alone. The description is the app's one-line summary followed by its author and the Go and NSGo context (appDescription).
export function appHead(app: App, langParam: LangCode | undefined) {
	const lang = langParam ?? DEFAULT_LANG;
	const tr = t(lang);
	const path = appPath(app.slug);
	const url = pageUrl(path, lang);
	const title = `${app.name} — ${tr.app_kind} · ${SITE_NAME}`;
	const desc = appDescription(app, lang);
	const shot = rasterShot(app);
	const profile = authorProfile(app.author);

	const software = {
		'@type': 'SoftwareApplication',
		name: app.name,
		url,
		sameAs: [app.url, appSource(app)].filter((u): u is string => u !== undefined),
		description: pick(app.desc, lang),
		...(app.category ? { applicationCategory: app.category } : {}),
		author: { '@type': 'Person', name: app.author, ...(profile ? { url: profile } : {}) },
		...(shot ? { screenshot: shot } : {}),
	};
	const jsonLd = [
		{ '@type': 'ItemPage', url, name: title, inLanguage: lang, isPartOf: WEBSITE, mainEntity: software },
		breadcrumbs([
			{ name: tr.nav_home, item: pageUrl('/', lang) },
			{ name: tr.cat_show_name, item: pageUrl('/showcase', lang) },
			{ name: app.name, item: url },
		]),
	];

	return headTags({ lang, path, title, desc, keywords: `${app.name}, ${tr.kw_app}`, image: `${SITE_URL}${appCardPath(app.slug)}`, imageAlt: `${app.name} — ${tr.app_kind}`, jsonLd });
}

interface HeadTags {
	lang: LangCode;
	path: SitePath | AppPath;
	title: string;
	desc: string;
	keywords: string;
	// Absolute URL of a 1200×630 PNG; the site's share image when undefined.
	image?: string;
	// Localized, for og:image:alt and twitter:image:alt.
	imageAlt: string;
	jsonLd: LdJson[];
}

function headTags(h: HeadTags) {
	const url = pageUrl(h.path, h.lang);
	const image = h.image ?? OG_IMAGE;
	return {
		meta: [
			{ title: h.title },
			{ name: 'description', content: h.desc },
			{ name: 'keywords', content: h.keywords },
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
			{ name: 'twitter:card', content: 'summary_large_image' },
			{ name: 'twitter:title', content: h.title },
			{ name: 'twitter:description', content: h.desc },
			{ name: 'twitter:image', content: image },
			{ name: 'twitter:image:alt', content: h.imageAlt },
			...h.jsonLd.map(ldJson),
		],
		links: [
			{ rel: 'canonical', href: url },
			...LANGS.map((l) => ({ rel: 'alternate', hrefLang: l.code, href: pageUrl(h.path, l.code) })),
			{ rel: 'alternate', hrefLang: 'x-default', href: pageUrl(h.path, DEFAULT_LANG) },
		],
	};
}
