// An entry's score, 0 to 100, from the raw signals the scheduled Update scores workflow records in data/scores.json (packages/enrich/src/score.ts): how many stars its repository has, in how many recent weeks it was worked on, whether it is open source and under what license, how many likes it has here, and on how many days of the counted weeks it was released or tagged. The score says how popular, active and open a project is, not how good it is.
//
// This module must keep zero imports: the workflow loads it from Node by its path (packages/enrich imports '../../catalog/src/score.ts'), where the rest of the catalog, built on Vite's import.meta.glob, cannot load. It never reads the clock either: a score depends only on the signals and the day they were taken (asOf), so the same scores.json gives the same scores on whatever day the site is built.

// The most each signal adds to the score; together 100.
export const SCORE_WEIGHTS = { stars: 30, activity: 25, openness: 20, likes: 15, release: 10 } as const;
export type ScoreSignal = keyof typeof SCORE_WEIGHTS;
export const SCORE_SIGNALS = Object.keys(SCORE_WEIGHTS) as ScoreSignal[];

// What a signal that cannot be measured counts for, as a share of its weight: half of it, so that an entry is neither punished nor rewarded for what nobody can see.
export const NEUTRAL = 0.5;
// Fixed anchors rather than ranks among the entries, so that a score does not move when other entries come and go: 1,000 stars and 50 likes count in full, on a log scale below.
export const STAR_ANCHOR = 1000;
export const LIKE_ANCHOR = 50;
// What an archived repository's score is multiplied by.
export const ARCHIVED_FACTOR = 0.5;
// How many recent weeks the activity is counted over (the workflow's windows), how many active weeks count in full for an established project, and the fewest weeks a young project is judged on.
export const ACTIVITY_WEEKS = 12;
const ACTIVITY_FULL = 8;
const ACTIVITY_MIN = 4;
// How many days with a release or tag in the counted weeks count in full, on a log scale below: one a week.
export const RELEASE_ANCHOR = 12;

// What the workflow records of one entry. An entry without repo is closed source. path is set when the entry lives in a folder of a larger repository: its activity is that folder's, its release and license the repository's, and its stars are not recorded, as the repository's are not the plugin's own. A field that is left out was not measured, except released (never released) and archived (not archived).
export interface ScoreSignals {
	repo?: string;
	path?: string;
	stars?: number;
	// Of the last ACTIVITY_WEEKS full weeks before asOf, how many the entry could have had commits in (fewer for a repository or folder that is younger) and how many it did.
	weeks?: number;
	activeWeeks?: number;
	// The SPDX id GitHub detects, "NOASSERTION" for a license it cannot name, or null for a public repository with no license.
	license?: string | null;
	// Whether the license is one the Open Source Initiative approves.
	osi?: boolean;
	// The day of the latest release or tag, YYYY-MM-DD.
	released?: string;
	// On how many days in the rolling 12-week release window through asOf, the repository published a release or had a tag; left out for a record written before it was counted.
	releaseDays?: number;
	archived?: boolean;
	likes: number;
}

export interface ScorePart {
	signal: ScoreSignal;
	// Points out of max, to one decimal.
	points: number;
	max: number;
	// Whether the signal was measured or counted at NEUTRAL because it cannot be.
	basis: 'measured' | 'neutral';
}

export interface Score {
	// 0 to 100: exact, rounded.
	total: number;
	// The parts' points added up in tenths, times ARCHIVED_FACTOR when archived; total is it rounded. Adding whole tenths keeps a sum like 54.5 exact, so it rounds up as the breakdown a visitor adds up does, which a sum of the one-decimal points in floating point can miss.
	exact: number;
	parts: ScorePart[];
	// The share of the weight that was measured: 1 for an open-source entry, less when some signals are counted at NEUTRAL. The site shows a score below 1 as approximate.
	measured: number;
	archived: boolean;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const DAY = 86_400_000;

// A count on a log scale, 0 at 0 and 1 at anchor and above. A ratio of logarithms is the same in any base, so one base serves every signal.
function logShare(n: number, anchor: number): number {
	return clamp01(Math.log1p(Math.max(0, n)) / Math.log1p(anchor));
}

// Activity: active weeks over the weeks the entry is judged on, between ACTIVITY_MIN and ACTIVITY_FULL; a project younger than ACTIVITY_MIN weeks has the weeks it did not exist yet counted at half, so it is neither punished for being young nor in full after two busy weeks.
export function activityShare(weeks: number, activeWeeks: number): number {
	const target = Math.max(ACTIVITY_MIN, Math.min(ACTIVITY_FULL, weeks));
	const missing = Math.max(0, ACTIVITY_MIN - weeks);
	return clamp01((activeWeeks + NEUTRAL * missing) / target);
}

// Openness and license as one scale, as the two are one question: an OSI-approved license 1, another license (or one GitHub cannot name) 0.6, a public repository without a license 0.3 (its source can be read but not reused), closed source 0.
export function opennessShare(s: Pick<ScoreSignals, 'repo' | 'license' | 'osi'>): number {
	if (!s.repo) return 0;
	if (s.license === null || s.license === undefined) return 0.3;
	return s.osi ? 1 : 0.6;
}

// The days with a release or tag that a record is known to have: its releaseDays, or for a record written before they were counted, one when its latest release falls in the counted weeks, before asOf and on or after their first day (it had at least that one), and none otherwise, a release on asOf or later included, as the days are counted.
export function knownReleaseDays(s: Pick<ScoreSignals, 'released' | 'releaseDays'>, asOf: string): number {
	if (s.releaseDays !== undefined) return s.releaseDays;
	if (!s.released) return 0;
	const days = (Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${s.released}T00:00:00Z`)) / DAY;
	return days >= 1 && days <= ACTIVITY_WEEKS * 7 ? 1 : 0;
}

// Releases: the days with a release or tag in the counted weeks, on a log scale, in full from RELEASE_ANCHOR.
export function releaseShare(days: number): number {
	return logShare(days, RELEASE_ANCHOR);
}

export function scoreOf(s: ScoreSignals, asOf: string): Score {
	const open = Boolean(s.repo);
	const shares: Record<ScoreSignal, number | undefined> = {
		stars: open && !s.path && s.stars !== undefined ? logShare(s.stars, STAR_ANCHOR) : undefined,
		// No week to judge yet (a repository or folder with no commit before asOf) is not a measurement: activityShare would count it at NEUTRAL anyway, and marking it so makes the total approximate, as the breakdown says.
		activity: open && s.weeks !== undefined && s.weeks > 0 && s.activeWeeks !== undefined ? activityShare(s.weeks, s.activeWeeks) : undefined,
		openness: opennessShare(s),
		likes: logShare(s.likes, LIKE_ANCHOR),
		release: open ? releaseShare(knownReleaseDays(s, asOf)) : undefined,
	};
	const parts = SCORE_SIGNALS.map((signal): ScorePart => {
		const share = shares[signal];
		const max = SCORE_WEIGHTS[signal];
		return { signal, max, points: round1(max * (share ?? NEUTRAL)), basis: share === undefined ? 'neutral' : 'measured' };
	});
	const archived = s.archived === true;
	const tenths = parts.reduce((n, p) => n + Math.round(p.points * 10), 0);
	const exact = ((archived ? ARCHIVED_FACTOR : 1) * tenths) / 10;
	const measured = parts.filter((p) => p.basis === 'measured').reduce((n, p) => n + p.max, 0) / 100;
	return { total: Math.round(exact), exact, parts, measured, archived };
}

export interface ScoreTarget {
	repo?: string;
	path?: string;
}

const GITHUB_REPO = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/#?]|$)/;
const GITHUB_IMPORT = /^github\.com\/([\w.-]+)\/([\w.-]+?)(?:\/|$)/i;

// What the workflow measures for an entry: its repository (its repo field, its link when that is a repository, or a GitHub Go import path) and, for an entry in a folder of it, the folder (from its Go import path under the repository, or else from a /tree/<ref>/<path> link into that same repository). An empty target is a closed-source entry.
export function scoreTarget(e: { repo?: string; url?: string; goImport?: string }): ScoreTarget {
	const m = e.url ? GITHUB_REPO.exec(e.url.trim()) : null;
	const linked = m ? `${m[1]}/${m[2]}` : undefined;
	const imported = e.goImport ? GITHUB_IMPORT.exec(e.goImport.trim()) : null;
	const importedRepo = imported ? `${imported[1]}/${imported[2]}` : undefined;
	const repo = e.repo && /^[^/\s]+\/[^/\s]+$/.test(e.repo) ? e.repo : linked ?? importedRepo;
	if (!repo) return {};
	const prefix = `github.com/${repo}/`.toLowerCase();
	const fromImport = e.goImport?.toLowerCase().startsWith(prefix) ? e.goImport.slice(prefix.length) : undefined;
	// A folder of another repository than the entry's is not the entry's folder; a query or fragment is not part of the folder.
	const fromTree = e.url && linked?.toLowerCase() === repo.toLowerCase() ? /^https:\/\/github\.com\/[^/]+\/[^/]+\/tree\/[^/]+\/([^?#]+?)\/?(?:[?#].*)?$/.exec(e.url.trim())?.[1] : undefined;
	const path = (fromImport ?? fromTree)?.replace(/^\/+|\/+$/g, '');
	return path ? { repo, path } : { repo };
}

// The key an entry's signals are kept under in scores.json: the same as its like key (likes.ts), so likes and scores line up.
export function scoreKey(kind: 'app' | 'ui' | 'state' | 'template' | 'ai' | 'plugin', e: { slug: string; repo?: string }): string {
	return kind === 'app' || kind === 'plugin' || kind === 'ai' ? `${kind}:${e.slug}` : `${kind}:${e.repo}`;
}
