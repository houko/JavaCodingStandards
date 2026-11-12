import { GAMES, GENRES, GENRE_COLORS, GENRE_COUNTS, GENRE_KEYS, type LangCode, MODELS, fill, filterGames, t } from '@vibe-arcade/catalog';
import { useState } from 'react';
import { type HomeSearch, filterOf, genreSlug, hasFilter, modelSlug } from '../lib/search';
import { BTN_LINE, H2, WRAP } from '../lib/ui';
import { Chip, ChipRow } from './Chips';
import { GameCard } from './GameCard';
import { Toolbar } from './Toolbar';

interface GamesSectionProps {
	lang: LangCode;
	search: HomeSearch;
	// Merges a change into the URL's filters.
	onFilter: (patch: HomeSearch) => void;
	onOpen: (slug: string) => void;
	onSurprise: () => void;
}

const NO_FILTER: HomeSearch = { q: undefined, model: undefined, genre: undefined };

// Every game, filtered and ordered by the URL's search.
export function GamesSection({ lang, search, onFilter, onOpen, onSurprise }: GamesSectionProps) {
	const tr = t(lang);
	const list = filterGames(filterOf(search), lang);

	// The cards' entrance animation alternates between two identical keyframes whenever the filters change, which restarts it without remounting the grid. State derived during render, as React's docs describe for values that follow a prop.
	const view = `${search.q ?? ''}|${search.sort ?? ''}|${search.model ?? ''}|${search.genre ?? ''}`;
	const [pop, setPop] = useState({ view, flip: false });
	if (pop.view !== view) setPop({ view, flip: !pop.flip });

	return (
		<section id='games' className={`avg-reveal ${WRAP} pb-20 sm:pb-24`} aria-labelledby='games-h'>
			<div className='mb-5 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-5'>
				<div className='flex flex-col gap-1'>
					<h2 id='games-h' className={H2}>
						{tr.allH}
					</h2>
					<span aria-live='polite' className='text-[14px] text-muted'>
						{fill(tr.showing, { a: list.length, b: GAMES.length })}
					</span>
				</div>
				<Toolbar tr={tr} q={search.q ?? ''} sortNew={search.sort === 'new'} onQuery={(q) => onFilter({ q: q || undefined })} onSort={(sortNew) => onFilter({ sort: sortNew ? 'new' : undefined })} onSurprise={onSurprise} />
			</div>

			<div className='mb-7 flex flex-col gap-3 max-sm:gap-1.5'>
				<ChipRow label={tr.model}>
					<Chip tone='lime' label={tr.allModels} count={GAMES.length} active={search.model === undefined} onPick={() => onFilter({ model: undefined })} />
					{MODELS.map((m) => (
						<Chip key={m.name} tone='lime' label={m.name} count={m.count} active={search.model === modelSlug(m.name)} onPick={() => onFilter({ model: modelSlug(m.name) })} />
					))}
				</ChipRow>
				<ChipRow label={tr.genre}>
					<Chip tone='fg' label={tr.all} count={GAMES.length} color='var(--color-fg)' active={search.genre === undefined} onPick={() => onFilter({ genre: undefined })} />
					{GENRES.map((g) => (
						<Chip key={g} tone='fg' label={tr[GENRE_KEYS[g]]} count={GENRE_COUNTS[g]} color={GENRE_COLORS[g]} active={search.genre === genreSlug(g)} onPick={() => onFilter({ genre: genreSlug(g) })} />
					))}
				</ChipRow>
			</div>

			{list.length === 0 && (
				<div className='flex flex-col items-center gap-4 rounded-xl border border-dashed border-line-2 px-6 py-12 text-center text-muted'>
					<p>{tr.noResults}</p>
					{hasFilter(search) && (
						<button type='button' onClick={() => onFilter(NO_FILTER)} className={`${BTN_LINE} px-4 text-[14px] text-fg`}>
							{tr.filtersReset}
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
