import { describe, expect, it, vi } from 'vitest';
import { alreadyListed } from './entry';
import { buildSearchIndex, searchCatalog } from './search';

// data/state/ may hold no library at all, which would let a check that loops over STATE_SOLUTIONS pass without running. This file swaps in one synthetic library, read through the same reader as a file in data/state/, so the search and the duplicate check of the state category always run against an entry.
vi.mock('./catalog', async (importOriginal) => {
	const real = await importOriginal<typeof import('./catalog')>();
	const file = {
		$schema: '../schema/state.schema.json',
		slug: 'signals-kit',
		name: 'Signals Kit',
		author: 'someone',
		summary: { en: 'Stores built on core signals.', 'zh-CN': '基于 core 信号的状态仓库。' },
		repo: 'someone/signals-kit',
		url: 'https://github.com/someone/signals-kit',
		install: 'go get github.com/someone/signals-kit',
		tags: ['stores', 'signals'],
		added: '2026-11-04T12:00:00Z',
	};
	return { ...real, STATE_SOLUTIONS: real.readStateSolutions({ 'signals-kit.json': file }) };
});

describe('state management in the catalog', () => {
	it('finds a library by its tags, name and summary in any language', () => {
		const index = buildSearchIndex('en');
		for (const q of ['STORES', 'signals', 'signals kit', '状态仓库']) expect(searchCatalog(index, q).filter((r) => r.cat === 'state').map((r) => r.name), q).toEqual(['Signals Kit']);
		expect(searchCatalog(index, 'signals kit')[0]?.target).toEqual({ type: 'url', url: 'https://github.com/someone/signals-kit' });
	});

	it('says a submission repeats a library by its repository', () => {
		expect(alreadyListed('state', { repo: 'someone/signals-kit' })).toBe('Signals Kit');
		expect(alreadyListed('state', { repo: 'someone/other-kit' })).toBeUndefined();
	});
});
