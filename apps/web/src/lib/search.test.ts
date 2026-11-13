import { CREATORS, GAMES, GENRES, MODELS } from '@vibe-arcade/catalog';
import { describe, expect, it } from 'vitest';
import { filterOf, genreSlug, hasFilter, modelSlug, text, validateHomeSearch } from './search';

const EMPTY = { q: undefined, sort: undefined, model: undefined, genre: undefined, creator: undefined, game: undefined };

describe('validateHomeSearch', () => {
	it('returns every key, undefined when absent, so a raw value never survives the merge', () => {
		expect(validateHomeSearch({})).toEqual(EMPTY);
		expect(Object.keys(validateHomeSearch({}))).toEqual(['q', 'sort', 'model', 'genre', 'creator', 'game']);
	});

	it('keeps valid values', () => {
		const model = modelSlug(MODELS[0].name);
		expect(validateHomeSearch({ q: 'kart', sort: 'new', model, genre: 'story-sim', creator: CREATORS[0].key, game: 'saltline' })).toEqual({ q: 'kart', sort: 'new', model, genre: 'story-sim', creator: CREATORS[0].key, game: 'saltline' });
	});

	it('reads a creator in any case and writes the lowercase handle', () => {
		for (const c of CREATORS) expect(validateHomeSearch({ creator: c.handle.toUpperCase() }).creator).toBe(c.key);
		expect(validateHomeSearch({ creator: 'no_such_creator' }).creator).toBeUndefined();
	});

	it('drops unknown values and the default order', () => {
		expect(validateHomeSearch({ sort: 'liked', model: 'gpt-0', genre: 'Story & sim', game: 'no-such-game' })).toEqual(EMPTY);
		expect(validateHomeSearch({ sort: 'NEW', q: '   ', genre: ['shooter', 'racing'], game: { slug: 'saltline' } })).toEqual(EMPTY);
	});

	it('reads back the numbers and booleans the query decoder makes of plain text', () => {
		expect(validateHomeSearch({ q: 2048 }).q).toBe('2048');
		expect(validateHomeSearch({ q: true }).q).toBe('true');
		expect(text(0)).toBe('0');
	});

	it('caps the search text', () => {
		expect(validateHomeSearch({ q: 'x'.repeat(500) }).q).toHaveLength(80);
		expect(validateHomeSearch({ q: 'x'.repeat(80) }).q).toHaveLength(80);
	});

	it('never cuts the search text inside a character', () => {
		const q = validateHomeSearch({ q: `${'x'.repeat(79)}😀😀` }).q;
		expect(q).toBe(`${'x'.repeat(79)}😀`);
	});

	it('accepts the slug of every genre, model and game', () => {
		for (const g of GENRES) expect(validateHomeSearch({ genre: genreSlug(g) }).genre).toBe(genreSlug(g));
		for (const m of MODELS) expect(validateHomeSearch({ model: modelSlug(m.name) }).model).toBe(modelSlug(m.name));
		for (const g of GAMES) expect(validateHomeSearch({ game: g.slug }).game).toBe(g.slug);
		expect(validateHomeSearch({ game: 'souls-like-boss-fight' }).game).toBe('evensong');
	});
});

describe('filterOf', () => {
	it('maps the URL slugs back to the catalog names', () => {
		expect(filterOf({ q: 'a', sort: 'new', genre: 'puzzle-toys', model: modelSlug(MODELS[0].name) })).toEqual({ q: 'a', sort: 'new', genre: 'Puzzle & toys', model: MODELS[0].name, creator: undefined });
	});

	it('defaults to most liked with no filter', () => {
		expect(filterOf({})).toEqual({ q: undefined, sort: 'liked', genre: undefined, model: undefined, creator: undefined });
	});
});

describe('hasFilter', () => {
	it('ignores the order and the open game', () => {
		expect(hasFilter({ sort: 'new', game: 'saltline' })).toBe(false);
		expect(hasFilter({ genre: 'racing' })).toBe(true);
		expect(hasFilter({ q: 'x' })).toBe(true);
		expect(hasFilter({ creator: CREATORS[0].key })).toBe(true);
	});
});
