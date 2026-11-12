import { type App, APPS, HAS_SCORES, appBySlug, appSource, entryScore, fill, hostOf, likeKey, pick } from '@awesome-nsgo/catalog';
import { Link, useParams } from '@tanstack/react-router';
import { neighbours } from '../../components/AppDetail';
import { AppLink, PlatformTags, type AppView, appView } from '../../components/bits';
import { LikeButton } from '../../components/Like';
import { ScoreBreakdown } from '../../components/Score';
import { useLang, useT } from '../../lib/lang';
import { scoreTotal } from '../../lib/score';
import { appBadgeMarkdown } from '../../lib/seo';
import { useSite } from '../../lib/site';
import { AppIcon, KindTag, StatusBar, Win, btn, btnGo, iconLabel, likeBtnLg, lnk, well } from '../ui';

// The plain tint behind an app that has no screenshot, as in the showcase grid.
export const noShot = 'bg-[linear-gradient(160deg,#eef2f6,#dde4ec)]';

// The app's screenshot in a hairline frame, or its icon and catalog number on a plain tint when it has none.
// `fit` caps the screenshot's height on the desktop to what the app page's window has left, so a screenshot taller than 16:10 does not push the description out of view; the frame then shrinks to the image's width.
export function AppShot({ view, priority = false, fit = false }: { view: AppView; priority?: boolean; fit?: boolean }) {
	const t = useT();
	const { app } = view;
	if (app.image) {
		return (
			<div className={`overflow-hidden rounded-lg border border-line ${fit ? 'desk:w-fit desk:max-w-full' : ''}`}>
				<img key={app.slug} src={app.image} alt={`${app.name} ${t.app_shot}`} width={1200} height={750} fetchPriority={priority ? 'high' : undefined} decoding='async' className={`block h-auto w-full bg-paper ${fit ? 'desk:max-h-[calc(100dvh_-_400px)] desk:w-auto desk:max-w-full' : ''}`} />
			</div>
		);
	}
	return (
		<div className={`relative grid aspect-[16/10] place-items-center rounded-lg border border-line ${noShot}`}>
			<span aria-hidden='true' className='absolute top-2 left-3 font-mono text-[36px] leading-10 text-lo'>
				{view.num}
			</span>
			<AppIcon app={app} size={96} />
		</div>
	);
}

// Icon, name, kind tag and the one-line summary. The window's title bar is the heading, so the large name here is hidden from assistive technology.
export function AppHead({ app, kindLabel, className = '' }: { app: App; kindLabel: string; className?: string }) {
	const lang = useLang();
	return (
		<div className={`grid content-start gap-2.5 ${className}`}>
			<div className='flex items-center gap-3'>
				<AppIcon app={app} size={48} />
				<div className='min-w-0'>
					<p aria-hidden='true' className='m-0 truncate text-xl leading-7 font-semibold'>
						{app.name}
					</p>
					<KindTag kind={app.kind} label={kindLabel} />
				</div>
			</div>
			<p className='m-0 [&:lang(ko)]:break-keep'>{pick(app.desc, lang)}</p>
		</div>
	);
}

// Author, UI kind, site, catalog number and, once the workflow has recorded scores, the score (or that the app has not been measured yet).
export function AppFacts({ view }: { view: AppView }) {
	const t = useT();
	const { app } = view;
	const src = appSource(app);
	const score = entryScore(likeKey.app(app));
	return (
		<dl className='m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-0.5 border-y border-line py-2'>
			<dt className='text-faint'>{t.f_author}</dt>
			<dd className='m-0 break-words'>{app.author}</dd>
			<dt className='text-faint'>{t.f_ui}</dt>
			<dd className='m-0'>{t[`kind_${app.kind}`]}</dd>
			<dt className='text-faint'>{t.f_platform}</dt>
			<dd className='m-0'><PlatformTags app={app} /></dd>
			<dt className='text-faint'>{t.f_site}</dt>
			<dd lang='en' className='m-0 font-mono wrap-break-word'>
				{view.host}
			</dd>
			{src && (
				<>
					<dt className='text-faint'>{t.f_src}</dt>
					<dd lang='en' className='m-0 font-mono wrap-break-word'>
						<a className={lnk} href={src} target='_blank' rel='noopener'>
							{hostOf(src)}
						</a>
					</dd>
				</>
			)}
			<dt className='text-faint'>{t.f_no}</dt>
			<dd className='m-0 font-mono'>
				#{view.num} / {APPS.length}
			</dd>
			{HAS_SCORES && (
				<>
					<dt className='text-faint'>{t.score}</dt>
					<dd className={score ? 'm-0 font-mono' : 'm-0'}>{score ? `${scoreTotal(score)}/100` : t.score_pending}</dd>
				</>
			)}
		</dl>
	);
}

// The README badge for the app's author, as on the original look's page: the badge, its Markdown (in English, as it goes into the project's README) and a copy button.
function AppBadge({ app }: { app: App }) {
	const t = useT();
	const { copy, copied } = useSite();
	const md = appBadgeMarkdown(app.slug);
	return (
		<section aria-labelledby='app-badge-h' className='grid min-w-0 gap-1.5 border-t border-line pt-2.5'>
			<h2 id='app-badge-h' className='m-0 text-[13px] font-normal text-muted'>
				{t.badge_h}
			</h2>
			<p className='m-0 leading-[20px] [&:lang(ko)]:break-keep'>{t.badge_p}</p>
			<img src='/badge.svg' alt='Listed on Awesome NSGo' width={200} height={28} loading='lazy' decoding='async' className='block h-7 w-auto' />
			<div className='flex min-w-0 items-center gap-2'>
				<code lang='en' className='min-w-0 flex-1 overflow-x-auto rounded-md border border-line bg-paper px-2 py-1 font-mono text-xs whitespace-nowrap [scrollbar-width:none]'>
					{md}
				</code>
				<button type='button' className={btn} onClick={() => copy(md, 'badge')} aria-label={t.a_copy_badge}>
					{copied === 'badge' ? t.copied : t.copy}
				</button>
			</div>
		</section>
	);
}

// Open the project in a new tab, or copy its link.
export function AppActions({ app }: { app: App }) {
	const t = useT();
	const { copy, copied } = useSite();
	return (
		<div className='flex flex-wrap gap-2.5'>
			<a className={`${btnGo} max-w-full`} href={app.url} target='_blank' rel='noopener'>
				<span className='truncate'>{fill(t.open_x, { x: app.name })}</span>
			</a>
			<button type='button' className={btn} onClick={() => copy(app.url, 'det')}>
				{copied === 'det' ? t.copied : t.copy_link}
			</button>
			<LikeButton item={likeKey.app(app)} name={app.name} className={likeBtnLg} />
		</div>
	);
}

// Other apps by the same author: in the quick view a plain click switches the window to that app, on the app's page the rows link to the other pages under a heading.
export function MoreBy({ app, quick }: { app: App; quick: boolean }) {
	const t = useT();
	const lang = useLang();
	const others = APPS.filter((o) => o.author === app.author && o !== app).slice(0, 6);
	if (others.length === 0) return null;
	const label = fill(t.more_by, { x: app.author });
	return (
		<div>
			{quick ? <p className='m-0 mb-1 text-faint'>{label}</p> : <h2 className='m-0 mb-1 text-xs font-medium text-faint'>{label}</h2>}
			<ul className='m-0 list-none p-0'>
				{others.map((o) => (
					<li key={o.slug}>
						<AppLink slug={o.slug} quick={quick} dialog={quick} className='group grid grid-cols-[24px_minmax(0,1fr)] items-center gap-x-2 border-b border-line py-1 no-underline'>
							<AppIcon app={o} size={24} />
							<span className='min-w-0'>
								<span className={`block truncate ${iconLabel} -ml-1 w-fit max-w-full`}>{o.name}</span>
								<span className='block truncate text-muted'>{pick(o.desc, lang)}</span>
							</span>
						</AppLink>
					</li>
				))}
			</ul>
		</div>
	);
}

export function AppPage() {
	const { slug } = useParams({ strict: false });
	const app = slug ? appBySlug(slug) : undefined;
	// The route's loader answers an unknown slug with the 404 page before this renders.
	return app ? <Page app={app} /> : null;
}

function Page({ app }: { app: App }) {
	const t = useT();
	const lang = useLang();
	const v = appView(app);
	const kindLabel = t[`kind_${app.kind}`];
	const [prev, next] = neighbours(v);

	return (
		<div className='mx-auto max-w-[1180px] px-3.5 pt-3.5 desk:px-10 desk:pt-[30px]'>
			<Win title={app.name} level={1} fill closeTo='/showcase'>
				<nav aria-label={t.a_crumbs} className='px-1.5 pt-[3px] pb-1.5'>
					<ol className='m-0 flex list-none flex-wrap items-center gap-x-2 p-0'>
						<li>
							<Link to='/' className={lnk}>
								{t.nav_home}
							</Link>
						</li>
						<li aria-hidden='true'>▸</li>
						<li>
							<Link to='/showcase' className={lnk}>
								{t.cat_show_name}
							</Link>
						</li>
						<li aria-hidden='true'>▸</li>
						<li aria-current='page' className='min-w-0 truncate'>
							{app.name}
						</li>
					</ol>
				</nav>
				{/* On a phone the name comes first, then the screenshot, then the facts; on the desktop the screenshot takes the left column and the name and facts stack on the right. The score's breakdown follows the description, in the column that scrolls. */}
				{/* On the desktop the panel takes the height the window has left. The screenshot column is no wider than 1.6 times that height (less the padding and room for the description), so on a short screen the screenshot shrinks and the description under it stays in view. The author's other apps scroll on their own under the facts, and the left column scrolls too if a long description still does not fit. */}
				<article className={`${well} grid gap-4 p-3.5 desk:min-h-0 desk:flex-1 desk:grid-cols-[minmax(0,calc((100dvh_-_400px)_*_1.6))_300px] desk:grid-rows-[auto_minmax(0,1fr)] desk:justify-center desk:gap-x-7 desk:gap-y-3.5 desk:p-5`}>
					<AppHead app={app} kindLabel={kindLabel} className='desk:col-start-2 desk:row-start-1' />
					<div className='relative grid content-start gap-4 desk:col-start-1 desk:row-span-2 desk:row-start-1 desk:min-h-0 desk:overflow-y-auto'>
						<AppShot view={v} priority fit />
						<p className='m-0 leading-[22px] [&:lang(ko)]:break-keep'>{pick(app.about, lang)}</p>
						<ScoreBreakdown item={likeKey.app(app)} id='score' />
					</div>
					<div className='grid content-start gap-3.5 desk:col-start-2 desk:row-start-2 desk:flex desk:min-h-0 desk:flex-col'>
						<AppFacts view={v} />
						<AppActions app={app} />
						<div className='relative empty:hidden desk:min-h-0 desk:overflow-y-auto'>
							<MoreBy app={app} quick={false} />
						</div>
						<AppBadge app={app} />
					</div>
				</article>
				<nav aria-label={t.a_pager} className='flex flex-wrap justify-between gap-2.5 px-1.5 pt-2 pb-1.5'>
					<AppLink slug={prev.slug} quick={false} className={`${btn} max-w-full`}>
						<span className='truncate'>← {prev.name}</span>
					</AppLink>
					<AppLink slug={next.slug} quick={false} className={`${btn} max-w-full`}>
						<span className='truncate'>{next.name} →</span>
					</AppLink>
				</nav>
				<StatusBar>
					<span>
						{t.f_no} #{v.num} / {APPS.length}
					</span>
					<span lang='en' className='font-mono'>
						{v.host}
					</span>
				</StatusBar>
			</Win>
		</div>
	);
}
