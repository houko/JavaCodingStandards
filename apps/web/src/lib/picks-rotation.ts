// The rule that chooses the week's picks (data/meta.json), run by scripts/rotate-picks.ts from the weekly likes refresh (.github/workflows/likes.yml), so the picks change without anyone choosing them.
//
// The picks are the games whose posts gained the most likes since the last rotation, measured against the counts saved then (the baseline). A game that joined since has no count in the baseline and gains all its likes. Last week's picks step aside when enough others gained, games marked as down are never picked, and when too few gained at all the most liked fill the rest.

export const PICK_COUNT = 3;
// The least time between two rotations, so a refresh run by hand mid-week leaves the picks alone.
export const ROTATE_EVERY_DAYS = 7;

export interface PickCandidate {
	slug: string;
	likes: number;
	down?: string;
}

export interface PicksState {
	picks: string[];
	// The day of the last rotation, YYYY-MM-DD.
	picked?: string;
	// Each game's like count at the last rotation.
	baseline?: Record<string, number>;
}

const DAY_MS = 86_400_000;

// The picks state after a refresh on `today`: rotated when a week has passed since the last rotation, else unchanged. The first run only records the baseline, as there is nothing to measure a gain against yet.
export function rotatePicks(games: readonly PickCandidate[], state: PicksState, today: string): PicksState {
	const baseline = Object.fromEntries(games.map((g) => [g.slug, g.likes]));
	if (state.picked === undefined || state.baseline === undefined) return { picks: state.picks, picked: today, baseline };
	if ((Date.parse(today) - Date.parse(state.picked)) / DAY_MS < ROTATE_EVERY_DAYS) return state;
	const old = state.baseline;
	const listed = games.filter((g) => g.down === undefined);
	const gain = (g: PickCandidate) => g.likes - (old[g.slug] ?? 0);
	const byGain = [...listed].sort((a, b) => gain(b) - gain(a) || b.likes - a.likes || (a.slug < b.slug ? -1 : 1));
	const gained = byGain.filter((g) => gain(g) > 0);
	const fresh = gained.filter((g) => !state.picks.includes(g.slug));
	const first = (fresh.length >= PICK_COUNT ? fresh : gained).slice(0, PICK_COUNT).map((g) => g.slug);
	const byLikes = [...listed].sort((a, b) => b.likes - a.likes || (a.slug < b.slug ? -1 : 1));
	// The rest come from the most liked, last week's picks only after every other game.
	const others = byLikes.map((g) => g.slug).filter((slug) => !first.includes(slug));
	const rest = [...others.filter((slug) => !state.picks.includes(slug)), ...others.filter((slug) => state.picks.includes(slug))];
	const picks = [...first, ...rest].slice(0, PICK_COUNT);
	return { picks: picks.length === PICK_COUNT ? picks : state.picks, picked: today, baseline };
}
