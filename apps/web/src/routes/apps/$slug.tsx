import { appBySlug, appGroup, likeKey, pick } from '@awesome-nsgo/catalog';
import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { AppActions, AppBadge, AppFacts, AppPager, MoreBy, secH } from '../../components/AppDetail';
import { KindTag, MonoTile, appView } from '../../components/bits';
import { ScoreBreakdown } from '../../components/Score';
import { useLang, useT } from '../../lib/lang';
import { appHead } from '../../lib/seo';

// An app's own page: what the showcase cards and search open in the original look, and what search engines index. The retro look keeps a quick-view window over the listing pages.
export const Route = createFileRoute('/apps/$slug')({
	loader: ({ params }) => {
		if (!appBySlug(params.slug)) throw notFound();
	},
	head: ({ params, match }) => {
		const app = appBySlug(params.slug);
		return app ? appHead(app, match.search.lang) : {};
	},
	component: AppPage,
});

const crumbLink = 'text-fg-2 no-underline hover:text-blue-ink';
// The chevron between two crumbs.
const crumbSep = "before:mr-2 before:text-line-3 before:content-['›']";
// Headings in Chinese, Japanese and Korean keep a looser line and almost no negative tracking.
const CJK_H = '[&:is(:lang(zh-CN),:lang(zh-TW),:lang(ja),:lang(ko))]:tracking-[-0.01em] [&:is(:lang(zh-CN),:lang(zh-TW),:lang(ja),:lang(ko))]:leading-[1.2]';

function AppPage() {
	const t = useT();
	const lang = useLang();
	const { slug } = Route.useParams();
	// The loader has already answered an unknown slug with the 404 page.
	const app = appBySlug(slug);
	if (!app) throw notFound();

	const v = appView(app);
	const kindLabel = t[`kind_${app.kind}`];
	const group = appGroup(app);

	// The hero: the icon beside what the app is, then the actions. The body: the screenshot, the platforms it runs on and the description, with the facts, the score and the badge beside them (under them below split), then the author's other apps and the previous and next apps.
	return (
		<article className='page enter gap-11 max-sm:gap-8'>
			<nav aria-label={t.a_crumbs}>
				<ol className='m-0 flex list-none flex-wrap gap-2 p-0 text-[13px] text-fg-3'>
					<li>
						<Link to='/' className={crumbLink}>
							{t.nav_home}
						</Link>
					</li>
					<li className={crumbSep}>
						<Link to='/showcase' className={crumbLink}>
							{t.cat_show_name}
						</Link>
					</li>
					<li aria-current='page' className={crumbSep}>
						{app.name}
					</li>
				</ol>
			</nav>
			<header className='grid grid-cols-[96px_minmax(0,1fr)] items-start gap-8 max-sm:grid-cols-[minmax(0,1fr)] max-sm:gap-5'>
				{/* MonoTile loads the 96 px icon eagerly and at high priority: it is the page's largest paint on a phone. */}
				<div className='relative size-24 max-sm:size-18 max-sm:[&_.mono-96]:size-18 max-sm:[&_.mono-96]:text-[32px]'>
					<MonoTile view={v} size={96} />
				</div>
				<div className='flex min-w-0 flex-col gap-3.5'>
					<p className='m-0 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-fg-3 [&_.kind-tag]:self-center'>
						<KindTag app={app} label={kindLabel} />
						<Link to='/showcase' search={{ cat: group }} className='font-semibold text-blue-ink no-underline hover:underline'>
							{t[`grp_${group}`]}
						</Link>
						<span>
							<span lang='en'>by</span> {app.author}
						</span>
					</p>
					<h1 className={`m-0 text-[length:clamp(34px,4.6vw,54px)] leading-[1.06] font-extrabold tracking-[-0.04em] wrap-break-word ${CJK_H}`}>{app.name}</h1>
					<p className='m-0 text-[18px] leading-[1.6] text-fg-2 max-sm:text-[16.5px]'>{pick(app.desc, lang)}</p>
					<AppActions app={app} />
				</div>
			</header>
			<div className='grid grid-cols-[minmax(0,1fr)_340px] items-start gap-10 max-split:grid-cols-[minmax(0,1fr)]'>
				<div className='flex min-w-0 flex-col gap-9'>
					{app.image && (
						<figure className='m-0 overflow-hidden rounded-frame border border-line-2 bg-soft [box-shadow:var(--sh-3)]'>
							<img className='block h-auto w-full' src={app.image} alt={`${app.name} ${t.app_shot}`} width={1200} height={750} fetchPriority='high' decoding='async' />
						</figure>
					)}
					{/* The platforms the app runs on, each with its device glyph, in the order the catalog lists them, under a heading like the description's; the facts beside it leave them out rather than list them twice. */}
					<section className='flex flex-col gap-3' aria-labelledby='app-platforms-h'>
						<h2 id='app-platforms-h' className={secH}>
							{t.f_platform}
						</h2>
						<ul className='m-0 flex list-none flex-wrap gap-2 p-0'>
							{app.platforms.map((p) => (
								<li key={p} className='inline-flex h-8 items-center gap-1.5 rounded-full border border-line-2 bg-panel px-3 text-[13px] font-medium text-fg'>
									<span className='pglyph text-blue [--pg-size:14px]' data-p={p} />
									{t[`platform_${p}`]}
								</li>
							))}
						</ul>
					</section>
					<section className='flex flex-col gap-3' aria-labelledby='app-about-h'>
						<h2 id='app-about-h' className={secH}>
							{t.app_about}
						</h2>
						<p className='m-0 text-[16.5px] leading-[1.8] text-fg-2'>{pick(app.about, lang)}</p>
					</section>
				</div>
				<aside className='sticky top-24 flex flex-col gap-7 max-split:static'>
					<AppFacts view={v} kindLabel={kindLabel} />
					<ScoreBreakdown item={likeKey.app(app)} id='score' className='rounded-card border border-line-2 bg-panel px-5 py-[18px] max-sm:px-4' />
					<AppBadge app={app} />
				</aside>
			</div>
			<MoreBy app={app} />
			<AppPager view={v} />
		</article>
	);
}
