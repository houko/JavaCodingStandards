import { GAMES, GENRE_COLORS, GENRE_KEYS, HERO_GAMES, LAST_UPDATED, type LangCode, MODELS, creatorsCount, formatCount, formatDay, t } from '@vibe-arcade/catalog';
import { useEffect, useState } from 'react';
import { prefersReducedMotion, setMotionPaused, useCountUp, useMotionPaused } from '../lib/motion';
import { BTN_LIME, BTN_LINE, NEW_TAB } from '../lib/ui';
import { Clip } from './Clip';
import { Cover } from './Cover';
import { ArrowDown, ArrowOut, ChevronRight, Dice, Pause, Play } from './Icons';

// How long the screen stays on one game.
const ROTATE_MS = 6500;
const ACTION = { play: 'playNow', source: 'sourceLabel', watch: 'watchLabel' } as const;

// The line of counts under the screen. The three counts run up from zero once after mount; the server and the first client render show the final numbers.
function Stats({ lang }: { lang: LangCode }) {
	const tr = t(lang);
	const ease = useCountUp();
	const counts = [
		{ value: Math.round(GAMES.length * ease), label: tr.statGames },
		{ value: Math.round(creatorsCount * ease), label: tr.statCreators },
		{ value: Math.max(1, Math.round(MODELS.length * ease)), label: tr.statModels },
	];
	return (
		<p className='avg-in avg-d5 flex flex-wrap justify-center gap-x-7 gap-y-2 pt-2 text-[14px] text-muted'>
			{counts.map((c) => (
				<span key={c.label}>
					<strong className='font-mono font-bold text-fg tabular-nums'>{c.value}</strong> {c.label}
				</span>
			))}
			<span>
				{tr.statUpdated} <strong className='font-mono font-bold text-fg'>{formatDay(LAST_UPDATED, lang)}</strong>
			</span>
		</p>
	);
}

// The screen: the most liked games that have a clip, one at a time, each for a few seconds. It holds still while the pointer or the keyboard is on it, while the visitor has paused the page's motion, and for a visitor who asked for less of it; the dots choose a game by hand.
function Screen({ lang, onOpen }: { lang: LangCode; onOpen: (slug: string) => void }) {
	const tr = t(lang);
	const [index, setIndex] = useState(0);
	const [held, setHeld] = useState(false);
	const paused = useMotionPaused();
	const game = HERO_GAMES[index % HERO_GAMES.length];

	useEffect(() => {
		if (held || paused || HERO_GAMES.length < 2 || prefersReducedMotion()) return;
		const timer = setInterval(() => setIndex((i) => (i + 1) % HERO_GAMES.length), ROTATE_MS);
		return () => clearInterval(timer);
	}, [held, paused]);

	return (
		<div role='group' aria-label={tr.nowPlaying} onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)} className='avg-in-solid avg-d5 avg-screen relative mt-3 w-full max-w-[1040px] rounded-[18px] border border-[#2f2f37] bg-[linear-gradient(180deg,#24242a,#141418)] p-1.5 sm:mt-8 sm:rounded-[26px] sm:p-2.5'>
			<div className='relative aspect-[4/3] overflow-hidden rounded-xl bg-ink text-left sm:aspect-video sm:rounded-[18px]'>
				<Cover game={game} alt={`${game.name} — ${tr.coverAlt}`} eager={index === 0} className='absolute inset-0 size-full text-[40px]' />
				{game.heroVideo && <Clip src={game.heroVideo} small={game.video} className='avg-screen-vid' />}
				<div aria-hidden='true' className='avg-scan pointer-events-none absolute inset-0' />
				<div aria-hidden='true' className='pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(10_10_12/0.6)_0%,transparent_22%,transparent_52%,rgb(10_10_12/0.94)_100%)]' />
				<div className='absolute top-3 left-3 flex flex-wrap items-center gap-2 font-mono text-[12px] font-semibold uppercase sm:top-4 sm:left-4'>
					<span className='inline-flex items-center gap-2 rounded-full bg-bg/85 px-2.5 py-1.5 tracking-[0.08em] text-fg'>
						<span aria-hidden='true' className='avg-live size-2 rounded-full bg-heart' />
						{tr.nowPlaying}
					</span>
					<span className='rounded-full px-2.5 py-1.5 tracking-[0.06em] text-bg' style={{ backgroundColor: GENRE_COLORS[game.genre] }}>
						{tr[GENRE_KEYS[game.genre]]}
					</span>
				</div>
				<div className='absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-end sm:justify-between sm:gap-5 sm:px-7 sm:py-6'>
					<div className='flex min-w-0 flex-col gap-1'>
						<p className='font-display text-[22px] leading-[1.05] font-extrabold tracking-[-0.03em] sm:text-[36px]'>{game.name}</p>
						<p className='text-[14px] text-soft'>
							@{game.creator} · {game.model} · {formatCount(game.likes, lang)} <span aria-hidden='true'>♥</span>
							<span className='sr-only'>{tr.likesOnX}</span>
						</p>
					</div>
					<div className='flex flex-none gap-2.5'>
						<button type='button' onClick={() => onOpen(game.slug)} className={`${BTN_LINE} border-fg/30 bg-bg/60 px-4 text-[14px] text-fg`}>
							{tr.details}
						</button>
						<a href={game.link.url} {...NEW_TAB} className={`${BTN_LIME} px-[18px] text-[14px] font-bold whitespace-nowrap`}>
							{tr[ACTION[game.link.type]]}
							<ArrowOut size={14} />
						</a>
					</div>
				</div>
			</div>
			<div className='flex items-center justify-center gap-0.5 pt-2'>
				{HERO_GAMES.map((g, i) => (
					<button key={g.slug} type='button' aria-label={g.name} aria-pressed={i === index} onClick={() => setIndex(i)} className='flex min-h-11 min-w-6 cursor-pointer items-center justify-center px-2'>
						<span className={`avg-dot block h-1.5 rounded-full ${i === index ? 'w-7 bg-lime' : 'w-2 bg-[#4a4952]'}`} />
					</button>
				))}
				{/* Everything on the page that moves by itself stops here: this rotation, the clips, the ticker and the grid. */}
				<button type='button' aria-pressed={paused} aria-label={tr.pauseMotion} title={tr.pauseMotion} onClick={() => setMotionPaused(!paused)} className='avg-btn ml-2 inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-muted hover:text-lime motion-reduce:hidden'>
					{paused ? <Play size={16} /> : <Pause size={16} />}
				</button>
			</div>
		</div>
	);
}

export function Hero({ lang, onOpen, onSurprise }: { lang: LangCode; onOpen: (slug: string) => void; onSurprise: () => void }) {
	const tr = t(lang);
	return (
		<div className='relative overflow-hidden border-b border-line bg-bg'>
			<div aria-hidden='true' className='pointer-events-none absolute inset-0'>
				<div className='avg-glow absolute top-[46%] left-1/2 -ml-[600px] h-[760px] w-[1200px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-lime)_13%,transparent),transparent)]' />
				<div className='absolute inset-x-[-30%] bottom-0 h-[52%] [perspective:520px] [perspective-origin:50%_0%]'>
					<div className='avg-grid absolute inset-0' />
					<div className='absolute inset-0 bg-[linear-gradient(180deg,var(--color-bg)_0%,rgb(16_16_18/0.2)_40%,rgb(16_16_18/0.2)_70%,var(--color-bg)_100%)]' />
				</div>
			</div>
			<section id='top' aria-labelledby='hero-h' className='relative mx-auto flex max-w-[1280px] flex-col items-center gap-5 px-4 pt-14 pb-12 text-center sm:gap-6 sm:px-6 sm:pt-20 sm:pb-16'>
				<a href='#how' className='avg-in avg-d1 avg-pill inline-flex min-h-9 items-center gap-2.5 rounded-full border border-line bg-panel/85 py-[5px] pr-3.5 pl-[5px] text-[14px] text-soft hover:text-fg'>
					<span aria-hidden='true' className='rounded-full bg-lime px-[9px] py-[3px] font-mono text-[12px] font-semibold text-bg'>
						{'>_'}
					</span>
					{tr.heroEyebrow}
					<ChevronRight size={14} />
				</a>
				<h1 id='hero-h' className='avg-h1 avg-in avg-d2 font-display text-[clamp(36px,7.2vw,104px)] leading-[0.98] font-extrabold tracking-[-0.045em]'>
					<span className='block'>{tr.heroL1}</span>
					<span className='block text-lime'>
						{tr.heroL2}
						<span className='avg-caret' aria-hidden='true'>
							_
						</span>
					</span>
				</h1>
				<p className='avg-in avg-d3 max-w-[620px] text-[17px] leading-[1.55] text-soft sm:text-[19px]'>{tr.heroSub}</p>
				<div className='avg-in avg-d4 flex flex-wrap justify-center gap-3'>
					<a href='#games' className={`${BTN_LIME} min-h-[52px] rounded-[10px] px-6 text-[16px] font-bold max-sm:px-4`}>
						{tr.startPlaying}
						<ArrowDown size={17} />
					</a>
					<button type='button' onClick={onSurprise} className={`${BTN_LINE} min-h-[52px] rounded-[10px] bg-panel/85 px-[22px] text-[16px] max-sm:px-4`}>
						<Dice />
						{tr.surprise}
					</button>
				</div>
				{HERO_GAMES.length > 0 && <Screen lang={lang} onOpen={onOpen} />}
				<Stats lang={lang} />
			</section>
		</div>
	);
}
