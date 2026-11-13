import { GAMES, GENRES, GENRE_COLORS, GENRE_COUNTS, GENRE_KEYS, type Game, type LangCode, creatorByHandle, fill, formatCount, t } from '@vibe-arcade/catalog';
import { useState } from 'react';
import { type HomeSearch, NO_FILTER, genreSlug, hasFilter } from '../lib/search';
import { BTN_LINE, H2, WRAP } from '../lib/ui';
import { Avatar } from './Avatar';
import { Chip, ChipRow } from './Chips';
import { gamesCount } from './Creators';
import { GameCard } from './GameCard';
import { Close, Dice } from './Icons';
import { Toolbar } from './Toolbar';

interface GamesSectionProps {
	lang: LangCode;
	search: HomeSearch;
	// The games the search leaves, in its order.
	list: Game[];
	// Merges a change into the URL's filters.
	onFilter: (patch: HomeSearch) => void;
	onOpen: (slug: string) => void;
	onSurprise: () => void;
}

// Every game, filtered and ordered by the URL's search. The filters sit in a bar that stays under the header while the list scrolls, on screens wide enough to spare the height.
export function GamesSection({ lang, search, list, onFilter, onOpen, onSurprise }: GamesSectionProps) {
	const tr = t(lang);
	const creator = search.creator === undefined ? undefined : creatorByHandle(search.creator);

	// The cards' entrance animation alternates between two identical keyframes whenever the filters change, which restarts it without remounting the grid. State derived during render, as React's docs describe for values that follow a prop.
	const view = `${search.q ?? ''}|${search.sort ?? ''}|${search.model ?? ''}|${search.genre ?? ''}|${search.creator ?? ''}`;
	const [pop, setPop] = useState({ view, flip: false });
	if (pop.view !== view) setPop({ view, flip: !pop.flip });

	return (
		<section id='games' className={`${WRAP} pb-20 sm:pb-24`} aria-labelledby='games-h'>
			<div className='mb-4 flex flex-wrap items-end justify-between gap-4'>
				<div className='flex flex-col gap-1'>
					<h2 id='games-h' className={H2}>
						{tr.allH}
					</h2>
					<span aria-live='polite' className='text-[14px] text-muted'>
						{fill(tr.showing, { a: list.length, b: GAMES.length })}
					</span>
				</div>
				<button type='button' onClick={onSurprise} className={`${BTN_LINE} px-3.5 text-[14px]`}>
					<Dice size={16} />
					{tr.surprise}
				</button>
			</div>

			<div className='avg-filterbar -mx-4 mb-6 flex flex-col gap-1.5 px-4 max-md:mb-5 sm:-mx-6 sm:px-6 md:sticky md:top-[81px] md:z-30 md:border-b md:border-line md:bg-bg/90 md:py-3 md:backdrop-blur-md'>
				<Toolbar tr={tr} q={search.q ?? ''} model={search.model} sortNew={search.sort === 'new'} filtered={hasFilter(search)} onQuery={(q) => onFilter({ q: q || undefined })} onModel={(model) => onFilter({ model })} onSort={(sortNew) => onFilter({ sort: sortNew ? 'new' : undefined })} onReset={() => onFilter(NO_FILTER)} />
				<ChipRow label={tr.genre}>
					<Chip label={tr.all} count={GAMES.length} color='var(--color-fg)' active={search.genre === undefined} onPick={() => onFilter({ genre: undefined })} />
					{GENRES.map((g) => (
						<Chip key={g} label={tr[GENRE_KEYS[g]]} count={GENRE_COUNTS[g]} color={GENRE_COLORS[g]} active={search.genre === genreSlug(g)} onPick={() => onFilter({ genre: genreSlug(g) })} />
					))}
				</ChipRow>
			</div>

			{creator && (
				<div className='avg-pop-a mb-6 flex flex-wrap items-center gap-4 rounded-[14px] border border-lime bg-panel px-5 py-4'>
					<Avatar creator={creator} className='size-14' />
					<div className='flex min-w-0 flex-[1_1_200px] flex-col'>
						<h3 className='truncate font-display text-[22px] leading-tight font-bold'>{fill(tr.gamesBy, { c: `@${creator.handle}` })}</h3>
						<span className='text-[14px] text-muted'>
							{gamesCount(creator, tr)} · {formatCount(creator.likes, lang)} {tr.likesOnX}
						</span>
					</div>
					<a href={creator.url} target='_blank' rel='noopener noreferrer' className={`${BTN_LINE} px-4 text-[14px]`}>
						{tr.viewOnX}
					</a>
					<button type='button' onClick={() => onFilter({ creator: undefined })} className='avg-btn inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg bg-fg px-4 text-[14px] font-semibold text-bg'>
						{tr.clear}
						<Close size={14} />
					</button>
				</div>
			)}

			{list.length === 0 && (
				<div className='flex flex-col items-center gap-4 rounded-xl border border-dashed border-line-2 px-6 py-12 text-center text-muted'>
					<p>{tr.noResults}</p>
					{hasFilter(search) && (
						<button type='button' onClick={() => onFilter(NO_FILTER)} className='avg-btn inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-lime px-[18px] text-[14px] font-semibold text-bg'>
							{tr.reset}
						</button>
					)}
				</div>
			)}

			<ul className='grid grid-cols-[repeat(auto-fill,minmax(min(272px,100%),1fr))] gap-5'>
				{list.map((g, i) => (
					<GameCard key={g.slug} game={g} index={i} lang={lang} pop={pop.flip ? 'avg-pop-a' : 'avg-pop-b'} onOpen={onOpen} />
				))}
			</ul>
		</section>
	);
}
