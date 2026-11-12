import { APPS, type App, type AppPlatform, hostOf, pad2 } from '@awesome-nsgo/catalog';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { SiteMark } from './marks';

export interface AppView {
	app: App;
	index: number;
	num: string;
	host: string;
	initial: string;
	// Tile colour cycles through three styles by listing position.
	tone: 0 | 1 | 2;
}

export function appView(app: App): AppView {
	const index = APPS.indexOf(app);
	return { app, index, num: pad2(index + 1), host: hostOf(app.url), initial: app.name.charAt(0).toUpperCase(), tone: (index % 3) as 0 | 1 | 2 };
}

// The app's official icon; the letter tile stays as the fallback for an app without one. The 96 px icon heads an app's page, above the fold, so it loads at once and ahead of other images; every smaller one waits until it nears the screen.
export function MonoTile({ view, size }: { view: AppView; size: 44 | 52 | 56 | 96 }) {
	if (view.app.icon) return <img className={`mono-tile app-icon mono-${size}`} src={view.app.icon} alt='' width={size} height={size} loading={size === 96 ? 'eager' : 'lazy'} fetchPriority={size === 96 ? 'high' : undefined} decoding='async' />;
	return (
		<span className={`mono-tile mono-${size} tone-${view.tone}`} aria-hidden='true'>
			{view.initial}
		</span>
	);
}

// A link to the app's own page, so crawlers and new tabs reach it. In the retro look, with `quick` (the default), a plain left click opens the app's quick-view window instead; a click with a modifier key, a middle click, or a click before the page hydrates follows the link. The original look always follows it.
export function AppLink({ slug, className, quick = true, tabIndex, hidden, dialog, children }: { slug: string; className: string; quick?: boolean; tabIndex?: number; hidden?: boolean; dialog?: boolean; children: ReactNode }) {
	const { openApp, quickView } = useSite();
	const intercept = quick && quickView;
	return (
		<Link
			to='/apps/$slug'
			params={{ slug }}
			className={className}
			tabIndex={tabIndex}
			aria-hidden={hidden || undefined}
			aria-haspopup={dialog && quickView ? 'dialog' : undefined}
			onClick={
				intercept
					? (e) => {
							if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
							e.preventDefault();
							openApp(slug);
						}
					: undefined
			}
		>
			{children}
		</Link>
	);
}

export function KindTag({ app, label }: { app: App; label: string }) {
	return (
		<span className={`kind-tag kind-${app.kind}`}>
			{label}
		</span>
	);
}

// A platform's tag as short as it can be: the platform's own name, Windows cut to Win; mini programs have no short name, so they take the label in the visitor's language. `data-p` names the platform for the stylesheet, which draws its device glyph before the name in the original look (styles/primitives.css); the retro look draws none.
const PLATFORM_SHORT: Record<Exclude<AppPlatform, 'miniprogram'>, string> = { mac: 'macOS', win: 'Win', linux: 'Linux', ios: 'iOS', android: 'Android', web: 'Web' };

export function PlatformTags({ app }: { app: App }) {
	const t = useT();
	return <span className='flex flex-wrap items-center gap-1' aria-label={t.f_platform}>{app.platforms.map((p) => <span key={p} className='platform-tag' data-p={p} title={t[`platform_${p}`]}>{p === 'miniprogram' ? t.platform_miniprogram : PLATFORM_SHORT[p]}</span>)}</span>;
}

// The site's mark at its header size: an inline SVG (components/marks.tsx), so it costs no request and stays sharp at any density.
export function Logo() {
	return <SiteMark size={28} />;
}

export function SearchIcon({ size = 16, stroke = 'currentColor' }: { size?: number; stroke?: string }) {
	return (
		<svg aria-hidden='true' width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={stroke} strokeWidth='2' strokeLinecap='round'>
			<circle cx='11' cy='11' r='7' />
			<path d='M20 20l-3.5-3.5' />
		</svg>
	);
}

// The GitHub mark, in the current text colour.
export function GitHubMark({ size = 16 }: { size?: number }) {
	return (
		<svg aria-hidden='true' width={size} height={size} viewBox='0 0 16 16' fill='currentColor'>
			<path d='M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z' />
		</svg>
	);
}

export function CloseIcon({ size = 16 }: { size?: number }) {
	return (
		<svg aria-hidden='true' width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
			<path d='M6 6l12 12M18 6L6 18' />
		</svg>
	);
}
