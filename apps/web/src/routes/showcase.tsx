import { APPS, APP_PLATFORMS, type AppKind, type AppPlatform, HAS_SCORES, fill } from '@awesome-nsgo/catalog';
import { DEFAULT_SORT, groupChips, shownSort, sortApps, validateShowcaseSearch } from '../lib/showcase';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AppCard, showGrid } from '../components/EntryCard';
import { FilterBar, FilterChip, FilterChips, FilterSelect, FilterSelects } from '../components/FilterBar';
import { useT } from '../lib/lang';
import { useLikes } from '../lib/likes';
import { pageHead } from '../lib/seo';

export const Route = createFileRoute('/showcase')({
	// ?cat= and ?ui= keep the filters in the address, so a filtered list can be shared; an unknown value is dropped by the canonical-URL redirect.
	validateSearch: validateShowcaseSearch,
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/showcase', title: 'title_showcase', desc: 'desc_showcase', name: 'cat_show_name' }),
	component: ShowcasePage,
});

function ShowcasePage() {
	const t = useT();
	const { cat: group, ui: kind, platform, sort: sortParam } = Route.useSearch();
	const navigate = useNavigate({ from: '/showcase' });
	const setFilter = (next: { cat?: typeof group; ui?: AppKind; platform?: AppPlatform; sort?: typeof sortParam }) => void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true, resetScroll: false });
	const { status: likes, counts } = useLikes();
	const sort = shownSort(sortParam, likes);

	const ofPlatform = APPS.filter((a) => !platform || a.platforms.includes(platform));
	const nGo = ofPlatform.filter((a) => a.kind === 'go').length;
	// The groups count the apps of the chosen language, so a chip never leads to an empty list.
	const ofKind = ofPlatform.filter((a) => !kind || a.kind === kind);
	const chips = groupChips(ofKind, group);
	const list = sortApps(
		ofKind.filter((a) => !group || chips.some((c) => c.key === group && c.apps.includes(a))),
		sort,
		counts,
	);

	return (
		<section className='page enter gap-8 max-sm:gap-5'>
			<div className='flex flex-col gap-3'>
				<span className='kicker'>{fill(t.live_badge, { n: APPS.length })}</span>
				<h1 className='page-h1'>{t.cat_show_name}</h1>
				{/* Below sm the lead paragraph is left out, as on the other listings: the cards already say what the page holds. */}
				<p className='page-p max-sm:hidden'>{t.cat_show_desc}</p>
			</div>
			<FilterBar>
				<FilterChips label={t.a_cats}>
					<FilterChip onClick={() => setFilter({ cat: undefined })} pressed={!group} count={ofKind.length} title={t.all}>
						{t.all}
					</FilterChip>
					{chips.map((c) => (
						<FilterChip key={c.key} onClick={() => setFilter({ cat: c.key })} pressed={group === c.key} count={c.apps.length} title={t[`grp_${c.key}`]}>
							{t[`grp_short_${c.key}`]}
						</FilterChip>
					))}
				</FilterChips>
				<FilterSelects grouped>
					<FilterSelect id='ui' label={t.f_ui} value={kind ?? 'all'} onChange={(v) => setFilter({ ui: v === 'all' ? undefined : (v as AppKind) })}>
						<option value='all'>{`${t.all} · ${APPS.length}`}</option>
						<option value='go'>{`${t.kind_go} · ${nGo}`}</option>
						<option value='tsx'>{`${t.kind_tsx} · ${APPS.length - nGo}`}</option>
					</FilterSelect>
					<FilterSelect id='platform' label={t.f_platform} value={platform ?? 'all'} onChange={(v) => setFilter({ platform: v === 'all' ? undefined : (v as AppPlatform) })}>
						<option value='all'>{`${t.all} · ${ofKind.length}`}</option>
						{APP_PLATFORMS.map((p) => <option key={p} value={p}>{`${t[`platform_${p}`]} · ${ofKind.filter((a) => a.platforms.includes(p)).length}`}</option>)}
					</FilterSelect>
					<FilterSelect id='sort' label={t.sort} value={sort} onChange={(v) => setFilter({ sort: v === DEFAULT_SORT ? undefined : (v as typeof sortParam) })}>
						<option value='natural'>{t.sort_natural}</option>
						<option value='newest'>{t.sort_new}</option>
						{likes !== 'off' && <option value='likes'>{t.sort_likes}</option>}
						{HAS_SCORES && <option value='score'>{t.sort_score}</option>}
					</FilterSelect>
				</FilterSelects>
			</FilterBar>
			{/* How many apps the filters leave, said again to a screen reader whenever a filter changes it. */}
			<p className='m-0 -mb-3 text-[13px] text-fg-3' aria-live='polite'>
				{fill(t.results, { x: String(list.length) })}
			</p>
			<div className={showGrid}>
				{list.map((a, k) => (
					<AppCard key={a.slug} app={a} k={k} />
				))}
			</div>
			{list.length === 0 && (
				<div className='flex flex-wrap items-center gap-x-4 gap-y-3 rounded-band border border-line bg-soft p-7 text-[15px] text-fg-2'>
					<p className='m-0'>{t.f_none}</p>
					<button type='button' className='btn-g btn-44 btn-outline' onClick={() => setFilter({ cat: undefined, ui: undefined, platform: undefined })}>
						{t.f_clear}
					</button>
				</div>
			)}
		</section>
	);
}
