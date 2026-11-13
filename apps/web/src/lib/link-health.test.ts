import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error The link check is plain JavaScript run by a workflow, with no type declarations.
import { DOWN_AFTER, classify, decide, nextState, readState, withDown, writeState } from '../../../../.github/scripts/link-health.mjs';

const GAMES = new URL('../../../../packages/catalog/data/games/', import.meta.url);
const row = (slug: string, state: string, down?: string) => ({ slug, state, down });

describe('judging an answer', () => {
	it('calls a missing page, a server error and an unreachable host dead', () => {
		for (const status of [404, 410, 500, 503]) expect(classify({ status }).state, String(status)).toBe('dead');
		for (const error of ['ENOTFOUND', 'ECONNREFUSED', 'CERT_HAS_EXPIRED']) expect(classify({ error }).state, error).toBe('dead');
	});

	it('does not judge a refusal or a timeout', () => {
		for (const status of [401, 403, 429]) expect(classify({ status }).state, String(status)).toBe('unknown');
		expect(classify({ error: 'TimeoutError' }).state).toBe('unknown');
	});

	it('calls any other answer ok', () => {
		for (const status of [200, 204, 301]) expect(classify({ status }).state, String(status)).toBe('ok');
	});
});

describe('counting failures in a row', () => {
	it('adds one for a dead link and keeps the day of the first', () => {
		const first = nextState({}, [row('kit', 'dead')], '2026-11-13');
		expect(first).toEqual({ kit: { fails: 1, since: '2026-11-13' } });
		expect(nextState(first, [row('kit', 'dead')], '2026-11-14')).toEqual({ kit: { fails: 2, since: '2026-11-13' } });
	});

	it('starts over when the link answers, and holds still on an answer that proves nothing', () => {
		const two = { kit: { fails: 2, since: '2026-11-13' } };
		expect(nextState(two, [row('kit', 'ok')], '2026-11-15')).toEqual({});
		expect(nextState(two, [row('kit', 'unknown')], '2026-11-15')).toEqual(two);
		expect(nextState({}, [row('kit', 'unknown')], '2026-11-15')).toEqual({});
	});

	it('forgets a game that is no longer checked', () => {
		expect(nextState({ gone: { fails: 2, since: '2026-11-13' } }, [row('kit', 'ok')], '2026-11-15')).toEqual({});
	});

	it('survives the trip through the issue body, and a body that was edited', () => {
		const state = { kit: { fails: 2, since: '2026-11-13' }, 'kit-two': { fails: 1, since: '2026-11-14' } };
		expect(readState(`A table.\n\n${writeState(state)}\n`)).toEqual(state);
		expect(readState('No comment here.')).toEqual({});
		expect(readState(undefined)).toEqual({});
		expect(readState('<!-- link-health: not json -->')).toEqual({});
		expect(readState('<!-- link-health: {"kit":{"fails":"2","since":"x"},"ok":{"fails":1,"since":"2026-11-13"}} -->')).toEqual({ ok: { fails: 1, since: '2026-11-13' } });
	});
});

describe('deciding the marks', () => {
	it(`marks a game only once its link has been dead ${DOWN_AFTER} checks in a row`, () => {
		const results = [row('kit', 'dead')];
		expect(decide(results, { kit: { fails: DOWN_AFTER - 1, since: '2026-11-13' } }).mark).toEqual([]);
		expect(decide(results, { kit: { fails: DOWN_AFTER, since: '2026-11-13' } }).mark).toEqual(results);
	});

	it('reaches the mark on the third daily check, not before', () => {
		let state = {};
		const marked = ['2026-11-13', '2026-11-14', '2026-11-15'].map((day) => {
			state = nextState(state, [row('kit', 'dead')], day);
			return decide([row('kit', 'dead')], state).mark.length;
		});
		expect(marked).toEqual([0, 0, 1]);
	});

	it('does not mark a marked game again, and unmarks it at the first good answer', () => {
		const state = { kit: { fails: 9, since: '2026-11-01' } };
		expect(decide([row('kit', 'dead', '2026-11-04')], state)).toEqual({ mark: [], unmark: [] });
		expect(decide([row('kit', 'unknown', '2026-11-04')], {})).toEqual({ mark: [], unmark: [] });
		expect(decide([row('kit', 'ok', '2026-11-04')], {}).unmark).toHaveLength(1);
	});
});

describe('marking a game file', () => {
	const files = readdirSync(GAMES).filter((name) => name.endsWith('.json'));

	// The check rewrites a file with JSON.stringify, so every file must already be written that way or the pull request would reformat it.
	it('leaves every game file as it is when the mark goes on and comes off', () => {
		for (const name of files) {
			const text = readFileSync(new URL(name, GAMES), 'utf8');
			// A file is written the way the check writes it, whether or not it is marked today.
			expect(withDown(text, JSON.parse(text).down), name).toBe(text);
			const bare = withDown(text, undefined);
			const marked = withDown(bare, '2026-11-13');
			expect(JSON.parse(marked).down, name).toBe('2026-11-13');
			expect(withDown(marked, undefined), name).toBe(bare);
		}
	});

	it('adds one line at the end and nothing else', () => {
		const text = withDown(readFileSync(new URL(files[0], GAMES), 'utf8'), undefined) as string;
		const added = (withDown(text, '2026-11-13') as string).split('\n').filter((line: string) => !text.split('\n').includes(line));
		expect(added.some((line: string) => line === '\t"down": "2026-11-13"')).toBe(true);
	});

	it('refuses a file it would have to reformat', () => {
		expect(() => withDown('{"slug":"kit"}', '2026-11-13')).toThrow(/not formatted/);
	});
});
