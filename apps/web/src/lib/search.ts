import { GENRES, type GameFilter, type Genre, MODELS, creatorByHandle, gameBySlug, slugOf } from '@vibe-arcade/catalog';

// What the home page shows beyond its path lives in its query string, so a link reproduces the view: the search text, the order, the model, genre and creator filters, and the open game. A default is left out (the plain path shows it) and an unknown value is dropped. Genres and models are written as slugs (story-sim, claude-fable-5-2) rather than their display names, which have spaces, ampersands and dots.
export interface HomeSearch {
	q?: string;
	// Most liked first is the default and is never written.
	sort?: 'new';
	model?: string;
	genre?: string;
	// A creator's handle in lowercase, to show their games alone.
	creator?: string;
	// The slug of the game whose dialog is open.
	game?: string;
}

// The longest search text, which the search field enforces as its maxLength.
export const Q_MAX = 80;

export const genreSlug = (genre: Genre): string => slugOf(genre);
export const modelSlug = (model: string): string => slugOf(model);

const GENRE_BY_SLUG = new Map<string, Genre>(GENRES.map((g) => [genreSlug(g), g]));
const MODEL_BY_SLUG = new Map<string, string>(MODELS.map((m) => [modelSlug(m.name), m.name]));

// TanStack parses a query value that looks like JSON into its value (?q=2048 is a number, ?q=true a boolean), so text values are read back as strings.
export function text(v: unknown): string | undefined {
	if (typeof v === 'number' || typeof v === 'boolean') return String(v);
	return typeof v === 'string' && v.trim() ? v : undefined;
}

// Every key is always returned, undefined when absent or invalid, for the same reason as validateRootSearch: TanStack merges the validated object over the raw search, so a key left out would keep its raw value.
export function validateHomeSearch(search: Record<string, unknown>): HomeSearch {
	const q = text(search.q);
	const genre = text(search.genre);
	const model = text(search.model);
	const game = text(search.game);
	const creator = text(search.creator);
	return {
		// Cut by code point, so a hand-written URL never ends on half an emoji.
		q: q === undefined ? undefined : Array.from(q).slice(0, Q_MAX).join(''),
		sort: search.sort === 'new' ? 'new' : undefined,
		model: model !== undefined && MODEL_BY_SLUG.has(model) ? model : undefined,
		genre: genre !== undefined && GENRE_BY_SLUG.has(genre) ? genre : undefined,
		// Written in any case, kept in the one the site writes.
		creator: creator === undefined ? undefined : creatorByHandle(creator)?.key,
		game: game !== undefined && gameBySlug(game) ? game : undefined,
	};
}

// The catalog filter a validated search stands for.
export function filterOf(search: HomeSearch): GameFilter {
	return {
		q: search.q,
		sort: search.sort === 'new' ? 'new' : 'liked',
		model: search.model === undefined ? undefined : MODEL_BY_SLUG.get(search.model),
		genre: search.genre === undefined ? undefined : GENRE_BY_SLUG.get(search.genre),
		creator: search.creator,
	};
}

export const hasFilter = (search: HomeSearch): boolean => search.q !== undefined || search.model !== undefined || search.genre !== undefined || search.creator !== undefined;

// The patch that clears every filter and keeps the order.
export const NO_FILTER: HomeSearch = { q: undefined, model: undefined, genre: undefined, creator: undefined };
