import { type AppKind, HAS_SCORES, NATIVE_UI_DOCS, type Surface, UI_KEYS, UI_LIBS, type UiLibKey, fill, likeKey, pick } from '@awesome-nsgo/catalog';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CtaBox, ctaP } from '../components/Cta';
import { BarLink, CardHead, CardShot, EntryCard, cardShotImg, showBy, showDesc, showGrid } from '../components/EntryCard';
import { FilterBar, FilterChip, FilterChips, FilterSelect, FilterSelects } from '../components/FilterBar';
import { useLang, useT } from '../lib/lang';
import { validateUiSearch } from '../lib/page-search';
import { pageHead } from '../lib/seo';
import { useSite } from '../lib/site';
import { useLikes } from '../lib/likes';
import { UI_DEFAULT_SORT, type UiSort, shownUiSort, sortUiLibs } from '../lib/ui';

export const Route = createFileRoute('/ui')({
	// ?tag=, ?surface= and ?sort= keep the filters and the order in the address, so a link reproduces the view.
	validateSearch: validateUiSearch,
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/ui', title: 'title_ui', desc: 'desc_ui', name: 'cat_ui_name' }),
	component: UiPage,
});

const TAG: Record<UiLibKey, 'tag_theme' | 'tag_retro' | 'tag_icons'> = { theme: 'tag_theme', retro: 'tag_retro', icons: 'tag_icons' };

function UiPage() {
	const t = useT();
	const lang = useLang();
	const { openSubmit } = useSite();
	const { tag, surface, sort: sortParam } = Route.useSearch();
	const navigate = useNavigate({ from: '/ui' });
	const setFilter = (next: { tag?: UiLibKey; surface?: AppKind; sort?: UiSort }) => void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true, resetScroll: false });
	const { status: likes, counts } = useLikes();
	const sort = shownUiSort(sortParam, likes);
	const surfLabel: Record<Surface, string> = { go: t.surf_go, tsx: t.surf_tsx, both: t.surf_both };
	// A library for both kinds of app shows under either. The tags count the libraries of the chosen kind, so a chip never leads to an empty list; the one picked stays, and an empty list says so.
	const ofSurface = UI_LIBS.filter((l) => !surface || l.surface === surface || l.surface === 'both');
	const nGo = UI_LIBS.filter((l) => l.surface !== 'tsx').length;
	const nTsx = UI_LIBS.filter((l) => l.surface !== 'go').length;
	const chips = [{ key: undefined, n: ofSurface.length, label: t.all }, ...UI_KEYS.map((k) => ({ key: k, n: ofSurface.filter((l) => l.key === k).length, label: t[TAG[k]] }))].filter((c) => c.key === undefined || c.n > 0 || c.key === tag);
	const libs = sortUiLibs(ofSurface.filter((l) => !tag || l.key === tag), sort, counts);

	return (
		<section className='page enter gap-9 max-sm:gap-6'>
			<div className='flex flex-col gap-3'>
				<span className='kicker'>{fill(t.cat_ui_badge, { n: UI_LIBS.length })}</span>
				<h1 className='page-h1'>{t.cat_ui_name}</h1>
				{/* Below sm the lead paragraph is left out: on a phone it took four lines ahead of the list, whose heading and cards already say what the page holds. */}
				<p className='page-p max-sm:hidden'>{t.ui_p}</p>
				<a className='self-start text-[15px] font-semibold text-blue-ink no-underline hover:underline' href={NATIVE_UI_DOCS} target='_blank' rel='noopener'>
					{t.ui_builtin}
				</a>
			</div>
			<FilterBar>
				<FilterChips label={t.a_filter}>
					{chips.map((c) => (
						<FilterChip key={c.key ?? 'all'} onClick={() => setFilter({ tag: c.key })} pressed={tag === c.key} count={c.n} title={c.label}>
							{c.label}
						</FilterChip>
					))}
				</FilterChips>
				<FilterSelects grouped>
					<FilterSelect id='surface' label={t.f_ui} value={surface ?? 'all'} onChange={(v) => setFilter({ surface: v === 'all' ? undefined : (v as AppKind) })}>
						<option value='all'>{`${t.all} · ${UI_LIBS.length}`}</option>
						<option value='go'>{`${t.surf_go} · ${nGo}`}</option>
						<option value='tsx'>{`${t.surf_tsx} · ${nTsx}`}</option>
					</FilterSelect>
					<FilterSelect id='sort' label={t.sort} value={sort} onChange={(v) => setFilter({ sort: v === UI_DEFAULT_SORT ? undefined : (v as UiSort) })}>
						{HAS_SCORES && <option value='score'>{t.sort_score}</option>}
						<option value='newest'>{t.sort_new}</option>
						<option value='natural'>{t.sort_natural}</option>
						{likes !== 'off' && <option value='likes'>{t.sort_likes}</option>}
					</FilterSelect>
				</FilterSelects>
			</FilterBar>
			<div className={showGrid}>
				{libs.map((l, k) => {
					// The card opens the library's website when it has one; the bar then links its repository.
					const site = l.homepage ?? l.url;
					return (
						<div key={l.repo} className={`rv d${k % 6} flex`}>
							<EntryCard
								label={`github.com/${l.repo}`}
								bar={l.homepage && <BarLink href={l.url}>{t.on_github}</BarLink>}
								shot={
									// Without a screenshot the library's name sits on a dot field, so the card keeps the height of its neighbours.
									<CardShot href={site} className={`aspect-[16/10] ${l.image ? '' : 'dots'}`}>
										{l.image ? <img className={cardShotImg} src={l.image} alt='' width={1200} height={750} loading={k === 0 ? 'eager' : 'lazy'} fetchPriority={k === 0 ? 'high' : undefined} decoding='async' /> : <span className='inline-flex h-8 items-center rounded-full border border-line-2 bg-panel px-3.5 text-[13px] font-semibold text-fg-3'>{l.name}</span>}
									</CardShot>
								}
							>
								<CardHead as='h2' name={l.name} href={site} item={likeKey.ui(l)}>
									{/* A UI library's row carries two tags beside the like button: they go on their own line under the author, on every card so the descriptions line up, rather than squeeze its name away. The category is an outlined pill and the language a filled one, drawn as every page draws a language, so the two read as different kinds of label. */}
									<span className='flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5'>
										<span className={`${showBy} flex-[1_0_100%]`} title={l.author}>
											<span lang='en'>by</span> {l.author}
										</span>
										<span className='kind-tag flex-none self-auto border border-line-2 bg-transparent font-medium text-fg-2'>{t[TAG[l.key]]}</span>
										<span className={`kind-tag kind-${l.surface} flex-none self-auto`}>{surfLabel[l.surface]}</span>
									</span>
								</CardHead>
								<p className={showDesc}>{pick(l.desc, lang)}</p>
							</EntryCard>
						</div>
					);
				})}
			</div>
			{libs.length === 0 && (
				<div className='flex flex-wrap items-center gap-x-4 gap-y-3 rounded-band border border-line bg-soft p-7 text-[15px] text-fg-2'>
					<p className='m-0'>{t.ui_none}</p>
					<button type='button' className='btn-g btn-44 btn-outline' onClick={() => setFilter({ tag: undefined, surface: undefined })}>
						{t.f_clear}
					</button>
				</div>
			)}
			<CtaBox>
				<p className={ctaP}>{t.ui_cta}</p>
				<button type='button' className='btn-c btn-44' onClick={() => openSubmit('ui')}>
					{t.sub_ui}
				</button>
			</CtaBox>
		</section>
	);
}
