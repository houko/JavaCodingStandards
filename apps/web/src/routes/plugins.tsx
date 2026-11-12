import { CLI_CMDS, COMMUNITY_PLUGINS, HAS_SCORES, PLUGINS, PLUGINS_DOC, type Plugin, type PluginSurface, compareByScore, fill, likeKey, pick, pluginPath } from '@awesome-nsgo/catalog';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CopyButton, SetupLine, cmdRow } from '../components/CopyCmd';
import { CtaBox, CtaHead } from '../components/Cta';
import { BarLink, CardHead, EntryCard, TagList, showDesc } from '../components/EntryCard';
import { FilterBar, FilterChip, FilterChips, FilterSelect, FilterSelects } from '../components/FilterBar';
import { useLikes } from '../lib/likes';
import { validatePluginsSearch } from '../lib/page-search';
import { useLang, useT } from '../lib/lang';
import { pageHead } from '../lib/seo';
import { useSite } from '../lib/site';

// The letter tile's colour cycles by position, as the showcase's tiles do.
const TONES = ['tone-0', 'tone-1', 'tone-2'] as const;

// The pill of a plugin's tag of the kind of app it serves, drawn as an app's kind tag is (styles/primitives.css).
const SURF_TONE: Record<PluginSurface, string> = { tsx: 'kind-tsx', go: 'kind-go', both: 'kind-both' };

// A CLI command's row: the command row of an entry card, on the panel colour, as it sits on the soft band of the command line's box.
const cliRow = cmdRow.replace('bg-soft', 'bg-panel');

// `import "github.com/oneo-me/nsgo/base/datatable"`, split before its last two segments.
function goLine(path: string): { head: string; tail: string } {
	const parts = path.split('/');
	const cut = Math.max(parts.length - 2, 1);
	return { head: `import "${parts.slice(0, cut).join('/')}/`, tail: `${parts.slice(cut).join('/')}"` };
}

export const Route = createFileRoute('/plugins')({
	// ?surface= and ?sort= keep the filter and the order in the address, so a link reproduces the view.
	validateSearch: validatePluginsSearch,
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/plugins', title: 'title_plugins', desc: 'desc_plugins', name: 'nav_plugins' }),
	component: PluginsPage,
});

function PluginsPage() {
	const t = useT();
	const lang = useLang();
	const { openSubmit } = useSite();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: '/plugins' });
	const setSearch = (next: typeof search) => void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true, resetScroll: false });
	const source = search.source ?? 'all';
	const setSource = (next: 'all' | 'official' | 'community') => setSearch({ source: next === 'all' ? undefined : next });
	const surface = search.surface ?? 'all';
	const setSurface = (s: 'all' | 'go' | 'tsx') => setSearch({ surface: s === 'all' ? undefined : s });
	const surfLabel: Record<PluginSurface, string> = { go: t.surf_go, tsx: t.surf_tsx, both: t.surf_both };
	// A plugin for both kinds of app shows under either filter.
	const fits = (s: PluginSurface) => surface === 'all' || s === surface || s === 'both';
	const { status: likes, counts } = useLikes();
	// Highest score first, which the address leaves out, unless the link asks for the docs' order or the most liked. With likes off there is no most-liked order, and before the first scores no order by score, whatever the link says; either falls back to the default.
	const fallback = HAS_SCORES ? 'score' : 'docs';
	const sort = (search.sort === 'likes' && likes === 'off') || (search.sort === 'score' && !HAS_SCORES) || !search.sort ? fallback : search.sort;
	const shown = PLUGINS.filter((p) => fits(p.surface));
	// The community's plugins, under the same filter, after the official ones and the call to write one.
	const community = COMMUNITY_PLUGINS.filter((p) => fits(p.surface));
	const sourcePlugins = source === 'official' ? PLUGINS : source === 'community' ? COMMUNITY_PLUGINS : [...PLUGINS, ...COMMUNITY_PLUGINS];
	const sourceLabel = source === 'all' ? t.all : source === 'official' ? t.plug_official : t.plug_community;
	// Most liked or highest score first; equal likes keep the docs' order, and equal totals are ordered by the unrounded sum, then the raw active weeks and release days, then the docs' order (compareByScore). A plugin without a score yet stays in its docs order.
	for (const list of [shown, community]) {
		if (sort === 'likes') list.sort((a, b) => (counts[likeKey.plugin(b)] ?? 0) - (counts[likeKey.plugin(a)] ?? 0));
		if (sort === 'score') list.sort((a, b) => compareByScore(likeKey.plugin(a), likeKey.plugin(b)));
	}
	const chips = [
		{ key: 'all' as const, label: t.all, n: sourcePlugins.length },
		{ key: 'go' as const, label: t.surf_go, n: sourcePlugins.filter((p) => p.surface !== 'tsx').length },
		{ key: 'tsx' as const, label: t.surf_tsx, n: sourcePlugins.filter((p) => p.surface !== 'go').length },
	];
	// One plugin's card, as the official ones and the community's are shown alike.
	const card = (p: Plugin, k: number) => {
		// What the docs say to do first: import the Go package, and add the npm package when there is one (NSGo's own packages have none). `tail` is the part that tells the lines apart (the package's last two segments), which stays whole while `head` gives way to an ellipsis on a narrow card.
		const setup = [...(p.goImport ? [{ key: `plug:${p.slug}:go` as const, ...goLine(p.goImport) }] : []), ...(p.npm ? [{ key: `plug:${p.slug}:npm` as const, head: 'npm install ', tail: p.npm }] : [])];
		return (
			<div key={p.slug} className={`rv d${k % 6} flex`}>
				<EntryCard label={pluginPath(p)} bar={<BarLink href={p.url}>{t.docs_link}</BarLink>}>
					<CardHead
						as='h2'
						name={p.name}
						href={p.url}
						item={likeKey.plugin(p)}
						tile={
							<span className={`mono-tile mono-44 ${TONES[k % 3]}`} aria-hidden='true'>
								{p.mark}
							</span>
						}
					>
						<span className={`kind-tag ${SURF_TONE[p.surface]}`}>{surfLabel[p.surface]}</span>
					</CardHead>
					<p className={showDesc}>{pick(p.desc, lang)}</p>
					{/* A plugin's setup lines: the Go import and, for a plugin that comes with one, its npm package. */}
					{setup.length > 0 && (
						<div className='flex flex-col gap-1.5'>
							{setup.map((line) => (
								<SetupLine key={line.key} head={line.head} tail={line.tail} copyKey={line.key} />
							))}
						</div>
					)}
					<TagList tags={p.tags} />
				</EntryCard>
			</div>
		);
	};
	return (
		<section className='page enter gap-10 max-sm:gap-6'>
			<div className='flex flex-col gap-3'>
				<span className='kicker'>{`${sourceLabel} · ${sourcePlugins.length}`}</span>
				<h1 className='page-h1'>{t.nav_plugins}</h1>
				{/* Below sm the lead paragraph is left out: on a phone it took four lines ahead of the list, whose heading and cards already say what the page holds. */}
				<p className='page-p max-sm:hidden'>{t.plug_p}</p>
			</div>
			<FilterBar>
				<FilterChips label={t.a_filter}>
					{chips.map((c) => (
						<FilterChip key={c.key} onClick={() => setSurface(c.key)} pressed={surface === c.key} count={c.n} title={c.label}>
							{c.label}
						</FilterChip>
					))}
				</FilterChips>
				<span className='hidden h-6 w-px bg-line-2 md:block' aria-hidden='true' />
				<FilterChips label={t.nav_plugins}>
					{(['all', 'official', 'community'] as const).map((key) => {
						const count = key === 'all' ? PLUGINS.length + COMMUNITY_PLUGINS.length : key === 'official' ? PLUGINS.length : COMMUNITY_PLUGINS.length;
						const label = key === 'all' ? t.all : key === 'official' ? t.plug_official : t.plug_community;
						return (
							<FilterChip key={key} onClick={() => setSource(key)} pressed={source === key} count={count} title={label}>
								{label}
							</FilterChip>
						);
					})}
				</FilterChips>
				{(likes !== 'off' || HAS_SCORES) && (
					<FilterSelects grouped>
						<FilterSelect id='sort' label={t.sort} value={sort} onChange={(v) => setSearch({ sort: v === fallback ? undefined : (v as typeof sort) })}>
							<option value='docs'>{t.sort_def}</option>
							{likes !== 'off' && <option value='likes'>{t.sort_likes}</option>}
							{HAS_SCORES && <option value='score'>{t.sort_score}</option>}
						</FilterSelect>
					</FilterSelects>
				)}
			</FilterBar>
			{source !== 'community' && (
				<>
					{/* With no official package under the filter (or none listed yet), a line says so rather than an empty grid. */}
					{shown.length > 0 ? <div className='grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-4'>{shown.map(card)}</div> : <p className='m-0 text-[15px] text-fg-2'>{t.plug_none}</p>}
					{/* The nsgo command line: what it does beside its commands, each with a $ prompt and a copy button. */}
					<div className='rv grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] items-center gap-6 rounded-band border border-line bg-soft p-7 max-sm:p-5'>
						<div className='flex flex-col gap-2'>
							<h2 className='m-0 text-[22px] font-bold tracking-[-0.02em]'>{t.tool_h}</h2>
							<p className='m-0 text-[15px] leading-[1.7] text-fg-2'>{t.tool_p}</p>
						</div>
						<div className='flex flex-col gap-2'>
							{CLI_CMDS.map((cmd, i) => {
								const key = i === 0 ? 'cmd0' : 'cmd1';
								return (
									<div key={cmd} className={cliRow}>
										<span className='flex-auto overflow-x-auto font-mono text-[14px] whitespace-nowrap text-fg'>
											<span className='cmd-p'>$ </span>
											{cmd}
										</span>
										<CopyButton text={cmd} copyKey={key} label={t.a_copy_cmd} />
									</div>
								);
							})}
						</div>
					</div>
				</>
			)}
			{source !== 'official' && (
				<>
					<CtaBox>
						<CtaHead as='h2' title={COMMUNITY_PLUGINS.length > 0 ? fill(t.comm_h, { n: COMMUNITY_PLUGINS.length }) : t.comm_none} text={t.comm_p} />
						<div className='flex flex-wrap gap-2.5'>
							<a className='btn-g btn-44 btn-outline px-4' href={PLUGINS_DOC} target='_blank' rel='noopener'>
								{t.guide}
							</a>
							<button type='button' className='btn-c btn-44' onClick={() => openSubmit('plugin')}>
								{t.sub_plugin}
							</button>
						</div>
					</CtaBox>
					{/* With no community plugin at all the heading above already says so; the line below is for a filter that leaves none of them. */}
					{community.length > 0 ? <div className='grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-4'>{community.map(card)}</div> : COMMUNITY_PLUGINS.length > 0 && <p className='m-0 text-[15px] text-fg-2'>{t.comm_none}</p>}
				</>
			)}
		</section>
	);
}
