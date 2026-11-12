import { STATE_DOC, STATE_SOLUTIONS, fill, likeKey, pick } from '@awesome-nsgo/catalog';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { SetupLine } from '../components/CopyCmd';
import { CtaBox, CtaHead } from '../components/Cta';
import { BarLink, CardHead, CardShot, EntryCard, TagList, cardShotImg, showBy, showDesc, showGrid } from '../components/EntryCard';
import { GoCode } from '../components/GoCode';
import { EmptyLanes } from '../components/marks';
import { useLang, useT } from '../lib/lang';
import { STATE_BLOCKS, type StateBlock, validateStateSearch } from '../lib/page-search';
import { pageHead } from '../lib/seo';
import { useSite } from '../lib/site';

export const Route = createFileRoute('/state')({
	// ?block= keeps the open example in the address, so a link reproduces the view.
	validateSearch: validateStateSearch,
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/state', title: 'title_state', desc: 'desc_state', name: 'cat_state_name' }),
	component: StatePage,
});

type BlockId = StateBlock;

function StatePage() {
	const t = useT();
	const lang = useLang();
	const { openSubmit } = useSite();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: '/state' });
	const block: BlockId = search.block ?? 'signal';
	const setBlock = (b: BlockId) => void navigate({ search: (prev) => ({ ...prev, block: b === 'signal' ? undefined : b }), replace: true, resetScroll: false });
	const names: Record<StateBlock, { name: string; desc: string }> = { signal: { name: t.blk_signal_n, desc: t.blk_signal_d }, memo: { name: t.blk_memo_n, desc: t.blk_memo_d }, context: { name: t.blk_context_n, desc: t.blk_context_d } };
	const blocks = STATE_BLOCKS.map((b) => ({ ...b, ...names[b.id] }));
	const current = blocks.find((b) => b.id === block) ?? blocks[0];
	const listed = STATE_SOLUTIONS.length > 0;

	return (
		<section className='page enter gap-10 max-sm:gap-6'>
			<div className='flex flex-col gap-3'>
				{/* The count once a solution is listed; until then the "wanted" badge, in its warm tone. */}
				<span className='kicker' data-tone={listed ? undefined : 'dev'}>
					{listed ? fill(t.cat_state_count, { n: STATE_SOLUTIONS.length }) : t.cat_state_badge}
				</span>
				<h1 className='page-h1'>{t.cat_state_name}</h1>
				{/* Below sm the lead paragraph is left out: on a phone it took four lines ahead of the list, whose heading and cards already say what the page holds. */}
				<p className='page-p max-sm:hidden'>{t.state_p}</p>
			</div>

			{listed && (
				<div className='flex flex-col gap-4'>
					<h2 className='m-0 text-[22px] font-bold tracking-[-0.02em]'>{t.state_listed_h}</h2>
					<div className={showGrid}>
						{STATE_SOLUTIONS.map((s, k) => {
							// As on a plugin card, the install line gives way to an ellipsis before its last path segment, which tells the lines apart.
							const cut = s.install.lastIndexOf('/') + 1;
							const key = `state:${s.slug}` as const;
							// The card opens the library's website when it has one; the bar then links its repository.
							const site = s.homepage ?? s.url;
							return (
								<div key={s.repo} className={`rv d${k % 6} flex`}>
									<EntryCard
										label={`github.com/${s.repo}`}
										bar={s.homepage && <BarLink href={s.url}>{t.on_github}</BarLink>}
										shot={
											// A state solution's screenshot is its 1200x630 social card, shown whole.
											s.image && (
												<CardShot href={site} className='aspect-[1200/630]'>
													<img className={cardShotImg} src={s.image} alt='' width={1200} height={630} loading={k === 0 ? 'eager' : 'lazy'} fetchPriority={k === 0 ? 'high' : undefined} decoding='async' />
												</CardShot>
											)
										}
									>
										<CardHead as='h3' name={s.name} href={site} item={likeKey.state(s)}>
											<span className={showBy} title={s.author}>
												<span lang='en'>by</span> {s.author}
											</span>
										</CardHead>
										<p className={showDesc}>{pick(s.desc, lang)}</p>
										<SetupLine head={s.install.slice(0, cut)} tail={s.install.slice(cut)} copyKey={key} />
										<TagList tags={s.tags} />
									</EntryCard>
								</div>
							);
						})}
					</div>
				</div>
			)}

			<div className='grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-stretch gap-5'>
				<div className='flex flex-col gap-2.5' role='tablist' aria-label={t.a_builtin}>
					{blocks.map((b, i) => (
						<button key={b.id} type='button' role='tab' aria-selected={b.id === block} onClick={() => setBlock(b.id)} className='group flex items-start gap-4 rounded-frame border border-line-2 bg-panel px-5 py-5 text-left text-fg transition-[border-color,background,box-shadow] duration-150 hover:border-line-3 aria-selected:border-blue aria-selected:bg-blue-soft/60 aria-selected:[box-shadow:0_0_0_3px_color-mix(in_srgb,var(--color-blue)_14%,transparent)] max-sm:gap-3.5 max-sm:px-4 max-sm:py-4'>
							<span className='sk-num'>
								<span>{i + 1}</span>
							</span>
							<span className='flex flex-col gap-1.5'>
								<span className='text-[17px] font-[650]'>
									{b.name} <span className='font-mono text-[12px] font-normal text-fg-3 group-aria-selected:text-fg-2'>{b.kicker}</span>
								</span>
								<span className='text-[14px] leading-[1.65] text-fg-2'>{b.desc}</span>
							</span>
						</button>
					))}
				</div>
				{/* The open example as an editor pane: a file tab over the coloured source, and the docs link under it. */}
				<div className='editor' role='tabpanel'>
					<div className='editor-bar'>
						<span className='editor-tab' data-current lang='en'>
							app.go
						</span>
					</div>
					<div className='code flex-auto p-[22px] text-[13.5px] leading-[1.85] max-sm:p-[18px]'>
						<GoCode code={current.code} />
					</div>
					<a href={STATE_DOC} target='_blank' rel='noopener' className='flex min-h-12 items-center border-t border-line-2 bg-panel px-[22px] text-[14px] font-semibold text-blue-ink no-underline hover:underline focus-visible:rounded-b-frame focus-visible:outline-offset-[-2px] max-sm:px-[18px]' lang='en'>
						Components and state ↗
					</a>
				</div>
			</div>

			{listed ? (
				<CtaBox>
					<CtaHead as='h3' title={t.state_more_h} text={t.state_empty_p} />
					<button type='button' className='btn-c btn-44' onClick={() => openSubmit('state')}>
						{t.sub_state}
					</button>
				</CtaBox>
			) : (
				<div className='rv dots flex flex-col items-center gap-4 rounded-band border border-line bg-soft px-7 py-14 text-center max-sm:px-5 max-sm:py-10'>
					<EmptyLanes />
					<h2 className='m-0 text-[24px] font-bold tracking-[-0.02em]'>{t.state_empty_h}</h2>
					<p className='m-0 max-w-[36em] text-[15px] leading-[1.75] text-fg-2'>{t.state_empty_p}</p>
					<button type='button' className='btn-c btn-44' onClick={() => openSubmit('state')}>
						{t.sub_state}
					</button>
				</div>
			)}
		</section>
	);
}
