import { DEFAULT_LANG, appBySlug, langRedirectScript, t, validateRootSearch } from '@awesome-nsgo/catalog';
import { HeadContent, Link, Outlet, Scripts, createRootRoute, redirect } from '@tanstack/react-router';
import { type ReactNode, Suspense, lazy, useEffect } from 'react';
import { Background } from '../components/Background';
import { BackToTop, Footer, Toast } from '../components/Chrome';
import { CommandPalette } from '../components/CommandPalette';
import { Header } from '../components/Header';
import { SubmitModal } from '../components/SubmitModal';
import { retainLang, useLang, useT } from '../lib/lang';
import { useReveal, useScrolledPast } from '../lib/motion';
import { usePageView } from '../lib/pageviews';
import { SITE_NAME, ogLocaleAlternates } from '../lib/seo';
import { SiteProvider, useSite } from '../lib/site';
import { type Theme, readTheme } from '../lib/theme';
import { SubmitTools, readOriginTrial } from '../lib/webmcp';
import retroStyles from '../retro/retro.css?url';
import styles from '../styles.css?url';

// The retro look's components load only for visitors who picked it.
const RetroApp = lazy(() => import('../retro/RetroApp'));

const LANG_REDIRECT = langRedirectScript();

export const Route = createRootRoute({
	validateSearch: validateRootSearch,
	search: { middlewares: [retainLang] },
	// ?app=<slug> on any page is the retro look's quick-view window, which only client-side navigation opens; the original look opens apps on their own page. A request for such a URL (an old shared link or the former sitemap entry) gets a permanent redirect to the app's own page, keeping the language, so the old URLs consolidate there. import.meta.env.SSR is a build-time constant, so the client bundle drops the check and the quick view keeps working.
	beforeLoad: ({ search }): { theme: Theme } => {
		if (import.meta.env.SSR && search.app && appBySlug(search.app)) throw redirect({ to: '/apps/$slug', params: { slug: search.app }, search: { lang: search.lang === DEFAULT_LANG ? undefined : search.lang }, statusCode: 301 });
		return { theme: readTheme() };
	},
	head: ({ match }) => {
		const retro = match.context.theme === 'retro';
		const originTrial = readOriginTrial();
		return {
		meta: [
			{ charSet: 'utf-8' },
			// The original look draws to the screen's edges (viewport-fit=cover), so the safe-area insets its fixed buttons, toast and dialogs pad by are real on iPhones; its root pads the page by the side insets, keeping content out from under a landscape notch. The retro look keeps the default.
			{ name: 'viewport', content: retro ? 'width=device-width, initial-scale=1' : 'width=device-width, initial-scale=1, viewport-fit=cover' },
			// The original look is light or dark by the system setting, so the browser's own chrome follows it too; the retro look is light only.
			...(retro
				? [{ name: 'theme-color', content: '#00a6d4' }, { name: 'color-scheme', content: 'light' }]
				: [
						{ name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#ffffff' },
						{ name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#0b0c0f' },
						{ name: 'color-scheme', content: 'light dark' },
					]),
			...(originTrial ? [{ httpEquiv: 'origin-trial', content: originTrial }] : []),
			// A path no route matches (or a notFound() a route throws) is handled here, the only route with a notFoundComponent; no page head runs then, so the 404 gets its title and noindex from the root. Matched pages set their own through pageHead.
			...(match._notFound ? [{ title: `${t(match.search.lang ?? DEFAULT_LANG).nf_h} · ${SITE_NAME}` }, { name: 'robots', content: 'noindex' }] : []),
		],
		// The site mark for both looks: the SVG for browsers that take it, the ICO and the PNG for the rest.
		links: [
			{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
			{ rel: 'icon', href: '/favicon.ico', sizes: 'any' },
			{ rel: 'icon', type: 'image/png', sizes: '32x32', href: '/mark-32.png' },
			{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
			{ rel: 'manifest', href: '/site.webmanifest' },
			// Each look loads only its own stylesheet. The original stylesheet is preloaded and applied by the inline loader below so it does not block first paint; it uses the system's fonts, so nothing else is fetched.
			...(retro ? [{ rel: 'stylesheet', href: retroStyles }] : [{ rel: 'preload', as: 'style', href: styles }]),
		],
		};
	},
	component: RootComponent,
	notFoundComponent: NotFound,
});

function RootComponent() {
	const { theme } = Route.useRouteContext();
	usePageView();
	return (
		<RootDocument theme={theme}>
			<SiteProvider quickView={theme === 'retro'}>
				<SubmitTools />
				{theme === 'retro' ? (
					<Suspense>
						<RetroApp />
					</Suspense>
				) : (
					<Shell />
				)}
			</SiteProvider>
		</RootDocument>
	);
}

// Applies a preloaded stylesheet from an inline script in <head>. A stylesheet inserted by script does not block the first paint; the preload in the route head starts the download as early as a normal link.
const styleLoader = (href: string) => `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(href)};l.media='print';l.onload=function(){l.media='all'};document.head.appendChild(l)})()`;

function RootDocument({ theme, children }: { theme: Theme; children: ReactNode }) {
	const lang = useLang();

	return (
		<html lang={lang} data-theme={theme}>
			<head>
				{/* A bare URL is Simplified Chinese. A first visit with a saved choice or another browser language goes to its ?lang= page before anything renders, so the server serves that language and React never switches it mid-hydration. */}
				<script dangerouslySetInnerHTML={{ __html: LANG_REDIRECT }} />
				<HeadContent />
				{theme !== 'retro' && <script dangerouslySetInnerHTML={{ __html: styleLoader(styles) }} />}
				{ogLocaleAlternates(lang).map((locale) => (
					<meta key={locale} property='og:locale:alternate' content={locale} />
				))}
				<noscript>
					<style>{'.rv{opacity:1;transform:none}'}</style>
					{theme !== 'retro' && <link rel='stylesheet' href={styles} />}
				</noscript>
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}

function Shell() {
	const scrolled = useScrolledPast(600);
	const site = useSite();
	useReveal();

	// Escape closes the topmost overlay.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== 'Escape') return;
			if (site.palette) site.closePalette();
			else if (site.modal) site.closeSubmit();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [site]);

	return (
		<div className='site relative isolate flex min-h-screen flex-col bg-bg pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]'>
			<Background />
			<Header scrolled={scrolled} />
			<main className='relative z-1 w-full flex-auto'>
				<Outlet />
			</main>
			<Footer />
			<BackToTop show={scrolled} />
			<CommandPalette />
			<SubmitModal />
			<Toast />
		</div>
	);
}

function NotFound() {
	const t = useT();
	return (
		<section className='page enter min-h-[40vh] gap-5'>
			<span className='kicker'>404</span>
			<h1 className='page-h1'>{t.nf_h}</h1>
			<p className='page-p'>{t.nf_p}</p>
			<Link to='/' className='btn-c btn-44 self-start'>
				{t.a_home}
			</Link>
		</section>
	);
}
