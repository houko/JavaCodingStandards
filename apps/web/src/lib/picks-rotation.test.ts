import { describe, expect, it } from 'vitest';
import { type PickCandidate, ROTATE_EVERY_DAYS, rotatePicks } from './picks-rotation';

const games = (likes: Record<string, number>, down: string[] = []): PickCandidate[] => Object.entries(likes).map(([slug, n]) => ({ slug, likes: n, down: down.includes(slug) ? '2026-11-01' : undefined }));
const BASE = { a: 100, b: 100, c: 100, d: 100, e: 100 };
const STATE = { picks: ['a', 'b', 'c'], picked: '2026-11-06', baseline: BASE };

describe('rotating the picks', () => {
	it('only records the baseline the first time', () => {
		const next = rotatePicks(games(BASE), { picks: ['a', 'b', 'c'] }, '2026-11-13');
		expect(next).toEqual({ picks: ['a', 'b', 'c'], picked: '2026-11-13', baseline: BASE });
	});

	it(`leaves the picks alone until ${ROTATE_EVERY_DAYS} days have passed`, () => {
		expect(rotatePicks(games({ ...BASE, e: 900 }), STATE, '2026-11-12')).toBe(STATE);
	});

	it('picks the games that gained most, letting last week step aside, and saves the new baseline', () => {
		const now = { a: 500, b: 100, c: 100, d: 130, e: 120, f: 40 };
		const next = rotatePicks(games(now), STATE, '2026-11-13');
		// f joined since the last rotation, so all its 40 likes are a gain; a gained most but was picked last week.
		expect(next.picks).toEqual(['f', 'd', 'e']);
		expect(next.picked).toBe('2026-11-13');
		expect(next.baseline).toEqual(now);
	});

	it('keeps last week in the running when too few others gained', () => {
		expect(rotatePicks(games({ ...BASE, a: 300, d: 120 }), STATE, '2026-11-13').picks).toEqual(['a', 'd', 'e']);
	});

	it('never picks a game marked as down, and fills with the most liked when nothing gained', () => {
		expect(rotatePicks(games({ ...BASE, d: 900 }, ['d']), STATE, '2026-11-13').picks).not.toContain('d');
		expect(rotatePicks(games({ ...BASE, d: 99, e: 98 }), STATE, '2026-11-13').picks).toEqual(['d', 'e', 'a']);
	});
});
