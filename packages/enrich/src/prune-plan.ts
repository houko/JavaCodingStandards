// The rules of the weekly delisting (prune.ts) that need no network: when an entry is proposed for removal, which entries a maintainer kept, and how the pull request names what it proposes.

// The thresholds, each overridable by an environment variable of the same name: a score below SCORE_FLOOR once the entry has been listed for GRACE_DAYS, and a repository (or the folder the entry is measured by) without a commit for STALE_DAYS.
export interface PruneConfig {
	scoreFloor: number;
	graceDays: number;
	staleDays: number;
}

export const PRUNE_DEFAULTS: PruneConfig = { scoreFloor: 20, graceDays: 30, staleDays: 180 };

export function pruneConfig(env: Record<string, string | undefined>): PruneConfig {
	const num = (v: string | undefined, fallback: number) => (v && /^\d+$/.test(v) ? Number(v) : fallback);
	return { scoreFloor: num(env.SCORE_FLOOR, PRUNE_DEFAULTS.scoreFloor), graceDays: num(env.GRACE_DAYS, PRUNE_DEFAULTS.graceDays), staleDays: num(env.STALE_DAYS, PRUNE_DEFAULTS.staleDays) };
}

// What is known of an entry when it is judged. score is the site's score (scoreOf's total), undefined while the score workflow has not measured the entry yet. lastCommit is the date of the latest commit on the repository's default branch, or in the folder the entry is measured by. usesNsgo is undefined when it could not be told (a tree too large).
export interface PruneFacts {
	added?: string;
	score?: number;
	lastCommit?: string;
	archived: boolean;
	usesNsgo?: boolean;
}

export type PruneRule = 'score' | 'stale' | 'archived' | 'not-nsgo';

// Whether an entry of the kind is built with NSGo, and so leaves the site when no go.mod of its repository requires NSGo any more. An AI tool is not: an agent skill or rules for coding agents help build NSGo apps without a go.mod of their own.
export const builtWithNsgo = (kind: string) => kind !== 'ai';

export interface PruneReason {
	rule: PruneRule;
	text: string;
}

const DAY = 86_400_000;
const daysSince = (date: string, now: Date) => Math.floor((now.getTime() - Date.parse(date)) / DAY);

// Why the entry is proposed for removal, empty when it stays. The score rule leaves an entry alone during its grace period, and one without a score; the others apply to every entry.
export function pruneReasons(f: PruneFacts, now: Date, cfg: PruneConfig): PruneReason[] {
	const out: PruneReason[] = [];
	const age = f.added ? daysSince(f.added, now) : undefined;
	if (f.score !== undefined && f.score < cfg.scoreFloor && age !== undefined && age >= cfg.graceDays) out.push({ rule: 'score', text: `its score is ${f.score}, below ${cfg.scoreFloor}, after ${age} days on the site` });
	if (f.lastCommit) {
		const idle = daysSince(f.lastCommit, now);
		if (idle > cfg.staleDays) out.push({ rule: 'stale', text: `no commit for ${idle} days, more than ${cfg.staleDays}` });
	}
	if (f.archived) out.push({ rule: 'archived', text: 'its repository is archived' });
	if (f.usesNsgo === false) out.push({ rule: 'not-nsgo', text: 'no go.mod in its repository requires NSGo any more' });
	return out;
}

// ---- the pull request ----

export const PRUNE_PREFIX = 'prune/';
// One branch a run, by its day.
export const pruneBranch = (now: Date) => `${PRUNE_PREFIX}${now.toISOString().slice(0, 10)}`;

// The entries a pull request proposes, as <dir>/<file name without .json>, in a comment a later run reads to learn what a maintainer kept.
export const pruneMarker = (ids: readonly string[]) => `<!-- prune-listed: ${[...ids].sort().join(' ')} -->`;

export function markedEntries(body: string | null | undefined): string[] {
	const m = /<!-- prune-listed: ([^>]*?) -->/.exec(body ?? '');
	return m ? m[1].split(/\s+/).filter(Boolean) : [];
}

export interface PrunePull {
	head: { ref: string };
	state: 'open' | 'closed';
	merged_at: string | null;
	body: string | null;
	html_url: string;
}

// The entries a maintainer kept, from the earlier pull requests of this workflow: every entry listed in one closed without merging, and every entry listed in a merged one whose file is still on main, which the maintainer took out of the pull request before merging it. A kept entry is never proposed again.
export function keptEntries(pulls: readonly PrunePull[], onMain: (id: string) => boolean): Set<string> {
	const kept = new Set<string>();
	for (const p of pulls) {
		if (!p.head.ref.startsWith(PRUNE_PREFIX) || p.state !== 'closed') continue;
		for (const id of markedEntries(p.body)) if (!p.merged_at || onMain(id)) kept.add(id);
	}
	return kept;
}

// The pull request this workflow still has open, which a run waits for rather than proposing more beside it.
export const openPrune = (pulls: readonly PrunePull[]) => pulls.find((p) => p.head.ref.startsWith(PRUNE_PREFIX) && p.state === 'open');

export interface Candidate {
	// <dir>/<file name without .json>
	id: string;
	reasons: PruneReason[];
	// The site's source files that name the entry's slug (namedInCode), such as the home page's featured apps.
	namedIn: string[];
}

// The entries to propose, apart from those a maintainer kept and those the site's code names, which removing would break and which are reported instead.
export function selectProposals(candidates: readonly Candidate[], kept: ReadonlySet<string>): { propose: Candidate[]; kept: Candidate[]; named: Candidate[] } {
	const out = { propose: [] as Candidate[], kept: [] as Candidate[], named: [] as Candidate[] };
	for (const c of candidates) {
		if (!c.reasons.length) continue;
		if (kept.has(c.id)) out.kept.push(c);
		else if (c.namedIn.length) out.named.push(c);
		else out.propose.push(c);
	}
	return out;
}
