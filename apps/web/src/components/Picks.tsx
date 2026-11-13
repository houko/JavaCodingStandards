import { GENRE_COLORS, GENRE_KEYS, type LangCode, PICKS, formatCount, formatDay, pick, t } from '@vibe-arcade/catalog';
import { useState } from 'react';
import { BTN_LIME, BTN_LINE, H2, NEW_TAB, WRAP } from '../lib/ui';
import { Clip } from './Clip';
import { Cover } from './Cover';
import { CreatorLink } from './CreatorLink';
import { GameLink } from './GameLink';
import { ArrowOut } from './Icons';
import { noteLabel } from './Notes';

const ACTION = { play: 'playNow', source: 'sourceLabel', watch: 'watchLabel' } as const;
const two = (n: number) => String(n).padStart(2, '0');

// This week's picks (data/meta.json): one shown large, with what its creator reported about building it, the others a button away.
export function Picks({ lang, onOpen }: { lang: LangCode; onOpen: (slug: string) => void }) {
	const tr = t(lang);
	const [index, setIndex] = useState(0);
	const game = PICKS[index];
	// Up to three of the creator's figures, then the likes, and the day of the post when that leaves room.
	const stats = [...(game.notes?.facts.slice(0, 3).map((f) => ({ label: noteLabel(f.field, tr), value: f.value })) ?? []), { label: tr.likesOnX, value: formatCount(game.likes, lang) }];
	if (stats.length < 4) stats.push({ label: tr.posted, value: formatDay(game.postedAt, lang) });
	return (
		<section id='picks' className={`avg-reveal ${WRAP} pb-16 sm:pb-20`} aria-labelledby='picks-h'>
			<div className='mb-5 flex flex-wrap items-center justify-between gap-4'>
				<h2 id='picks-h' className={H2}>
					{tr.weekPicks}
				</h2>
				{PICKS.length > 1 && (
					<div role='group' aria-label={tr.weekPicks} className='avg-chiprow flex gap-2 max-sm:-mx-4 max-sm:overflow-x-auto max-sm:px-4 max-sm:py-1.5'>
						{PICKS.map((g, i) => (
							<button key={g.slug} type='button' aria-pressed={i === index} onClick={() => setIndex(i)} className={`avg-chip inline-flex min-h-11 flex-none cursor-pointer items-center gap-2.5 rounded-full border py-0 pr-4 pl-1.5 text-[14px] font-medium whitespace-nowrap ${i === index ? 'border-fg bg-fg text-bg' : 'border-line-2 bg-transparent text-fg'}`}>
								<span className='size-8 flex-none overflow-hidden rounded-full bg-track'>
									<Cover game={g} alt='' className='size-full text-[0px]' />
								</span>
								<span className='font-mono text-[12px] opacity-70'>{two(i + 1)}</span>
								{g.name}
							</button>
						))}
					</div>
				)}
			</div>
			{/* Keyed by the pick, so choosing another replays the entrance. */}
			<div key={game.slug} className='avg-pop-a flex flex-wrap overflow-hidden rounded-2xl border border-line bg-panel'>
				<div className='relative min-h-[240px] flex-[3_1_520px] overflow-hidden bg-ink sm:min-h-[440px]'>
					<Cover game={game} alt={`${game.name} — ${tr.coverAlt}`} className='avg-kb absolute inset-0 size-full text-[32px]' />
					{(game.heroVideo ?? game.video) && <Clip src={(game.heroVideo ?? game.video) as string} small={game.video} />}
					<div className='absolute top-4 left-4 flex flex-wrap gap-2 font-mono text-[12px] font-semibold tracking-[0.06em] uppercase'>
						<span className='rounded-md px-2.5 py-1.5 text-bg' style={{ backgroundColor: GENRE_COLORS[game.genre] }}>
							{tr[GENRE_KEYS[game.genre]]}
						</span>
						<span className='rounded-md bg-bg px-2.5 py-1.5 text-fg'>{tr.gotw}</span>
					</div>
				</div>
				<div className='flex min-w-0 flex-[2_1_380px] flex-col gap-5 p-6 sm:p-10'>
					<p className='font-mono text-[13px] tracking-[0.08em] text-lime uppercase'>
						{tr.featured} · {two(index + 1)} / {two(PICKS.length)}
					</p>
					<h3 className='font-display text-[38px] leading-none font-extrabold tracking-[-0.03em] sm:text-[48px]'>
						<GameLink slug={game.slug} onOpen={onOpen}>
							{game.name}
						</GameLink>
					</h3>
					<p className='text-[15px] text-muted'>
						{tr.by}{' '}
						<CreatorLink creator={game.creator} className='underline'>
							@{game.creator}
						</CreatorLink>{' '}
						· {tr.builtWith} {game.model} · <time dateTime={game.postedAt}>{formatDay(game.postedAt, lang)}</time>
					</p>
					<p className='max-w-[560px] text-[17px] text-soft-2 sm:text-[18px]'>{pick(game.pitch ?? game.summary, lang)}</p>
					<dl className='flex flex-wrap gap-x-8 gap-y-4 border-t border-line pt-5'>
						{stats.map((s) => (
							<div key={s.label} className='flex flex-col-reverse justify-end gap-0.5'>
								<dt className='text-[13px] text-muted first-letter:uppercase'>{s.label}</dt>
								<dd className='font-display text-[24px] leading-tight font-bold whitespace-nowrap'>{s.value}</dd>
							</div>
						))}
					</dl>
					<div className='flex flex-wrap gap-3 pt-1'>
						<a href={game.link.url} {...NEW_TAB} className={`${BTN_LIME} px-5 py-3`}>
							{tr[ACTION[game.link.type]]}
							<ArrowOut />
						</a>
						<button type='button' onClick={() => onOpen(game.slug)} className={`${BTN_LINE} bg-transparent px-5 py-3 text-fg`}>
							{tr.details}
						</button>
						{game.link.url !== game.postUrl && (
							<a href={game.postUrl} {...NEW_TAB} className={`${BTN_LINE} px-5 py-3`}>
								{tr.readPost}
							</a>
						)}
					</div>
				</div>
			</div>
		</section>
	);
}
