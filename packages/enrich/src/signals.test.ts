import { describe, expect, it } from 'vitest';
import { scoreOf } from '../../catalog/src/score.ts';
import type { ScoreSignals, ScoreTarget } from '../../catalog/src/score.ts';
import { type Batch, type BatchResult, type ScoresFile, anomalies, assemble, batches, buildQuery, commitMessage, eligibleWeeks, isIdle, isOsi, latestRelease, parseBatch, planRun, readLikes, releaseDays, scoredEntry, serializeScores, signalsOf, weekStart, weekWindows } from './signals.ts';

const DAY = 86_400_000;
const ASOF = '2026-11-02';
const MONDAY = Date.parse(`${ASOF}T00:00:00Z`);
// The run's time: the Wednesday after ASOF, as the daily workflow runs.
const NOW = Date.parse('2026-11-04T03:41:00Z');
const iso = (t: number) => new Date(t).toISOString();
const none = Array<boolean>(12).fill(false);
const activeAt = (...weeks: number[]) => none.map((_, i) => weeks.includes(i));

describe('the weeks', () => {
	it('end on the Monday of the week, in UTC', () => {
		expect(weekStart(new Date('2026-11-08T23:59:59Z'))).toBe('2026-11-02');
		expect(weekStart(new Date('2026-11-09T00:00:00Z'))).toBe('2026-11-09');
		expect(weekStart(new Date('2026-11-05T12:00:00Z'))).toBe('2026-11-02');
		expect(weekStart(new Date('2026-11-02T00:00:00Z'))).toBe('2026-11-02');
	});

	it('are 12 weeks before asOf, the latest first, each starting where the next one ends', () => {
		const windows = weekWindows(ASOF);
		expect(windows).toHaveLength(12);
		expect(windows[0].end).toBe(MONDAY);
		windows.forEach((w, i) => {
			expect(w.end - w.start).toBe(7 * DAY);
			if (i > 0) expect(w.end).toBe(windows[i - 1].start);
		});
		expect(windows[11].start).toBe(MONDAY - 84 * DAY);
	});

	it('count for a repository from the week it was created', () => {
		// Created on the Wednesday of window 3: windows 0 to 3 end after it.
		expect(eligibleWeeks(iso(MONDAY - 26 * DAY), activeAt(0, 1), undefined, ASOF)).toBe(4);
		// Created a second before window 0 ends: that window counts.
		expect(eligibleWeeks(iso(MONDAY - 1000), none, undefined, ASOF)).toBe(1);
		expect(eligibleWeeks(iso(MONDAY), none, undefined, ASOF)).toBe(0);
		expect(eligibleWeeks('2020-01-01T00:00:00Z', activeAt(0), undefined, ASOF)).toBe(12);
	});

	it('count back to the oldest active week when the history is older than the repository', () => {
		expect(eligibleWeeks(iso(MONDAY - 3 * DAY), activeAt(0, 8), undefined, ASOF)).toBe(9);
	});

	it('count for a repository whose history starts after the repository was made from its oldest active week', () => {
		// A repository created in July whose history was rewritten to start in the second-latest week.
		expect(eligibleWeeks('2026-07-18T00:00:00Z', activeAt(0, 1), 0, ASOF)).toBe(2);
		expect(eligibleWeeks('2026-07-18T00:00:00Z', activeAt(0, 1), 4, ASOF)).toBe(12);
		// Not known, as when the count is missing from the answer: from its creation.
		expect(eligibleWeeks('2026-07-18T00:00:00Z', activeAt(0, 1), undefined, ASOF)).toBe(12);
	});

	it('count for a folder with no commit before them from its oldest active week, and as the repository otherwise', () => {
		expect(eligibleWeeks('2020-01-01T00:00:00Z', activeAt(0, 2, 5), 0, ASOF)).toBe(6);
		expect(eligibleWeeks('2020-01-01T00:00:00Z', none, 0, ASOF)).toBe(0);
		expect(eligibleWeeks('2020-01-01T00:00:00Z', activeAt(0, 2, 5), 3, ASOF)).toBe(12);
	});
});

describe('the release and the license', () => {
	it('take the later of the latest release and the latest tag', () => {
		const RUN = Date.parse('2026-11-04T03:41:00Z');
		expect(latestRelease('2026-09-01T10:00:00Z', ['2026-10-30T23:30:00Z'], RUN)).toBe('2026-10-30');
		expect(latestRelease('2026-10-31T00:10:00Z', ['2026-10-30T23:30:00Z'], RUN)).toBe('2026-10-31');
		expect(latestRelease(null, ['2026-10-30T23:30:00Z'], RUN)).toBe('2026-10-30');
		expect(latestRelease('2026-09-01T10:00:00Z', [], RUN)).toBe('2026-09-01');
		expect(latestRelease(null, [], RUN)).toBeUndefined();
		expect(latestRelease(undefined, [undefined, null], RUN)).toBeUndefined();
		// A tag on a commit dated in the future is not believed; the newest real one counts.
		expect(latestRelease(null, ['2099-01-01T00:00:00Z', '2026-10-20T08:00:00Z'], RUN)).toBe('2026-10-20');
		expect(latestRelease('2026-09-01T10:00:00Z', ['2099-01-01T00:00:00Z'], RUN)).toBe('2026-09-01');
		// A release made between Monday and the run counts.
		expect(latestRelease('2026-11-03T12:00:00Z', [], RUN)).toBe('2026-11-03');
	});

	it('count the days with a release or tag in the counted weeks, the 12 full weeks before asOf', () => {
		const windows = weekWindows(ASOF);
		const start = MONDAY - 84 * DAY;
		expect(releaseDays([], windows)).toBe(0);
		expect(releaseDays([null, undefined], windows)).toBe(0);
		// Several on one day, or a monorepo's tags of all its packages, count once; days are UTC.
		expect(releaseDays(['2026-10-20T08:00:00Z', '2026-10-20T08:00:05Z', '2026-10-20T23:59:59Z', '2026-10-21T00:00:00Z'], windows)).toBe(2);
		// From the start of the oldest window, inclusive, up to asOf, exclusive: the days of this week are not counted, the same for every run of the week, as activity counts only the full weeks.
		expect(releaseDays([iso(start), iso(start - 1000), iso(MONDAY - 1000), iso(MONDAY), '2026-11-03T12:00:00Z', iso(NOW)], windows)).toBe(2);
		// A tag dated in the future is not believed, as for the latest release.
		expect(releaseDays(['2099-01-01T00:00:00Z', iso(NOW + 1000)], windows)).toBe(0);
		// A daily release window includes the current UTC day through the next midnight.
		expect(releaseDays(['2026-11-03T12:00:00Z'], weekWindows('2026-11-05'), NOW)).toBe(1);
		expect(releaseDays(Array.from({ length: 30 }, (_, i) => iso(start + i * DAY)), windows)).toBe(30);
		expect(releaseDays(Array.from({ length: 90 }, (_, i) => iso(start + i * DAY)), windows)).toBe(84);
	});

	it('knows the licenses the OSI approves', () => {
		expect(isOsi('MIT')).toBe(true);
		expect(isOsi('Unlicense')).toBe(true);
		expect(isOsi('Apache-2.0')).toBe(true);
		expect(isOsi('BUSL-1.1')).toBe(false);
		expect(isOsi('CC-BY-NC-4.0')).toBe(false);
		expect(isOsi('NOASSERTION')).toBe(false);
		expect(isOsi(null)).toBe(false);
		expect(isOsi('toString')).toBe(false);
	});
});

describe('what the site scores', () => {
	it('derives the key and target as the catalog does', () => {
		expect(scoredEntry('app', { slug: 'nsgo-gallery', url: 'https://oneo-me.github.io/nsgo/gallery/loader.html' })).toEqual({ key: 'app:nsgo-gallery', target: {}, urlOnly: false });
		expect(scoredEntry('app', { slug: 'ocr-manager', url: 'https://github.com/freewu/ocr-manager' })).toEqual({ key: 'app:ocr-manager', target: { repo: 'freewu/ocr-manager' }, urlOnly: true });
		expect(scoredEntry('app', { slug: 'bamboo', url: 'https://getbamboo.app/', repo: 'OldPanda/bamboo' })).toEqual({ key: 'app:bamboo', target: { repo: 'OldPanda/bamboo' }, urlOnly: false });
		expect(scoredEntry('ui', { slug: 'mujicaui', repo: 'ELY-Open-Source/MujicaUI', url: 'https://github.com/ELY-Open-Source/MujicaUI/tree/main/x' })).toEqual({ key: 'ui:ELY-Open-Source/MujicaUI', target: { repo: 'ELY-Open-Source/MujicaUI' }, urlOnly: false });
		expect(scoredEntry('plugin', { slug: 'untie', official: false, docs: 'https://github.com/someone/untie', import: 'github.com/someone/untie' })).toEqual({ key: 'plugin:untie', target: { repo: 'someone/untie' }, urlOnly: false });
	});

	it('leaves out official plugins, which are packages of NSGo itself', () => {
		expect(scoredEntry('plugin', { slug: 'datatable', official: true, docs: 'https://oneo-me.github.io/nsgo/docs/lists/', import: 'github.com/oneo-me/nsgo/base/datatable' })).toBeUndefined();
		expect(scoredEntry('plugin', { slug: 'untie', official: false, docs: 'https://github.com/someone/untie', import: 'github.com/someone/untie' })).toEqual({ key: 'plugin:untie', target: { repo: 'someone/untie' }, urlOnly: false });
	});
});

const ledger: ScoreSignals = { repo: 'jane/ledger', stars: 1419, weeks: 12, activeWeeks: 12, license: 'MIT', osi: true, released: '2026-11-01', releaseDays: 11, likes: 0 };
const sqlite: ScoreSignals = { repo: 'oneo-me/nsgo', path: 'base/datatable', weeks: 6, activeWeeks: 4, license: 'MIT', osi: true, released: '2026-11-01', releaseDays: 26, likes: 0 };
const pulse: ScoreSignals = { likes: 2 };

describe('which entries a run measures', () => {
	const targets = new Map<string, ScoreTarget>([
		['app:ledger', { repo: 'jane/ledger' }],
		['app:pulse', {}],
		['plugin:sqlite', { repo: 'oneo-me/nsgo', path: 'base/datatable' }],
		['app:new', { repo: 'you/new' }],
	]);

	it('measures every entry in the first run of a week, and drops the entries that are gone', () => {
		const prev: ScoresFile = { asOf: '2026-10-26', entries: { 'app:ledger': ledger, 'app:pulse': pulse, 'app:gone': ledger } };
		const plan = planRun(prev, targets, ASOF, false);
		expect(plan.full).toBe(true);
		expect(plan.measure).toEqual(['app:ledger', 'app:new', 'app:pulse', 'plugin:sqlite']);
		expect(plan.keep).toEqual({});
		expect(plan.dropped).toEqual(['app:gone']);
	});

	it('measures every entry of the seed file', () => {
		expect(planRun({ asOf: null, entries: {} }, targets, ASOF, false).measure).toHaveLength(4);
	});

	it('measures every entry when asked to, in the same week', () => {
		const prev: ScoresFile = { asOf: ASOF, entries: { 'app:ledger': ledger, 'app:pulse': pulse, 'plugin:sqlite': sqlite, 'app:new': { ...ledger, repo: 'you/new' } } };
		const plan = planRun(prev, targets, ASOF, true);
		expect(plan.full).toBe(true);
		expect(plan.measure).toHaveLength(4);
	});

	it('later in the week measures only the entries without a record of their repository or folder, and keeps the rest as they are', () => {
		const prev: ScoresFile = { asOf: ASOF, entries: { 'app:ledger': ledger, 'app:pulse': pulse, 'plugin:sqlite': { ...sqlite, path: 'base/datatable3' }, 'app:gone': ledger } };
		const plan = planRun(prev, targets, ASOF, false);
		expect(plan.full).toBe(false);
		expect(plan.measure).toEqual(['app:new', 'plugin:sqlite']);
		expect(plan.moved).toEqual(['plugin:sqlite']);
		expect(plan.dropped).toEqual(['app:gone']);
		expect(plan.keep['app:ledger']).toBe(ledger);
		expect(plan.keep['app:pulse']).toBe(pulse);
		expect(isIdle(plan)).toBe(false);
	});

	it('later in the week measures again the records of a file from before the release days were recorded, so a formula change needs no manual full run', () => {
		const { releaseDays: _, ...before } = ledger;
		const { releaseDays: __, ...sqliteBefore } = sqlite;
		const prev: ScoresFile = { asOf: ASOF, entries: { 'app:ledger': before, 'app:pulse': pulse, 'plugin:sqlite': sqliteBefore } };
		const plan = planRun(prev, targets, ASOF, false);
		expect(plan.full).toBe(false);
		expect(plan.measure).toEqual(['app:ledger', 'app:new', 'plugin:sqlite']);
		expect(plan.stale).toEqual(['app:ledger', 'plugin:sqlite']);
		expect(plan.moved).toEqual([]);
		// A closed-source record has no release days to count.
		expect(Object.keys(plan.keep)).toEqual(['app:pulse']);
		// One that moved as well is moved, not stale.
		const moved = planRun({ ...prev, entries: { ...prev.entries, 'plugin:sqlite': { ...sqliteBefore, path: 'base/datatable3' } } }, targets, ASOF, false);
		expect([moved.measure, moved.moved, moved.stale]).toEqual([['app:ledger', 'app:new', 'plugin:sqlite'], ['plugin:sqlite'], ['app:ledger']]);
	});

	it('keeps a record without release days once the file has them, so that one kept because its repository was not found does not leave every run with something to do', () => {
		const { releaseDays: _, ...before } = ledger;
		// app:new's repository was not found when the release days were first recorded, so its record was kept as it was; 0 is a count.
		const prev: ScoresFile = { asOf: ASOF, entries: { 'app:ledger': { ...ledger, releaseDays: 0 }, 'app:pulse': pulse, 'plugin:sqlite': sqlite, 'app:new': { ...before, repo: 'you/new' } } };
		const plan = planRun(prev, targets, ASOF, false);
		expect(plan.measure).toEqual([]);
		expect(plan.stale).toEqual([]);
		expect(plan.keep['app:new']).toBe(prev.entries['app:new']);
		expect(isIdle(plan)).toBe(true);
	});

	it('has nothing to do when every entry is recorded this week', () => {
		const prev: ScoresFile = { asOf: ASOF, entries: { 'app:ledger': ledger, 'app:pulse': pulse, 'plugin:sqlite': sqlite, 'app:new': { ...ledger, repo: 'you/new' } } };
		const plan = planRun(prev, targets, ASOF, false);
		expect(isIdle(plan)).toBe(true);
		expect(serializeScores({ asOf: prev.asOf, entries: plan.keep })).toBe(serializeScores(prev));
	});
});

describe('the file', () => {
	it('is the seed file when empty', () => {
		expect(serializeScores({ asOf: null, entries: {} })).toBe('{\n\t"$schema": "./schema/scores.schema.json",\n\t"asOf": null,\n\t"entries": {}\n}\n');
	});

	it('has its keys in order, tabs, an entry to a line and a trailing newline', () => {
		const text = serializeScores({ asOf: ASOF, entries: { 'plugin:sqlite': sqlite, 'app:pulse': pulse, 'app:ledger': ledger } });
		expect(text).toBe(
			[
				'{',
				'\t"$schema": "./schema/scores.schema.json",',
				'\t"asOf": "2026-11-02",',
				'\t"entries": {',
				'\t\t"app:ledger": { "activeWeeks": 12, "license": "MIT", "likes": 0, "osi": true, "releaseDays": 11, "released": "2026-11-01", "repo": "jane/ledger", "stars": 1419, "weeks": 12 },',
				'\t\t"app:pulse": { "likes": 2 },',
				'\t\t"plugin:sqlite": { "activeWeeks": 4, "license": "MIT", "likes": 0, "osi": true, "path": "base/datatable", "releaseDays": 26, "released": "2026-11-01", "repo": "oneo-me/nsgo", "weeks": 6 }',
				'\t}',
				'}',
				'',
			].join('\n'),
		);
		expect(JSON.parse(text)).toEqual({ $schema: './schema/scores.schema.json', asOf: ASOF, entries: { 'app:ledger': ledger, 'app:pulse': pulse, 'plugin:sqlite': sqlite } });
	});

	it('is the same bytes for the same signals, whatever order they come in', () => {
		const shuffled = { likes: 0, weeks: 12, releaseDays: 11, stars: 1419, repo: 'jane/ledger', released: '2026-11-01', osi: true, license: 'MIT', activeWeeks: 12 };
		expect(serializeScores({ asOf: ASOF, entries: { 'app:pulse': pulse, 'app:ledger': shuffled } })).toBe(serializeScores({ asOf: ASOF, entries: { 'app:ledger': ledger, 'app:pulse': pulse } }));
	});

	it('reads back as it was written', () => {
		const file: ScoresFile = { asOf: ASOF, entries: { 'app:ledger': ledger, 'app:pulse': pulse, 'plugin:sqlite': sqlite, 'ui:a/b': { repo: 'a/b', stars: 0, weeks: 0, activeWeeks: 0, license: null, archived: true, likes: 1 } } };
		const text = serializeScores(file);
		expect(serializeScores({ ...(JSON.parse(text) as ScoresFile) })).toBe(text);
	});
});

const plugins = Array.from({ length: 12 }, (_, i) => ({ key: `plugin:p${String(i).padStart(2, '0')}`, repo: 'oneo-me/nsgo', path: `base/p${i}` }));

describe('the GraphQL requests', () => {
	const windows = weekWindows(ASOF);

	it('ask at most 10 entries each, and a repository\'s own fields once a run', () => {
		const out = batches([{ key: 'app:ledger', repo: 'jane/ledger' }, ...plugins, { key: 'app:aa', repo: 'aa/aa' }]);
		expect(out.map((b) => b.repos.flatMap((r) => r.targets).length)).toEqual([10, 4]);
		expect(out[0].repos.map((r) => [r.repo, r.fields])).toEqual([
			['aa/aa', true],
			['jane/ledger', true],
			['oneo-me/nsgo', true],
		]);
		expect(out[1].repos.map((r) => [r.repo, r.fields])).toEqual([['oneo-me/nsgo', false]]);
		expect(buildQuery(out[0], windows).match(/stargazerCount/g)).toHaveLength(3);
		expect(buildQuery(out[1], windows)).not.toContain('stargazerCount');
	});

	it('takes one repository spelled two ways as one', () => {
		const out = batches([
			{ key: 'app:a', repo: 'Jane/Ledger' },
			{ key: 'app:b', repo: 'jane/ledger' },
		]);
		expect(out[0].repos).toHaveLength(1);
		expect(out[0].repos[0].targets.map((t) => t.key)).toEqual(['app:a', 'app:b']);
	});

	it('counts a folder\'s commits in the folder, with those before the weeks', () => {
		const query = buildQuery({ repos: [{ repo: 'oneo-me/nsgo', fields: true, targets: [{ key: 'plugin:sqlite', path: 'base/datatable' }] }] }, windows);
		expect(query).toContain('r0: repository(owner: "oneo-me", name: "nsgo")');
		expect(query).toContain('t0w0: history(since: "2026-10-26T00:00:00Z", until: "2026-11-01T23:59:59Z", path: "base/datatable", first: 1) { totalCount }');
		expect(query).toContain('t0w11: history(since: "2026-08-10T00:00:00Z", until: "2026-08-16T23:59:59Z", path: "base/datatable", first: 1) { totalCount }');
		expect(query).toContain('t0pre: history(until: "2026-08-09T23:59:59Z", path: "base/datatable", first: 1) { totalCount }');
		expect(query).toContain('t0ever: history(path: "base/datatable", first: 1) { totalCount }');
		expect(query).toContain('orderBy: { field: TAG_COMMIT_DATE, direction: DESC }');
	});

	it('counts a repository\'s commits and those before the weeks without a path, and not all of them', () => {
		const query = buildQuery({ repos: [{ repo: 'jane/ledger', fields: true, targets: [{ key: 'app:ledger' }] }] }, windows);
		expect(query).toContain('t0w0: history(since: "2026-10-26T00:00:00Z", until: "2026-11-01T23:59:59Z", first: 1) { totalCount }');
		expect(query).toContain('t0pre: history(until: "2026-08-09T23:59:59Z", first: 1) { totalCount }');
		expect(query).not.toContain('ever:');
		expect(query).not.toContain('path:');
	});
});

describe('reading GitHub\'s answer', () => {
	const windows = weekWindows(ASOF);
	const batch: Batch = {
		repos: [
			{ repo: 'jane/ledger', fields: true, targets: [{ key: 'app:ledger' }] },
			{ repo: 'gone/app', fields: true, targets: [{ key: 'app:gone' }] },
			{ repo: 'oneo-me/nsgo', fields: true, targets: [{ key: 'plugin:sqlite', path: 'base/datatable' }, { key: 'plugin:fetch', path: 'base/plot' }] },
		],
	};
	const weeks = (n: number, counts: number[], pre?: number, ever?: number) => ({ ...Object.fromEntries(counts.map((c, w) => [`t${n}w${w}`, { totalCount: c }])), ...(pre === undefined ? {} : { [`t${n}pre`]: { totalCount: pre }, [`t${n}ever`]: { totalCount: ever } }) });
	const answer = {
		data: {
			r0: { stargazerCount: 1419, isArchived: false, createdAt: '2025-01-01T00:00:00Z', licenseInfo: { spdxId: 'MIT' }, latestRelease: { publishedAt: '2026-10-01T00:00:00Z' }, releases: { nodes: [{ publishedAt: null, tagName: 'v0.4.0' }, { publishedAt: '2026-10-01T00:00:00Z', tagName: 'v0.2.0' }, { publishedAt: '2026-07-01T00:00:00Z', tagName: 'v0.1.0' }] }, refs: { nodes: [{ name: 'v0.3.1', target: { committedDate: '2026-11-01T08:00:00Z' } }, { name: 'v0.3.0', target: { tagger: { date: '2026-11-01T20:00:00Z' } } }, { name: 'v0.2.0', target: { committedDate: '2026-10-01T00:00:00Z' } }] }, defaultBranchRef: { target: weeks(0, [3400, 0, 5, 1, 1, 1, 1, 1, 1, 1, 1, 1]) } },
			r1: null,
			r2: {
				stargazerCount: 4592,
				isArchived: true,
				createdAt: '2026-09-25T00:00:00Z',
				licenseInfo: { spdxId: 'NOASSERTION' },
				latestRelease: null,
				refs: { nodes: [{ name: 'base/datatable/v0.1.0', target: { tagger: { date: '2026-10-20T00:00:00Z' } } }] },
				defaultBranchRef: { target: { ...weeks(2, [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0], 0, 5), ...weeks(3, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 0, 0) } },
			},
		},
		errors: [{ type: 'NOT_FOUND', path: ['r1'], message: "Could not resolve to a Repository with the name 'gone/app'." }],
	};

	it('reads each repository and each entry\'s weeks, and lists a repository GitHub does not find', () => {
		const out = parseBatch(batch, answer, windows, NOW);
		expect(out.notFound).toEqual(['app:gone']);
		// ledger's days: 2026-10-01 (a release and its tag) and 2026-11-01 (two tags); a draft has no date, and a release in July is before the weeks.
		expect(out.repos.get('jane/ledger')).toEqual({ stars: 1419, archived: false, createdAt: '2025-01-01T00:00:00Z', license: 'MIT', released: '2026-11-01', releaseDays: 2 });
		expect(out.repos.get('oneo-me/nsgo')).toEqual({ stars: 4592, archived: true, createdAt: '2026-09-25T00:00:00Z', license: 'NOASSERTION', released: '2026-10-20', releaseDays: 1 });
		expect(out.activity.get('app:ledger')).toEqual({ active: activeAt(0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11) });
		expect(out.activity.get('plugin:sqlite')).toEqual({ active: activeAt(0, 2), pre: 0, ever: 5 });
		expect(out.activity.get('plugin:fetch')).toEqual({ active: none, pre: 0, ever: 0 });
	});

	it('dates a tag with a release by that release alone, so that the two count as one day even when the tag\'s commit is from an earlier day', () => {
		const repo = (releases: { publishedAt: string | null; tagName: string }[], refs: { name: string; committedDate: string }[]) => {
			const r0 = { stargazerCount: 1, isArchived: false, createdAt: '2026-09-01T00:00:00Z', licenseInfo: { spdxId: 'MIT' }, latestRelease: releases.find((n) => n.publishedAt) ?? null, releases: { nodes: releases }, refs: { nodes: refs.map(({ name, committedDate }) => ({ name, target: { committedDate } })) }, defaultBranchRef: null };
			return parseBatch({ repos: [{ repo: 'a/b', fields: true, targets: [{ key: 'ui:a/b' }] }] }, { data: { r0 } }, windows, NOW).repos.get('a/b');
		};
		// A release made from GitHub's release page, or a lightweight tag of HEAD, is dated by its commit, here the evening before the release was published, on another UTC day.
		const release = { publishedAt: '2026-10-28T00:21:57Z', tagName: 'v0.1.1' };
		const tag = { name: 'v0.1.1', committedDate: '2026-10-27T19:38:12Z' };
		expect(repo([release], [tag])).toMatchObject({ released: '2026-10-28', releaseDays: 1 });
		// A bare tag on another day is a day of its own.
		expect(repo([release], [tag, { name: 'v0.1.0', committedDate: '2026-10-20T10:00:00Z' }])?.releaseDays).toBe(2);
		// A draft has no date, so its tag keeps its own.
		expect(repo([{ publishedAt: null, tagName: 'v0.2.0' }], [{ name: 'v0.2.0', committedDate: '2026-10-15T10:00:00Z' }])).toMatchObject({ released: '2026-10-15', releaseDays: 1 });
	});

	it('takes a repository without a license as one, and without commits as inactive', () => {
		const out = parseBatch({ repos: [{ repo: 'a/b', fields: true, targets: [{ key: 'ui:a/b' }] }] }, { data: { r0: { stargazerCount: 2, isArchived: false, createdAt: '2026-10-01T00:00:00Z', licenseInfo: null, latestRelease: null, releases: { nodes: [] }, refs: { nodes: [] }, defaultBranchRef: null } } }, windows, NOW);
		expect(out.repos.get('a/b')).toEqual({ stars: 2, archived: false, createdAt: '2026-10-01T00:00:00Z', license: null, released: undefined, releaseDays: 0 });
		expect(out.activity.get('ui:a/b')).toEqual({ active: none });
	});

	it('throws on any other error, and on an answer without data', () => {
		expect(() => parseBatch(batch, { ...answer, errors: [{ type: 'RATE_LIMITED', path: ['r0'], message: 'API rate limit exceeded' }] }, windows, NOW)).toThrow(/RATE_LIMITED/);
		expect(() => parseBatch(batch, { data: answer.data, errors: [{ message: 'Something went wrong' }] }, windows, NOW)).toThrow(/Something went wrong/);
		expect(() => parseBatch(batch, { data: null, errors: [] }, windows, NOW)).toThrow(/without data/);
	});

	it('records the signals the catalog reads', () => {
		const out = parseBatch(batch, answer, windows, NOW);
		expect(signalsOf({ repo: 'jane/ledger' }, out.repos.get('jane/ledger')!, out.activity.get('app:ledger')!, 3, ASOF)).toEqual({ repo: 'jane/ledger', stars: 1419, weeks: 12, activeWeeks: 11, license: 'MIT', osi: true, released: '2026-11-01', releaseDays: 2, likes: 3 });
		expect(signalsOf({ repo: 'oneo-me/nsgo', path: 'base/datatable' }, out.repos.get('oneo-me/nsgo')!, out.activity.get('plugin:sqlite')!, 0, ASOF)).toEqual({ repo: 'oneo-me/nsgo', path: 'base/datatable', weeks: 3, activeWeeks: 2, license: 'NOASSERTION', osi: false, released: '2026-10-20', releaseDays: 1, archived: true, likes: 0 });
		// A folder with no commit ever moved or is misnamed: judged on the repository's weeks, 0 activity, not counted at half as a new one is.
		const nsgo = { stars: 4592, archived: false, createdAt: '2026-09-28T00:00:00Z', license: 'MIT', releaseDays: 26 };
		const gone = signalsOf({ repo: 'oneo-me/nsgo', path: 'base/old' }, nsgo, { active: none, pre: 0, ever: 0 }, 0, ASOF);
		expect([gone.weeks, gone.activeWeeks]).toEqual([5, 0]);
		expect(scoreOf(gone, ASOF).parts.find((p) => p.signal === 'activity')).toMatchObject({ points: 0, basis: 'measured' });
		// A folder added after the windows (commits, but none in them yet) is new: 0 weeks, counted at half.
		expect(signalsOf({ repo: 'oneo-me/nsgo', path: 'base/new' }, nsgo, { active: none, pre: 0, ever: 2 }, 0, ASOF).weeks).toBe(0);
		// A folder has its repository's release days, as its license.
		expect(signalsOf({ repo: 'oneo-me/nsgo', path: 'base/new' }, nsgo, { active: none, pre: 0, ever: 2 }, 0, ASOF).releaseDays).toBe(26);
		// The release days are written for every entry with a repository, none included: a record without them is one from before they were counted.
		const bare = signalsOf({ repo: 'a/b' }, { stars: 0, archived: false, createdAt: '2020-01-01T00:00:00Z', license: null, releaseDays: 0 }, { active: none }, 0, ASOF);
		expect(bare).toEqual({ repo: 'a/b', stars: 0, weeks: 12, activeWeeks: 0, license: null, releaseDays: 0, likes: 0 });
		expect(Object.keys(bare)).not.toContain('osi');
		expect(Object.keys(bare)).not.toContain('archived');
		expect(Object.keys(bare)).not.toContain('released');
	});
});

describe('the file a run writes', () => {
	const info = { stars: 10, archived: false, createdAt: '2020-01-01T00:00:00Z', license: 'MIT', releaseDays: 0 };
	const keys = Array.from({ length: 10 }, (_, i) => `app:a${i}`);
	const targets = new Map<string, ScoreTarget>([...keys.map((k, i): [string, ScoreTarget] => [k, { repo: `o/a${i}` }]), ['app:pulse', {}]]);
	const found = (notFound: string[]): BatchResult => ({
		repos: new Map(keys.filter((k) => !notFound.includes(k)).map((k) => [`o/${k.slice('app:'.length)}`, info])),
		activity: new Map(keys.filter((k) => !notFound.includes(k)).map((k) => [k, { active: none }])),
		notFound,
	});
	const old: ScoreSignals = { repo: 'o/a1', stars: 5, weeks: 12, activeWeeks: 1, license: 'MIT', osi: true, likes: 0 };

	it('keeps an entry\'s last record when its repository is not found, or leaves it out without one', () => {
		const prev: ScoresFile = { asOf: '2026-10-26', entries: { 'app:a1': old, 'app:a2': { ...old, repo: 'o/other' } } };
		const plan = planRun(prev, targets, ASOF, false);
		const out = assemble(plan, prev, targets, found(['app:a1', 'app:a2']), { 'app:pulse': 2, 'app:a0': 4 }, ASOF);
		expect(out.kept).toEqual(['app:a1']);
		expect(out.skipped).toEqual(['app:a2']);
		expect(out.file.asOf).toBe(ASOF);
		expect(out.file.entries['app:a1']).toBe(old);
		expect(out.file.entries['app:a2']).toBeUndefined();
		expect(out.file.entries['app:pulse']).toEqual({ likes: 2 });
		expect(out.file.entries['app:a0']).toMatchObject({ repo: 'o/a0', stars: 10, likes: 4 });
		expect(out.file.entries['app:a3']).toMatchObject({ repo: 'o/a3', likes: 0 });
	});

	it('stops when more than a fifth of the catalog\'s repositories, and more than three, are not found', () => {
		const prev: ScoresFile = { asOf: null, entries: {} };
		const plan = planRun(prev, targets, ASOF, false);
		expect(() => assemble(plan, prev, targets, found(['app:a1', 'app:a2']), {}, ASOF)).not.toThrow();
		// Three of ten is above a fifth, but three are entries to fix, not a broken token.
		expect(() => assemble(plan, prev, targets, found(['app:a1', 'app:a2', 'app:a3']), {}, ASOF)).not.toThrow();
		expect(() => assemble(plan, prev, targets, found(['app:a1', 'app:a2', 'app:a3', 'app:a4']), {}, ASOF)).toThrow(/4 of the 10/);
		// An incremental run that asks about one new entry whose repository is gone records the rest rather than failing.
		const one = { ...plan, measure: ['app:a1'] };
		expect(() => assemble(one, prev, targets, found(['app:a1']), {}, ASOF)).not.toThrow();
		// Entries whose repositories are not found have no record, so every later run of the week asks about them again: a fifth of a larger catalog, they leave those runs to record the rest.
		const big = new Map<string, ScoreTarget>([...targets, ...Array.from({ length: 20 }, (_, i): [string, ScoreTarget] => [`app:b${i}`, { repo: `o/b${i}` }])]);
		const missing = ['app:a1', 'app:a2', 'app:a3', 'app:a4'];
		expect(() => assemble({ ...plan, measure: missing }, prev, big, found(missing), {}, ASOF)).not.toThrow();
	});

	it('counts the likes only when they are on', () => {
		expect(readLikes({ enabled: true, counts: { 'app:pulse': 2 }, mine: [] })).toEqual({ 'app:pulse': 2 });
		expect(() => readLikes({ enabled: false, counts: {} })).toThrow(/not enabled/);
		expect(() => readLikes({ counts: {} })).toThrow(/not enabled/);
		expect(() => readLikes(null)).toThrow(/not enabled/);
		expect(() => readLikes({ enabled: true, counts: { 'app:x': -1 } })).toThrow(/app:x/);
	});
});

describe('anomalies', () => {
	const at = (entries: Record<string, ScoreSignals>, asOf = ASOF): ScoresFile => ({ asOf, entries });
	const what = (prev: ScoreSignals, next: ScoreSignals) => anomalies(at({ k: prev }, '2026-10-26'), at({ k: next })).map((a) => a.what);
	const base: ScoreSignals = { repo: 'a/b', stars: 100, weeks: 12, activeWeeks: 6, license: 'MIT', osi: true, released: '2026-10-01', releaseDays: 12, likes: 2 };

	it('flags likes that rise by 10, or triple and rise by 5', () => {
		expect(what(base, { ...base, likes: 12 })).toEqual(['likes went from 2 to 12']);
		expect(what({ ...base, likes: 20 }, { ...base, likes: 30 })).toEqual(['likes went from 20 to 30']);
		expect(what({ ...base, likes: 20 }, { ...base, likes: 29 })).toEqual([]);
		expect(what({ ...base, likes: 5 }, { ...base, likes: 14 })).toEqual([]);
		expect(what({ ...base, likes: 3 }, { ...base, likes: 9 })).toEqual(['likes went from 3 to 9']);
		expect(what({ ...base, likes: 3 }, { ...base, likes: 8 })).toEqual([]);
		expect(what({ ...base, likes: 4 }, { ...base, likes: 11 })).toEqual([]);
	});

	it('flags stars that rise by 200, or double and rise by 30', () => {
		expect(what({ ...base, stars: 1000 }, { ...base, stars: 1200 })).toEqual(['stars went from 1000 to 1200']);
		expect(what({ ...base, stars: 1000 }, { ...base, stars: 1199 })).toEqual([]);
		expect(what({ ...base, stars: 30 }, { ...base, stars: 60 })).toEqual(['stars went from 30 to 60']);
		expect(what({ ...base, stars: 29 }, { ...base, stars: 58 })).toEqual([]);
		expect(what({ ...base, stars: 31 }, { ...base, stars: 61 })).toEqual([]);
	});

	it('flags a repository that was archived', () => {
		expect(what(base, { ...base, archived: true })).toContain('a/b is archived');
		expect(what({ ...base, archived: true }, { ...base, archived: true })).toEqual([]);
		expect(anomalies(at({}), at({ k: { ...base, archived: true } })).map((a) => a.what)).toEqual(['a/b is archived']);
	});

	it('flags a score that moved by 15 or more', () => {
		// 6 of 12 active weeks is 18.8 points of activity, none is 0; 3 is 9.4.
		expect(what(base, { ...base, activeWeeks: 0 })).toEqual(['the score went from 73 to 54']);
		expect(what(base, { ...base, activeWeeks: 3 })).toEqual([]);
		expect(anomalies(at({}, '2026-10-26'), at({ k: base }))).toEqual([]);
	});
});

describe('the commit message', () => {
	it('names the day of a full run and the entries whose score moved by 5 or more', () => {
		const targets = new Map<string, ScoreTarget>([
			['app:ledger', { repo: 'jane/ledger' }],
			['app:pulse', {}],
		]);
		const prev: ScoresFile = { asOf: '2026-10-26', entries: { 'app:ledger': ledger, 'app:pulse': pulse, 'app:gone': pulse } };
		const next: ScoresFile = { asOf: ASOF, entries: { 'app:ledger': { ...ledger, activeWeeks: 4 }, 'app:pulse': { likes: 3 } } };
		const plan = planRun(prev, targets, ASOF, false);
		expect(commitMessage(plan, prev, next)).toBe('chore(scores): daily signals as of 2026-11-02\n\n- app:ledger: 85 → 72\n- app:gone: removed\n');
	});

	it('counts the entries a later run fills in', () => {
		const targets = new Map<string, ScoreTarget>([
			['app:ledger', { repo: 'jane/ledger' }],
			['app:pulse', {}],
			['app:new', { repo: 'you/new' }],
		]);
		const prev: ScoresFile = { asOf: ASOF, entries: { 'app:ledger': ledger } };
		const next: ScoresFile = { asOf: ASOF, entries: { 'app:ledger': ledger, 'app:pulse': pulse, 'app:new': { ...ledger, repo: 'you/new' } } };
		expect(commitMessage(planRun(prev, targets, ASOF, false), prev, next)).toBe('chore(scores): signals for 2 new entries\n\n- app:new: 85\n- app:pulse: 37\n');
	});

	it('names the records from before a signal was recorded that a later run measures again, and not one it had to keep', () => {
		const targets = new Map<string, ScoreTarget>([
			['app:ledger', { repo: 'jane/ledger' }],
			['app:gone', { repo: 'gone/app' }],
			['app:new', { repo: 'you/new' }],
		]);
		const { releaseDays: _, ...before } = ledger;
		const lost = { ...before, repo: 'gone/app' };
		const prev: ScoresFile = { asOf: ASOF, entries: { 'app:ledger': before, 'app:gone': lost } };
		// ledger is measured again; gone/app is not found, so its record is kept as it was.
		const next: ScoresFile = { asOf: ASOF, entries: { 'app:ledger': ledger, 'app:gone': lost, 'app:new': { ...ledger, repo: 'you/new' } } };
		const plan = planRun(prev, targets, ASOF, false);
		expect(plan.stale).toEqual(['app:gone', 'app:ledger']);
		expect(commitMessage(plan, prev, next)).toBe('chore(scores): signals for 2 new or re-measured entries\n\n- app:ledger: 78 → 85\n- app:new: 85\n');
	});

	it('says when it only drops entries', () => {
		const prev: ScoresFile = { asOf: ASOF, entries: { 'app:ledger': ledger, 'app:gone': ledger } };
		const next: ScoresFile = { asOf: ASOF, entries: { 'app:ledger': ledger } };
		expect(commitMessage(planRun(prev, new Map([['app:ledger', { repo: 'jane/ledger' }]]), ASOF, false), prev, next)).toBe('chore(scores): drop the signals of 1 entry\n\n- app:gone: removed\n');
	});
});
