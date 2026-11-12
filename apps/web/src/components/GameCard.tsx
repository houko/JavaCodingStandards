import { GENRE_COLORS, GENRE_KEYS, type Game, type LangCode, formatCount, formatDay, pick, t } from '@vibe-arcade/catalog';
import { NEW_TAB } from '../lib/ui';
import { Cover } from './Cover';
import { GameLink } from './GameLink';
import { ArrowOut, Heart } from './Icons';

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

export function GameCard({ game, index, lang, pop, onOpen }: GameCardProps) {
	const tr = t(lang);
	const action = tr[game.link.type];
	return (
		<li className={`avg-card ${pop} flex flex-col overflow-hidden rounded-xl border border-line bg-panel`} style={{ animationDelay: `${Math.min(index, 16) * 35}ms` }}>
			<button type='button' onClick={() => onOpen(game.slug)} aria-label={`${tr.details}: ${game.name}`} className='relative block aspect-[16/10] w-full cursor-pointer overflow-hidden bg-ink'>
				<Cover game={game} alt={`${game.name} — ${tr.coverAlt}`} className='absolute inset-0 size-full text-[22px]' />
				<span className={`${BADGE} left-3 tracking-[0.06em] text-bg uppercase`} style={{ backgroundColor: GENRE_COLORS[game.genre] }}>
					{tr[GENRE_KEYS[game.genre]]}
				</span>
				<span className={`${BADGE} right-3 bg-bg text-fg`}>#{String(index + 1).padStart(2, '0')}</span>
			</button>
			<div className='flex flex-1 flex-col gap-2 p-[18px]'>
				<h3 className='font-display text-[20px] leading-[1.2] font-bold'>
					<GameLink slug={game.slug} onOpen={onOpen}>
						{game.name}
					</GameLink>
				</h3>
				<p className='text-[14px] text-muted'>
					<a href={game.creatorUrl} rel='noopener noreferrer' className='text-muted hover:text-lime'>
						@{game.creator}
					</a>{' '}
					· {game.model} · <time dateTime={game.postedAt}>{formatDay(game.postedAt, lang)}</time>
				</p>
				<p className='flex-1 text-[14px] text-soft'>{pick(game.summary, lang)}</p>
				<div className='mt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5'>
					<span className='inline-flex items-center gap-1.5 font-mono text-[13px] text-muted'>
						<Heart size={14} />
						<span className='sr-only'>{tr.likesOnX}: </span>
						{formatCount(game.likes, lang)}
					</span>
					{/* The two buttons drop to a line of their own, still at the right, where a language's labels are too long to share the row with the likes. */}
					<div className='ml-auto flex gap-1.5'>
						<a href={game.postUrl} {...NEW_TAB} aria-label={`${tr.post}: ${game.name}`} className='avg-btn inline-flex min-h-11 items-center rounded-lg border border-line-2 px-3 text-[14px]'>
							{tr.post}
						</a>
						<a href={game.link.url} {...NEW_TAB} aria-label={`${action}: ${game.name}`} className='avg-btn inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-fg px-3.5 text-[14px] font-semibold text-bg hover:text-bg'>
							{action}
							<ArrowOut size={14} />
						</a>
					</div>
				</div>
			</div>
		</li>
	);
}
