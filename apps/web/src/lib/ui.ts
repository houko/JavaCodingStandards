import { HAS_SCORES, type UiLib, byName, compareByScore, likeKey } from '@awesome-nsgo/catalog';
import type { LikesState } from './likes';

// The UI components page's orders, as the showcase has them: highest score first, newest first, by name, or most liked first. Shared by both looks.
export type UiSort = 'score' | 'newest' | 'natural' | 'likes';
export const UI_SORTS = ['score', 'newest', 'natural', 'likes'] as const satisfies readonly UiSort[];

// The order the page opens in, which the address leaves out: highest score first, or newest first before the first scores.
export const UI_DEFAULT_SORT: UiSort = HAS_SCORES ? 'score' : 'newest';

// The order shown for the address's ?sort=: with likes off there is no most-liked order, and before the first scores no order by score, whatever the link says; either falls back to UI_DEFAULT_SORT.
export function shownUiSort(sort: UiSort | undefined, likes: LikesState['status']): UiSort {
	return (sort === 'likes' && likes === 'off') || (sort === 'score' && !HAS_SCORES) ? UI_DEFAULT_SORT : (sort ?? UI_DEFAULT_SORT);
}

// The libraries in the chosen order. By score, equal totals go by compareByScore and then by name; libraries with the same likes go by name; libraries without a score come after those with one.
export function sortUiLibs(libs: readonly UiLib[], sort: UiSort, likes: Readonly<Record<string, number>>): UiLib[] {
	const list = [...libs].sort(byName);
	if (sort === 'newest') list.sort((a, b) => (b.added ?? '').localeCompare(a.added ?? ''));
	if (sort === 'likes') list.sort((a, b) => (likes[likeKey.ui(b)] ?? 0) - (likes[likeKey.ui(a)] ?? 0));
	if (sort === 'score') list.sort((a, b) => compareByScore(likeKey.ui(a), likeKey.ui(b)));
	return list;
}
