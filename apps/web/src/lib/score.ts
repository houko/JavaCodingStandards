import { ACTIVITY_WEEKS, ARCHIVED_FACTOR, type LangCode, SITE_REPO, type Score, type ScoreSignal, type ScoreSignals, type Translations, fill } from '@awesome-nsgo/catalog';

// An entry's score as both looks show it (components/Score.tsx): the total, and each signal's line in the breakdown with what was measured, or why it could not be, in the page's language. The looks only lay these out.

// The formula, and every change to the recorded signals, on GitHub: anyone can take the raw values and work the score out again.
export const SCORE_FORMULA_URL = `${SITE_REPO}/blob/main/packages/catalog/src/score.ts`;
export const SCORE_HISTORY_URL = `${SITE_REPO}/commits/main/packages/catalog/data/scores.json`;

const LABEL: Record<ScoreSignal, 'score_stars' | 'score_activity' | 'score_open' | 'score_likes' | 'score_release'> = { stars: 'score_stars', activity: 'score_activity', openness: 'score_open', likes: 'score_likes', release: 'score_release' };

export interface ScoreRow {
	signal: ScoreSignal;
	label: string;
	// The raw value behind the points (the star count, the active weeks, the license), or why the signal could not be measured.
	detail: string;
	points: number;
	max: number;
	// The points out of max as the page writes numbers, 12.5/25.
	of: string;
	// Whether the row shows the neutral tag: a signal counted at NEUTRAL.
	neutral: boolean;
}

export interface ScoreView {
	rows: ScoreRow[];
	// The archived line, when the score was multiplied by ARCHIVED_FACTOR.
	archived: string | undefined;
	asOf: string;
}

// A score's band, which each look colours its badge by. The bands use the exact score so two entries that round to the same displayed tenth can still get the same treatment consistently.
export type ScoreTier = 'top' | 'hi' | 'mid' | 'lo' | 'low';
export function scoreTier(score: Score): ScoreTier {
	return score.exact >= 80 ? 'top' : score.exact >= 65 ? 'hi' : score.exact >= 50 ? 'mid' : score.exact >= 35 ? 'lo' : 'low';
}

// The total as shown: approximate (≈36.6) when part of the weight was counted at NEUTRAL rather than measured. The exact score is kept to one decimal so close entries do not collapse into the same integer badge.
export function scoreTotal(score: Score): string {
	return `${score.measured < 1 ? '≈' : ''}${score.exact.toFixed(1)}`;
}

// The score as a sentence for assistive technology and the tooltip, with a note when part of it could not be measured.
export function scoreLabel(score: Score, name: string, t: Translations, lang: LangCode): string {
	const label = fill(t.score_a, { x: name, n: scoreTotal(score) });
	if (score.measured >= 1) return label;
	return `${label}${lang === 'en' || lang === 'ko' ? '. ' : '。'}${t.score_partial}`;
}

// A day in the page's language, formatted in UTC as the app pages' added date is, so the server's render and the visitor's browser agree on it.
function dayOf(day: string, lang: LangCode): string {
	return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(day));
}

function license(s: ScoreSignals, t: Translations): string {
	if (!s.repo) return t.score_lic_closed;
	if (s.license === null || s.license === undefined) return t.score_lic_none;
	if (s.license === 'NOASSERTION') return t.score_lic_unknown;
	return fill(s.osi ? t.score_lic_osi : t.score_lic_other, { x: s.license });
}

// The release row: on how many days of the rolling release window it was released or tagged, or for a record written before those were counted, its latest release, as the score counts it then (knownReleaseDays).
function release(s: ScoreSignals, t: Translations, lang: LangCode, num: Intl.NumberFormat): string {
	if (s.releaseDays === undefined) return s.released ? fill(t.score_v_rel, { x: dayOf(s.released, lang) }) : t.score_v_rel_none;
	if (s.releaseDays === 0 && !s.released) return t.score_v_rel_none;
	return fill(t.score_v_rel_days, { x: num.format(ACTIVITY_WEEKS), n: num.format(s.releaseDays) });
}

// Why a signal counted at NEUTRAL could not be measured: the source is closed, the stars of the repository an entry lives in are not its own, or there is no week of history to judge the activity on yet. day is the score snapshot's, as the page writes it.
function neutralReason(signal: ScoreSignal, s: ScoreSignals, t: Translations, day: string): string {
	if (!s.repo) return t.score_na_closed;
	if (signal === 'stars' && s.path) return fill(t.score_na_shared, { x: s.repo });
	if (signal === 'activity' && s.weeks === 0) return fill(t.score_v_weeks_new, { x: day });
	return '';
}

export function scoreRows(score: Score, signals: ScoreSignals, asOf: string, t: Translations, lang: LangCode): ScoreView {
	const num = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 });
	const day = dayOf(asOf, lang);
	const measured: Record<ScoreSignal, () => string> = {
		stars: () => fill(t.score_v_stars, { n: num.format(signals.stars ?? 0) }),
		activity: () => fill(t.score_v_weeks, { x: num.format(signals.weeks ?? 0), n: num.format(signals.activeWeeks ?? 0) }),
		openness: () => license(signals, t),
		// As of the score snapshot, like every signal: the heart beside the name counts likes as they come, so the row says which day its count is from.
		likes: () => fill(t.score_v_likes, { n: num.format(signals.likes), x: day }),
		release: () => release(signals, t, lang, num),
	};
	const rows = score.parts.map(
		(p): ScoreRow => ({
			signal: p.signal,
			label: t[LABEL[p.signal]],
			detail: p.basis === 'neutral' ? neutralReason(p.signal, signals, t, day) : measured[p.signal](),
			points: p.points,
			max: p.max,
			of: `${num.format(p.points)}/${p.max}`,
			neutral: p.basis === 'neutral',
		}),
	);
	return { rows, archived: score.archived ? fill(t.score_archived, { n: num.format(ARCHIVED_FACTOR) }) : undefined, asOf: fill(t.score_asof, { x: day }) };
}
