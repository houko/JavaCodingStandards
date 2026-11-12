import { AI_TOOLS, type AiTool, APPS, type App, COMMUNITY_PLUGINS, PLUGINS, type Plugin, STATE_SOLUTIONS, type StateSolution, TEMPLATES, type Template, UI_LIBS, type UiLib } from './catalog';

// Every entry a visitor can like has a stable key: its kind and its id in the catalog. The server accepts only keys of entries listed here, so the likes table cannot fill with made-up ids.
export const likeKey = {
	app: (a: App) => `app:${a.slug}`,
	ui: (l: UiLib) => `ui:${l.repo}`,
	state: (s: StateSolution) => `state:${s.repo}`,
	template: (x: Template) => `template:${x.repo}`,
	// By slug, as several tools may share a repository (the skills of a collection).
	ai: (x: AiTool) => `ai:${x.slug}`,
	plugin: (p: Plugin) => `plugin:${p.slug}`,
} as const;

export const LIKE_KEYS: ReadonlySet<string> = new Set([...APPS.map(likeKey.app), ...UI_LIBS.map(likeKey.ui), ...STATE_SOLUTIONS.map(likeKey.state), ...TEMPLATES.map(likeKey.template), ...AI_TOOLS.map(likeKey.ai), ...PLUGINS.map(likeKey.plugin), ...COMMUNITY_PLUGINS.map(likeKey.plugin)]);
