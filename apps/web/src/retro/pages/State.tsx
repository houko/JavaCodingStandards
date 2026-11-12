import { STATE_DOC, STATE_SOLUTIONS, fill, likeKey, pad2, pick } from '@awesome-nsgo/catalog';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { STATE_BLOCKS, type StateBlock } from '../../lib/page-search';
import { LikeButton } from '../../components/Like';
import { ScoreButton } from '../../components/Score';
import { useLang, useT } from '../../lib/lang';
import { useSite } from '../../lib/site';
import { DesktopIcons } from '../DesktopIcons';
import { PixelIcon, StatusBar, Win, btnGo, btnSm, field, likeBtn, well } from '../ui';

type BlockId = StateBlock;

// The state page: a header window, the listed solutions in a tall window on the right, NSGo's built-in reactive primitives as a property sheet with a code pane, and a dialog asking for more solutions. Below the desktop breakpoint the windows stack in that order.
// On the desktop the grid is exactly one window tall, so the page fits one screen. The primitives row takes its content height or what the header and the dialog leave, whichever is less, and the last row soaks up the rest; the primitives and solutions windows scroll inside themselves when they are cut short.
export function State() {
	const t = useT();
	const listed = STATE_SOLUTIONS.length > 0;
	return (
		<div className='relative mx-auto flex max-w-[1440px] flex-col gap-[26px] px-3.5 pt-3.5 desk:grid desk:h-[calc(var(--win-max)+26px)] desk:grid-cols-12 desk:grid-rows-[auto_minmax(0,auto)_auto_1fr] desk:items-start desk:gap-x-7 desk:gap-y-0 desk:pt-[26px] desk:pr-10 desk:pl-[136px]'>
			<DesktopIcons className='hidden desk:absolute desk:top-[26px] desk:left-[18px] desk:grid desk:grid-cols-1 desk:gap-4' />
			<Win level={1} title={t.cat_state_name} closeTo='/' className='desk:col-span-6 desk:col-start-1 desk:row-start-1'>
				<div className='flex flex-wrap items-center gap-2.5 px-1.5 pt-[3px] pb-1.5'>
					<span className={`${field} font-mono`} lang='en'>
						~/state
					</span>
					<span className='flex-1' />
					<span className='flex items-center gap-1.5'>
						<span aria-hidden='true' className={`size-2 rounded-full bg-[#28c840] ${listed ? '' : 'animate-blink'}`} />
						{listed ? fill(t.cat_state_count, { n: STATE_SOLUTIONS.length }) : t.cat_state_badge}
					</span>
				</div>
				<div className={`${well} px-5 pt-4 pb-[18px]`}>
					<p className='m-0 leading-[22px]'>{t.state_p}</p>
				</div>
				<StatusBar>
					<span>{t.cat_state_desc}</span>
				</StatusBar>
			</Win>
			{listed && <Solutions />}
			<Primitives />
			<Ask listed={listed} />
		</div>
	);
}

// Every listed solution in one window, a section each: preview, name, description, the install line with a copy button, and its links.
function Solutions() {
	const t = useT();
	const lang = useLang();
	const { copy, copied } = useSite();
	// Not `fill`: its cap is the grid area less the stagger offset, not the whole screen, so the window keeps its content height until the screen runs out.
	return (
		<Win title={t.state_listed_h} className='desk:col-span-6 desk:col-start-7 desk:row-span-4 desk:row-start-1 desk:mt-10 desk:-ml-3 desk:flex desk:max-h-[calc(100%-2.5rem)] desk:min-h-0 desk:flex-col' bodyClassName='desk:flex desk:min-h-0 desk:flex-1 desk:flex-col'>
			<div className={`${well} relative divide-y divide-line px-3.5 desk:min-h-0 desk:flex-1 desk:overflow-y-auto`}>
				{STATE_SOLUTIONS.map((s, k) => (
					<article key={s.repo} className='grid gap-x-4 gap-y-3 py-3.5 min-[480px]:grid-cols-[200px_minmax(0,1fr)]'>
						{s.image && (
							<a href={s.homepage ?? s.url} target='_blank' rel='noopener' className='block self-start overflow-hidden rounded-lg border border-line shadow-sm transition-shadow hover:shadow-pop'>
								<img src={s.image} alt={`${s.name} ${t.preview_img}`} width={1200} height={630} loading={k === 0 ? 'eager' : 'lazy'} fetchPriority={k === 0 ? 'high' : undefined} decoding='async' className='block aspect-[1200/630] w-full' />
							</a>
						)}
						<div className={`min-w-0 ${s.image ? '' : 'min-[480px]:col-span-2'}`}>
							<div className='flex flex-wrap items-baseline gap-x-2'>
								<h3 className='m-0 text-sm leading-5 font-semibold'>{s.name}</h3>
								<span className='text-muted'>
									<span lang='en'>by</span> {s.author}
								</span>
							</div>
							<p lang='en' className='m-0 truncate font-mono text-xs leading-5 text-faint'>
								github.com/{s.repo}
							</p>
							<p className='m-0 mt-1 mb-2 line-clamp-3'>{pick(s.desc, lang)}</p>
							<div className='flex flex-wrap gap-1.5'>
								{s.tags.map((tag) => (
									<code key={tag} lang='en' className='rounded border border-line bg-face px-1.5 font-mono text-xs leading-5'>
										{tag}
									</code>
								))}
							</div>
						</div>
						<div className='flex items-center justify-between gap-2 rounded-lg bg-ink py-[3px] pr-[3px] pl-2.5 font-mono text-xs text-paper min-[480px]:col-span-2'>
							<code lang='en' className='min-w-0 wrap-break-word'>
								<span className='text-sky'>❯ </span>
								<span className='text-yel'>{s.install}</span>
							</code>
							<button type='button' className={`${btnSm} font-ui text-ink`} onClick={() => copy(s.install, 'cmd0')} aria-label={t.a_copy_cmd}>
								{copied === 'cmd0' ? t.copied : t.copy}
							</button>
						</div>
						<div className='flex flex-wrap gap-1.5 min-[480px]:col-span-2'>
							<a className={btnSm} href={s.url} target='_blank' rel='noopener'>
								{t.on_github}
							</a>
							{s.homepage && (
								<a className={btnSm} href={s.homepage} target='_blank' rel='noopener'>
									{t.visit}
								</a>
							)}
							<LikeButton item={likeKey.state(s)} name={s.name} className={likeBtn} size={12} />
							<ScoreButton item={likeKey.state(s)} name={s.name} />
						</div>
					</article>
				))}
			</div>
			<StatusBar>
				<span>{fill(t.cat_state_count, { n: STATE_SOLUTIONS.length })}</span>
			</StatusBar>
		</Win>
	);
}

// The built-in primitives as a property sheet: numbered tabs down the left, the selected one's snippet in a code pane on the right.
function Primitives() {
	const t = useT();
	// ?block= keeps the open example in the address, as in the original look.
	const search = useSearch({ from: '/state' });
	const navigate = useNavigate({ from: '/state' });
	const block: BlockId = search.block ?? 'signal';
	const setBlock = (b: BlockId) => void navigate({ search: (prev) => ({ ...prev, block: b === 'signal' ? undefined : b }), replace: true, resetScroll: false });
	const names: Record<StateBlock, { name: string; desc: string }> = { signal: { name: t.blk_signal_n, desc: t.blk_signal_d }, memo: { name: t.blk_memo_n, desc: t.blk_memo_d }, context: { name: t.blk_context_n, desc: t.blk_context_d } };
	const blocks = STATE_BLOCKS.map((b) => ({ ...b, ...names[b.id] }));
	const current = blocks.find((b) => b.id === block) ?? blocks[0];
	return (
		<Win title={t.a_builtin} idle fill className='desk:col-span-6 desk:col-start-1 desk:row-start-2 desk:mt-5 desk:ml-8 desk:min-h-0 desk:self-stretch'>
			<div className={`${well} grid gap-3 p-3 desk:min-h-0 desk:flex-1 desk:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] desk:grid-rows-[minmax(0,1fr)]`}>
				<div role='tablist' aria-label={t.a_builtin} aria-orientation='vertical' className='relative grid content-start gap-1 desk:min-h-0 desk:overflow-y-auto'>
					{blocks.map((b, i) => (
						<button key={b.id} type='button' role='tab' id={`blk-${b.id}`} aria-controls='blk-panel' aria-selected={b.id === block} onClick={() => setBlock(b.id)} className='group grid cursor-pointer grid-cols-[22px_1fr] gap-x-2 rounded-lg border-0 bg-transparent px-2 py-1.5 text-left hover:bg-ink/5 aria-selected:bg-ink aria-selected:text-paper'>
							<span className='font-mono text-lo group-aria-selected:text-yel'>{pad2(i + 1)}</span>
							<span>
								<span className='block'>
									{b.name}{' '}
									<span lang='en' className='font-mono text-faint group-aria-selected:text-sky'>
										{b.kicker}
									</span>
								</span>
								<span className='block text-muted group-aria-selected:text-paper/70'>{b.desc}</span>
							</span>
						</button>
					))}
				</div>
				<div role='tabpanel' id='blk-panel' aria-labelledby={`blk-${current.id}`} className='flex flex-col rounded-lg bg-ink text-paper desk:min-h-0'>
					<div className='flex h-[24px] items-center gap-2 border-b border-[#2c4058] px-3 text-slate'>
						<span lang='en' className='font-mono'>
							app.go
						</span>
					</div>
					<pre lang='en' className='relative m-0 min-h-[96px] flex-1 overflow-x-auto desk:min-h-0 px-3 py-2.5 font-mono whitespace-pre-wrap'>
						{current.code}
					</pre>
					<a href={STATE_DOC} target='_blank' rel='noopener' lang='en' className='rounded-b-lg border-t border-[#2c4058] px-3 py-1.5 text-yel hover:bg-paper/5'>
						Components and state ↗
					</a>
				</div>
			</div>
		</Win>
	);
}

// The closing dialog: with solutions listed it asks for another one, otherwise it invites the first.
function Ask({ listed }: { listed: boolean }) {
	const t = useT();
	const { openSubmit } = useSite();
	// Below 1261px the desktop columns are too narrow for the header, the primitives and this dialog to share one screen (in English the primitives window collapsed to its title bar at 1100x700), so the dialog is hidden there; Submit stays in the menu bar and on the desktop icons.
	return (
		<section aria-labelledby='state-ask' className='mx-1 grid grid-cols-[40px_1fr] gap-x-4 gap-y-2.5 rounded-xl border border-line bg-face p-3.5 shadow-win desk:col-span-5 desk:col-start-2 desk:row-start-3 desk:hidden desk:m-0 desk:mt-6 desk:ml-4 desk:px-[18px] desk:pt-4 desk:pb-3.5 min-[1261px]:grid'>
			<PixelIcon name='inbox' scale={2} className='mt-1' />
			<div>
				<h2 id='state-ask' className='m-0 mb-1 text-xl leading-7 font-semibold [&:lang(ko)]:break-keep'>
					{listed ? t.state_more_h : t.state_empty_h}
				</h2>
				<p className='m-0'>{t.state_empty_p}</p>
			</div>
			<div className='col-span-full flex flex-wrap justify-end gap-2.5 pt-1'>
				<button type='button' className={btnGo} onClick={() => openSubmit('state')}>
					{t.sub_state}
				</button>
			</div>
		</section>
	);
}
