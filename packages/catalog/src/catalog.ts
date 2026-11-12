import type { Text } from './lang';
import type { StringKey } from './strings';
import { CatalogError, Reader, unique } from './validate';

// The entries live in packages/catalog/data, one file each in their category's directory (apps/, ui/, state/, templates/, ai/, plugins/, articles/, docs/), named after the entry's slug, so submissions that arrive together never touch the same file. data/schema/ describes their fields. Data sources: oneo-me/nsgo (its docs, docs/public/en/, its packages and examples/) and each project's own README.

export const SITE_URL = 'https://awesomensgo.dev';
// NSGo itself, by ONEO: its site, its showcases page, its repository and the Go module every NSGo app requires. This site is a community catalog, not NSGo's own.
export const NSGO_SITE = 'https://oneo-me.github.io/nsgo/';
export const NSGO_SHOWCASE = 'https://oneo-me.github.io/nsgo/showcases/';
export const NSGO_REPO = 'https://github.com/oneo-me/nsgo';
export const NSGO_MODULE = 'github.com/oneo-me/nsgo';
// This site's own repository, where submissions arrive.
export const SITE_REPO = 'https://github.com/yldm-tech/awesome-nsgo';
export const DATA_DIR = 'packages/catalog/data';
export const SPONSOR_URL = 'https://github.com/sponsors/oneo-me';
// NSGo's docs on its site, each page at DOCS_BASE + its path + '/' (docUrl).
export const DOCS_BASE = 'https://oneo-me.github.io/nsgo/docs/';
export const STATE_DOC = `${DOCS_BASE}components/`;
export const PLUGINS_DOC = `${DOCS_BASE}authoring/`;
export const NATIVE_UI_DOCS = `${DOCS_BASE}ui/`;

// A docs page's link from its path under DOCS_BASE, as a guide's file gives it: the empty path is the docs' introduction.
export function docUrl(doc: { file: string }): string {
	return `${DOCS_BASE}${doc.file}${doc.file ? '/' : ''}`;
}

export const RESOURCES = [
	{ key: 'res_site', url: NSGO_SITE },
	{ key: 'res_docs', url: DOCS_BASE },
	{ key: 'res_ui', url: NATIVE_UI_DOCS },
	{ key: 'res_demo', url: `${NSGO_SITE}gallery/loader.html` },
	{ key: 'res_examples', url: `${NSGO_REPO}/tree/main/examples` },
	{ key: 'res_nsh', url: 'https://nsh.dev' },
] as const satisfies readonly { key: StringKey; url: string }[];

const SLUG = /^[a-z0-9-]+$/;
const SHOT = /^[a-z0-9-]+\.(webp|svg)$/;
const REPO = /^[^/\s]+\/[^/\s]+$/;
const shot = (file: string | undefined) => (file ? `/shots/${file}` : undefined);
const ADDED = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

// Each read* function checks an entry, a file or a whole directory of them, the bundled ones at load or a contributor's version, and throws a CatalogError naming the file and field of the first mistake.

// ---- one file per entry ----

// A category's files: data/<dir>/<slug>.json, each pointing at schema. A dated category's files also say when the entry was added (UTC, e.g. 2026-11-04T12:00:00Z): the submission bot sets it, and the category's page can list entries by it. An entry read on its own, as the form writes it or a visitor pastes it, may leave out $schema and added, which its file adds.
export interface Kind<T> {
	dir: string;
	schema: string;
	dated: boolean;
	read: (r: Reader) => T;
}

const readSlug = (r: Reader) => r.match('slug', SLUG, 'lowercase letters, digits and hyphens');
const readAdded = (r: Reader) => (r.raw.added === undefined ? undefined : r.match('added', ADDED, 'a UTC time like 2026-11-04T12:00:00Z'));

// One entry as entered in the form or pasted, before it has a file: the same checks as its file, less the file's own fields.
export function readEntry<T>(kind: Kind<T>, json: unknown): T {
	if (!json || typeof json !== 'object' || Array.isArray(json)) throw new CatalogError('the entry must be an object');
	return kind.read(new Reader('entry', json as Record<string, unknown>));
}

// One entry's file, data/<dir>/<name>: its entry, named after its slug, pointing at its schema and, in a dated category, saying when it was added.
export function readEntryFile<T extends { slug: string; added?: string }>(kind: Kind<T>, name: string, json: unknown): T {
	const file = `${kind.dir}/${name}`;
	if (!json || typeof json !== 'object' || Array.isArray(json)) throw new CatalogError(`${file}: must be an object`);
	const r = new Reader(file, json as Record<string, unknown>);
	const entry = kind.read(r);
	if (name !== `${entry.slug}.json`) r.fail('slug', `must match the file name, ${name}`);
	if (r.raw.$schema !== kind.schema) r.fail('$schema', `must be "${kind.schema}"`);
	if (kind.dated && !entry.added) r.fail('added', 'is required: the site lists entries by when they were added');
	return entry;
}

// The entries of a category's directory, keyed by file name, in file name order (the caller sorts them as its page lists them).
function readEntryFiles<T extends { slug: string; added?: string }>(kind: Kind<T>, files: Record<string, unknown>): T[] {
	return Object.entries(files)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([name, json]) => readEntryFile(kind, name, json));
}

// import.meta.glob's result keyed by file name rather than path.
const byFileName = (files: Record<string, unknown>) => Object.fromEntries(Object.entries(files).map(([path, json]) => [path.slice(path.lastIndexOf('/') + 1), json]));

// Names in natural order: letter case aside, and numbers by their value, so 2048 comes before apigo and App 9 before App 10.
const NATURAL = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

// The oldest entry first, by when it was added; entries added at the same second go by slug.
export function byAdded(a: { slug: string; added?: string }, b: { slug: string; added?: string }): number {
	return (a.added ?? '').localeCompare(b.added ?? '') || NATURAL.compare(a.slug, b.slug);
}

// ---- apps (data/apps/<slug>.json) ----

// The language an app is written in: Go, or TSX (a TSX app with Go of its own included). Both draw each platform's native views.
export const APP_KINDS = ['go', 'tsx'] as const;
export type AppKind = (typeof APP_KINDS)[number];
// What an app ships for: the desktops, the phones (ios also covers its App Clips, tvOS and watchOS), the browser, and the WeChat, QQ, Alipay and Douyin mini programs.
export const APP_PLATFORMS = ['mac', 'win', 'linux', 'ios', 'android', 'web', 'miniprogram'] as const;
export type AppPlatform = (typeof APP_PLATFORMS)[number];

// The schema.org applicationCategory values Google's software-app structured data accepts that can describe an app.
export const APP_CATEGORIES = ['BusinessApplication', 'CommunicationApplication', 'DesignApplication', 'DeveloperApplication', 'EducationalApplication', 'EntertainmentApplication', 'FinanceApplication', 'GameApplication', 'HealthApplication', 'LifestyleApplication', 'MultimediaApplication', 'ReferenceApplication', 'SecurityApplication', 'UtilitiesApplication'] as const;
export type AppCategory = (typeof APP_CATEGORIES)[number];

// What visitors browse the showcase by: groups of the site's own, set in each entry's group (and picked by the model for a new one), as the schema.org categories are too broad to tell a proxy client from a disk cleaner. Ordered as the showcase's chips break ties; an app with neither a group nor a category is `other`.
export const APP_GROUPS = ['agents', 'dev', 'ai', 'network', 'notes', 'system', 'devices', 'media', 'game', 'chat', 'other'] as const;
export type AppGroup = (typeof APP_GROUPS)[number];
// The groups an entry can name, as its schema's enum does.
export type EntryGroup = Exclude<AppGroup, 'other'>;
export const ENTRY_GROUPS = APP_GROUPS.filter((g): g is EntryGroup => g !== 'other');

// The group of an entry that names only a category, as one written before groups were.
const GROUP_OF: Record<AppCategory, EntryGroup> = {
	DeveloperApplication: 'dev',
	MultimediaApplication: 'media',
	EntertainmentApplication: 'media',
	UtilitiesApplication: 'system',
	BusinessApplication: 'notes',
	FinanceApplication: 'system',
	LifestyleApplication: 'system',
	ReferenceApplication: 'notes',
	SecurityApplication: 'network',
	HealthApplication: 'system',
	EducationalApplication: 'notes',
	CommunicationApplication: 'chat',
	GameApplication: 'game',
	DesignApplication: 'media',
};

// The schema.org category an app's structured data names when its entry gives a group but no category, as a new one does.
export const GROUP_CATEGORY: Record<EntryGroup, AppCategory> = {
	agents: 'DeveloperApplication',
	dev: 'DeveloperApplication',
	ai: 'UtilitiesApplication',
	network: 'UtilitiesApplication',
	notes: 'BusinessApplication',
	system: 'UtilitiesApplication',
	devices: 'UtilitiesApplication',
	media: 'MultimediaApplication',
	game: 'GameApplication',
	chat: 'CommunicationApplication',
};

export function appGroup(app: { group?: EntryGroup; category?: AppCategory }): AppGroup {
	return app.group ?? (app.category ? GROUP_OF[app.category] : 'other');
}

export function isAppGroup(v: unknown): v is AppGroup {
	return typeof v === 'string' && (APP_GROUPS as readonly string[]).includes(v);
}

export interface App {
	slug: string;
	name: string;
	author: string;
	kind: AppKind;
	platforms: readonly AppPlatform[];
	// The showcase's group (appGroup).
	group?: EntryGroup;
	// For structured data only: the entry's own, or else its group's (GROUP_CATEGORY).
	category?: AppCategory;
	// The app's homepage: its website, or its repository when it has none.
	url: string;
	// Its GitHub repository as owner/name, for an open-source app; closed-source apps leave it out.
	repo?: string;
	// One line, for cards and search results.
	desc: Text;
	// The full description, for the detail drawer.
	about: Text;
	// Screenshot under /shots/, when the project provides one.
	image?: string;
	// The app's icon: its ai-logo avatar on the ai-logo CDN, its official icon under /icons/, or none, for the letter tile.
	icon?: string;
	// The images that stand in until the project gives its own (readProvisional).
	provisional?: ProvisionalImage[];
	// When it joined the showcase (UTC, e.g. 2026-11-04T12:00:00Z), for the showcase's newest-first order. Set by the submission bot, so an entry checked before it is submitted has none yet.
	added?: string;
}

// Icons come from yldm-tech/ai-logo (its avatar renders), served by its CDN.
export const AILOGO_CDN = 'https://ailogo.yldm.ai/avatar/';

// Which of an entry's images stand in until its project gives its own: the owner's GitHub avatar for an app's icon, GitHub's card of the repository or a card drawn of it for a screenshot. packages/enrich sets the list, the announcement's issue asks the project for the images on it, and whoever replaces one drops it from the list.
export type ProvisionalImage = 'icon' | 'screenshot';

const readProvisional = (r: Reader, allowed: readonly ProvisionalImage[]): ProvisionalImage[] | undefined => {
	if (r.raw.provisional === undefined) return undefined;
	const list = r.strings('provisional', 1);
	for (const v of list) if (!(allowed as readonly string[]).includes(v)) r.fail('provisional', `may list only ${allowed.join(' and ')}`);
	if (new Set(list).size !== list.length) r.fail('provisional', 'lists an image twice');
	for (const v of list) if (r.raw[v] === undefined) r.fail('provisional', `lists the ${v}, which the entry does not have`);
	return list as ProvisionalImage[];
};

const readApp = (r: Reader): App => {
	r.only(['$schema', 'slug', 'name', 'author', 'kind', 'platforms', 'category', 'group', 'url', 'repo', 'summary', 'description', 'screenshot', 'icon', 'provisional', 'added']);
	const group = r.raw.group === undefined ? undefined : r.oneOf('group', ENTRY_GROUPS);
	const platforms = r.strings('platforms', 1);
	if (platforms.some((platform) => !(APP_PLATFORMS as readonly string[]).includes(platform))) r.fail('platforms', `must contain only ${APP_PLATFORMS.join(', ')}`);
	if (new Set(platforms).size !== platforms.length) r.fail('platforms', 'lists a platform twice');
	const icon = r.raw.icon as { ailogo?: unknown; file?: unknown } | undefined;
	let iconUrl: string | undefined;
	if (icon !== undefined) {
		if (typeof icon?.ailogo === 'string' && /^[a-z0-9]+$/.test(icon.ailogo) && Object.keys(icon).length === 1) iconUrl = `${AILOGO_CDN}${icon.ailogo}.webp`;
		else if (typeof icon?.file === 'string' && /^[a-z0-9-]+\.webp$/.test(icon.file) && Object.keys(icon).length === 1) iconUrl = `/icons/${icon.file}`;
		else r.fail('icon', 'must be { "ailogo": "<id>" } or { "file": "<name>.webp" }');
	}
	return {
		slug: readSlug(r),
		name: r.str('name'),
		author: r.str('author'),
		kind: r.oneOf('kind', APP_KINDS),
		platforms: platforms as AppPlatform[],
		group,
		category: r.raw.category === undefined ? (group ? GROUP_CATEGORY[group] : undefined) : r.oneOf('category', APP_CATEGORIES),
		url: r.url('url'),
		repo: r.raw.repo === undefined ? undefined : r.match('repo', REPO, 'owner/name'),
		desc: r.text('summary'),
		about: r.text('description'),
		image: shot(r.raw.screenshot === undefined ? undefined : r.match('screenshot', SHOT, 'a .webp or .svg file name')),
		icon: iconUrl,
		provisional: readProvisional(r, ['icon', 'screenshot']),
		added: readAdded(r),
	};
};

export const APP_KIND: Kind<App> = { dir: 'apps', schema: '../schema/app.schema.json', dated: true, read: readApp };

export function readAppEntry(json: unknown): App {
	return readEntry(APP_KIND, json);
}

export function readAppFile(name: string, json: unknown): App {
	return readEntryFile(APP_KIND, name, json);
}

// The showcase's default order, the order APPS is in, and the official plugins': by name, naturally; the same name goes by slug.
export function byName(a: { name: string; slug: string }, b: { name: string; slug: string }): number {
	return NATURAL.compare(a.name, b.name) || a.slug.localeCompare(b.slug);
}

// The newest app first, by when it was added; apps added at the same second go by name.
export function byNewest(a: App, b: App): number {
	return (b.added ?? '').localeCompare(a.added ?? '') || byName(a, b);
}

// The apps of data/apps/, keyed by file name, by name in natural order.
export function readApps(files: Record<string, unknown>): App[] {
	return readEntryFiles(APP_KIND, files).sort(byName);
}

// Every file in data/apps/, through Vite (the site's build and the tests both run on it). Vite needs each glob written out, so every category has its own.
export const APPS: readonly App[] = readApps(byFileName(import.meta.glob<unknown>('../data/apps/*.json', { eager: true, import: 'default' })));

// The app's GitHub repository link, unless its homepage is that repository already.
export function appSource(app: { url: string; repo?: string }): string | undefined {
	if (!app.repo) return undefined;
	const src = `https://github.com/${app.repo}`;
	return app.url.replace(/\/+$/, '').toLowerCase() === src.toLowerCase() ? undefined : src;
}

export function appBySlug(slug: string): App | undefined {
	return APPS.find((a) => a.slug === slug);
}

// The author's GitHub profile, only where the data proves the author name is a GitHub login: one of their apps lives in a repository that login owns. Otherwise undefined, since a name such as 'Faizan' is not necessarily a login. The apps are the site's, or the ones a test gives.
export function authorProfile(author: string, apps: readonly Pick<App, 'author' | 'url'>[] = APPS): string | undefined {
	const login = author.toLowerCase();
	const owns = apps.some((a) => a.author === author && new URL(a.url).hostname === 'github.com' && new URL(a.url).pathname.split('/')[1]?.toLowerCase() === login);
	return owns ? `https://github.com/${author}` : undefined;
}

// ---- UI component libraries (data/ui/<slug>.json) ----

export const UI_KEYS = ['theme', 'retro', 'icons'] as const;
export type UiLibKey = (typeof UI_KEYS)[number];

// The kind of NSGo app a UI library, a template or a plugin serves: apps written in Go, apps written in TSX, or both.
export const SURFACES = ['go', 'tsx', 'both'] as const;
export type Surface = (typeof SURFACES)[number];

export interface UiLib {
	slug: string;
	name: string;
	author: string;
	key: UiLibKey;
	// Which kind of app its components go in: Go apps, TSX apps, or both.
	surface: Surface;
	desc: Text;
	repo: string;
	url: string;
	homepage?: string;
	image?: string;
	// The images that stand in until the project gives its own (readProvisional).
	provisional?: ProvisionalImage[];
	added?: string;
}

const readUiLib = (r: Reader): UiLib => {
	r.only(['$schema', 'slug', 'name', 'author', 'tag', 'surface', 'summary', 'repo', 'url', 'homepage', 'screenshot', 'provisional', 'added']);
	return {
		slug: readSlug(r),
		name: r.str('name'),
		author: r.str('author'),
		key: r.oneOf('tag', UI_KEYS),
		surface: r.oneOf('surface', SURFACES),
		desc: r.text('summary'),
		repo: r.match('repo', REPO, 'owner/name'),
		url: r.url('url'),
		homepage: r.optUrl('homepage'),
		image: shot(r.raw.screenshot === undefined ? undefined : r.match('screenshot', SHOT, 'a .webp or .svg file name')),
		provisional: readProvisional(r, ['screenshot']),
		added: readAdded(r),
	};
};

export const UI_KIND: Kind<UiLib> = { dir: 'ui', schema: '../schema/ui.schema.json', dated: true, read: readUiLib };

// The libraries of data/ui/, keyed by file name, the oldest first.
export function readUiLibs(files: Record<string, unknown>): UiLib[] {
	const libs = readEntryFiles(UI_KIND, files).sort(byAdded);
	unique(UI_KIND.dir, libs, 'repo', (l) => l.repo);
	return libs;
}

export const UI_LIBS: readonly UiLib[] = readUiLibs(byFileName(import.meta.glob<unknown>('../data/ui/*.json', { eager: true, import: 'default' })));

// ---- state management (data/state/<slug>.json) ----

export interface StateSolution {
	slug: string;
	name: string;
	author: string;
	desc: Text;
	repo: string;
	url: string;
	homepage?: string;
	install: string;
	tags: readonly string[];
	image?: string;
	// The images that stand in until the project gives its own (readProvisional).
	provisional?: ProvisionalImage[];
	added?: string;
}

const readStateSolution = (r: Reader): StateSolution => {
	r.only(['$schema', 'slug', 'name', 'author', 'summary', 'repo', 'url', 'homepage', 'install', 'tags', 'screenshot', 'provisional', 'added']);
	return {
		slug: readSlug(r),
		name: r.str('name'),
		author: r.str('author'),
		desc: r.text('summary'),
		repo: r.match('repo', REPO, 'owner/name'),
		url: r.url('url'),
		homepage: r.optUrl('homepage'),
		install: r.str('install'),
		tags: r.strings('tags', 1),
		image: shot(r.raw.screenshot === undefined ? undefined : r.match('screenshot', SHOT, 'a .webp or .svg file name')),
		provisional: readProvisional(r, ['screenshot']),
		added: readAdded(r),
	};
};

export const STATE_KIND: Kind<StateSolution> = { dir: 'state', schema: '../schema/state.schema.json', dated: true, read: readStateSolution };

// The solutions of data/state/, keyed by file name, the oldest first.
export function readStateSolutions(files: Record<string, unknown>): StateSolution[] {
	const solutions = readEntryFiles(STATE_KIND, files).sort(byAdded);
	unique(STATE_KIND.dir, solutions, 'repo', (x) => x.repo);
	return solutions;
}

export const STATE_SOLUTIONS: readonly StateSolution[] = readStateSolutions(byFileName(import.meta.glob<unknown>('../data/state/*.json', { eager: true, import: 'default' })));

// ---- templates (data/templates/<slug>.json) ----

// A project that NSGo apps start from: a template repository or a starter, with what it sets up already (a component library, packaging, tests). Not an app: what people use is the app they make from it.
export interface Template {
	slug: string;
	name: string;
	author: string;
	desc: Text;
	repo: string;
	url: string;
	homepage?: string;
	// The language the apps it starts are written in.
	surface: Surface;
	// The command that starts a project from it.
	use: string;
	tags: readonly string[];
	image?: string;
	// The images that stand in until the project gives its own (readProvisional).
	provisional?: ProvisionalImage[];
	added?: string;
}

const readTemplate = (r: Reader): Template => {
	r.only(['$schema', 'slug', 'name', 'author', 'summary', 'repo', 'url', 'homepage', 'surface', 'use', 'tags', 'screenshot', 'provisional', 'added']);
	return {
		slug: readSlug(r),
		name: r.str('name'),
		author: r.str('author'),
		desc: r.text('summary'),
		repo: r.match('repo', REPO, 'owner/name'),
		url: r.url('url'),
		homepage: r.optUrl('homepage'),
		surface: r.oneOf('surface', SURFACES),
		use: r.str('use'),
		tags: r.strings('tags', 1),
		image: shot(r.raw.screenshot === undefined ? undefined : r.match('screenshot', SHOT, 'a .webp or .svg file name')),
		provisional: readProvisional(r, ['screenshot']),
		added: readAdded(r),
	};
};

export const TEMPLATE_KIND: Kind<Template> = { dir: 'templates', schema: '../schema/template.schema.json', dated: true, read: readTemplate };

// The templates of data/templates/, keyed by file name, the oldest first.
export function readTemplates(files: Record<string, unknown>): Template[] {
	const templates = readEntryFiles(TEMPLATE_KIND, files).sort(byAdded);
	unique(TEMPLATE_KIND.dir, templates, 'repo', (x) => x.repo);
	return templates;
}

export const TEMPLATES: readonly Template[] = readTemplates(byFileName(import.meta.glob<unknown>('../data/templates/*.json', { eager: true, import: 'default' })));

// ---- AI tools (data/ai/<slug>.json) ----

// What an AI tool is: an agent skill (a SKILL.md and what it comes with), an MCP server or library, rules for coding agents (AGENTS.md, Cursor rules), or something else that helps an AI build NSGo apps.
export const AI_TOOL_TYPES = ['skill', 'mcp', 'rules', 'other'] as const;
export type AiToolType = (typeof AI_TOOL_TYPES)[number];

// A tool that helps AI coding agents build NSGo apps. Several may live in one repository, as the skills of a collection do, so it is told apart by its link, which may point at its folder.
export interface AiTool {
	slug: string;
	name: string;
	author: string;
	desc: Text;
	repo: string;
	url: string;
	homepage?: string;
	type: AiToolType;
	// The command that installs it.
	install: string;
	tags: readonly string[];
	image?: string;
	// The images that stand in until the project gives its own (readProvisional).
	provisional?: ProvisionalImage[];
	added?: string;
}

const readAiTool = (r: Reader): AiTool => {
	r.only(['$schema', 'slug', 'name', 'author', 'summary', 'repo', 'url', 'homepage', 'type', 'install', 'tags', 'screenshot', 'provisional', 'added']);
	return {
		slug: readSlug(r),
		name: r.str('name'),
		author: r.str('author'),
		desc: r.text('summary'),
		repo: r.match('repo', REPO, 'owner/name'),
		url: r.url('url'),
		homepage: r.optUrl('homepage'),
		type: r.oneOf('type', AI_TOOL_TYPES),
		install: r.str('install'),
		tags: r.strings('tags', 1),
		image: shot(r.raw.screenshot === undefined ? undefined : r.match('screenshot', SHOT, 'a .webp or .svg file name')),
		provisional: readProvisional(r, ['screenshot']),
		added: readAdded(r),
	};
};

export const AI_KIND: Kind<AiTool> = { dir: 'ai', schema: '../schema/ai.schema.json', dated: true, read: readAiTool };

// The AI tools of data/ai/, keyed by file name, the oldest first.
export function readAiTools(files: Record<string, unknown>): AiTool[] {
	const tools = readEntryFiles(AI_KIND, files).sort(byAdded);
	unique(AI_KIND.dir, tools, 'url', (x) => x.url);
	return tools;
}

export const AI_TOOLS: readonly AiTool[] = readAiTools(byFileName(import.meta.glob<unknown>('../data/ai/*.json', { eager: true, import: 'default' })));

// ---- plugins (data/plugins/<slug>.json) ----

export type PluginSurface = Surface;

export interface Plugin {
	slug: string;
	mark: string;
	name: string;
	desc: Text;
	official: boolean;
	// Which kind of app the package serves: Go apps, TSX apps, or both.
	surface: PluginSurface;
	// The Go package the app imports (an official one's starts with NSGO_MODULE/), and an npm package when the plugin comes with one; NSGo's own have none.
	goImport?: string;
	npm?: string;
	tags: readonly string[];
	url: string;
	added?: string;
}

const GO_IMPORT = /^[a-z0-9.-]+(\/[A-Za-z0-9._~-]+)+$/;
const NPM_NAME = /^(@[a-z0-9-]+\/)?[a-z0-9][a-z0-9._-]*$/;

const readPlugin = (r: Reader): Plugin => {
	r.only(['$schema', 'slug', 'name', 'mark', 'official', 'surface', 'import', 'npm', 'tags', 'docs', 'summary', 'added']);
	return {
		slug: readSlug(r),
		name: r.str('name'),
		mark: r.match('mark', /^\S{1,2}$/, 'one or two characters'),
		official: r.bool('official'),
		surface: r.oneOf('surface', SURFACES),
		goImport: r.raw.import === undefined ? undefined : r.match('import', GO_IMPORT, 'a Go import path'),
		npm: r.raw.npm === undefined ? undefined : r.match('npm', NPM_NAME, 'an npm package name'),
		tags: r.strings('tags'),
		url: r.url('docs'),
		desc: r.text('summary'),
		added: readAdded(r),
	};
};

export const PLUGIN_KIND: Kind<Plugin> = { dir: 'plugins', schema: '../schema/plugin.schema.json', dated: true, read: readPlugin };

// The plugins of data/plugins/, keyed by file name: the official ones by name, then the community's, the oldest first.
export function readPlugins(files: Record<string, unknown>): Plugin[] {
	const plugins = readEntryFiles(PLUGIN_KIND, files);
	const official = plugins.filter((p) => p.official).sort(byName);
	return [...official, ...plugins.filter((p) => !p.official).sort(byAdded)];
}

const ALL_PLUGINS: readonly Plugin[] = readPlugins(byFileName(import.meta.glob<unknown>('../data/plugins/*.json', { eager: true, import: 'default' })));

export const PLUGINS: readonly Plugin[] = ALL_PLUGINS.filter((p) => p.official);
export const COMMUNITY_PLUGINS: readonly Plugin[] = ALL_PLUGINS.filter((p) => !p.official);

// What a plugin's card is headed with: an official package's path in NSGo's module (nsgo/base/datatable), a community plugin's slug under plugins/.
export function pluginPath(p: Pick<Plugin, 'slug' | 'official' | 'goImport'>): string {
	return p.official && p.goImport?.startsWith(`${NSGO_MODULE}/`) ? `nsgo/${p.goImport.slice(NSGO_MODULE.length + 1)}` : `plugins/${p.slug}`;
}

// ---- guides (data/docs/<slug>.json) and articles (data/articles/<slug>.json) ----

export interface Doc {
	slug: string;
	title: string;
	// The page's path under DOCS_BASE, such as getting-started or ui/button; the introduction's is empty.
	file: string;
	url: string;
	desc: Text;
}

const DOC_FILE = /^([a-z0-9-]+(\/[a-z0-9-]+)*)?$/;

const readDoc = (r: Reader): Doc => {
	r.only(['$schema', 'slug', 'title', 'file', 'summary']);
	const file = r.raw.file;
	if (typeof file !== 'string' || !DOC_FILE.test(file)) r.fail('file', `must be a docs path such as getting-started or ui/button, or "" for the introduction, got ${JSON.stringify(file)}`);
	return { slug: readSlug(r), title: r.str('title'), file, url: docUrl({ file }), desc: r.text('summary') };
};

// The guides are NSGo's own, so they are not submitted and have no date.
export const DOC_KIND: Kind<Doc> = { dir: 'docs', schema: '../schema/doc.schema.json', dated: false, read: readDoc };

// The guides of data/docs/, keyed by file name, by title.
export function readDocs(files: Record<string, unknown>): Doc[] {
	const docs = readEntryFiles(DOC_KIND, files).sort((a, b) => NATURAL.compare(a.title, b.title) || a.slug.localeCompare(b.slug));
	unique(DOC_KIND.dir, docs, 'url', (d) => d.url);
	return docs;
}

export const DOCS: readonly Doc[] = readDocs(byFileName(import.meta.glob<unknown>('../data/docs/*.json', { eager: true, import: 'default' })));

export interface Article {
	slug: string;
	title: string;
	site: string;
	url: string;
	added?: string;
}

const readArticle = (r: Reader): Article => {
	r.only(['$schema', 'slug', 'title', 'site', 'url', 'added']);
	return { slug: readSlug(r), title: r.str('title'), site: r.str('site'), url: r.url('url'), added: readAdded(r) };
};

export const ARTICLE_KIND: Kind<Article> = { dir: 'articles', schema: '../schema/article.schema.json', dated: true, read: readArticle };

// The articles of data/articles/, keyed by file name, the oldest first.
export function readArticles(files: Record<string, unknown>): Article[] {
	const articles = readEntryFiles(ARTICLE_KIND, files).sort(byAdded);
	unique(ARTICLE_KIND.dir, articles, 'url', (a) => a.url);
	return articles;
}

export const ARTICLES: readonly Article[] = readArticles(byFileName(import.meta.glob<unknown>('../data/articles/*.json', { eager: true, import: 'default' })));

// ---- install commands ----

// nsgo init's three templates (cmd/nsgo/init.go): a Go app, the default; a TSX app; and a TSX app with Go of its own.
export type InstallTab = 'go' | 'tsx' | 'mixed';

export const INSTALL_TABS: readonly { key: InstallTab; label: string }[] = [
	{ key: 'go', label: 'go' },
	{ key: 'tsx', label: 'tsx' },
	{ key: 'mixed', label: 'mixed' },
];

// -module makes init write the app's go.mod and print the go get steps that add NSGo and its tool; without it the app has no module and go tool nsgo dev cannot run.
export const INSTALL_CMDS: Record<InstallTab, string> = {
	go: `go run ${NSGO_MODULE}/cmd/nsgo@latest init -module example.com/my-app my-app`,
	tsx: `go run ${NSGO_MODULE}/cmd/nsgo@latest init -template tsx -module example.com/my-app my-app`,
	mixed: `go run ${NSGO_MODULE}/cmd/nsgo@latest init -template mixed -module example.com/my-app my-app`,
};

// The nsgo CLI as a project's tool: added to its go.mod once, then run with go tool.
export const CLI_CMDS = [`go get -tool ${NSGO_MODULE}/cmd/nsgo`, 'go tool nsgo doctor'] as const;

export function hostOf(url: string): string {
	return url.replace('https://', '').replace(/\/$/, '');
}

export function pad2(n: number): string {
	return (n < 10 ? '0' : '') + n;
}
