import { GAMES, LAST_UPDATED, type LangCode, MODELS, creatorsCount, formatDay, t } from '@vibe-arcade/catalog';
import { useEffect, useState } from 'react';
import { useCountUp } from '../lib/motion';
import { BTN_LIME, BTN_LINE } from '../lib/ui';
import { ArrowDown, Dice, Pause, Play } from './Icons';

// The wall behind the hero: four rows of ten covers, each row doubled so its marquee loops without a seam. The picks stride through the games so neighbouring rows differ.
const ROW_SECONDS = [96, 120, 84, 132];
const WALL = ROW_SECONDS.map((seconds, r) => {
	const tiles = Array.from({ length: 10 }, (_, k) => GAMES[(r * 9 + k * 3 + r) % GAMES.length].cover);
	return { seconds, right: r % 2 === 1, tiles: [...tiles, ...tiles] };
});

// Sized down on the narrowest phones so a date like 11月12日 or 12 нояб. stays on one line of its half-width column.
const STAT_VALUE = 'font-display text-[28px] font-bold leading-none whitespace-nowrap min-[400px]:text-[36px] sm:text-[44px]';

// The three counts run up from zero once after mount; the server and the first client render show the final numbers.
function Stats({ lang }: { lang: LangCode }) {
	const tr = t(lang);
	const ease = useCountUp();
	const stats = [
		{ value: Math.round(GAMES.length * ease), label: tr.statGames },
		{ value: Math.round(creatorsCount * ease), label: tr.statCreators },
		{ value: Math.max(1, Math.round(MODELS.length * ease)), label: tr.statModels },
		{ value: formatDay(LAST_UPDATED, lang), label: tr.statUpdated },
	];
	return (
		<dl className='avg-in avg-d5 grid grid-cols-2 gap-x-6 gap-y-6 pt-3 sm:flex sm:flex-wrap sm:gap-10'>
			{stats.map((s) => (
				<div key={s.label} className='flex flex-col-reverse justify-end'>
					<dt className='text-[14px] text-muted'>{s.label}</dt>
					<dd className={`${STAT_VALUE} tabular-nums`}>{s.value}</dd>
				</div>
			))}
		</dl>
	);
}

export function Hero({ lang, onSurprise }: { lang: LangCode; onSurprise: () => void }) {
	const tr = t(lang);
	// The line in two parts, cut after its first comma, so the languages written without spaces can set each part on a line of its own (styles/arcade.css); the others run them together as before.
	const cut = tr.h1.search(/[,，、]/) + 1;
	// The wall and the ticker scroll for as long as the page is open, so a visitor can stop them. The flag sits on the root element, where the stylesheet reads it for both.
	const [paused, setPaused] = useState(false);
	useEffect(() => {
		document.documentElement.toggleAttribute('data-motion-paused', paused);
	}, [paused]);
	return (
		<div className='relative overflow-hidden border-b border-line'>
			<div aria-hidden='true' className='pointer-events-none absolute inset-0'>
				<div className='absolute top-[-18%] left-[30%] flex w-[120%] origin-top-left flex-col gap-4 [transform:perspective(1400px)_rotateX(16deg)_rotateY(-14deg)_rotateZ(-9deg)]'>
					{WALL.map((row) => (
						<div key={row.seconds} className={`avg-track ${row.right ? 'avg-right' : 'avg-left'}`} style={{ animationDuration: `${row.seconds}s` }}>
							{row.tiles.map((src, i) => (
								<img key={i} src={src} alt='' width={960} height={600} loading='lazy' decoding='async' fetchPriority='low' className='h-40 w-64 flex-none rounded-xl border border-fg/12 bg-panel object-cover' />
							))}
						</div>
					))}
				</div>
				<div className='avg-shade absolute inset-0' />
				<div className='absolute inset-0 bg-[linear-gradient(180deg,var(--color-bg)_0%,transparent_18%,transparent_72%,var(--color-bg)_100%)]' />
				<div className='avg-glow absolute bottom-[-30%] left-[-10%] h-[70%] w-[60%] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-lime)_16%,transparent),transparent)]' />
			</div>
			<section id='top' aria-labelledby='hero-h' className='relative mx-auto flex min-h-[560px] max-w-[1280px] flex-col justify-center gap-6 px-4 pt-16 pb-14 sm:min-h-[640px] sm:gap-7 sm:px-6 sm:pt-28 sm:pb-24'>
				<p className='avg-in avg-d1 font-mono text-[12px] tracking-[0.08em] text-lime uppercase sm:text-[13px]'>{tr.eyebrow}</p>
				<h1 id='hero-h' className='avg-h1 avg-in avg-d2 max-w-[12ch] font-display text-[clamp(44px,8vw,112px)] leading-[0.95] font-extrabold tracking-[-0.04em]'>
					{cut > 0 && <span>{tr.h1.slice(0, cut)}</span>}
					<span>
						{tr.h1.slice(cut)}
						<span className='avg-caret text-lime' aria-hidden='true'>
							_
						</span>
					</span>
				</h1>
				<p className='avg-in avg-d3 max-w-[640px] text-[17px] text-soft sm:text-[19px]'>{tr.heroP}</p>
				<div className='avg-in avg-d4 flex flex-wrap gap-3'>
					<a href='#games' className={`${BTN_LIME} min-h-12 px-5 py-3`}>
						{tr.allH}
						<ArrowDown />
					</a>
					<a href='#submit' className={`${BTN_LINE} min-h-12 bg-bg/60 px-5 py-3`}>
						{tr.submitGame}
					</a>
					<button type='button' onClick={onSurprise} className={`${BTN_LINE} min-h-12 bg-bg/60 px-5 py-3`}>
						<Dice />
						{tr.surprise}
					</button>
				</div>
				<Stats lang={lang} />
			</section>
			<button type='button' aria-pressed={paused} aria-label={tr.pauseMotion} title={tr.pauseMotion} onClick={() => setPaused(!paused)} className='avg-btn absolute right-4 bottom-1.5 inline-flex size-11 cursor-pointer items-center justify-center rounded-lg border border-line-2 bg-bg/60 text-fg motion-reduce:hidden sm:right-6 sm:bottom-6'>
				{paused ? <Play /> : <Pause />}
			</button>
		</div>
	);
}
