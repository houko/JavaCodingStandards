import { AI_TOOLS, APP_PLATFORMS, APPS, INSTALL_CMDS, INSTALL_TABS, type InstallTab, NSGO_SITE, PLUGINS, STATE_SOLUTIONS, TEMPLATES, UI_LIBS, fill, langDef, likeKey, pick } from '@awesome-nsgo/catalog';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { Fragment } from 'react';
import { AppLink, MonoTile, appView } from '../components/bits';
import { AppCard } from '../components/EntryCard';
import { NavIcon } from '../components/marks';
import { ScoreChip } from '../components/Score';
import { useLang, useT } from '../lib/lang';
import { useCountUp } from '../lib/motion';
import { validateHomeSearch } from '../lib/page-search';
import { pageHead } from '../lib/seo';
import { DEFAULT_SORT, sortApps } from '../lib/showcase';
import { useSite } from '../lib/site';

// The apps in the showcase's default order: by score, from scores.json, which the scores workflow updates each day (DEFAULT_SORT in lib/showcase.ts).
const RANKED_APPS = sortApps(APPS, DEFAULT_SORT, {});

// The featured section's apps: the four highest scores, so they change as the scores do.
const FEATURED_APPS = RANKED_APPS.slice(0, 4);

// The hero's list: the newest apps, by the date they were listed.
const NEWEST_APPS = sortApps(APPS, 'newest', {}).slice(0, 5);

// The platform rail: each platform with the number of apps that run on it, leaving out the platforms no app supports yet, as an empty cell reads as a dead link.
const PLATFORM_COUNTS = APP_PLATFORMS.map((p) => ({ p, n: APPS.filter((a) => a.platforms.includes(p)).length })).filter((x) => x.n > 0);

// The chips floating round the hero's Newest card: up to four platforms apps run on, phones and the web before the desktops so the spread reads at a glance.
const CHIP_ORDER = ['mac', 'ios', 'web', 'win', 'android', 'linux', 'miniprogram'] as const;
const FLOAT_CHIPS = CHIP_ORDER.filter((p) => PLATFORM_COUNTS.some((x) => x.p === p)).slice(0, 4);

export const Route = createFileRoute('/')({
	// ?install= keeps the install command's tab in the address, so a link reproduces the view.
	validateSearch: validateHomeSearch,
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/', title: null, desc: 'desc_home', name: 'nav_home' }),
	component: HomePage,
});

// The sections under the hero share their box, head row and heading; each adds its own vertical padding.
const SEC = 'site-shell mx-auto flex flex-col px-6 max-sm:px-5';
const SEC_HEAD = 'mb-8 flex flex-wrap items-end justify-between gap-4';
// Chinese, Japanese and Korean headings get looser tracking and leading than Latin ones; :lang() matches the language the heading inherits.
const CJK_H = '[&:is(:lang(zh-CN),:lang(zh-TW),:lang(ja),:lang(ko))]:tracking-[-0.005em] [&:is(:lang(zh-CN),:lang(zh-TW),:lang(ja),:lang(ko))]:leading-[1.25]';
const SEC_H2 = `m-0 text-[length:clamp(26px,3.4vw,36px)] leading-[1.14] font-bold tracking-[-0.03em] ${CJK_H}`;
// The hero's two 48px buttons; on phones they grow to fill their row (see the row's comment).
const BTN_48 = 'box-border inline-flex min-h-12 items-center justify-center gap-[0.35em] rounded-full px-6 py-0 text-[15px] font-semibold max-sm:flex-auto';

function HomePage() {
	const t = useT();
	const nApps = APPS.length;
	return (
		<div className='enter'>
			<Hero />
			{/* No platform rail and no featured section while the catalog has no apps: their headings over nothing would read as a broken page. */}
			<PlatformRail />
			<Categories />
			{FEATURED_APPS.length > 0 && (
				<div className='relative border-t border-line bg-soft pt-20 max-sm:pt-14'>
					{/* Decoration only: dots and two broad lanes behind the cards, and a line of light along the band's top edge (styles/backdrop.css). */}
					<div aria-hidden='true' className='band-deco'>
						<span className='band-lane b1' />
						<span className='band-lane b2' />
					</div>
					<span aria-hidden='true' className='edge-light' />
					<section aria-labelledby='fresh' className={`${SEC} relative pb-24 max-sm:pb-16`}>
						<div className={`rv ${SEC_HEAD}`}>
							<h2 id='fresh' className={SEC_H2}>
								{t.feat_h}
							</h2>
							<Link to='/showcase' className='btn-g btn-44 btn-outline'>
								{fill(t.feat_all, { n: nApps })} <span className='arrow'>→</span>
							</Link>
						</div>
						<div className='grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4'>
							{FEATURED_APPS.map((a, k) => (
								<AppCard key={a.slug} app={a} k={k} as='h3' like={false} score={false} />
							))}
						</div>
					</section>
				</div>
			)}
		</div>
	);
}

function Hero() {
	const t = useT();
	const lang = useLang();
	const { copy, copied } = useSite();
	const { install } = Route.useSearch();
	const navigate = useNavigate({ from: '/' });
	const tab: InstallTab = install ?? 'go';
	const setTab = (k: InstallTab) => void navigate({ search: (prev) => ({ ...prev, install: k === 'go' ? undefined : k }), replace: true, resetScroll: false });
	const e = useCountUp();
	const words = langDef(lang).words;
	const nApps = APPS.length;

	const stats = [
		{ n: String(Math.round(APPS.length * e)), label: t.st_apps },
		{ n: String(Math.round(PLUGINS.length * e)), label: t.st_plugins },
		{ n: String(Math.round(UI_LIBS.length * e)), label: t.st_libs },
		{ n: 'Apache-2.0', label: t.st_license },
	];

	return (
		<section className='relative pt-20 pb-16 max-sm:pt-10 max-sm:pb-10'>
			{/* Copy on the left, the newest apps on the right; one column below 1000px. The two lanes drift in the space above the Newest card (styles/backdrop.css), hidden below 1000px. */}
			<div className='site-shell relative mx-auto grid grid-cols-[minmax(0,1fr)_400px] items-start gap-x-14 gap-y-10 px-6 max-hero:grid-cols-1 max-sm:px-5'>
				<span aria-hidden='true' className='backdrop-lane l1 pointer-events-none' />
				<span aria-hidden='true' className='backdrop-lane l2 pointer-events-none' />
				<div className='flex min-w-0 flex-col items-start gap-6'>
					<Link to='/showcase' className='rise [animation-delay:0.08s] group inline-flex h-8 items-center gap-2 rounded-full border border-line-2 bg-panel pr-3 pl-2.5 text-[13px] font-medium text-fg-2 no-underline [box-shadow:var(--sh-1)] hover:border-line-3 hover:text-fg max-md:h-10'>
						<span className='lanes' />
						{fill(t.live_badge, { n: nApps })}
						<span className='arrow' aria-hidden='true'>
							→
						</span>
					</Link>

					{/* The second phrase is set apart by a lane under it (.lane-under); both remain plain inline text so the available width decides every wrap. Languages written without spaces between words take a smaller size, as their lines hold more. */}
					<h1
						className='rise [animation-delay:0.14s] m-0 text-[length:clamp(38px,4.8vw,60px)] leading-[1.06] font-extrabold tracking-[-0.045em] data-[words=false]:text-[length:clamp(34px,4.2vw,52px)] max-sm:text-[length:min(36px,9vw)] max-sm:data-[words=false]:text-[34px] [&:is(:lang(zh-CN),:lang(zh-TW),:lang(ja),:lang(ko))]:leading-[1.18] [&:is(:lang(zh-CN),:lang(zh-TW),:lang(ja),:lang(ko))]:tracking-[-0.015em]'
						data-words={words}
					>
						{t.h1_1}
						{words && ' '}
						<span className='lane-under'>{t.h1_2}</span>
					</h1>

					<p className='rise [animation-delay:0.14s] m-0 max-w-[560px] text-[17.5px] leading-[1.7] text-fg-2 [&:is(:lang(zh-CN),:lang(zh-TW),:lang(ja),:lang(ko))]:max-w-[32em]'>
						{t.hero_p}
						{words && ' '}
						{t.hero_p2}
					</p>

					{/* Below 640px the tabs and the copy button share the first line and the command takes the whole second line. The command wraps at its spaces rather than scrolling, each word kept whole (a module path breaks at its hyphen otherwise), so the end that says what it does (init -module … my-app) is never hidden; a word wider than the box still scrolls. */}
					<div className='rise [animation-delay:0.2s] box-border inline-flex max-w-full items-center gap-1 rounded-menu border border-line-2 bg-soft p-1 max-sm:flex max-sm:w-full max-sm:flex-wrap'>
						<div role='tablist' aria-label={t.a_install} className='flex flex-none gap-0.5'>
							{INSTALL_TABS.map((it) => (
								<button key={it.key} type='button' role='tab' aria-selected={tab === it.key} onClick={() => setTab(it.key)} className='seg-tab min-h-8 rounded-[9px] border-0 bg-transparent px-2.5 py-0 font-mono text-[12.5px] text-fg-2 aria-selected:bg-panel aria-selected:font-semibold aria-selected:text-fg aria-selected:[box-shadow:var(--sh-1),0_0_0_1px_var(--color-line-2)] max-md:min-h-10'>
									{it.label}
								</button>
							))}
						</div>
						<code className='min-w-0 flex-auto overflow-x-auto px-3.5 py-0 text-left font-mono text-[13.5px] text-fg max-sm:order-last max-sm:basis-full max-sm:px-3 max-sm:py-2.5 max-sm:text-[13px]'>
							<span className='cmd-p'>$ </span>
							{INSTALL_CMDS[tab].split(' ').map((word, i) => (
								<Fragment key={i}>
									{i > 0 && ' '}
									<span className='whitespace-nowrap'>{word}</span>
								</Fragment>
							))}
						</code>
						<button type='button' className={`btn-g min-h-8 min-w-[72px] flex-none rounded-[9px] border border-line-2 bg-panel px-3 py-0 text-[12.5px] font-semibold hover:border-line-3 hover:bg-soft max-md:min-h-10 max-sm:ml-auto ${copied === 'cmd' ? 'text-blue-ink' : 'text-fg-2'}`} onClick={() => copy(INSTALL_CMDS[tab], 'cmd')} aria-label={t.a_copy_install}>
							{copied === 'cmd' ? t.copied : t.copy}
						</button>
					</div>

					{/* On phones the two buttons fill the row between them, or each its own row when they do not fit side by side. */}
					<div className='rise [animation-delay:0.26s] flex flex-wrap gap-3 max-sm:self-stretch'>
						<Link to='/showcase' className={`btn-c ${BTN_48}`}>
							{t.explore} <span className='arrow'>→</span>
						</Link>
						<a className={`btn-g btn-outline ${BTN_48}`} href={NSGO_SITE} target='_blank' rel='noopener'>
							{t.site}
						</a>
					</div>

					{/* The figures sit between hairlines; on phones they wrap freely and the hairlines go, as a wrapped row would start with one. */}
					<div className='rise [animation-delay:0.26s] flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-fg-3 [&>span+span]:border-l [&>span+span]:border-line-2 [&>span+span]:pl-6 max-sm:[&>span+span]:border-l-0 max-sm:[&>span+span]:pl-0'>
						{stats.map((st) => (
							<span key={st.label}>
								<span className='text-[19px] font-bold text-fg tabular-nums'>{st.n}</span> {st.label}
							</span>
						))}
					</div>
				</div>

				{/* The newest apps as a ranked list; phones show four of the five. A ring of light runs round it and platform chips float at its corners (styles/backdrop.css); both are decoration. */}
				{NEWEST_APPS.length > 0 && (
					<div className='rise [animation-delay:0.2s] glow-frame'>
					{FLOAT_CHIPS.map((p, i) => (
						<span key={p} aria-hidden='true' className={`float-chip c${i + 1}`}>
							<span className='pglyph' data-p={p} />
							{t[`platform_${p}`]}
						</span>
					))}
					<section aria-label={t.a_marquee} className='card [box-shadow:var(--sh-3)]'>
						<div className='flex h-12 items-center justify-between border-b border-line px-5'>
							<h2 className='kicker m-0 text-[13px]'>{t.sort_new}</h2>
							<Link to='/showcase' search={{ sort: 'newest' }} className='inline-flex items-center text-[13px] font-semibold text-blue-ink no-underline hover:underline max-md:min-h-10'>
								{fill(t.feat_all, { n: nApps })} →
							</Link>
						</div>
						<ol className='m-0 list-none p-1.5 [&>li+li]:border-t [&>li+li]:border-line max-sm:[&>li:nth-child(n+5)]:hidden'>
							{NEWEST_APPS.map((a) => (
								<li key={a.slug}>
									<AppLink slug={a.slug} dialog className='row grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-box px-3 py-2.5 text-fg no-underline'>
										<MonoTile view={appView(a)} size={44} />
										<span className='flex min-w-0 flex-col'>
											<span className='truncate text-[15px] font-semibold'>{a.name}</span>
											<span className='truncate text-[13px] text-fg-3'>{pick(a.desc, lang)}</span>
										</span>
										<ScoreChip item={likeKey.app(a)} name={a.name} className='text-[12.5px] text-fg-2' />
									</AppLink>
								</li>
							))}
						</ol>
					</section>
					</div>
				)}
			</div>
		</section>
	);
}

// The platforms apps run on, each a link to the showcase filtered to it. Below md the list scrolls sideways inside the bordered track and fades out at its right edge, where more cells wait; the fade is on the list, not on the track, so the track keeps its border and corners, and the list's end padding lets the last cell scroll clear of the fade.
function PlatformRail() {
	const t = useT();
	if (PLATFORM_COUNTS.length === 0) return null;
	return (
		<section aria-label={t.f_platform} className={`${SEC} pb-4`}>
			<div className='rail-track overflow-hidden rounded-band border border-line-2 bg-soft p-2 max-md:px-0 max-md:py-1'>
				<ul className='m-0 flex list-none gap-2 p-0 max-md:snap-x max-md:scroll-px-2 max-md:overflow-x-auto max-md:py-1 max-md:pr-7 max-md:pl-2 max-md:[mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent)] max-md:[scrollbar-width:none]'>
					{PLATFORM_COUNTS.map(({ p, n }) => (
						<li key={p} className='flex flex-1 max-md:flex-none'>
							<Link to='/showcase' search={{ platform: p }} className='spot group flex min-h-14 flex-1 snap-start items-center gap-3 rounded-menu border border-line-2 bg-panel px-4 text-fg no-underline transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-line-3 motion-reduce:hover:translate-y-0'>
								<span className='ichip flex size-9 flex-none items-center justify-center rounded-[10px] bg-blue-soft text-blue'>
									<span className='pglyph [--pg-size:20px]' data-p={p} />
								</span>
								<span className='flex flex-col'>
									<span className='text-[14px] font-semibold whitespace-nowrap'>{t[`platform_${p}`]}</span>
									<span className='text-[12.5px] text-fg-3 tabular-nums'>{n}</span>
								</span>
							</Link>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}

function Categories() {
	const t = useT();
	const nState = STATE_SOLUTIONS.length;
	const nTpl = TEMPLATES.length;
	const nAi = AI_TOOLS.length;
	// The categories still waiting for their first entries wear the warm "wanted" tone on their badge; showcase, plugins and ui always have entries.
	const cats = [
		{ to: '/showcase', name: t.cat_show_name, badge: t.cat_show_badge, wanted: false, desc: t.cat_show_desc },
		{ to: '/plugins', name: t.nav_plugins, badge: t.cat_plug_badge, wanted: false, desc: fill(t.cat_plug_desc, { n: PLUGINS.length }) },
		{ to: '/ui', name: t.cat_ui_name, badge: fill(t.cat_ui_badge, { n: UI_LIBS.length }), wanted: false, desc: t.cat_ui_desc },
		{ to: '/state', name: t.cat_state_name, badge: nState ? fill(t.cat_state_count, { n: nState }) : t.cat_state_badge, wanted: nState === 0, desc: t.cat_state_desc },
		{ to: '/templates', name: t.cat_tpl_name, badge: nTpl ? fill(t.cat_tpl_count, { n: nTpl }) : t.cat_tpl_badge, wanted: nTpl === 0, desc: t.cat_tpl_desc },
		{ to: '/ai', name: t.cat_ai_name, badge: nAi ? fill(t.cat_ai_count, { n: nAi }) : t.cat_ai_badge, wanted: nAi === 0, desc: t.cat_ai_desc },
	] as const;
	return (
		<section aria-labelledby='cats' className={`${SEC} py-20 max-sm:py-14`}>
			<div className={`rv ${SEC_HEAD}`}>
				<div className='flex flex-col gap-2.5'>
					<h2 id='cats' className={SEC_H2}>
						{t.cats_h}
					</h2>
					<p className='m-0 text-[15px] text-fg-3'>{t.cats_src}</p>
				</div>
			</div>
			<div className='grid grid-cols-3 gap-3 max-split:grid-cols-2 max-tab:grid-cols-1'>
				{cats.map((c, k) => (
					// The reveal is on a wrapper: on the tile itself its settled transform would override the tile's hover lift. The tile's own border and shadow utilities outrank .tile:hover, so its hover restates them.
					<div key={c.to} className={`rv d${k} flex`}>
						<Link to={c.to} className='tile spot group relative flex min-h-[184px] flex-1 flex-col gap-3 rounded-card border border-line-2 bg-panel p-6 text-fg no-underline [box-shadow:var(--sh-1)] hover:border-line-3 hover:[box-shadow:var(--sh-2)] max-sm:min-h-0 max-sm:p-5'>
							<span className='flex items-start justify-between gap-3'>
								<span className='ichip flex size-10 items-center justify-center rounded-box bg-blue-soft text-blue'>
									<NavIcon to={c.to} />
								</span>
								<span className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold ${c.wanted ? 'bg-dev-soft text-dev' : 'bg-soft text-fg-2'}`}>{c.badge}</span>
							</span>
							<span className='text-[19px] font-[650] tracking-[-0.015em]'>{c.name}</span>
							<span className='text-[14.5px] leading-[1.6] text-fg-2'>{c.desc}</span>
							<span aria-hidden='true' className='arrow mt-auto self-end text-[16px] text-fg-3 group-hover:text-blue-ink'>
								→
							</span>
							<span aria-hidden='true' className='tile-mark' />
						</Link>
					</div>
				))}
			</div>
		</section>
	);
}
