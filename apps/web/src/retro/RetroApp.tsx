import { DEFAULT_LANG, LANGS, NSGO_REPO, type RootSearch, SITE_REPO, SPONSOR_URL, langDef } from '@awesome-nsgo/catalog';
import { Link, useLocation, useMatches } from '@tanstack/react-router';
import { type ComponentType, useEffect, useRef, useState } from 'react';
import { GitHubMark } from '../components/bits';
import { NAV, SITE_NAV } from '../components/Header';
import { useLang, useSetLang, useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { switchTheme } from '../lib/theme';
import { RetroAppWindow } from './AppWindow';
import { RetroPalette } from './Palette';
import { RetroSubmit } from './Submit';
import { AppPage } from './pages/AppPage';
import { Home } from './pages/Home';
import { Learn } from './pages/Learn';
import { Metrics } from './pages/Metrics';
import { NotFound } from './pages/NotFound';
import { Plugins } from './pages/Plugins';
import { Showcase } from './pages/Showcase';
import { State } from './pages/State';
import { AiTools, Templates } from './pages/Category';
import { Ui } from './pages/Ui';
import { btnGoSm, btnSm, lnk } from './ui';

// The retro look renders its own page for each route instead of the route's component (which carries the original look's markup); routes still own their URL, head, loader and 404s.
const PAGES: Record<string, ComponentType> = {
	'/': Home,
	'/ui': Ui,
	'/state': State,
	'/templates': Templates,
	'/ai': AiTools,
	'/plugins': Plugins,
	'/showcase': Showcase,
	'/learn': Learn,
	'/metrics': Metrics,
	'/apps/$slug': AppPage,
};

function usePage(): ComponentType {
	return useMatches({
		select: (ms) => {
			if (ms.some((m) => m._notFound || m.status === 'notFound')) return NotFound;
			return PAGES[ms[ms.length - 1]?.routeId ?? ''] ?? NotFound;
		},
	});
}

// On the desktop the page scrolls inside <main>, not the window, so the router's scroll reset does not reach it.
function scrollMainToTop(): boolean {
	const main = document.getElementById('main');
	if (!main || main.scrollTop === 0) return false;
	main.scrollTo({ top: 0 });
	return true;
}

export default function RetroApp() {
	const site = useSite();
	const Page = usePage();
	const pathname = useLocation({ select: (l) => l.pathname });

	useEffect(() => {
		scrollMainToTop();
	}, [pathname]);

	// Escape closes the topmost overlay; ⌘K / Ctrl+K opens search.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				site.openPalette();
				return;
			}
			if (e.key !== 'Escape') return;
			if (site.palette) site.closePalette();
			else if (site.modal) site.closeSubmit();
			else if (site.app) site.closeApp();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [site]);

	return (
		// On the desktop the whole look is one screen: the menu bar and the footer stay put, and a page taller than the space between them scrolls inside it.
		<div id='top' className='flex min-h-screen flex-col desk:h-dvh desk:min-h-0 desk:overflow-hidden'>
			<MenuBar />
			<main id='main' className='flex-1 desk:min-h-0 desk:overflow-y-auto'>
				<Page />
			</main>
			<Foot />
			<RetroAppWindow />
			<RetroPalette />
			<RetroSubmit />
			<Toast />
		</div>
	);
}

function useClock(lang: string): string {
	const [now, setNow] = useState<string>('');
	useEffect(() => {
		const fmt = new Intl.DateTimeFormat(lang, { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
		const tick = () => setNow(fmt.format(new Date()));
		tick();
		const id = setInterval(tick, 15000);
		return () => clearInterval(id);
	}, [lang]);
	return now;
}

// A menu-bar drop-down: the button toggles it, a click outside or Escape closes it, and navigating closes it.
function useMenu() {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const pathname = useLocation({ select: (l) => l.pathname });
	useEffect(() => setOpen(false), [pathname]);
	useEffect(() => {
		if (!open) return;
		const outside = (e: PointerEvent) => {
			if (!ref.current?.contains(e.target as Node)) setOpen(false);
		};
		const esc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false);
		};
		document.addEventListener('pointerdown', outside);
		document.addEventListener('keydown', esc);
		return () => {
			document.removeEventListener('pointerdown', outside);
			document.removeEventListener('keydown', esc);
		};
	}, [open]);
	return { open, setOpen, ref };
}

const menuBtn = 'h-[24px] cursor-pointer rounded-md border-0 bg-transparent px-2.5 hover:bg-ink/5 aria-expanded:bg-ink/8';
const dropdown = 'absolute top-[27px] right-0 z-50 m-0 min-w-[160px] list-none rounded-lg border border-line bg-paper p-1 shadow-pop';
const dropItem = 'flex justify-between gap-4 rounded-md px-2.5 leading-[26px] no-underline hover:bg-ink/5 aria-[current=page]:bg-ink/8 aria-[current=page]:font-semibold';

function MenuBar() {
	const t = useT();
	const lang = useLang();
	const setLang = useSetLang();
	const { openPalette, openSubmit } = useSite();
	const clock = useClock(lang);
	const langMenu = useMenu();
	const navMenu = useMenu();

	return (
		<header className='sticky top-0 z-40 flex h-[30px] flex-none items-center gap-0.5 border-b border-line bg-paper/85 px-2.5 backdrop-blur-md'>
			<Link to='/' aria-label={t.a_home} className='flex h-[24px] items-center gap-2 rounded-md pr-2.5 pl-1 font-semibold no-underline hover:bg-ink/5'>
				<img src='/icon-32.png' srcSet='/icon-32.png 1x, /icon-64.webp 2x' width={20} height={20} alt='' className='size-5 rounded-[5px]' />
				<span className='hidden whitespace-nowrap min-[480px]:inline'>Awesome NSGo</span>
			</Link>
			<nav aria-label={t.a_cats} className='hidden desk:flex'>
				{NAV.map((n) => (
					<Link key={n.to} to={n.to} activeOptions={{ exact: true, includeSearch: false }} className='flex h-[24px] items-center rounded-md px-[10px] whitespace-nowrap no-underline hover:bg-ink/5 aria-[current=page]:bg-ink/8 aria-[current=page]:font-semibold'>
						{t[n.key]}
					</Link>
				))}
			</nav>
			<div className='relative flex desk:hidden' ref={navMenu.ref}>
				<button type='button' className={`${menuBtn} whitespace-nowrap`} aria-haspopup='menu' aria-expanded={navMenu.open} onClick={() => navMenu.setOpen((v) => !v)}>
					{t.menu}
				</button>
				<div role='menu' aria-label={t.a_cats} hidden={!navMenu.open} className={`${dropdown} right-auto left-0`}>
					{SITE_NAV.map((n) => (
						<Link key={n.to} to={n.to} role='menuitem' activeOptions={{ exact: true, includeSearch: false }} className={dropItem}>
							{t[n.key]}
						</Link>
					))}
				</div>
			</div>
			<div className='ml-auto flex items-center gap-2'>
				<button type='button' onClick={openPalette} aria-label={t.search_label} className='flex h-[24px] cursor-pointer items-center gap-1.5 rounded-md border border-line bg-hi/70 px-2 text-faint'>
					<span aria-hidden='true'>⌕</span>
					<span className='hidden w-[150px] text-left whitespace-nowrap min-[1261px]:inline'>{t.search_btn}</span>
					<span aria-hidden='true' className='hidden rounded border border-line px-1 text-[11px] leading-[14px] min-[1261px]:inline'>
						⌘K
					</span>
				</button>
				<div className='relative flex' ref={langMenu.ref}>
					<button type='button' className={menuBtn} aria-haspopup='menu' aria-expanded={langMenu.open} aria-label={t.lang} onClick={() => langMenu.setOpen((v) => !v)}>
						{langDef(lang).short} ▾
					</button>
					{/* Always rendered and hidden while closed, so every page links to its other language versions, as in the original look. */}
					<div role='menu' aria-label={t.lang} hidden={!langMenu.open} className={dropdown}>
						{LANGS.map((L) => (
							<Link
								key={L.code}
								to='.'
								search={(prev: RootSearch): RootSearch => ({ ...prev, lang: L.code === DEFAULT_LANG ? undefined : L.code })}
								activeOptions={{ exact: true }}
								role='menuitemradio'
								aria-checked={L.code === lang}
								lang={L.code}
								hrefLang={L.code}
								className={dropItem}
								onClick={(e) => {
									if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
									e.preventDefault();
									langMenu.setOpen(false);
									setLang(L.code);
								}}
							>
								<span>{L.native}</span>
								<span className='font-mono text-lo'>{L.code}</span>
							</Link>
						))}
					</div>
				</div>
				<a href={SITE_REPO} target='_blank' rel='noopener' aria-label='GitHub' title='GitHub' className='grid size-[24px] place-items-center rounded-md hover:bg-ink/5'>
					<GitHubMark size={16} />
				</a>
				<button type='button' className={btnSm} onClick={() => switchTheme('original')} title={t.a_theme}>
					{t.theme_original}
				</button>
				<button type='button' className={btnGoSm} onClick={() => openSubmit()}>
					{t.submit_short}
				</button>
				<span aria-hidden='true' className='hidden min-w-[72px] pr-1 pl-1.5 text-right whitespace-nowrap tabular-nums desk:inline' suppressHydrationWarning>
					{clock}
				</span>
			</div>
		</header>
	);
}

function Foot() {
	const t = useT();
	return (
		<footer className='mt-14 flex min-h-[30px] flex-none flex-wrap items-center gap-x-[18px] gap-y-1.5 border-t border-line bg-paper/85 px-4 py-1 text-xs text-muted backdrop-blur-md desk:mt-0 desk:flex-nowrap desk:overflow-hidden desk:whitespace-nowrap'>
			<span>{t.footer_l}</span>
			<nav aria-label={t.a_site_nav} className='flex flex-wrap gap-x-3'>
				{NAV.map((n) => (
					<Link key={n.to} to={n.to} className={lnk}>
						{t[n.key]}
					</Link>
				))}
				<Link to='/metrics' className={lnk}>{t.metrics_title}</Link>
			</nav>
			<span className='flex-1' />
			<a className={`${lnk} inline-flex items-center gap-1.5`} href={NSGO_REPO} target='_blank' rel='noopener'>
				<GitHubMark size={13} />
				GitHub
			</a>
			<a className={lnk} href={SPONSOR_URL} target='_blank' rel='noopener'>
				{t.sponsor}
			</a>
			<a
				className={lnk}
				href='#top'
				onClick={(e) => {
					if (scrollMainToTop()) e.preventDefault();
				}}
			>
				{t.to_top} ↑
			</a>
		</footer>
	);
}

function Toast() {
	const { copied } = useSite();
	const t = useT();
	return (
		<div role='status' aria-live='polite' className={`pointer-events-none fixed bottom-7 left-1/2 z-[99] -translate-x-1/2 rounded-lg border border-line bg-paper px-4 py-2 shadow-pop transition-[opacity,translate] duration-200 ease-out ${copied ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`}>
			{copied ? t.toast : ''}
		</div>
	);
}
