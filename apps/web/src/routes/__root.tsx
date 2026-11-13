import { ANALYTICS_TOKEN, DEFAULT_LANG, SITE_NAME, langRedirectScript, t, validateRootSearch } from '@vibe-arcade/catalog';
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { LogoMark } from '../components/Logo';
import { retainLang, useLang, useT } from '../lib/lang';
import { ogLocaleAlternates } from '../lib/seo';
import { BTN_LIME } from '../lib/ui';
import styles from '../styles.css?url';

const LANG_REDIRECT = langRedirectScript();

export const Route = createRootRoute({
	validateSearch: validateRootSearch,
	search: { middlewares: [retainLang] },
	head: ({ match }) => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			// The site is dark only, so the browser's own chrome is told once.
			{ name: 'theme-color', content: '#101012' },
			{ name: 'color-scheme', content: 'dark' },
			// A path no route matches, or a notFound() a route throws, is handled here, the only route with a notFoundComponent; no page head runs then, so the 404 gets its title and noindex from the root. Matched pages set their own (lib/seo.ts).
			...(match._notFound ? [{ title: `${t(match.search.lang ?? DEFAULT_LANG).notFoundTitle} — ${SITE_NAME}` }, { name: 'robots', content: 'noindex' }] : []),
		],
		links: [
			{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
			{ rel: 'icon', href: '/favicon.ico', sizes: 'any' },
			{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
			{ rel: 'manifest', href: '/site.webmanifest' },
			// The feed of new games (lib/feed.ts), for readers that look for one on the page.
			{ rel: 'alternate', type: 'application/atom+xml', title: SITE_NAME, href: '/feed.xml' },
			// The display face sets the hero's first line, so it is fetched alongside the stylesheet rather than after it. Font preloads are always fetched in CORS mode, hence crossOrigin on a same-origin file.
			{ rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/bricolage-grotesque-latin.woff2', crossOrigin: 'anonymous' },
			{ rel: 'stylesheet', href: styles },
		],
	}),
	component: RootComponent,
	notFoundComponent: NotFound,
});

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
}

function RootDocument({ children }: { children: ReactNode }) {
	const lang = useLang();
	const tr = useT();
	return (
		<html lang={lang}>
			<head>
				{/* A bare URL is English. A first visit with a saved choice or another browser language goes to its ?lang= page before anything renders, so the server serves that language and React never switches it mid-hydration. */}
				<script dangerouslySetInnerHTML={{ __html: LANG_REDIRECT }} />
				<HeadContent />
				{ogLocaleAlternates(lang).map((locale) => (
					<meta key={locale} property='og:locale:alternate' content={locale} />
				))}
			</head>
			<body>
				<a href='#main' className='sr-only rounded-lg bg-lime px-4 py-3 font-semibold text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200]'>
					{tr.skipToContent}
				</a>
				{children}
				<Scripts />
				{/* Page views for Cloudflare Web Analytics, once its token is set; the Worker gives this script the page's nonce like every other. */}
				{ANALYTICS_TOKEN && <script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon={JSON.stringify({ token: ANALYTICS_TOKEN, spa: true })} />}
			</body>
		</html>
	);
}

function NotFound() {
	const tr = useT();
	return (
		<main id='main' tabIndex={-1} className='mx-auto flex min-h-screen w-full max-w-[720px] flex-col items-start justify-center gap-5 px-4 py-16 outline-none sm:px-6'>
			<Link to='/' aria-label={SITE_NAME} className='avg-logo flex min-h-11 items-center gap-2.5 text-fg hover:text-fg'>
				<LogoMark size={44} />
				<span className='font-display text-[24px] font-extrabold tracking-[-0.02em]'>{SITE_NAME}</span>
			</Link>
			<p className='font-mono text-[13px] tracking-[0.08em] text-lime uppercase'>404</p>
			<h1 className='font-display text-[clamp(36px,7vw,64px)] leading-none font-extrabold tracking-[-0.03em]'>
				{tr.notFoundTitle}
				<span className='avg-caret text-lime' aria-hidden='true'>
					_
				</span>
			</h1>
			<p className='max-w-[520px] text-[17px] text-soft'>{tr.notFoundBody}</p>
			<Link to='/' className={`${BTN_LIME} px-5 py-3`}>
				{tr.backHome}
			</Link>
		</main>
	);
}
