import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { type ScoreSignals, scoreOf, scoreTarget } from '../../catalog/src/score.ts';
import { listDir } from './files.ts';
import { NSGO_MODULE, quiet } from './find.ts';
import { github } from './github.ts';
import { type RepoInfo, currentRepo, namedInCode, usesNsgo } from './listed.ts';
import { type Candidate, type PruneFacts, type PrunePull, type PruneRule, builtWithNsgo, keptEntries, openPrune, pruneBranch, pruneConfig, pruneMarker, pruneReasons, selectProposals } from './prune-plan.ts';
import { scoredEntry } from './signals.ts';
import { ENTRY_DIRS, type Entry, type EntryKind, repoOfEntry } from './source.ts';

// Run by .github/workflows/prune.yml once a week. It proposes, in one pull request, to take off the site the entries that no longer meet its bar, by rules a maintainer then confirms by merging (prune-plan.ts): an entry whose score on the site is below SCORE_FLOOR (20) once it has been listed for GRACE_DAYS (30), an entry whose repository, or the folder of it the entry is measured by, has had no commit for STALE_DAYS (180), whatever its score, and an entry whose repository is archived, or, for a kind built with NSGo (all but AI tools, which help build NSGo apps without a go.mod of their own), in which no go.mod requires NSGo any more. It checks apps, UI libraries, state management, templates, AI tools and the community plugins that name a repository, never NSGo's own packages (the official plugins). An entry whose repository is gone is left to verify.ts, which removes it on its own; one the site's code names, such as a featured app, is only reported, as removing it would break the page.
//
// The score is the one the site shows, computed from packages/catalog/data/scores.json as the site computes it (packages/catalog/src/score.ts), so an entry the score workflow has not measured yet is never proposed by the score rule.
//
// What a maintainer kept needs no state of its own: each pull request lists its entries in a marker (prune-plan.ts), and a later run reads the earlier ones. Every entry of one closed without merging is kept, and every entry of a merged one whose file is still on main was taken out of it before the merge and is kept; a kept entry is never proposed again. While one of these pull requests is open, a run proposes nothing. The pull request removes each entry's file and its icon and screenshot, on the branch prune/<day>, after the catalog checks passed on the result. Like verify.ts, it works in the repository's working tree, checked out at main and clean, with origin/main fetched, and leaves the tree detached at origin/main.
//
// Environment: GITHUB_TOKEN (the site's GitHub App, which pushes the branch and opens the pull request, so CI runs on it), BASE_REF (the commit the change is made on, default origin/main), REPORT_FILE (a Markdown summary of the run), SCORE_FLOOR, GRACE_DAYS and STALE_DAYS (the thresholds above), and DRY_RUN=true to only report what it would propose, touching neither the working tree nor GitHub.

const run = promisify(execFile);
const ROOT = join(import.meta.dirname, '../../..');
const DATA_DIR = 'packages/catalog/data';
const PUBLIC = 'apps/web/public';
const BASE = 'main';

const env = process.env;
const SITE = env.GITHUB_REPOSITORY || 'yldm-tech/awesome-nsgo';
const DRY_RUN = env.DRY_RUN === 'true';
const BASE_REF = env.BASE_REF || `origin/${BASE}`;
const CFG = pruneConfig(env);
const now = new Date();

const report: string[] = [];
const say = (line: string): void => {
	report.push(line);
	console.log(line);
};

const git = (...args: string[]) => run('git', args, { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 });
const tail = (text: string, n: number) => (text.length > n ? `…${text.slice(-n)}` : text);
const codeBlock = (text: string) => `\`\`\`\`\n${text.replace(/````/g, '```')}\n\`\`\`\``;
const cell = (s: string) => s.replace(/\|/g, '\\|');

// Where main as it is now is fetched to, apart from origin/main, which keeps the commit the run began on.
const LATEST = 'refs/prune/latest';

const KIND_LABEL: Record<EntryKind, string> = { app: 'app', ui: 'UI library', state: 'state management', template: 'template', ai: 'AI tool', plugin: 'community plugin' };
const RULE_LABEL: Record<PruneRule, string> = { score: 'score below the floor', stale: 'no commit for long', archived: 'archived', 'not-nsgo': 'no longer built with NSGo' };

interface Listed {
	// <dir>/<file name without .json>
	id: string;
	kind: EntryKind;
	file: string;
	entry: Entry;
	repo: string;
	// The folder of the repository the entry is measured by, when it is one.
	path?: string;
	score?: number;
}

interface Checked extends Listed {
	info: RepoInfo;
	facts: PruneFacts;
}

interface ScoresFile {
	asOf: string | null;
	entries: Record<string, ScoreSignals>;
}

// The entries that name a GitHub repository, with the score the site shows for each, in each directory's file order. The official plugins are packages of NSGo's own repository, which this site does not judge.
async function listedEntries(scores: ScoresFile): Promise<Listed[]> {
	const out: Listed[] = [];
	for (const [kind, dir] of Object.entries(ENTRY_DIRS) as [EntryKind, string][]) {
		for (const name of (await listDir(join(ROOT, DATA_DIR, dir))).filter((n) => n.endsWith('.json')).sort()) {
			const file = `${DATA_DIR}/${dir}/${name}`;
			const entry = JSON.parse(await readFile(join(ROOT, file), 'utf8')) as Entry;
			const repo = repoOfEntry(entry);
			if (!repo || entry.official === true || repo.toLowerCase() === NSGO_MODULE.replace('github.com/', '')) continue;
			// The score as the site shows it: from a record taken of the repository and folder the entry names now (scores.ts, scoresFor).
			const scored = scoredEntry(kind, entry);
			const signals = scored ? scores.entries[scored.key] : undefined;
			const score = scored && signals && scores.asOf && signals.repo === scored.target.repo && signals.path === scored.target.path ? scoreOf(signals, scores.asOf).total : undefined;
			const target = scored?.target ?? scoreTarget({ url: typeof entry.docs === 'string' ? entry.docs : undefined, goImport: typeof entry.import === 'string' ? entry.import : undefined });
			const path = target.repo?.toLowerCase() === repo.toLowerCase() ? target.path : undefined;
			out.push({ id: `${dir}/${name.replace(/\.json$/, '')}`, kind, file, entry, repo, path, score });
		}
	}
	return out;
}

// The day of the latest commit on the repository's default branch, or in the entry's folder; undefined for an empty repository or one whose history cannot be read.
async function lastCommit(info: RepoInfo, path?: string): Promise<string | undefined> {
	const q = `sha=${encodeURIComponent(info.default_branch)}&per_page=1${path ? `&path=${encodeURIComponent(path)}` : ''}`;
	const commits = await github<{ commit: { committer: { date: string } | null; author: { date: string } | null } }[]>(`/repos/${info.full_name}/commits?${q}`).catch(() => undefined);
	const c = commits?.[0]?.commit;
	return c?.committer?.date ?? c?.author?.date;
}

// What the rules need of one entry's repository; undefined when the repository is gone, private or disabled, which verify.ts handles.
async function check(l: Listed): Promise<Checked | { gone: string }> {
	const info = await currentRepo(l.repo);
	if (!info) return { gone: 'GitHub answers 404 for its repository' };
	if (info.disabled) return { gone: 'GitHub has disabled its repository' };
	if (info.private) return { gone: 'its repository is private' };
	const [commit, nsgo] = await Promise.all([lastCommit(info, l.path), builtWithNsgo(l.kind) ? usesNsgo(info) : undefined]);
	return { ...l, info, facts: { added: typeof l.entry.added === 'string' ? l.entry.added : undefined, score: l.score, lastCommit: commit, archived: info.archived, usesNsgo: nsgo } };
}

// Runs fn over items, a few at a time, as each takes several requests.
async function pool<T, R>(items: readonly T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const out: R[] = new Array(items.length);
	let next = 0;
	await Promise.all(
		Array.from({ length: size }, async () => {
			while (next < items.length) {
				const i = next++;
				out[i] = await fn(items[i]);
			}
		}),
	);
	return out;
}

// Every pull request of the site whose branch is this workflow's, in all states.
async function prunePulls(): Promise<PrunePull[]> {
	const out: PrunePull[] = [];
	for (let page = 1; ; page++) {
		const batch = (await github<PrunePull[]>(`/repos/${SITE}/pulls?state=all&per_page=100&page=${page}`)) ?? [];
		out.push(...batch.filter((p) => p.head.ref.startsWith('prune/')));
		if (batch.length < 100) return out;
	}
}

const nameOf = (c: Checked) => String(c.entry.name ?? c.entry.slug ?? c.id);
const day = (iso?: string) => (iso ? iso.slice(0, 10) : 'unknown');

// The table the pull request and the report show: each entry with the facts the rules looked at.
function table(rows: readonly { c: Checked; reasons: string[] }[]): string {
	const head = '| Entry | Kind | Score | Last commit | Why |\n| --- | --- | --- | --- | --- |';
	const lines = rows.map(({ c, reasons }) => `| [${cell(quiet(nameOf(c)))}](${c.info.html_url}${c.path ? `/tree/${c.info.default_branch}/${c.path}` : ''}) (\`${c.file}\`) | ${KIND_LABEL[c.kind]} | ${c.score ?? 'none'} | ${day(c.facts.lastCommit)} | ${cell(reasons.join('; '))} |`);
	return [head, ...lines].join('\n');
}

// Removes the entries and their images on the branch, runs the catalog checks, and pushes the branch and opens the pull request. Returns its link; throws with what went wrong, leaving no branch behind. The working tree is back on origin/main either way.
async function propose(rows: readonly { c: Checked; reasons: string[] }[]): Promise<string> {
	const branch = pruneBranch(now);
	let pushed = false;
	await git('switch', '-q', '-C', branch, BASE_REF);
	try {
		for (const { c } of rows) {
			await rm(join(ROOT, c.file));
			const icon = (c.entry.icon as { file?: unknown } | undefined)?.file;
			const images = [...(typeof icon === 'string' ? [`icons/${icon}`] : []), ...(typeof c.entry.screenshot === 'string' ? [`shots/${c.entry.screenshot}`] : [])];
			for (const img of images) await rm(join(ROOT, PUBLIC, img), { force: true });
		}
		try {
			await run('pnpm', ['--filter', '@awesome-nsgo/catalog', 'test'], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
		} catch (err) {
			const out = (err as { stdout?: string }).stdout ?? String(err);
			throw new Error(`the catalog checks failed with these entries removed:\n${codeBlock(tail(out, 1500))}`);
		}
		await git('add', '-A', '--', DATA_DIR, PUBLIC);
		await git('commit', '-q', '-m', `chore(catalog): remove ${rows.length} ${rows.length === 1 ? 'entry' : 'entries'} below the site's bar`, '-m', rows.map(({ c, reasons }) => `- ${c.file}: ${reasons.join('; ')}`).join('\n'));
		// As in verify.ts: the commit is moved onto main as it is now, so a workflow file merged during the run does not make GitHub refuse the push.
		await git('fetch', '-q', 'origin', `+refs/heads/${BASE}:${LATEST}`);
		await git('rebase', '-q', LATEST);
		await git('push', '-q', '--force', 'origin', `HEAD:refs/heads/${branch}`);
		pushed = true;
		const body = [
			`The weekly *Prune listed projects* workflow proposes taking these ${rows.length} ${rows.length === 1 ? 'entry' : 'entries'} off the site, with their icons and screenshots. An entry is proposed when its score on the site is below ${CFG.scoreFloor} after at least ${CFG.graceDays} days on the site, when its repository (or the folder it is measured by) has had no commit for more than ${CFG.staleDays} days, or when its repository is archived or no longer requires NSGo.`,
			table(rows),
			`To keep an entry, restore its files on this branch before merging (or ask for it in a comment); to keep them all, close this pull request. A kept entry is never proposed again. The catalog checks passed with these entries removed before the branch was pushed, and CI runs them again.`,
			pruneMarker(rows.map(({ c }) => c.id)),
		].join('\n\n');
		const pr = await github<{ html_url: string }>(`/repos/${SITE}/pulls`, { method: 'POST', body: { title: `Remove ${rows.length} ${rows.length === 1 ? 'entry' : 'entries'} below the site's bar`, head: branch, base: BASE, body } });
		if (!pr) throw new Error('GitHub did not open the pull request');
		return pr.html_url;
	} catch (err) {
		if (pushed) await github(`/repos/${SITE}/git/refs/heads/${branch}`, { method: 'DELETE' }).catch(() => undefined);
		throw err;
	} finally {
		await git('rebase', '--abort').catch(() => undefined);
		await git('reset', '-q', '--hard', BASE_REF);
		await git('clean', '-qfd', '--', DATA_DIR, PUBLIC);
		await git('switch', '-q', '--detach', BASE_REF);
		await git('branch', '-q', '-D', branch);
	}
}

async function main(): Promise<void> {
	if (!DRY_RUN) {
		const { stdout: dirty } = await git('status', '--porcelain', '--', DATA_DIR, PUBLIC);
		if (dirty.trim()) throw new Error(`the working tree has changes under ${DATA_DIR} or ${PUBLIC}; run this on a clean checkout`);
	}
	say(`## Prune listed projects${DRY_RUN ? ' (dry run)' : ''}\n`);
	say(`Rules: a score below ${CFG.scoreFloor} after ${CFG.graceDays} days on the site; no commit for more than ${CFG.staleDays} days; an archived repository; no go.mod requiring NSGo.\n`);

	const pulls = await prunePulls();
	const waiting = openPrune(pulls);
	if (waiting) {
		say(`The pull request ${waiting.html_url} from an earlier run is still open, so this run proposes nothing. Merge or close it first.`);
		return;
	}
	const kept = keptEntries(pulls, (id) => existsSync(join(ROOT, DATA_DIR, `${id}.json`)));

	const scores = JSON.parse(await readFile(join(ROOT, DATA_DIR, 'scores.json'), 'utf8')) as ScoresFile;
	const entries = await listedEntries(scores);
	const gone: string[] = [];
	const failed: string[] = [];
	const checked = (
		await pool(entries, 4, async (l) => {
			try {
				const r = await check(l);
				if ('gone' in r) {
					gone.push(`- \`${l.file}\`: ${r.gone}; verify.ts removes such an entry`);
					return undefined;
				}
				return r;
			} catch (err) {
				failed.push(`- \`${l.file}\` (${l.repo}): ${quiet(err instanceof Error ? err.message : String(err))}`);
				return undefined;
			}
		})
	).filter((c): c is Checked => c !== undefined);

	const judged = new Map(checked.map((c) => [c.id, { c, reasons: pruneReasons(c.facts, now, CFG) }]));
	const candidates: Candidate[] = [];
	for (const { c, reasons } of judged.values()) if (reasons.length) candidates.push({ id: c.id, reasons, namedIn: await namedInCode(ROOT, BASE_REF, String(c.entry.slug)) });
	const picked = selectProposals(candidates, kept);
	const rowsOf = (list: readonly Candidate[]) => list.map((cand) => ({ c: (judged.get(cand.id) as { c: Checked }).c, reasons: cand.reasons.map((r) => r.text) }));
	const rows = rowsOf(picked.propose);

	const byRule = (Object.keys(RULE_LABEL) as PruneRule[]).map((rule) => `${picked.propose.filter((c) => c.reasons.some((r) => r.rule === rule)).length} ${RULE_LABEL[rule]}`);
	say(`Checked ${checked.length} of ${entries.length} entries that name a repository. ${rows.length} ${rows.length === 1 ? 'is' : 'are'} proposed (${byRule.join(', ')}; an entry may meet several rules).\n`);

	if (rows.length) {
		if (DRY_RUN) say(`### Would propose (${rows.length})\n\n${table(rows)}\n`);
		else {
			try {
				const url = await propose(rows);
				say(`### Proposed (${rows.length}): ${url}\n\n${table(rows)}\n`);
			} catch (err) {
				failed.push(`- the pull request: ${quiet(err instanceof Error ? err.message : String(err))}`);
				say(`### Would have proposed (${rows.length})\n\n${table(rows)}\n`);
			}
		}
	} else say('### Proposed (0)\n\nNone.\n');
	say(`### Kept by a maintainer (${picked.kept.length})\n\n${picked.kept.length ? table(rowsOf(picked.kept)) : 'None.'}\n`);
	say(`### Named by the site's code (${picked.named.length})\n\nThese meet a rule, but the site's code names their slug, so removing them would break a page; take them out there first.\n\n${picked.named.map((c) => `- \`${c.id}\`: ${c.reasons.map((r) => r.text).join('; ')} (named in ${c.namedIn.map((f) => `\`${f}\``).join(', ')})`).join('\n') || 'None.'}\n`);
	say(`### Repository gone (${gone.length})\n\n${gone.join('\n') || 'None.'}\n`);
	say(`### Failed (${failed.length})\n\n${failed.join('\n') || 'None.'}`);
	if (failed.some((f) => f.startsWith('- the pull request'))) process.exitCode = 1;
}

try {
	await main();
} finally {
	if (env.REPORT_FILE) await writeFile(env.REPORT_FILE, `${report.join('\n')}\n`);
}
