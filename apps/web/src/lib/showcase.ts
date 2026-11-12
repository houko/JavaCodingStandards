import { APPS, APP_GROUPS, APP_KINDS, APP_PLATFORMS, type App, type AppGroup, type AppKind, type AppPlatform, HAS_SCORES, appGroup, byNewest, compareByScore, isAppGroup, likeKey } from '@awesome-nsgo/catalog';
import type { LikesState } from './likes';
import { oneOf, text } from './page-search';

// The showcase's view in the address: ?cat= a group, ?ui= go or tsx (the language an app is written in), ?platform= one it ships for, ?sort= natural, newest, likes or score (DEFAULT_SORT when absent), and in the retro look ?author= the author picked in its side panel. Every key is always returned, undefined when absent or invalid, for the same reason as validateRootSearch: TanStack merges the validated object over the raw search.
export interface ShowcaseSearch {
	cat?: AppGroup;
	ui?: AppKind;
	platform?: AppPlatform;
	sort?: AppSort;
	author?: string;
}

const AUTHORS = new Set(APPS.map((a) => a.author));

// Groups the showcase had before it had groups of its own, so a link shared then still opens a list: utility's apps are mostly system tools now, and design's category is media's.
const FORMER_GROUPS: Record<string, AppGroup> = { utility: 'system', design: 'media' };

export function validateShowcaseSearch(search: Record<string, unknown>): ShowcaseSearch {
	const author = text(search.author);
	return {
		cat: isAppGroup(search.cat) ? search.cat : typeof search.cat === 'string' ? FORMER_GROUPS[search.cat] : undefined,
		ui: oneOf(search.ui, APP_KINDS),
		platform: typeof search.platform === 'string' && APP_PLATFORMS.includes(search.platform as AppPlatform) ? (search.platform as AppPlatform) : undefined,
		sort: oneOf(search.sort, ['natural', 'newest', 'likes', 'score'] as const),
		author: author !== undefined && AUTHORS.has(author) ? author : undefined,
	};
}

// The showcase's orders: by name in natural order (APPS' own order), newest first, most liked first, or highest score first.
export type AppSort = 'natural' | 'newest' | 'likes' | 'score';

// The order the showcase opens in, which the address leaves out: highest score first, or newest first before the first scores. An app listed since the last scores has none yet and comes after the scored ones until the next daily run.
export const DEFAULT_SORT: AppSort = HAS_SCORES ? 'score' : 'newest';

// The order the showcase shows for the address's ?sort=: with likes off there is no most-liked order, and before the first scores no order by score, whatever the link says; either falls back to DEFAULT_SORT. Scores are part of the build, so the order by score needs no likes. Shared by both looks.
export function shownSort(sort: ShowcaseSearch['sort'], likes: LikesState['status']): AppSort {
	return (sort === 'likes' && likes === 'off') || (sort === 'score' && !HAS_SCORES) ? DEFAULT_SORT : (sort ?? DEFAULT_SORT);
}

// The apps in the chosen order; apps with the same likes keep their natural order, and by score equal totals are ordered by the unrounded sum, then the raw stars, active weeks and release days, then their natural order (compareByScore), with apps without a score after those with one. Shared by both looks.
export function sortApps(apps: readonly App[], sort: AppSort, likes: Readonly<Record<string, number>>): App[] {
	const list = [...apps];
	if (sort === 'newest') list.sort(byNewest);
	if (sort === 'likes') list.sort((a, b) => (likes[likeKey.app(b)] ?? 0) - (likes[likeKey.app(a)] ?? 0));
	if (sort === 'score') list.sort((a, b) => compareByScore(likeKey.app(a), likeKey.app(b)));
	return list;
}

// The groups that have apps, largest first; ties keep APP_GROUPS' order, and Other always comes last. `keep` (the chosen group) stays even when the interface filter leaves it empty, so the visitor sees which filter emptied the list. Shared by both looks.
export function groupChips(apps: readonly App[], keep?: AppGroup): { key: AppGroup; apps: App[] }[] {
	const chips = APP_GROUPS.map((key) => ({ key, apps: apps.filter((a) => appGroup(a) === key) })).filter((c) => c.apps.length > 0 || c.key === keep);
	return chips.sort((a, b) => Number(a.key === 'other') - Number(b.key === 'other') || b.apps.length - a.apps.length);
}
