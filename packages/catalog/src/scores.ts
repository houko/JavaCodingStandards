import scoresJson from '../data/scores.json';
import { AI_TOOLS, APPS, COMMUNITY_PLUGINS, STATE_SOLUTIONS, TEMPLATES, UI_LIBS } from './catalog';
import { ACTIVITY_WEEKS, type Score, type ScoreSignals, type ScoreTarget, scoreKey, scoreOf, scoreTarget } from './score';
import { CatalogError, Reader } from './validate';

// The signals the scheduled Update scores workflow records in data/scores.json, checked as they load, and each entry's score from them (score.ts). The file keeps only raw signals, so a change to the formula takes effect on the next build without the workflow running again. Only the workflow writes the file, and it runs the tests before it commits: a mistake in it fails them with the entry's key and the field.

export interface ScoresFile {
	// The UTC day the signals were taken on, YYYY-MM-DD; null until the workflow first runs.
	asOf: string | null;
	// Each entry's signals by its key (scoreKey).
	entries: Record<string, ScoreSignals>;
}

const SCHEMA = './schema/scores.schema.json';
// The fields of an entry's signals, as ScoreSignals names them; data/schema/scores.schema.json describes the same.
export const SCORE_FIELDS = ['repo', 'path', 'stars', 'weeks', 'activeWeeks', 'license', 'osi', 'released', 'releaseDays', 'archived', 'likes'] as const satisfies readonly (keyof ScoreSignals)[];

const KEY = /^(app|ui|state|template|ai|plugin):\S+$/;
const REPO = /^[^/\s]+\/[^/\s]+$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
// The most release days a record can have: they are counted in the rolling ACTIVITY_WEEKS-week window through asOf, at most one a day.
const RELEASE_DAYS_MAX = ACTIVITY_WEEKS * 7;

// A calendar day as YYYY-MM-DD, and one that exists.
function readDay(r: Reader, field: string): string {
	const v = r.match(field, DAY, 'a day like 2026-11-02');
	const t = Date.parse(`${v}T00:00:00Z`);
	if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== v) r.fail(field, `must be a day that exists, got "${v}"`);
	return v;
}

function readCount(r: Reader, field: string): number | undefined {
	const v = r.raw[field];
	if (v === undefined) return undefined;
	if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) r.fail(field, `must be a whole number, 0 or more, got ${JSON.stringify(v)}`);
	return v;
}

// One entry's signals. Which signals were measured is told by which fields are there, so the reader holds the file to the shapes the workflow writes: a closed-source entry has only its likes, an entry in a folder of a repository no stars, and the weeks always come with the active weeks among them.
function readSignals(key: string, json: unknown): ScoreSignals {
	if (!json || typeof json !== 'object' || Array.isArray(json)) throw new CatalogError(`scores.json (${key}): must be an object`);
	const r: Reader = new Reader(`scores.json (${key})`, json as Record<string, unknown>);
	r.only(SCORE_FIELDS);
	const repo = r.raw.repo === undefined ? undefined : r.match('repo', REPO, 'owner/name');
	if (!repo) for (const f of SCORE_FIELDS) if (f !== 'likes' && r.raw[f] !== undefined) r.fail(f, 'is recorded only for an entry with a repository (repo); a closed-source entry has only its likes');
	const path = r.optStr('path');
	const stars = readCount(r, 'stars');
	if (path !== undefined && stars !== undefined) r.fail('stars', 'is not recorded for an entry in a folder of a repository (path): the repository\'s stars are not its own');
	const weeks = readCount(r, 'weeks');
	const activeWeeks = readCount(r, 'activeWeeks');
	if (weeks === undefined && activeWeeks !== undefined) r.fail('weeks', 'is required with activeWeeks');
	if (weeks !== undefined && activeWeeks === undefined) r.fail('activeWeeks', 'is required with weeks');
	if (weeks !== undefined && weeks > ACTIVITY_WEEKS) r.fail('weeks', `must be at most ${ACTIVITY_WEEKS}, got ${weeks}`);
	if (weeks !== undefined && activeWeeks !== undefined && activeWeeks > weeks) r.fail('activeWeeks', `must be at most weeks (${weeks}), got ${activeWeeks}`);
	const lic = r.raw.license;
	if (lic !== undefined && lic !== null && (typeof lic !== 'string' || !lic.trim())) r.fail('license', 'must be an SPDX id, "NOASSERTION" or null');
	const license = lic as string | null | undefined;
	const osi = r.raw.osi === undefined ? undefined : r.bool('osi');
	if (osi !== undefined && typeof license !== 'string') r.fail('osi', 'is recorded only with a license');
	const released = r.raw.released === undefined ? undefined : readDay(r, 'released');
	const releaseDays = readCount(r, 'releaseDays');
	if (releaseDays !== undefined && releaseDays > RELEASE_DAYS_MAX) r.fail('releaseDays', `must be at most ${RELEASE_DAYS_MAX}, got ${releaseDays}`);
	if (r.raw.archived !== undefined && r.raw.archived !== true) r.fail('archived', 'is written only as true, and left out otherwise');
	const archived = r.raw.archived === true ? true : undefined;
	const likes = readCount(r, 'likes');
	if (likes === undefined) r.fail('likes', 'is required');
	return { repo, path, stars, weeks, activeWeeks, license, osi, released, releaseDays, archived, likes };
}

// data/scores.json, or a version of it: throws a CatalogError naming the entry's key and the field of the first mistake.
export function readScores(json: unknown): ScoresFile {
	if (!json || typeof json !== 'object' || Array.isArray(json)) throw new CatalogError('scores.json: must be an object');
	const r: Reader = new Reader('scores.json', json as Record<string, unknown>);
	r.only(['$schema', 'asOf', 'entries']);
	if (r.raw.$schema !== SCHEMA) r.fail('$schema', `must be "${SCHEMA}"`);
	const asOf = r.raw.asOf === null ? null : readDay(r, 'asOf');
	const raw = r.raw.entries;
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) r.fail('entries', 'must be an object of signals by entry key');
	const entries: Record<string, ScoreSignals> = {};
	for (const [key, s] of Object.entries(raw)) {
		if (!KEY.test(key)) r.fail(`entries.${key}`, 'is not an entry key: app:<slug>, ui:<owner/name>, state:<owner/name>, template:<owner/name>, ai:<slug> or plugin:<slug>');
		entries[key] = readSignals(key, s);
	}
	if (asOf === null && Object.keys(entries).length) r.fail('asOf', 'is required once there are entries: their weeks and releases are counted up to it');
	return { asOf, entries };
}

// What the workflow measures for each entry that has a score, by its key: the scoreable entries among those visitors can like (LIKE_KEYS), as the catalog lists them now.
export const SCORE_TARGETS: ReadonlyMap<string, ScoreTarget> = new Map([
	...APPS.map((a) => [scoreKey('app', a), scoreTarget({ repo: a.repo, url: a.url })] as const),
	...UI_LIBS.map((l) => [scoreKey('ui', l), scoreTarget({ repo: l.repo })] as const),
	...STATE_SOLUTIONS.map((s) => [scoreKey('state', s), scoreTarget({ repo: s.repo })] as const),
	...TEMPLATES.map((x) => [scoreKey('template', x), scoreTarget({ repo: x.repo })] as const),
	// An AI tool in a folder of its repository is measured by that folder.
	...AI_TOOLS.map((x) => [scoreKey('ai', x), scoreTarget({ repo: x.repo, url: x.url })] as const),
	...COMMUNITY_PLUGINS.map((p) => [scoreKey('plugin', p), scoreTarget({ url: p.url, goImport: p.goImport })] as const),
]);

export interface EntryScore {
	signals: ScoreSignals;
	score: Score;
}

// The scores of the entries of targets whose signals in file were taken of the repository and folder they have now: an entry whose repository changed shows no score until the workflow measures it again, never one of another repository. A key in the file of an entry that is gone is left out rather than failing, so that removing an entry never trips on the file.
export function scoresFor(file: ScoresFile, targets: ReadonlyMap<string, ScoreTarget>): Map<string, EntryScore> {
	const scores = new Map<string, EntryScore>();
	const asOf = file.asOf;
	if (asOf === null) return scores;
	for (const [key, target] of targets) {
		const signals = Object.hasOwn(file.entries, key) ? file.entries[key] : undefined;
		if (signals && signals.repo === target.repo && signals.path === target.path) scores.set(key, { signals, score: scoreOf(signals, asOf) });
	}
	return scores;
}

const FILE = readScores(scoresJson);
const ENTRY_SCORES = scoresFor(FILE, SCORE_TARGETS);

// The day the scores were taken, null before the workflow first records them.
export const SCORES_AS_OF: string | null = FILE.asOf;
// Whether any entry has a score: without one, the site offers no sorting by score.
export const HAS_SCORES: boolean = ENTRY_SCORES.size > 0;

// An entry's score by its key (likeKey), undefined while it has none.
export function entryScore(key: string): Score | undefined {
	return ENTRY_SCORES.get(key)?.score;
}

// The signals an entry's score was computed from, for its breakdown: the star count, the weeks, the license and so on.
export function entrySignals(key: string): ScoreSignals | undefined {
	return ENTRY_SCORES.get(key)?.signals;
}

// For sorting by score, highest first: an entry's total, or -1 for one without a score, so that it goes after every scored entry.
export function scoreRank(key: string): number {
	return ENTRY_SCORES.get(key)?.score.total ?? -1;
}

// A count for the tie-break, with one that was not measured (a closed-source entry's, a folder's stars) after 0.
const countOf = (n: number | undefined) => n ?? -1;

// Two entries' scores for sorting, the higher first: by the total, then for equal totals by the unrounded sum, then by the raw stars, active weeks and release days, which tell apart counts that round to the same points (stars from 1,000, a young project's weeks, release days from RELEASE_ANCHOR); an entry with a score goes before one without. 0 when nothing tells them apart, so that a stable sort keeps the list's own order.
export function compareScores(a: EntryScore | undefined, b: EntryScore | undefined): number {
	if (!a || !b) return Number(!a) - Number(!b);
	return (
		b.score.total - a.score.total ||
		b.score.exact - a.score.exact ||
		countOf(b.signals.stars) - countOf(a.signals.stars) ||
		countOf(b.signals.activeWeeks) - countOf(a.signals.activeWeeks) ||
		countOf(b.signals.releaseDays) - countOf(a.signals.releaseDays)
	);
}

// compareScores of two entries by their keys (likeKey), for sorting a list of them by score.
export function compareByScore(a: string, b: string): number {
	return compareScores(ENTRY_SCORES.get(a), ENTRY_SCORES.get(b));
}
