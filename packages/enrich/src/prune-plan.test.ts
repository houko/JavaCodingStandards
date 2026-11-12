import { describe, expect, it } from 'vitest';
import { PRUNE_DEFAULTS, type PrunePull, builtWithNsgo, keptEntries, markedEntries, openPrune, pruneBranch, pruneConfig, pruneMarker, pruneReasons, selectProposals } from './prune-plan.ts';

const now = new Date('2026-12-01T00:00:00Z');
const cfg = PRUNE_DEFAULTS;
const rules = (f: Parameters<typeof pruneReasons>[0]) => pruneReasons(f, now, cfg).map((r) => r.rule);

describe('the weekly delisting', () => {
	it('reads its thresholds from the environment, with the defaults otherwise', () => {
		expect(pruneConfig({})).toEqual({ scoreFloor: 20, graceDays: 30, staleDays: 180 });
		expect(pruneConfig({ SCORE_FLOOR: '15', GRACE_DAYS: '60', STALE_DAYS: 'x' })).toEqual({ scoreFloor: 15, graceDays: 60, staleDays: 180 });
	});

	it('proposes an entry whose score is below the floor once its grace period is over', () => {
		const old = { added: '2026-10-01T00:00:00Z', archived: false, lastCommit: '2026-11-20T00:00:00Z' };
		expect(rules({ ...old, score: 19 })).toEqual(['score']);
		expect(rules({ ...old, score: 20 })).toEqual([]);
		// Within its first 30 days on the site, however low the score.
		expect(rules({ ...old, added: '2026-11-02T00:00:00Z', score: 5 })).toEqual([]);
		expect(rules({ ...old, added: '2026-11-01T00:00:00Z', score: 5 })).toEqual(['score']);
	});

	it('never proposes an entry by its score while it has none', () => {
		expect(rules({ added: '2026-01-01T00:00:00Z', archived: false, lastCommit: '2026-11-20T00:00:00Z' })).toEqual([]);
		// Nor one without a date it was added.
		expect(rules({ score: 3, archived: false, lastCommit: '2026-11-20T00:00:00Z' })).toEqual([]);
	});

	it('proposes a repository without a commit for more than 180 days, whatever its score', () => {
		expect(rules({ added: '2026-10-01T00:00:00Z', score: 90, archived: false, lastCommit: '2026-05-01T00:00:00Z' })).toEqual(['stale']);
		expect(rules({ added: '2026-10-01T00:00:00Z', score: 90, archived: false, lastCommit: '2026-06-04T00:00:00Z' })).toEqual([]);
		const r = pruneReasons({ archived: false, lastCommit: '2026-05-01T00:00:00Z' }, now, cfg)[0];
		expect(r.text).toBe('no commit for 214 days, more than 180');
	});

	it('proposes an archived repository and one no longer built with NSGo, but not one it could not tell', () => {
		const fresh = { added: '2026-11-20T00:00:00Z', score: 60, lastCommit: '2026-11-25T00:00:00Z' };
		expect(rules({ ...fresh, archived: true })).toEqual(['archived']);
		expect(rules({ ...fresh, archived: false, usesNsgo: false })).toEqual(['not-nsgo']);
		expect(rules({ ...fresh, archived: false, usesNsgo: undefined })).toEqual([]);
		expect(rules({ ...fresh, archived: true, usesNsgo: false, score: 10, added: '2026-01-01T00:00:00Z', lastCommit: '2025-01-01T00:00:00Z' })).toEqual(['score', 'stale', 'archived', 'not-nsgo']);
	});

	it('asks whether NSGo is still used only of the kinds built with it', () => {
		expect(['app', 'ui', 'state', 'template', 'plugin'].every(builtWithNsgo)).toBe(true);
		// An agent skill or rules for coding agents have no go.mod of their own.
		expect(builtWithNsgo('ai')).toBe(false);
	});

	it('names one branch a run and lists its entries in a marker', () => {
		expect(pruneBranch(now)).toBe('prune/2026-12-01');
		const marker = pruneMarker(['ui/uix', 'apps/b', 'apps/a']);
		expect(marker).toBe('<!-- prune-listed: apps/a apps/b ui/uix -->');
		expect(markedEntries(`Table\n\n${marker}\n`)).toEqual(['apps/a', 'apps/b', 'ui/uix']);
		expect(markedEntries('no marker')).toEqual([]);
		expect(markedEntries(null)).toEqual([]);
	});

	it('remembers what a maintainer kept from the earlier pull requests', () => {
		const pr = (ref: string, state: 'open' | 'closed', merged: boolean, ids: string[]): PrunePull => ({ head: { ref }, state, merged_at: merged ? '2026-11-10T00:00:00Z' : null, body: pruneMarker(ids), html_url: `https://github.com/x/y/pull/${ref}` });
		const onMain = new Set(['apps/kept-in-merge', 'apps/still-there']);
		const pulls = [
			// Closed without merging: everything in it is kept.
			pr('prune/2026-11-02', 'closed', false, ['apps/closed-one', 'ui/closed-two']),
			// Merged: what is gone was removed; what is still on main was taken out of it before the merge.
			pr('prune/2026-11-09', 'closed', true, ['apps/removed', 'apps/kept-in-merge']),
			// Another workflow's pull request does not count.
			pr('verify/apps/still-there', 'closed', false, ['apps/still-there']),
		];
		expect([...keptEntries(pulls, (id) => onMain.has(id))].sort()).toEqual(['apps/closed-one', 'apps/kept-in-merge', 'ui/closed-two']);
		expect(openPrune(pulls)).toBeUndefined();
		const waiting = pr('prune/2026-11-16', 'open', false, ['apps/a']);
		expect(openPrune([...pulls, waiting])).toBe(waiting);
		// An open one keeps nothing yet.
		expect(keptEntries([waiting], () => true).size).toBe(0);
	});

	it('leaves out the kept entries and those the site code names', () => {
		const reasons = [{ rule: 'stale' as const, text: 'no commit' }];
		const picked = selectProposals(
			[
				{ id: 'apps/a', reasons, namedIn: [] },
				{ id: 'apps/kept', reasons, namedIn: [] },
				{ id: 'apps/featured', reasons, namedIn: ['apps/web/src/routes/index.tsx'] },
				{ id: 'apps/fine', reasons: [], namedIn: [] },
			],
			new Set(['apps/kept']),
		);
		expect(picked.propose.map((c) => c.id)).toEqual(['apps/a']);
		expect(picked.kept.map((c) => c.id)).toEqual(['apps/kept']);
		expect(picked.named.map((c) => c.id)).toEqual(['apps/featured']);
	});
});
