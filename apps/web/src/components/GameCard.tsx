import { GENRE_COLORS, GENRE_KEYS, type Game, type LangCode, formatCount, formatDay, pick, t } from '@vibe-arcade/catalog';
import type { MouseEvent } from 'react';
import { prefersReducedMotion } from '../lib/motion';
import { NEW_TAB } from '../lib/ui';
import { Cover } from './Cover';
import { CreatorLink } from './CreatorLink';
import { GameLink } from './GameLink';
import { ArrowOut, Bubble, Heart } from './Icons';

interface GameCardProps {
	game: Game;
	// The card's place in the list as shown, from 0.
	index: number;
	lang: LangCode;
	// avg-pop-a or avg-pop-b: the grid alternates the two so every filter change replays the entrance.
	pop: string;
	onOpen: (slug: string) => void;
}

const BADGE = 'absolute top-3 rounded-md px-2 py-1 font-mono text-[11px] font-semibold';

// While the pointer is over a card its clip plays over the cover, from the start each time. Nothing of the clip is fetched before that (preload none), and a visitor who asked for less motion keeps the cover.
function playClip(e: MouseEvent<HTMLLIElement>) {
	const video = e.currentTarget.querySelector('video');
	if (!video || prefersReducedMotion()) return;
	video.muted = true;
	video.style.opacity = '1';
	// Leaving before it starts rejects the promise, which is no error.
	video.play().catch(() => {});
}

function stopClip(e: MouseEvent<HTMLLIElement>) {
	const video = e.currentTarget.querySelector('video');
	if (!video) return;
	video.style.opacity = '0';
	video.pause();
	video.currentTime = 0;
}

export function GameCard({ game, index, lang, pop, onOpen }: GameCardProps) {
	const tr = t(lang);
	const action = tr[game.link.type];
	return (
		<li onMouseEnter={playClip} onMouseLeave={stopClip} className={`avg-card ${pop} flex flex-col overflow-hidden rounded-xl border border-line bg-panel`} style={{ animationDelay: `${Math.min(index, 16) * 35}ms` }}>
			{/* The pointer's way into the game's details. The keyboard and a screen reader use the title's link below, so this copy of it is hidden from both. */}
			<button type='button' tabIndex={-1} aria-hidden='true' onClick={() => onOpen(game.slug)} className='relative block aspect-[16/10] w-full cursor-pointer overflow-hidden bg-ink'>
				<Cover game={game} alt='' className='absolute inset-0 size-full text-[22px]' />
				{game.video && <video src={game.video} muted loop playsInline preload='none' className='avg-vid pointer-events-none absolute inset-0 size-full object-cover opacity-0' />}
				<span className={`${BADGE} left-3 tracking-[0.06em] text-bg uppercase`} style={{ backgroundColor: GENRE_COLORS[game.genre] }}>
					{tr[GENRE_KEYS[game.genre]]}
				</span>
				<span className={`${BADGE} right-3 bg-bg text-fg`}>#{String(index + 1).padStart(2, '0')}</span>
			</button>
			<div className='flex flex-1 flex-col gap-2 p-[18px]'>
				<h3 className='font-display text-[20px] leading-[1.2] font-bold'>
					<GameLink slug={game.slug} onOpen={onOpen} className='avg-title'>
						{game.name}
					</GameLink>
				</h3>
				<p className='truncate text-[14px] text-muted'>
					<CreatorLink creator={game.creator} className='avg-link text-muted'>
						@{game.creator}
					</CreatorLink>{' '}
					· {game.model}
				</p>
				<p className='flex-1 text-[14px] text-soft'>{pick(game.summary, lang)}</p>
				<div className='mt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5'>
					{/* The likes, then the day of the post where the row has room for it: this group is one line high and takes only the width the buttons leave, so a day that does not fit wraps out of sight instead of pushing the buttons down. */}
					<span className='flex h-5 min-w-16 flex-[1_1_0] flex-wrap items-center gap-x-1.5 overflow-hidden font-mono text-[13px] leading-5 text-muted'>
						<span className='inline-flex flex-none items-center gap-1.5'>
							<Heart size={14} />
							<span className='sr-only'>{tr.likesOnX}: </span>
							{formatCount(game.likes, lang)}
						</span>
						<span className='inline-flex flex-none items-center gap-1.5'>
							<span aria-hidden='true' className='text-[#4a4952]'>
								/
							</span>
							<time dateTime={game.postedAt}>{formatDay(game.postedAt, lang)}</time>
						</span>
					</span>
					<div className='ml-auto flex gap-1.5'>
						<a href={game.postUrl} {...NEW_TAB} aria-label={`${tr.post}: ${game.name}`} title={tr.post} className='avg-btn inline-flex size-11 items-center justify-center rounded-lg border border-line-2'>
							<Bubble />
						</a>
						<a href={game.link.url} {...NEW_TAB} aria-label={`${action}: ${game.name}`} className='avg-btn avg-play inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-fg px-3.5 text-[14px] font-semibold whitespace-nowrap text-bg hover:text-bg'>
							{action}
							<ArrowOut size={14} />
						</a>
					</div>
				</div>
			</div>
		</li>
	);
}
