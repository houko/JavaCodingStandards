// What the score script (score.ts) decides about the signals it records in packages/catalog/data/scores.json, without touching the network: the weeks it counts, which entries a run measures, the GraphQL it asks GitHub and how it reads the answer, the file's bytes, and what the report and the commit say. Pure functions, so they are tested on their own.

import spdx from 'spdx-license-list';
import { ACTIVITY_WEEKS, type ScoreSignals, type ScoreTarget, scoreKey, scoreOf, scoreTarget } from '../../catalog/src/score.ts';
import type { Entry, EntryKind } from './source.ts';

// data/scores.json as the catalog reads it (packages/catalog/src/scores.ts, which the scripts cannot import): the UTC day the signals were taken on, null before the first run, and each entry's signals by its key.
export interface ScoresFile {
	asOf: string | null;
	entries: Record<string, ScoreSignals>;
}

const SCHEMA = './schema/scores.schema.json';
const DAY = 86_400_000;
const WEEK = 7 * DAY;

const day = (t: number) => new Date(t).toISOString().slice(0, 10);
const atMidnight = (d: string) => Date.parse(`${d}T00:00:00Z`);
// A GitHub timestamp to the second, as GraphQL takes it.
const stamp = (t: number) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z');

// ---- weeks ----

// The Monday (UTC) of now's week, YYYY-MM-DD: the day a run's counted weeks end on, the same all week.
export function weekStart(now: Date): string {
	const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	return day(midnight - ((now.getUTCDay() + 6) % 7) * DAY);
}

// One counted week, from start up to but not including end, as epoch milliseconds.
export interface Window {
	start: number;
	end: number;
}

// The ACTIVITY_WEEKS full weeks before asOf, the latest first: window i runs from asOf − (i+1)·7 days up to asOf − i·7 days.
export function weekWindows(asOf: string): Window[] {
	const end = atMidnight(asOf);
	return Array.from({ length: ACTIVITY_WEEKS }, (_, i) => ({ start: end - (i + 1) * WEEK, end: end - i * WEEK }));
}

// How many of the windows (weekWindows, the latest first) an entry could have had commits in. An entry with no commit before the windows (pre = 0) counts from its oldest active week: a plugin added to a folder later, or a repository whose history starts later than the repository itself (kero, created in July, has commits only from late October after its history was rewritten), is not marked down for weeks it had no history in. Otherwise a repository counts the weeks that end after it was created, and at least those back to its oldest active week (history imported from elsewhere is older than the repository); a folder counts as its repository does.
export function eligibleWeeks(createdAt: string, active: readonly boolean[], pre: number | undefined, asOf: string): number {
	const oldest = active.lastIndexOf(true) + 1;
	if (pre === 0) return oldest;
	const created = Date.parse(createdAt);
	return Math.max(oldest, weekWindows(asOf).filter((w) => w.end > created).length);
}

// ---- release and license ----

// The day of the latest release or newest tag, YYYY-MM-DD, or undefined when there is none: a Go library is often only tagged. A time after now is left out: a tag's date is its commit's, which anyone can set, and one dated in 2099 would otherwise count as a fresh release for ever.
export function latestRelease(releaseAt: string | null | undefined, tagsAt: readonly (string | null | undefined)[], now: number): string | undefined {
	const times = [releaseAt, ...tagsAt].filter((t): t is string => Boolean(t)).map((t) => Date.parse(t)).filter((t) => t <= now);
	return times.length ? day(Math.max(...times)) : undefined;
}

// On how many UTC days there was a release or tag in the windows: several on one day, or a monorepo's tags of all its packages, count once; a tag with a release is dated by that release alone (parseBatch), so that a release and its own tag count once even when the tag's commit is from an earlier day. Times after the run are left out. The times are the newest 100 releases and the newest 100 tags (REPO_FIELDS): a repository with more in the windows is counted from those alone, which already reach well past RELEASE_ANCHOR's days, so its points are exact and only the raw count the tie-break reads is a lower bound.
export function releaseDays(times: readonly (string | null | undefined)[], windows: readonly Window[], now = Number.POSITIVE_INFINITY): number {
	const start = windows[windows.length - 1].start;
	const end = windows[0].end;
	const days = new Set<number>();
	for (const t of times) {
		const at = t ? Date.parse(t) : Number.NaN;
		if (at >= start && at < end && at <= now) days.add(Math.floor(at / DAY));
	}
	return days.size;
}

// Whether an SPDX id is a license the Open Source Initiative approves, by the SPDX license list. NOASSERTION (a license GitHub cannot name) and no license are not.
export function isOsi(id: string | null | undefined): boolean {
	return Boolean(id) && Object.hasOwn(spdx, id as string) && spdx[id as string].osiApproved === true;
}

// ---- what the site lists ----

// An entry the site gives a score: its key (its like key) and what is measured for it, the same as the catalog derives them (SCORE_TARGETS in packages/catalog/src/scores.ts), so that a recorded entry's repository and folder match the site's. urlOnly is an app that names its repository only by its link, with no repo field.
export interface Scored {
	key: string;
	target: ScoreTarget;
	urlOnly: boolean;
}

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

// The scored entry of one of data/<kind>/*.json, or undefined for one the site does not score: an official plugin, which is a package of NSGo itself.
export function scoredEntry(kind: EntryKind, e: Entry): Scored | undefined {
	if (kind === 'plugin' && e.official === true) return undefined;
	const slug = String(e.slug);
	const repo = str(e.repo);
	// An app's and an AI tool's link may be a folder of their repository, which is then what is measured.
	const target = kind === 'app' || kind === 'ai' ? scoreTarget({ repo, url: str(e.url) }) : kind === 'plugin' ? scoreTarget({ url: str(e.docs), goImport: str(e.import) }) : scoreTarget({ repo });
	return { key: scoreKey(kind, { slug, repo }), target, urlOnly: kind === 'app' && !repo && Boolean(target.repo) };
}

// ---- what a run measures ----

export interface Plan {
// Every entry is measured again: the first run of a day (asOf moved on), or FULL=true.
	full: boolean;
	// The keys measured in this run, and why: the whole catalog in a full run, otherwise the entries without a record, those whose repository or folder changed since theirs (moved), and those whose record is from before a signal was recorded (stale).
	measure: string[];
	moved: string[];
	stale: string[];
	// The records left as they are, byte for byte.
	keep: Record<string, ScoreSignals>;
	// The keys of entries the catalog no longer lists, dropped from the file.
	dropped: string[];
}

const sameTarget = (s: ScoreSignals | undefined, t: ScoreTarget) => s !== undefined && s.repo === t.repo && s.path === t.path;

// Which entries a run measures. The first run of a day measures all of them, so that a day's signals are one snapshot; a later run that day only fills in what is missing. Both drop the entries that are gone. While the file is from before a signal was recorded (no record has releaseDays), a record without it is measured again, so a formula change needs no manual full run: an entry with a repository whose record has no releaseDays. Runs record all they measure or nothing, so after the first one that succeeds every record whose repository was found has releaseDays, and a record kept because its repository was not found is kept again rather than measured on every run, which would leave no run idle.
export function planRun(prev: ScoresFile, targets: ReadonlyMap<string, ScoreTarget>, asOf: string, full: boolean): Plan {
	const all = full || prev.asOf !== asOf;
	const measure: string[] = [];
	const moved: string[] = [];
	const stale: string[] = [];
	const keep: Record<string, ScoreSignals> = {};
	const predates = Object.values(prev.entries).every((s) => s.releaseDays === undefined);
	for (const [key, target] of targets) {
		const old = Object.hasOwn(prev.entries, key) ? prev.entries[key] : undefined;
		const isStale = predates && sameTarget(old, target) && old?.repo !== undefined && old.releaseDays === undefined;
		if (old && !sameTarget(old, target)) moved.push(key);
		if (isStale) stale.push(key);
		if (all || !sameTarget(old, target) || isStale) measure.push(key);
		else keep[key] = old as ScoreSignals;
	}
	const dropped = Object.keys(prev.entries).filter((key) => !targets.has(key));
	return { full: all, measure: measure.sort(), moved: moved.sort(), stale: stale.sort(), keep, dropped: dropped.sort() };
}

// Whether a run has nothing to do: no request is made and the file stays as it is.
export const isIdle = (plan: Plan) => plan.measure.length === 0 && plan.dropped.length === 0;

// ---- asking GitHub ----

// Up to this many entries' activity is asked in one GraphQL request (each one asks 12 or 13 commit counts).
export const BATCH_SIZE = 10;

// One GraphQL request: the repositories it asks about, each with the entries measured in it. fields says whether this request asks the repository's own fields (stars, license, releases); each repository's are asked once in a run, in the first request it appears in.
export interface Batch {
	repos: { repo: string; fields: boolean; targets: { key: string; path?: string }[] }[];
}

// The requests of a run for the entries with a repository, in a fixed order (by repository, then key), so that every run asks the same way.
export function batches(targets: readonly { key: string; repo: string; path?: string }[], size = BATCH_SIZE): Batch[] {
	const sorted = [...targets].sort((a, b) => (a.repo.toLowerCase() < b.repo.toLowerCase() ? -1 : a.repo.toLowerCase() > b.repo.toLowerCase() ? 1 : a.key < b.key ? -1 : 1));
	const out: Batch[] = [];
	const asked = new Set<string>();
	for (let i = 0; i < sorted.length; i += size) {
		const batch: Batch = { repos: [] };
		for (const t of sorted.slice(i, i + size)) {
			const id = t.repo.toLowerCase();
			let r = batch.repos.find((x) => x.repo.toLowerCase() === id);
			if (!r) {
				r = { repo: t.repo, fields: !asked.has(id), targets: [] };
				asked.add(id);
				batch.repos.push(r);
			}
			r.targets.push(t.path === undefined ? { key: t.key } : { key: t.key, path: t.path });
		}
		out.push(batch);
	}
	return out;
}

// A repository's own fields: the latest release, and the newest 100 releases and tags, for the day of the latest (latestRelease) and the days with one (releaseDays). A release is dated when it was published (a draft has no date and is left out); a tag by its commit, or for an annotated tag by its tagger, and for the days with one, a tag with a release by that release (tagName and the ref's name match it to its tag).
const REPO_FIELDS = 'stargazerCount isArchived createdAt licenseInfo { spdxId } latestRelease { publishedAt } releases(first: 100, orderBy: { field: CREATED_AT, direction: DESC }) { nodes { publishedAt tagName } } refs(refPrefix: "refs/tags/", first: 100, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) { nodes { name target { ... on Commit { committedDate } ... on Tag { tagger { date } } } } }';

// A commit count on the default branch, in a folder when there is one, from since up to end, either open; until is inclusive in GitHub's history, so it stops a second before end.
function history(since: number | undefined, end: number | undefined, path: string | undefined): string {
	const args = [...(since === undefined ? [] : [`since: "${stamp(since)}"`]), ...(end === undefined ? [] : [`until: "${stamp(end - 1000)}"`]), ...(path === undefined ? [] : [`path: ${JSON.stringify(path)}`]), 'first: 1'];
	return `history(${args.join(', ')}) { totalCount }`;
}

// The GraphQL query of a request. Repository i is aliased r<i> and entry j t<j>: t<j>w<k> counts its commits in window k, t<j>pre those before the oldest window, and for an entry in a folder t<j>ever all of them, up to now (a folder without any is one that moved, not one that is new). Counting commits per week rather than listing them measures a repository with thousands of commits as exactly as a small one.
export function buildQuery(batch: Batch, windows: readonly Window[]): string {
	let j = 0;
	const repos = batch.repos.map((r, i) => {
		const [owner, name] = r.repo.split('/');
		const counts = r.targets.flatMap((t) => {
			const n = j++;
			const weeks = windows.map((w, k) => `t${n}w${k}: ${history(w.start, w.end, t.path)}`);
			const pre = `t${n}pre: ${history(undefined, windows[windows.length - 1].start, t.path)}`;
			return t.path === undefined ? [...weeks, pre] : [...weeks, pre, `t${n}ever: ${history(undefined, undefined, t.path)}`];
		});
		return `r${i}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { ${r.fields ? `${REPO_FIELDS} ` : ''}defaultBranchRef { target { ... on Commit { ${counts.join(' ')} } } } }`;
	});
	return `query {\n${repos.join('\n')}\n}`;
}

// A repository's own signals.
export interface RepoInfo {
	stars: number;
	archived: boolean;
	createdAt: string;
	// The SPDX id GitHub detects, NOASSERTION for a license it cannot name, null for none.
	license: string | null;
	released?: string;
	// The days with a release or tag in the rolling 12-week release window (releaseDays).
	releaseDays: number;
}

// An entry's commits: whether it had any in each window (the latest first), how many before them, and for an entry in a folder how many ever.
export interface Activity {
	active: boolean[];
	pre?: number;
	ever?: number;
}

export interface BatchResult {
	repos: Map<string, RepoInfo>;
	activity: Map<string, Activity>;
	// The keys of the entries whose repository GitHub did not find: deleted, made private, or renamed and gone.
	notFound: string[];
}

export interface GraphqlAnswer {
	data?: Record<string, unknown> | null;
	errors?: { type?: string; path?: (string | number)[]; message: string }[];
}

interface GqlRepo {
	stargazerCount?: number;
	isArchived?: boolean;
	createdAt?: string;
	licenseInfo?: { spdxId: string | null } | null;
	latestRelease?: { publishedAt: string | null } | null;
	releases?: { nodes: { publishedAt: string | null; tagName: string }[] } | null;
	refs?: { nodes: { name: string; target: { committedDate?: string; tagger?: { date: string | null } | null } | null }[] } | null;
	defaultBranchRef: { target: Record<string, { totalCount: number }> | null } | null;
}

// Reads the answer to buildQuery(batch). A repository GitHub does not find (NOT_FOUND) leaves its entries in notFound, for the caller to keep their last record or leave them out; any other error, or an answer without data, throws, so that a run never records part of what it asked.
// now is the run's time, past which a release or tag date is not believed (latestRelease). activityWindows are the full weeks used for commit activity; releaseWindows is the rolling release window, ending at the next UTC day so today's releases count.
export function parseBatch(batch: Batch, answer: GraphqlAnswer, activityWindows: readonly Window[], now: number, releaseWindows: readonly Window[] = activityWindows): BatchResult {
	const missing = new Set<number>();
	for (const e of answer.errors ?? []) {
		const alias = typeof e.path?.[0] === 'string' ? /^r(\d+)$/.exec(e.path[0]) : null;
		if (e.type !== 'NOT_FOUND' || !alias) throw new Error(`GitHub GraphQL: ${e.type ?? 'error'} at ${e.path?.join('.') ?? 'the query'}: ${e.message}`);
		missing.add(Number(alias[1]));
	}
	if (!answer.data) throw new Error('GitHub GraphQL answered without data');
	const out: BatchResult = { repos: new Map(), activity: new Map(), notFound: [] };
	let j = 0;
	batch.repos.forEach((r, i) => {
		const repo = answer.data?.[`r${i}`] as GqlRepo | null | undefined;
		const first = j;
		j += r.targets.length;
		if (missing.has(i) || !repo) {
			out.notFound.push(...r.targets.map((t) => t.key));
			return;
		}
		if (r.fields) {
			const lic = repo.licenseInfo;
			const releases = repo.releases?.nodes ?? [];
			const refs = repo.refs?.nodes ?? [];
			const tagDate = (n: (typeof refs)[number]) => n.target?.committedDate ?? n.target?.tagger?.date;
			// A tag with a published release is dated once, by that release: its commit is often from an earlier day than the release, and would count it twice. A draft has no date, so its tag keeps its own.
			const withRelease = new Set(releases.filter((n) => n.publishedAt).map((n) => n.tagName));
			out.repos.set(r.repo.toLowerCase(), {
				stars: repo.stargazerCount ?? 0,
				archived: repo.isArchived === true,
				createdAt: String(repo.createdAt),
				license: lic ? (lic.spdxId ?? 'NOASSERTION') : null,
				// The newest tags by their commits' dates, every one of them, so that one dated in the future does not hide the real ones.
				released: latestRelease(repo.latestRelease?.publishedAt, refs.map(tagDate), now),
				releaseDays: releaseDays([...releases.map((n) => n.publishedAt), ...refs.filter((n) => !withRelease.has(n.name)).map(tagDate)], releaseWindows, now),
			});
		}
		const counts = repo.defaultBranchRef?.target ?? {};
		r.targets.forEach((t, k) => {
			const n = first + k;
			const active = activityWindows.map((_, w) => (counts[`t${n}w${w}`]?.totalCount ?? 0) > 0);
			// A repository's count before the windows left out of the answer is unknown, and its weeks then count from its creation; a folder's is 0.
			const pre = counts[`t${n}pre`]?.totalCount;
			out.activity.set(t.key, t.path === undefined ? { active, pre } : { active, pre: pre ?? 0, ever: counts[`t${n}ever`]?.totalCount ?? 0 });
		});
	});
	return out;
}

// ---- the signals ----

// An entry's signals from what GitHub answered about it: a closed-source entry has only its likes, an entry in a folder no stars, and archived and osi are written only as the catalog reads them.
export function signalsOf(target: ScoreTarget, repo: RepoInfo, activity: Activity, likes: number, asOf: string): ScoreSignals {
	// A folder without any commit ever is one that moved or is misnamed, not one that is new: it is judged on the repository's weeks, so its activity is 0 rather than counted at half.
	const pre = target.path !== undefined && activity.ever === 0 ? undefined : activity.pre;
	const weeks = eligibleWeeks(repo.createdAt, activity.active, pre, asOf);
	// With pre = 0 the weeks start at the oldest active one, so every active week is among them; otherwise eligibleWeeks keeps them too.
	const activeWeeks = activity.active.filter(Boolean).length;
	return {
		repo: target.repo,
		...(target.path === undefined ? { stars: repo.stars } : { path: target.path }),
		weeks,
		activeWeeks,
		license: repo.license,
		...(repo.license === null ? {} : { osi: isOsi(repo.license) }),
		...(repo.released ? { released: repo.released } : {}),
		releaseDays: repo.releaseDays,
		...(repo.archived ? { archived: true } : {}),
		likes,
	};
}

// More than this share of the catalog's entries with a repository not found means the token cannot see public repositories, not that they are gone: the run stops. The share is of the whole catalog rather than of the entries a run asks about: an entry whose repository is not found has no record, so every later run of the week asks about it again, and four such entries alone would otherwise fail every run until they are fixed.
export const NOT_FOUND_LIMIT = 0.2;
// A few missing repositories are entries to fix, not a broken token, whatever share of a small catalog they are: the run aborts only past this many as well.
export const NOT_FOUND_MIN = 3;

export interface Assembled {
	file: ScoresFile;
	// Entries whose repository was not found: kept at their last record of the same repository, or left out (the site shows them as pending).
	kept: string[];
	skipped: string[];
}

// The file a run writes: the records it keeps, and the ones it measured, from GitHub's answers and the likes. Throws when too many repositories were not found, before anything is written. scoreAsOf is the daily snapshot; activityAsOf keeps commit activity anchored to the latest complete Monday-ending week.
export function assemble(plan: Plan, prev: ScoresFile, targets: ReadonlyMap<string, ScoreTarget>, found: BatchResult, likes: Readonly<Record<string, number>>, scoreAsOf: string, activityAsOf = scoreAsOf): Assembled {
	const open = [...targets.values()].filter((t) => t.repo).length;
	if (found.notFound.length > NOT_FOUND_MIN && found.notFound.length > open * NOT_FOUND_LIMIT) throw new Error(`GitHub did not find the repositories of ${found.notFound.length} of the ${open} entries with a repository (${found.notFound.join(', ')}), more than ${NOT_FOUND_LIMIT * 100}%: is the token able to read public repositories?`);
	const notFound = new Set(found.notFound);
	const entries: Record<string, ScoreSignals> = { ...plan.keep };
	const kept: string[] = [];
	const skipped: string[] = [];
	for (const key of plan.measure) {
		const target = targets.get(key) as ScoreTarget;
		const count = Object.hasOwn(likes, key) ? likes[key] : 0;
		if (!target.repo) {
			entries[key] = { likes: count };
			continue;
		}
		const old = Object.hasOwn(prev.entries, key) ? prev.entries[key] : undefined;
		const repo = found.repos.get(target.repo.toLowerCase());
		const activity = found.activity.get(key);
		if (notFound.has(key) || !repo || !activity) {
			if (old && sameTarget(old, target)) {
				entries[key] = old;
				kept.push(key);
			} else skipped.push(key);
			continue;
		}
		entries[key] = signalsOf(target, repo, activity, count, activityAsOf);
	}
	return { file: { asOf: scoreAsOf, entries }, kept, skipped };
}

// The likes of each entry from the site's /api/likes answer. Throws unless likes are enabled there, rather than record everyone at 0.
export function readLikes(json: unknown): Record<string, number> {
	const body = json as { enabled?: unknown; counts?: unknown } | null;
	if (!body || body.enabled !== true) throw new Error('the likes are not enabled on the site, so no like could be counted');
	const counts = body.counts;
	if (!counts || typeof counts !== 'object' || Array.isArray(counts)) throw new Error('the likes answer has no counts');
	const out: Record<string, number> = {};
	for (const [key, n] of Object.entries(counts)) {
		if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) throw new Error(`the likes answer counts ${JSON.stringify(n)} for ${key}`);
		out[key] = n;
	}
	return out;
}

// ---- the file ----

const ordered = (keys: string[]) => keys.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

// data/scores.json's bytes: tabs, keys in order, an entry's signals on one line, so that its history shows each entry's change as one line, and a trailing newline. The same signals always give the same bytes.
export function serializeScores(file: ScoresFile): string {
	const signals = (s: ScoreSignals) => {
		const fields = ordered(Object.keys(s).filter((k) => s[k as keyof ScoreSignals] !== undefined));
		return `{ ${fields.map((k) => `${JSON.stringify(k)}: ${JSON.stringify(s[k as keyof ScoreSignals])}`).join(', ')} }`;
	};
	const keys = ordered(Object.keys(file.entries));
	const entries = keys.length ? `{\n${keys.map((k) => `\t\t${JSON.stringify(k)}: ${signals(file.entries[k])}`).join(',\n')}\n\t}` : '{}';
	return `{\n\t"$schema": ${JSON.stringify(SCHEMA)},\n\t"asOf": ${JSON.stringify(file.asOf)},\n\t"entries": ${entries}\n}\n`;
}

// ---- the report and the commit ----

// An entry's score from a file's record of it, undefined without one.
export function totalOf(file: ScoresFile, key: string): number | undefined {
	const s = file.asOf !== null && Object.hasOwn(file.entries, key) ? file.entries[key] : undefined;
	return s && file.asOf !== null ? scoreOf(s, file.asOf).total : undefined;
}

export interface Anomaly {
	key: string;
	what: string;
}

// What a maintainer should look at in a run: likes or stars that jumped (an entry being gamed, or one that really took off), a repository that was archived, and a score that moved by 15 or more. Likes count when they rise by 10, or triple and rise by 5; stars when they rise by 200, or double and rise by 30.
export function anomalies(prev: ScoresFile, next: ScoresFile): Anomaly[] {
	const out: Anomaly[] = [];
	for (const key of ordered(Object.keys(next.entries))) {
		const s = next.entries[key];
		const old = Object.hasOwn(prev.entries, key) ? prev.entries[key] : undefined;
		const likes = s.likes - (old?.likes ?? 0);
		if (old && (likes >= 10 || (s.likes >= 3 * old.likes && likes >= 5))) out.push({ key, what: `likes went from ${old.likes} to ${s.likes}` });
		if (old?.stars !== undefined && s.stars !== undefined) {
			const stars = s.stars - old.stars;
			if (stars >= 200 || (s.stars >= 2 * old.stars && stars >= 30)) out.push({ key, what: `stars went from ${old.stars} to ${s.stars}` });
		}
		if (s.archived && !old?.archived) out.push({ key, what: `${s.repo} is archived` });
		const from = totalOf(prev, key);
		const to = totalOf(next, key);
		if (from !== undefined && to !== undefined && Math.abs(to - from) >= 15) out.push({ key, what: `the score went from ${from} to ${to}` });
	}
	return out;
}

const entriesWord = (n: number) => (n === 1 ? 'entry' : 'entries');

// The commit message of a run's change to the file: a week's full run lists the entries whose score moved by 5 or more; a run that fills in entries names them.
export function commitMessage(plan: Plan, prev: ScoresFile, next: ScoresFile): string {
	// In a run that fills in entries, one whose repository was not found keeps its last record, the same one, and was not measured after all.
	const measured = plan.measure.filter((key) => Object.hasOwn(next.entries, key) && (plan.full || next.entries[key] !== prev.entries[key]));
	const stale = measured.some((key) => plan.stale.includes(key));
	const kind = stale ? (plan.moved.length ? 'new, moved or re-measured' : 'new or re-measured') : plan.moved.length ? 'new or moved' : 'new';
	const line = (key: string) => {
		const from = totalOf(prev, key);
		const to = totalOf(next, key);
		return from === undefined ? `- ${key}: ${to}` : `- ${key}: ${from} → ${to}`;
	};
	const body = plan.full
		? measured.filter((key) => {
				const from = totalOf(prev, key);
				const to = totalOf(next, key);
				return from === undefined || to === undefined || Math.abs(to - from) >= 5;
			})
		: measured;
	// The entries the site no longer lists, and one whose repository changed and is not found.
	const gone = ordered(Object.keys(prev.entries).filter((key) => !Object.hasOwn(next.entries, key)));
	const subject = plan.full
		? `chore(scores): daily signals as of ${next.asOf}`
		: measured.length
			? `chore(scores): signals for ${measured.length} ${kind} ${entriesWord(measured.length)}`
			: `chore(scores): drop the signals of ${gone.length} ${entriesWord(gone.length)}`;
	const lines = [...body.map(line), ...gone.map((key) => `- ${key}: removed`)];
	return lines.length ? `${subject}\n\n${lines.join('\n')}\n` : `${subject}\n`;
}
