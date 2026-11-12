import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type ScoreTarget, scoreOf } from '../../catalog/src/score.ts';
import { listDir } from './files.ts';
import { github } from './github.ts';
import { type BatchResult, type GraphqlAnswer, type Scored, type ScoresFile, anomalies, assemble, batches, buildQuery, commitMessage, isIdle, parseBatch, planRun, readLikes, scoredEntry, serializeScores, totalOf, weekStart, weekWindows } from './signals.ts';
import { ENTRY_DIRS, type Entry, type EntryKind } from './source.ts';

// Run by .github/workflows/score.yml once a day. It records in packages/catalog/data/scores.json the raw signals each entry's score is computed from when the site is built (packages/catalog/src/score.ts): for every app, UI library, state management library and community plugin, its repository's stars, license, latest release or tag and whether it is archived, in how many of the 12 full weeks before the latest complete Monday (activityAsOf) it had commits, on how many days in the rolling 12-week release window through the current UTC day it had a release or tag, and its likes on the site. A closed-source app has only its likes; a plugin in a folder of a repository has its commits counted in that folder, and its stars are not recorded, as the repository's are not the plugin's own.
//
// Scheduled runs pass FULL=true and measure every entry again, so changes to stars, releases and likes reach the site daily; activity remains a weekly snapshot anchored to the latest complete Monday. When FULL is false, planRun measures the whole catalog when the daily asOf changes and otherwise fills in entries that have no record, whose repository or folder changed, or whose record predates a signal, leaving every other record as it is. A run is all or nothing: a failed request, a GraphQL error other than a repository GitHub does not find, likes that cannot be read, or more than a fifth of the repositories not found throws before anything is written, and the next day's run makes up the day. A repository that is not found keeps its entry's last record of it, or leaves the entry without one (the site shows it as pending), and is listed under Data to fix.
//
// GitHub is asked through GraphQL, 10 entries a request: a repository's own fields once a run, and for each entry 12 commit counts, one a week (signals.ts, buildQuery), which measures a repository with thousands of commits as exactly as a small one. A full run makes about a dozen requests.
//
// Environment: GITHUB_TOKEN (any token that reads public repositories), LIKES_URL (the site's likes, default https://awesomensgo.dev/api/likes), FULL=true to measure every entry even when this week is recorded, DRY_RUN=true to only write the report, REPORT_FILE (a Markdown summary of the run: each measured entry's score and its parts, anomalies and data to fix) and COMMIT_FILE (where the commit message of the change is written, when there is one).

const ROOT = join(import.meta.dirname, '../../..');
const DATA_DIR = join(ROOT, 'packages/catalog/data');
const SCORES_FILE = join(DATA_DIR, 'scores.json');

const env = process.env;
const LIKES_URL = env.LIKES_URL || 'https://awesomensgo.dev/api/likes';
const FULL = env.FULL === 'true';
const DRY_RUN = env.DRY_RUN === 'true';
const now = new Date();
const scoreAsOf = now.toISOString().slice(0, 10);
const activityAsOf = weekStart(now);
const releaseAsOf = new Date(Date.parse(`${scoreAsOf}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

const report: string[] = [];
const say = (line: string): void => {
	report.push(line);
	console.log(line);
};
const cell = (s: string) => s.replace(/\|/g, '\\|');

// Every entry the site scores, from data/{apps,ui,state,templates,ai,plugins}/*.json as the catalog reads them, with community plugins only (a subset of LIKE_KEYS).
async function scoredEntries(): Promise<Scored[]> {
	const out: Scored[] = [];
	for (const [kind, dir] of Object.entries(ENTRY_DIRS) as [EntryKind, string][]) {
		for (const name of (await listDir(join(DATA_DIR, dir))).sort()) {
			if (!name.endsWith('.json')) continue;
			const entry = scoredEntry(kind, JSON.parse(await readFile(join(DATA_DIR, dir, name), 'utf8')) as Entry);
			if (entry) out.push(entry);
		}
	}
	return out;
}

async function fetchLikes(): Promise<Record<string, number>> {
	const res = await fetch(LIKES_URL, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
	if (!res.ok) throw new Error(`${LIKES_URL} answered ${res.status}, so no like could be counted`);
	return readLikes(await res.json());
}

// A part's cell in the report: its points, then the raw value it comes from, or n/a for a signal counted at the neutral value.
function partCells(file: ScoresFile, key: string): string[] {
	const s = file.entries[key];
	const score = scoreOf(s, file.asOf as string);
	const raw: Record<string, string> = {
		stars: s.stars === undefined ? '' : String(s.stars),
		activity: s.weeks === undefined ? '' : `${s.activeWeeks}/${s.weeks} weeks`,
		openness: !s.repo ? 'closed' : s.license === null || s.license === undefined ? 'no license' : `${s.license}${s.osi ? ', OSI' : ''}`,
		likes: String(s.likes),
		release: s.releaseDays === undefined ? (s.released ?? (s.repo ? 'never' : '')) : `${s.releaseDays} days, latest ${s.released ?? 'never'}`,
	};
	return score.parts.map((p) => `${p.points}${p.basis === 'neutral' ? ' n/a' : raw[p.signal] ? ` (${cell(raw[p.signal])})` : ''}`);
}

function scoreCell(file: ScoresFile, key: string): string {
	const score = scoreOf(file.entries[key], file.asOf as string);
	return `${score.measured < 1 ? '≈' : ''}${score.total}${score.archived ? ' (archived ×0.5)' : ''}`;
}

async function main(): Promise<void> {
	say(`## Update scores${DRY_RUN ? ' (dry run)' : ''}\n`);
	const raw = await readFile(SCORES_FILE, 'utf8');
	const prev = JSON.parse(raw) as ScoresFile;
	const scored = await scoredEntries();
	const targets = new Map<string, ScoreTarget>(scored.map((e) => [e.key, e.target]));
	const plan = planRun(prev, targets, scoreAsOf, FULL);

	const open = scored.filter((e) => e.target.repo);
	const repos = new Set(open.map((e) => (e.target.repo as string).toLowerCase()));
	say(`The site scores ${scored.length} entries: ${open.length} with a repository, in ${repos.size} repositories, and ${scored.length - open.length} closed source.\n`);
	if (isIdle(plan)) return say(`The daily snapshot for ${scoreAsOf} is recorded for every entry, so nothing was asked and scores.json is unchanged.`);
	if (plan.full) say(`A full run for ${scoreAsOf}${FULL ? ' (FULL=true)' : prev.asOf ? `, as the file was taken as of ${prev.asOf}` : ', the first one'}: every entry is measured.\n`);
	else if (plan.measure.length) say(`The daily snapshot for ${scoreAsOf} is recorded; this run measures the ${plan.measure.length} entries without a record of their repository or of every signal (${plan.measure.join(', ')}) and leaves the others as they are.\n`);
	if (plan.dropped.length) say(`Dropped the signals of ${plan.dropped.length} entries the site no longer lists: ${plan.dropped.join(', ')}.\n`);

	let requests = 0;
	const found: BatchResult = { repos: new Map(), activity: new Map(), notFound: [] };
	let likes: Record<string, number> = {};
	if (plan.measure.length) {
		likes = await fetchLikes();
		const activityWindows = weekWindows(activityAsOf);
		const releaseWindows = weekWindows(releaseAsOf);
		const asked = plan.measure.flatMap((key) => {
			const t = targets.get(key) as ScoreTarget;
			return t.repo ? [{ key, repo: t.repo, ...(t.path === undefined ? {} : { path: t.path }) }] : [];
		});
		for (const batch of batches(asked)) {
			requests++;
			const answer = await github<GraphqlAnswer>('/graphql', { method: 'POST', body: { query: buildQuery(batch, activityWindows) } });
			if (!answer) throw new Error('GitHub GraphQL answered 404');
			const part = parseBatch(batch, answer, activityWindows, now.getTime(), releaseWindows);
			for (const [k, v] of part.repos) found.repos.set(k, v);
			for (const [k, v] of part.activity) found.activity.set(k, v);
			found.notFound.push(...part.notFound);
		}
		say(`Asked GitHub in ${requests} GraphQL requests, and read the likes from ${LIKES_URL}.\n`);
	}

	const { file: next, kept, skipped } = assemble(plan, prev, targets, found, likes, scoreAsOf, activityAsOf);

	const totals = new Map(plan.measure.filter((key) => Object.hasOwn(next.entries, key)).map((key) => [key, totalOf(next, key) as number]));
	const rows = [...totals.keys()].sort((a, b) => (totals.get(b) as number) - (totals.get(a) as number) || (a < b ? -1 : 1));
	say(`### Scores (${rows.length})\n`);
	say('n/a is a signal that cannot be measured, counted at half its weight; ≈ marks a score with such a signal.\n');
	say('| Entry | Score | Change | Stars /30 | Activity /25 | Openness /20 | Likes /15 | Release /10 |');
	say('| --- | --: | --: | --- | --- | --- | --- | --- |');
	for (const key of rows) {
		const from = totalOf(prev, key);
		const to = totals.get(key) as number;
		const change = from === undefined ? 'new' : to === from ? '0' : `${to > from ? '+' : ''}${to - from}`;
		say(`| ${cell(key)} | ${scoreCell(next, key)} | ${change} | ${partCells(next, key).join(' | ')} |`);
	}
	say('');

	const odd = anomalies(prev, next);
	say(`### Anomalies (${odd.length})\n\n${odd.map((a) => `- ${a.key}: ${a.what}`).join('\n') || 'None.'}\n`);

	const fix: string[] = [];
	for (const key of [...kept, ...skipped]) {
		const t = targets.get(key) as ScoreTarget;
		const line = `GitHub does not find ${t.repo}${kept.includes(key) ? ', so its last record is kept' : ', so it has no score'}: deleted, made private, or renamed?`;
		console.log(`::warning::${key}: ${line}`);
		fix.push(`- ${key}: ${line}`);
	}
	for (const key of plan.measure) {
		const s = Object.hasOwn(next.entries, key) ? next.entries[key] : undefined;
		if (s?.path && found.activity.get(key)?.ever === 0) fix.push(`- ${key}: ${s.repo} has no commit in ${s.path}; does its import name the folder the plugin is in now?`);
	}
	for (const e of scored) if (e.urlOnly) fix.push(`- ${e.key}: names its repository ${e.target.repo} only by its link; give it a repo field.`);
	say(`### Data to fix (${fix.length})\n\n${fix.join('\n') || 'None.'}\n`);

	const bytes = serializeScores(next);
	if (bytes === raw) return say('scores.json is unchanged.');
	if (DRY_RUN) return say('A dry run, so scores.json was not written.');
	await writeFile(SCORES_FILE, bytes);
	if (env.COMMIT_FILE) await writeFile(env.COMMIT_FILE, commitMessage(plan, prev, next));
	say('Wrote scores.json.');
}

try {
	await main();
} catch (err) {
	say(`### Failed\n\n${err instanceof Error ? err.message : String(err)}\n\nNothing was written; the next run tries again.`);
	throw err;
} finally {
	if (env.REPORT_FILE) await writeFile(env.REPORT_FILE, `${report.join('\n')}\n`);
}
