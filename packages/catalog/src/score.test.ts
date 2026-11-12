import { describe, expect, it } from 'vitest';
import { ARCHIVED_FACTOR, NEUTRAL, RELEASE_ANCHOR, SCORE_SIGNALS, SCORE_WEIGHTS, type Score, type ScoreSignal, type ScoreSignals, activityShare, knownReleaseDays, releaseShare, scoreKey, scoreOf, scoreTarget } from './score';

// The formula is a pure function of the signals and the day they were taken, so every case passes its own asOf.
const AS_OF = '2026-11-02';
const daysBefore = (n: number) => new Date(Date.parse(`${AS_OF}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);

// An open-source app, measured in full.
const OPEN: ScoreSignals = { repo: 'someone/app', stars: 1419, weeks: 12, activeWeeks: 12, license: 'MIT', osi: true, released: daysBefore(2), releaseDays: 12, likes: 0 };
// A plugin in a folder of a larger repository.
const PLUGIN: ScoreSignals = { repo: 'someone/tools', path: 'plugins/sqlite', weeks: 6, activeWeeks: 4, license: 'MIT', osi: true, released: daysBefore(1), releaseDays: 26, likes: 0 };

const part = (score: Score, signal: ScoreSignal) => score.parts.find((p) => p.signal === signal)!;
const points = (s: ScoreSignals, signal: ScoreSignal) => part(scoreOf(s, AS_OF), signal).points;
// Every score this file computes, to check the total against its parts.
const seen: Score[] = [];
const score = (s: ScoreSignals, asOf = AS_OF) => {
	const sc = scoreOf(s, asOf);
	seen.push(sc);
	return sc;
};

describe('scoreOf', () => {
	it('weighs the signals to 100 in all', () => {
		expect(Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
		expect(score(OPEN).parts.map((p) => [p.signal, p.max])).toEqual(SCORE_SIGNALS.map((s) => [s, SCORE_WEIGHTS[s]]));
	});

	it('counts stars on a log scale, in full from 1,000', () => {
		const stars = (n: number) => part(score({ ...OPEN, stars: n }), 'stars').points / SCORE_WEIGHTS.stars;
		expect(stars(0)).toBe(0);
		expect(stars(1)).toBeCloseTo(0.1, 2);
		expect(stars(20)).toBeCloseTo(0.44, 2);
		expect(stars(100)).toBeCloseTo(0.67, 2);
		// 999 stars is just under the anchor, which rounding to a tenth of a point no longer shows; 900 still does.
		expect(stars(999)).toBeLessThanOrEqual(1);
		expect(stars(900)).toBeLessThan(1);
		expect(stars(1000)).toBe(1);
		expect(stars(100_000)).toBe(1);
	});

	it('counts likes on a log scale, in full from 50', () => {
		const likes = (n: number) => part(score({ ...OPEN, likes: n }), 'likes').points;
		expect(likes(0)).toBe(0);
		expect(likes(1)).toBe(2.6);
		expect(likes(2)).toBe(4.2);
		expect(likes(10)).toBe(9.1);
		expect(likes(49)).toBeLessThan(15);
		expect(likes(50)).toBe(15);
		expect(likes(500)).toBe(15);
	});

	it('never lowers the score when a signal grows', () => {
		for (const [field, values] of [
			['stars', [0, 1, 2, 5, 10, 20, 31, 50, 100, 300, 999, 1000, 5000]],
			['likes', [0, 1, 2, 3, 5, 10, 20, 49, 50, 100]],
			['activeWeeks', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]],
			['releaseDays', [0, 1, 2, 3, 4, 6, 8, 11, 12, 13, 50]],
		] as const) {
			const totals = values.map((v) => score({ ...OPEN, stars: 3, likes: 0, activeWeeks: 0, [field]: v }).total);
			for (let i = 1; i < totals.length; i++) expect(totals[i], `${field} ${values[i]}`).toBeGreaterThanOrEqual(totals[i - 1]);
		}
	});

	it('counts openness and license as one scale', () => {
		expect(points(OPEN, 'openness')).toBe(20);
		expect(points({ ...OPEN, license: 'BUSL-1.1', osi: false }, 'openness')).toBe(12);
		expect(points({ ...OPEN, license: 'NOASSERTION', osi: false }, 'openness')).toBe(12);
		expect(points({ ...OPEN, license: null, osi: undefined }, 'openness')).toBe(6);
		expect(points({ likes: 0 }, 'openness')).toBe(0);
		expect(part(score({ likes: 0 }), 'openness').basis).toBe('measured');
	});

	it('counts the days with a release or tag on a log scale, in full from one a week', () => {
		const release = (n: number) => part(score({ ...OPEN, releaseDays: n }), 'release').points;
		expect(RELEASE_ANCHOR).toBe(12);
		expect([0, 1, 2, 3, 4, 6, 8, 11, 12, 13, 84].map(release)).toEqual([0, 2.7, 4.3, 5.4, 6.3, 7.6, 8.6, 9.7, 10, 10, 10]);
		expect(releaseShare(0)).toBe(0);
		expect(releaseShare(RELEASE_ANCHOR)).toBe(1);
		expect(releaseShare(1000)).toBe(1);
		// The days are what counts, not when the latest one was: a record that counted them is not read by its latest day.
		expect(knownReleaseDays({ released: '2020-01-01', releaseDays: 4 }, AS_OF)).toBe(4);
		expect(knownReleaseDays({ released: daysBefore(1), releaseDays: 0 }, AS_OF)).toBe(0);
		expect(part(score({ ...OPEN, released: undefined, releaseDays: 0 }), 'release')).toEqual({ signal: 'release', points: 0, max: 10, basis: 'measured' });
	});

	it('counts a record written before the days were counted as having released on one day when its latest release is in the counted weeks, and none otherwise', () => {
		const old = (released: string | undefined) => knownReleaseDays({ released }, AS_OF);
		expect(old(daysBefore(1))).toBe(1);
		expect(old(daysBefore(84))).toBe(1);
		expect(old(daysBefore(85))).toBe(0);
		expect(old(daysBefore(365))).toBe(0);
		// A release on asOf or after it is not in the counted weeks, as the days are counted: a tag dated in the future earns nothing either.
		expect(old(daysBefore(0))).toBe(0);
		expect(old(daysBefore(-3))).toBe(0);
		expect(old('2099-01-01')).toBe(0);
		expect(old(undefined)).toBe(0);
		expect(points({ ...OPEN, releaseDays: undefined }, 'release')).toBe(2.7);
		expect(points({ ...OPEN, releaseDays: undefined, released: daysBefore(91) }, 'release')).toBe(0);
		expect(part(score({ ...OPEN, releaseDays: undefined, released: undefined }), 'release')).toEqual({ signal: 'release', points: 0, max: 10, basis: 'measured' });
		// It never counts for more than the days, once they are counted, can: one day is the least a release in the weeks gives.
		expect(score({ ...OPEN, releaseDays: undefined }).total).toBeLessThanOrEqual(score({ ...OPEN, releaseDays: 1 }).total);
	});

	it('counts a closed-source app\'s unmeasurable signals at neutral, and its likes as they are', () => {
		const pulse = score({ likes: 2 });
		expect(pulse.parts.map((p) => [p.signal, p.points, p.basis])).toEqual([
			['stars', 15, 'neutral'],
			['activity', 12.5, 'neutral'],
			['openness', 0, 'measured'],
			['likes', 4.2, 'measured'],
			['release', 5, 'neutral'],
		]);
		expect(pulse.total).toBe(37);
		expect(pulse.measured).toBeCloseTo(0.35, 10);
		expect(score({ likes: 0 }).total).toBe(33);
		// Signals recorded for a closed-source entry by mistake count for nothing.
		expect(score({ likes: 2, stars: 5000, weeks: 12, activeWeeks: 12, released: AS_OF }).total).toBe(37);
	});

	it('counts a folder plugin\'s stars at neutral, as its repository\'s are not its own', () => {
		const sqlite = score(PLUGIN);
		expect(part(sqlite, 'stars')).toEqual({ signal: 'stars', points: 15, max: 30, basis: 'neutral' });
		expect(part(sqlite, 'activity').basis).toBe('measured');
		// A repository or folder with no week of history yet: its activity is not measured, so the total is approximate, at the same points as before.
		const fresh = score({ ...OPEN, weeks: 0, activeWeeks: 0 });
		expect(part(fresh, 'activity')).toEqual({ signal: 'activity', points: 12.5, max: 25, basis: 'neutral' });
		expect(fresh.measured).toBe(0.75);
		expect(part(score({ ...OPEN, weeks: 1, activeWeeks: 1 }), 'activity').basis).toBe('measured');
		expect(sqlite.measured).toBeCloseTo(0.7, 10);
		// Stars recorded for it by mistake are not counted either.
		expect(score({ ...PLUGIN, stars: 4592 }).total).toBe(sqlite.total);
		expect(score(OPEN).measured).toBe(1);
	});

	it('counts an unmeasured activity at neutral', () => {
		const s = score({ ...OPEN, weeks: undefined, activeWeeks: undefined });
		expect(part(s, 'activity')).toEqual({ signal: 'activity', points: 25 * NEUTRAL, max: 25, basis: 'neutral' });
	});

	it('halves an archived repository\'s score', () => {
		const live = score(OPEN);
		const archived = score({ ...OPEN, archived: true });
		expect(archived.archived).toBe(true);
		expect(live.archived).toBe(false);
		expect(archived.parts).toEqual(live.parts);
		expect(archived.exact).toBe(ARCHIVED_FACTOR * live.exact);
		expect(archived.total).toBe(Math.round(ARCHIVED_FACTOR * live.parts.reduce((n, p) => n + p.points, 0)));
		expect(archived.total).toBeLessThan(live.total);
		// 0 + 6.3 + 20 + 0 + 2.7 = 29 points, halved 14.5, rounds up to 15.
		const half = score({ repo: 'a/b', stars: 0, weeks: 12, activeWeeks: 2, license: 'MIT', osi: true, releaseDays: 1, likes: 0, archived: true });
		expect(half.parts.map((p) => p.points)).toEqual([0, 6.3, 20, 0, 2.7]);
		expect([half.exact, half.total]).toEqual([14.5, 15]);
	});

	it('adds the parts up in tenths, so a sum of x.5 rounds up as the breakdown does', () => {
		// 15 (stars, neutral) + 12.5 (activity, neutral) + 0 + 0 + 5 (release, neutral) = 32.5 points: 33.
		const closed = score({ likes: 0 });
		expect([closed.exact, closed.total]).toEqual([32.5, 33]);
		// 3.0 + 25 + 20 + 4.2 + 2.7 = 54.9; with one star fewer, 0 + 25 + 20 + 4.2 + 2.7 = 51.9.
		const kit = score({ repo: 'a/b', stars: 1, weeks: 12, activeWeeks: 12, license: 'MIT', osi: true, releaseDays: 1, likes: 2 });
		expect(kit.parts.map((p) => p.points)).toEqual([3, 25, 20, 4.2, 2.7]);
		expect([kit.exact, kit.total]).toEqual([54.9, 55]);
		// 0 + 18.8 + 20 + 5.3 + 5.4 is 49.5 in tenths, but 49.49999999999999 added up in floating point, which would round down to 49.
		const half = score({ repo: 'a/b', stars: 0, weeks: 12, activeWeeks: 6, license: 'MIT', osi: true, releaseDays: 3, likes: 3 });
		expect(half.parts.map((p) => p.points)).toEqual([0, 18.8, 20, 5.3, 5.4]);
		expect(half.parts.reduce((n, p) => n + p.points, 0)).toBeLessThan(49.5);
		expect([half.exact, half.total]).toEqual([49.5, 50]);
	});

	it('gives the same score for the same signals, whenever it is computed', () => {
		expect(scoreOf(OPEN, AS_OF)).toEqual(scoreOf(OPEN, AS_OF));
		expect(scoreOf({ likes: 2 }, AS_OF)).toEqual(scoreOf({ likes: 2 }, '2027-01-04'));
	});

	it('makes the total of every score its parts\' points, rounded', () => {
		for (const stars of [0, 7, 31, 640]) for (const likes of [0, 1, 3, 17]) for (const archived of [undefined, true]) for (const base of [OPEN, PLUGIN, { likes: 0 }]) score({ ...base, stars, likes, archived });
		for (const s of seen) {
			expect(s.exact).toBe(((s.archived ? ARCHIVED_FACTOR : 1) * s.parts.reduce((n, p) => n + Math.round(p.points * 10), 0)) / 10);
			expect(s.total).toBe(Math.round(s.exact));
			expect(Math.abs(s.total - (s.archived ? ARCHIVED_FACTOR : 1) * s.parts.reduce((n, p) => n + p.points, 0))).toBeLessThanOrEqual(0.5 + 1e-9);
			expect(Number.isInteger(s.total)).toBe(true);
			expect(s.total).toBeGreaterThanOrEqual(0);
			expect(s.total).toBeLessThanOrEqual(100);
			for (const p of s.parts) expect(Math.round(p.points * 10) / 10).toBe(p.points);
		}
	});
});

describe('activityShare', () => {
	it('counts active weeks over the weeks a project is judged on', () => {
		expect(activityShare(0, 0)).toBe(0.5);
		expect(activityShare(2, 2)).toBe(0.75);
		expect(activityShare(3, 3)).toBe(0.875);
		expect(activityShare(6, 6)).toBe(1);
		expect(activityShare(12, 8)).toBe(1);
		expect(activityShare(12, 12)).toBe(1);
		expect(activityShare(12, 4)).toBe(0.5);
		expect(activityShare(12, 0)).toBe(0);
	});

	it('has no sudden drop when a young project turns four weeks old, and never drops for a busy week', () => {
		for (let a = 0; a <= 3; a++) expect(activityShare(3, a) - activityShare(4, a), `${a} active`).toBeLessThanOrEqual(0.125);
		for (let w = 0; w < 12; w++) {
			for (let a = 0; a <= w; a++) {
				expect(activityShare(w + 1, a + 1), `${w} weeks, ${a} active`).toBeGreaterThanOrEqual(activityShare(w, a));
				expect(activityShare(w, a + 1), `${w} weeks, ${a} active`).toBeGreaterThanOrEqual(activityShare(w, a));
			}
		}
	});
});

describe('scoreTarget', () => {
	it('measures an entry\'s repo field', () => {
		expect(scoreTarget({ repo: 'someone/app', url: 'https://app.someone.dev' })).toEqual({ repo: 'someone/app' });
		expect(scoreTarget({ repo: 'someone/kit' })).toEqual({ repo: 'someone/kit' });
	});

	it('measures the repository an app without a repo field links to', () => {
		expect(scoreTarget({ url: 'https://github.com/someone/game-2048' })).toEqual({ repo: 'someone/game-2048' });
		expect(scoreTarget({ url: 'https://github.com/someone/game-2048.git' })).toEqual({ repo: 'someone/game-2048' });
	});

	it('measures a plugin in its folder of a larger repository', () => {
		const sqlite = { url: 'https://github.com/someone/tools/blob/main/docs/plugins/sqlite.md', goImport: 'github.com/someone/tools/plugins/sqlite' };
		expect(scoreTarget(sqlite)).toEqual({ repo: 'someone/tools', path: 'plugins/sqlite' });
		expect(scoreTarget({ ...sqlite, goImport: 'github.com/Someone/Tools/plugins/sqlite' })).toEqual({ repo: 'someone/tools', path: 'plugins/sqlite' });
		expect(scoreTarget({ url: 'https://kit.someone.dev', goImport: 'github.com/someone/kit/kitnsgo' })).toEqual({ repo: 'someone/kit', path: 'kitnsgo' });
	});

	it('measures the folder a /tree/ link points at', () => {
		expect(scoreTarget({ url: 'https://github.com/someone/tools/tree/main/x' })).toEqual({ repo: 'someone/tools', path: 'x' });
		expect(scoreTarget({ url: 'https://github.com/someone/tools/tree/main/x/y/' })).toEqual({ repo: 'someone/tools', path: 'x/y' });
		expect(scoreTarget({ url: 'https://github.com/someone/tools/tree/main/x#readme' })).toEqual({ repo: 'someone/tools', path: 'x' });
		expect(scoreTarget({ repo: 'Someone/Tools', url: 'https://github.com/someone/tools/tree/main/x' })).toEqual({ repo: 'Someone/Tools', path: 'x' });
		// A link into another repository says nothing of a folder of the entry's own.
		expect(scoreTarget({ repo: 'someone/app', url: 'https://github.com/other/monorepo/tree/main/packages/app' })).toEqual({ repo: 'someone/app' });
	});

	it('measures nothing of a closed-source entry', () => {
		expect(scoreTarget({ url: 'https://reef.someone.dev' })).toEqual({});
		expect(scoreTarget({})).toEqual({});
	});
});

describe('scoreKey', () => {
	it('keys an entry as its like is keyed', () => {
		expect(scoreKey('app', { slug: 'app', repo: 'someone/app' })).toBe('app:app');
		expect(scoreKey('plugin', { slug: 'sqlite' })).toBe('plugin:sqlite');
		expect(scoreKey('ui', { slug: 'kit', repo: 'someone/kit' })).toBe('ui:someone/kit');
		expect(scoreKey('state', { slug: 'store', repo: 'someone/store' })).toBe('state:someone/store');
		expect(scoreKey('template', { slug: 'starter', repo: 'someone/starter' })).toBe('template:someone/starter');
		// Several AI tools may share a repository, so theirs is by slug.
		expect(scoreKey('ai', { slug: 'nsgo-usage', repo: 'someone/skills' })).toBe('ai:nsgo-usage');
	});
});
