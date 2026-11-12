import { APP_KINDS, type AppKind, type InstallTab, UI_KEYS, type UiLibKey } from '@awesome-nsgo/catalog';
import { UI_SORTS, type UiSort } from './ui';

// What each page shows beyond its path lives in its query string, so a link reproduces the view: the filter, the order, the open tab. A default is left out (the plain path shows it), and an unknown value is dropped, as the showcase's ?cat= and ?ui= already were. Every key is always returned, undefined when absent, for the same reason as validateRootSearch: TanStack merges the validated object over the raw search.

// TanStack parses a query value that looks like a number into one (?author=4202217), so text values are read back as strings.
export function text(v: unknown): string | undefined {
	if (typeof v === 'number') return String(v);
	return typeof v === 'string' && v.trim() ? v : undefined;
}

export function oneOf<T extends string>(v: unknown, values: readonly T[]): T | undefined {
	const s = text(v);
	return values.find((x) => x === s);
}

// The plugins page: the kind of app a plugin serves (Go or TSX; one for both shows under either), and the order besides the docs' own.
export interface PluginsSearch {
	source?: 'all' | 'official' | 'community';
	surface?: AppKind;
	sort?: 'docs' | 'likes' | 'score';
}

export function validatePluginsSearch(search: Record<string, unknown>): PluginsSearch {
	return {
		source: oneOf(search.source, ['all', 'official', 'community'] as const),
		surface: oneOf(search.surface, APP_KINDS),
		sort: oneOf(search.sort, ['docs', 'likes', 'score'] as const),
	};
}

// The UI components page: the kind of library shown, the kind of app it serves, as on the plugins page, and the order (lib/ui.ts).
export interface UiSearch {
	tag?: UiLibKey;
	surface?: AppKind;
	sort?: UiSort;
}

export function validateUiSearch(search: Record<string, unknown>): UiSearch {
	return { tag: oneOf(search.tag, UI_KEYS), surface: oneOf(search.surface, APP_KINDS), sort: oneOf(search.sort, UI_SORTS) };
}

// The state page: the open example of NSGo's own reactive primitives, besides the first (signals).
export type StateBlock = 'signal' | 'memo' | 'context';

export interface StateSearch {
	block?: Exclude<StateBlock, 'signal'>;
}

export function validateStateSearch(search: Record<string, unknown>): StateSearch {
	return { block: oneOf(search.block, ['memo', 'context'] as const) };
}

// Each primitive's example, shared by both looks: real NSGo API from its core package (core/reactive.go, core/storage.go), indented with two spaces as the code panes have no tab stops of their own.
export const STATE_BLOCKS: readonly { id: StateBlock; kicker: string; code: string }[] = [
	{
		id: 'signal',
		kicker: 'core.NewSignal',
		code: 'count := core.NewSignal(cx, 0)\n\ncore.Text{ContentFunc: func() string {\n  return fmt.Sprintf("%d", count.Get())\n}}\n\ncount.Set(5)\ncount.Update(func(n int) int { return n + 1 })',
	},
	{
		id: 'memo',
		kicker: 'core.NewMemo',
		code: 'first := core.NewSignal(cx, "Ada")\nlast := core.NewSignal(cx, "Lovelace")\nfull := core.NewMemo(cx, func() string {\n  return first.Get() + " " + last.Get()\n})\n\ncx.Effect(func() {\n  log.Println("name:", full.Get())\n})',
	},
	{
		id: 'context',
		kicker: 'core.NewKey',
		code: 'var Theme = core.NewKey("theme", "light")\n\nfunc Root(cx *core.Scope) core.Node {\n  Theme.Provide(cx, "dark")\n  return core.Func(Badge)\n}\n\nfunc Badge(cx *core.Scope) core.Node {\n  return core.Text{Content: Theme.Use(cx)}\n}\n\n// kept on the device\ncx.Storage().SetItem("theme", "dark")',
	},
];

// The home page: the install command's tab, besides the first (nsgo init's default template, go).
export interface HomeSearch {
	install?: Exclude<InstallTab, 'go'>;
}

export function validateHomeSearch(search: Record<string, unknown>): HomeSearch {
	return { install: oneOf(search.install, ['tsx', 'mixed'] as const) };
}
