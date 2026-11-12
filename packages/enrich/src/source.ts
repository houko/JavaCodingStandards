// What can be learned about a submitted entry from the catalog files and the project's repository, without touching the network: pure functions, so they are tested on their own.

// What an entry is, for its copy: an app, which also has a description besides the one-line summary, or an entry of another category the submission bot files. Articles have no copy to complete.
export type EntryKind = 'app' | 'ui' | 'state' | 'template' | 'ai' | 'plugin';

// The directory under the catalog's data that holds each kind's files, one per entry, named after its slug.
export const ENTRY_DIRS: Record<EntryKind, string> = { app: 'apps', ui: 'ui', state: 'state', template: 'templates', ai: 'ai', plugin: 'plugins' };

// What each kind is, for the model writing its copy.
export const KIND_NAMES: Record<EntryKind, string> = { app: 'an app in the showcase', ui: 'a UI component library, theme or icon set', state: 'a state management library', template: 'a template that NSGo apps start from', ai: 'an AI tool for building NSGo apps (an agent skill, an MCP server or rules for coding agents)', plugin: 'an NSGo plugin, a Go package that adds components or a capability to NSGo apps' };

// The files in head that base does not have: the entries a branch adds to a directory.
export function addedFiles(base: readonly string[], head: readonly string[]): string[] {
	const known = new Set(base);
	return head.filter((name) => name.endsWith('.json') && !known.has(name)).sort();
}

// The entry files both the base branch and the branch have, which the copy reads as examples of the site's voice: only JSON files, as a directory may hold others, such as the .gitkeep of a category with no entry yet, which is empty and no entry.
export function knownFiles(base: readonly string[], head: readonly string[]): string[] {
	return base.filter((name) => name.endsWith('.json') && head.includes(name));
}

export type Entry = Record<string, unknown>;

// owner/name of the entry's GitHub repository: its `repo` field, or else its link when that is a repository.
export function repoOfEntry(entry: Entry): string | undefined {
	if (typeof entry.repo === 'string' && /^[\w.-]+\/[\w.-]+$/.test(entry.repo)) return entry.repo;
	for (const key of ['url', 'docs']) {
		const v = entry[key];
		if (typeof v !== 'string') continue;
		const m = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/#?]|$)/.exec(v.trim());
		if (m) return `${m[1]}/${m[2]}`;
	}
	return undefined;
}

// The project's own nsgo.yaml among the repository's paths, the file NSGo's CLI reads beside an app's main package (cmd/nsgo/project.go), and the only name it reads. The shallowest one outside dependencies and examples, so an app kept under cmd/app/ is found while a vendored copy of NSGo's examples is not.
export function pickNsgoConfig(paths: readonly string[]): string | undefined {
	const skip = /(^|\/)(node_modules|vendor|examples?|testdata|third_party)\//;
	const found = paths.filter((p) => (p === 'nsgo.yaml' || p.endsWith('/nsgo.yaml')) && !skip.test(p));
	found.sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
	return found[0];
}

// A path relative to a file in the repository, as a path from the repository root; undefined when it leaves the repository.
export function joinRepoPath(fromFile: string, rel: string): string | undefined {
	const parts = fromFile.split('/').slice(0, -1);
	for (const seg of rel.replace(/^\.\//, '').split('/')) {
		if (seg === '' || seg === '.') continue;
		if (seg === '..') {
			if (!parts.length) return undefined;
			parts.pop();
		} else parts.push(seg);
	}
	return parts.join('/');
}

export type IconSource = { path: string } | { macOnly: string } | undefined;

// What nsgo.yaml's icon field holds (the icons struct in cmd/nsgo/project.go): apple, an Icon Composer .icon or an .icns for Apple's targets, and png, a square PNG for every other target.
function iconFields(nsgo: unknown): { apple?: string; png?: string } {
	const icon = (nsgo as { icon?: unknown } | null | undefined)?.icon;
	if (!icon || typeof icon !== 'object') return {};
	const { apple, png } = icon as { apple?: unknown; png?: unknown };
	const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
	return { apple: text(apple), png: text(png) };
}

// The app's icon as NSGo builds it (resolveIcons in cmd/nsgo/icon.go): nsgo.yaml's icon.png, relative to nsgo.yaml's directory, or else assets/Icon.png beside nsgo.yaml when it exists. An app whose only icon is for Apple's targets (icon.apple, or assets/AppIcon.icon, an Icon Composer folder, or assets/AppIcon.icns) has one of its own that cannot be converted here: { macOnly } names it. undefined when the app has no icon at all, as `nsgo init` writes none.
export function iconOf(configPath: string, nsgo: unknown, paths: readonly string[]): IconSource {
	const { apple, png } = iconFields(nsgo);
	if (png) {
		const path = joinRepoPath(configPath, png);
		if (path && /\.(png|jpe?g|webp)$/i.test(path)) return { path };
	}
	const fallback = joinRepoPath(configPath, 'assets/Icon.png');
	if (fallback !== undefined && paths.includes(fallback)) return { path: fallback };
	if (apple) return { macOnly: joinRepoPath(configPath, apple) ?? apple };
	const bundle = joinRepoPath(configPath, 'assets/AppIcon.icon');
	if (bundle !== undefined && paths.some((p) => p.startsWith(`${bundle}/`))) return { macOnly: bundle };
	const icns = joinRepoPath(configPath, 'assets/AppIcon.icns');
	if (icns !== undefined && paths.includes(icns)) return { macOnly: icns };
	return undefined;
}

// The app's kind, from the files beside its nsgo.yaml: tsx when a TSX file other than a test sits there, as App.tsx does in an app `nsgo init -template tsx` or `-template mixed` makes, whose main package compiles it (github.com/oneo-me/nsgo/tsx/compiler); go otherwise.
export function appKindOf(configPath: string, paths: readonly string[]): 'go' | 'tsx' {
	const dir = configPath.includes('/') ? configPath.slice(0, configPath.lastIndexOf('/') + 1) : '';
	const tsx = paths.some((p) => p.startsWith(dir) && !p.slice(dir.length).includes('/') && /\.tsx$/i.test(p) && !/\.test\.tsx$/i.test(p));
	return tsx ? 'tsx' : 'go';
}

// The platforms of APP_PLATFORMS each of NSGo's build targets (cmd/nsgo/build.go) runs on. all is every target a Mac with Go and Xcode builds, which leaves out the mini programs; tvOS and watchOS have no platform on the site and are left out, and so is ios_simulator, a package for Xcode's simulator that no one installs on an iPhone.
const TARGET_PLATFORMS: [RegExp, readonly (typeof APP_PLATFORMS)[number][]][] = [
	[/^all$/, ['mac', 'win', 'linux', 'ios', 'android', 'web']],
	[/^macos_/, ['mac']],
	[/^windows_/, ['win']],
	[/^linux_/, ['linux']],
	[/^ios$/, ['ios']],
	[/^android_/, ['android']],
	[/^web$/, ['web']],
	[/^miniprogram(_\w+)?$/, ['miniprogram']],
];

// The build.targets nsgo init writes into every new app's nsgo.yaml (cmd/nsgo/init.go): an app that still lists exactly these never chose its platforms, so they say nothing of what it ships for.
const INIT_TARGETS = ['macos_arm64', 'windows_x64', 'ios_simulator', 'android_arm64', 'web'];

// The platforms an app builds for, from its nsgo.yaml's build.targets, in APP_PLATFORMS order; undefined when nsgo.yaml lists no target that maps to one, or still lists the ones nsgo init wrote, in any order.
export function platformsFromConfig(nsgo: unknown): string[] | undefined {
	const targets = (nsgo as { build?: { targets?: unknown } } | null | undefined)?.build?.targets;
	if (!Array.isArray(targets)) return undefined;
	const named = new Set(targets.filter((t): t is string => typeof t === 'string').map((t) => t.trim().toLowerCase()));
	if (named.size === INIT_TARGETS.length && INIT_TARGETS.every((t) => named.has(t))) return undefined;
	const found = new Set<string>();
	for (const t of targets) {
		if (typeof t !== 'string') continue;
		for (const [pattern, platforms] of TARGET_PLATFORMS) if (pattern.test(t.trim().toLowerCase())) for (const p of platforms) found.add(p);
	}
	const out = APP_PLATFORMS.filter((p) => found.has(p));
	return out.length ? out : undefined;
}

// The app's icon files in a repository with no nsgo.yaml to name one (exodrive builds its window from cmd/exodrive-gui/ with no nsgo.yaml), best first: an icon.png (NSGo's assets/Icon.png), appicon.png or icon-256.png at the root or in a folder of assets, largest first by the size in its name, and one with no size taken as large. Copies of other projects, examples and tests are passed over.
export function repoIcons(paths: readonly string[]): string[] {
	const name = /^(?:app[-_]?)?icon(?:[-_](\d+)(?:x\d+)?)?\.(?:png|jpe?g|webp)$/i;
	const folder = /^(?:assets|resources|build|icons?|images?|img|static|public|res)$/i;
	const foreign = /(^|\/)(node_modules|third_party|vendor|examples?|testdata|tests?)\//i;
	const size = (p: string) => Number(name.exec(p.split('/').pop() ?? '')?.[1] ?? 1024);
	return paths
		.filter((p) => {
			const parts = p.split('/');
			const file = parts.pop() ?? '';
			return name.test(file) && !foreign.test(p) && parts.every((d) => folder.test(d) || /^(?:app|desktop|nsgo|src)$/i.test(d));
		})
		.sort((a, b) => size(b) - size(a) || a.split('/').length - b.split('/').length || a.localeCompare(b));
}

// Where to cut an icon, from ImageMagick's box (%@, "WxH+X+Y") around its mostly opaque pixels: a macOS icon's plate inside its transparent margins. An icon with no transparency at all gives an empty box (0x0), and is kept whole, as is one whose box cannot be read. side is the square the icon is centred on.
export function iconCut(box: string, width: number, height: number): { crop?: string; side: number } {
	const m = /^(\d+)x(\d+)\+(\d+)\+(\d+)$/.exec(box.trim());
	const [w, h] = m ? [Number(m[1]), Number(m[2])] : [0, 0];
	return w > 0 && h > 0 ? { crop: box.trim(), side: Math.max(w, h) } : { side: Math.max(width, height) };
}

// Whether an image's width and height are close enough to make it square: an app icon or a logo, not a screenshot of a window or a phone screen.
export function isSquarish(width: number, height: number): boolean {
	return width > 0 && height > 0 && Math.max(width, height) / Math.min(width, height) < 1.15;
}

// Whether an image is far wider than a window, as a banner or a row of links is (LunaBox's QQ group strip is 720×240); a desktop window rarely runs past 2.4 to 1.
export function isBanner(width: number, height: number): boolean {
	return width > 0 && height > 0 && width / height > 2.4;
}

// Whether an image is far taller than a phone screen, as a capture of a whole scrolled page is; a phone's screen runs to about 2.2 to 1 (19.5:9), so a portrait screenshot of an NSGo app on iOS or Android is not one.
export function isTall(width: number, height: number): boolean {
	return width > 0 && height > 0 && height / width > 2.4;
}

// ---- screenshots ----

// A file of a repository's branch as raw.githubusercontent.com serves it.
export const rawUrl = (repo: string, branch: string, path: string) => `https://raw.githubusercontent.com/${repo}/${branch}/${path.split('/').map(encodeURIComponent).join('/')}`;

// The narrowest image taken as a screenshot: of a desktop window, or of a phone screen at its full resolution.
export const SHOT_MIN_WIDTH = 600;

export type ShotProblem = 'narrow' | 'square' | 'tall' | 'banner';

// Why an image of this size is not a screenshot of an app, or undefined when it can be one: under SHOT_MIN_WIDTH wide, square (an icon or a logo), far taller than a phone screen (a whole scrolled page), or a banner. A portrait screenshot is one, as NSGo apps run on phones. The submission workflow, the site's form and its Worker all judge by this.
export function shotProblem(width: number, height: number): ShotProblem | undefined {
	if (width < SHOT_MIN_WIDTH) return 'narrow';
	if (isSquarish(width, height)) return 'square';
	if (isTall(width, height)) return 'tall';
	if (isBanner(width, height)) return 'banner';
	return undefined;
}

// What an image the form takes may be: a PNG, JPEG or WebP of at most this many bytes.
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

// Where the site's bot puts a screenshot a visitor uploaded with the form, on the pull request's branch: the submission workflow turns it into the site's WebP in apps/web/public/shots and removes it.
export const STAGED_SHOTS = 'submissions';
export const stagedShot = (slug: string, format: 'png' | 'jpeg' | 'webp') => `${STAGED_SHOTS}/${slug}.${format === 'jpeg' ? 'jpg' : format}`;

// The staged screenshot of slug among the files of STAGED_SHOTS, if there is one.
export function stagedShotOf(files: readonly string[], slug: string): string | undefined {
	const file = files.find((f) => new RegExp(`^${slug.replace(/[^a-z0-9-]/g, '')}\\.(png|jpg|webp)$`).test(f));
	return file ? `${STAGED_SHOTS}/${file}` : undefined;
}

// Where a repository's screenshots may be, in the order they are tried, each source with how many of its images are tried: the README's images, as the project picked them to show itself, then the images in its screenshot folders, which a project with none in its README often keeps for its website. An image is listed once; the caller passes over those named as artwork (isArtwork).
export function repoShotSources(r: { repo: string; branch: string; paths: readonly string[]; readme?: { path: string; text: string } }): { from: string; urls: string[]; tries: number }[] {
	const seen = new Set<string>();
	const keep = (u: string | undefined): u is string => !!u && !seen.has(u) && !!seen.add(u);
	return [
		{ from: 'the README', urls: r.readme ? readmeImages(r.readme.text).map((src) => resolveImage(src, r.repo, r.branch, (r.readme as { path: string }).path)).filter(keep) : [], tries: 8 },
		{ from: 'a screenshot folder in the repository', urls: repoScreenshots(r.paths).map((p) => rawUrl(r.repo, r.branch, p)).filter(keep), tries: 6 },
		{ from: 'another likely screenshot file in the repository', urls: repoLikelyScreenshots(r.paths).map((p) => rawUrl(r.repo, r.branch, p)).filter(keep), tries: 12 },
	];
}

// The screenshot link a visitor gave in the site's form, from the pull request the bot opened: submissionBody in packages/catalog writes it as <!-- submitted-screenshot: URL --> on a line of its own. Only such a line counts, so a marker inside the entry's JSON above it, where every line starts with a space or a brace, is not taken for the visitor's link. Lines are split at \n only: a regular expression's multiline mode also starts a line after U+2028, which JSON.stringify leaves as it is in a string. The link is checked again with the form's rule (https, no space, quote, backtick or angle bracket), as the body could have been edited since.
export function submittedScreenshot(body: string | null | undefined): string | undefined {
	const url = (body ?? '')
		.split(/\r?\n/)
		.map((line) => /^<!-- submitted-screenshot: (\S+) -->$/.exec(line)?.[1])
		.find((u) => u !== undefined);
	return url && url.length <= 300 && /^https:\/\/[^\s<>"'`]+$/.test(url) ? url : undefined;
}

// Images in the repository's screenshot folders (screenshots/, screenshot/, screens/ or shots/, at any depth), for an app whose README shows none that fits: a project often keeps them for its website instead (popMind's are in website/public/shots/en/). Folders for English come first where there are folders per language, then the rest in path order.
export function repoScreenshots(paths: readonly string[]): string[] {
	const inFolder = /(^|\/)(screenshots?|screens|shots)\//i;
	const image = /\.(png|jpe?g|webp|gif)$/i;
	const english = (p: string) => (/\/en(-[a-z]+)?\//i.test(p) ? 0 : 1);
	return paths.filter((p) => inFolder.test(p) && image.test(p) && !p.includes('node_modules/')).sort((a, b) => english(a) - english(b) || a.localeCompare(b));
}

// Likely window images outside a folder literally called screenshots. Many projects keep them under docs/assets, a website's public directory or UI baseline fixtures and call them preview, demo, overview, dashboard or similar. The name must say what the image is likely to show, and branding and small UI assets are excluded; dimensions are still checked by firstShot before one is used.
export function repoLikelyScreenshots(paths: readonly string[]): string[] {
	const image = /\.(png|jpe?g|webp|gif)$/i;
	const skipFolder = /(^|\/)(node_modules|vendor|third_party|dist|build)(\/|$)/i;
	const branding = /(^|[-_.\/])(icons?|logos?|favicons?|badges?|avatars?|emojis?|flags?|brands?|banners?|heroes?|covers?|splash|social|og[-_.]?images?|backdrops?|backgrounds?|wallpapers?|tray|marks?)([-_.\/]|$)/i;
	const likely = /(^|[-_.])(screenshots?|screen[-_.]?shots?|previews?|demos?|showcases?|windows?|overviews?|dashboards?|galleries?|interfaces?|pages?|modes?|activities?|pictures?|settings|home|main|ui)([-_.0-9]|$)/i;
	const english = (p: string) => (/\/en(-[a-z]+)?\//i.test(p) ? 0 : 1);
	// Prefer a complete window or dashboard over the small icon and menu-bar previews that design repositories often keep by the dozen. Dimensions are unknown until download, so a useful name gets the first attempts.
	const preferred = [/screens?hot/i, /window/i, /dashboard/i, /\bmain\b/i, /\bhome\b/i, /settings/i, /overview/i, /interface/i, /showcase/i, /demo/i, /preview/i, /pages?/i, /gallery/i, /activities?/i, /modes?/i, /pictures?/i, /(^|[-_.])ui([-_.0-9]|$)/i];
	const rank = (p: string) => {
		const file = p.slice(p.lastIndexOf('/') + 1);
		const found = preferred.findIndex((pattern) => pattern.test(file));
		return found < 0 ? preferred.length : found;
	};
	return paths
		.filter((p) => image.test(p) && !skipFolder.test(p) && !branding.test(p) && likely.test(p.slice(p.lastIndexOf('/') + 1)))
		.sort((a, b) => rank(a) - rank(b) || english(a) - english(b) || a.localeCompare(b));
}

// The values a field may take in one of the catalog's schemas (properties.<field>.enum), such as an app's categories in app.schema.json.
export function schemaEnum(schema: unknown, field: string): string[] {
	const values = (schema as { properties?: Record<string, { enum?: unknown } | undefined> })?.properties?.[field]?.enum;
	return Array.isArray(values) ? values.filter((v): v is string => typeof v === 'string') : [];
}

// A field the model picks from the values its schema allows.
export type ChoiceField = 'category' | 'group' | 'tag' | 'surface' | 'type';

// What the values of each field mean, for the model picking one; the same words as the discover workflow's triage.
export const CHOICE_HINTS: Record<ChoiceField, string> = {
	category: 'the one that best says what the app is for',
	group: "the showcase's group that best says what the app is for: agents for tools for AI coding agents (terminals and workspaces for them, their usage, quotas and skills); dev for other developer tools (Git, editors, terminals, SSH, databases, API clients, cloud storage); ai for AI assistants (chat clients, writing, translation, voice input, local models); network for proxy and VPN clients; notes for notes, documents and reading (Markdown, PDF, OCR, RSS); system for system and file utilities (cleaning, files, clipboard, screenshots, remote desktop, menu bar tools); devices for hardware and the smart home (chargers, monitors, peripherals, Home Assistant); media for music, video, audio and images; game for games and their launchers; chat for messaging, mail and notifications",
	tag: 'theme for a component library or theme, retro for one in a retro style, icons for an icon set',
	surface: 'go when it is for NSGo apps written in Go (Go components or packages, or a template that starts a Go app); tsx when it is for apps written in TSX (components for TSX, or a template that starts a TSX app); both when it serves each, as a template of the mixed kind does',
	type: 'skill for an agent skill (a SKILL.md), mcp for an MCP server or library, rules for instructions for coding agents (AGENTS.md, Cursor rules), other for anything else',
};

// The platforms an app may list, in the order the catalog keeps them (APP_PLATFORMS in packages/catalog): NSGo's targets as the site names them. The discover workflow writes none, which the catalog's check rejects.
export const APP_PLATFORMS = ['mac', 'win', 'linux', 'ios', 'android', 'web', 'miniprogram'] as const;

// The platforms the site's form writes without asking which an app runs on, the three desktops (DEFAULT_PLATFORMS in packages/catalog's entry.ts, which this package cannot import).
export const FORM_PLATFORMS = ['mac', 'win', 'linux'] as const;

// Whether the entry's platforms still hold what the form writes without asking (FORM_PLATFORMS), or are missing, as in an entry the discover workflow adds.
export function platformsAtDefault(entry: Entry): boolean {
	const list = entry.platforms;
	if (list === undefined) return true;
	return Array.isArray(list) && list.length === FORM_PLATFORMS.length && FORM_PLATFORMS.every((p) => list.includes(p));
}

// What the model picks along with the copy: the fields the site's form fills in without asking (buildEntry in packages/catalog), as long as they still hold its default. An app's showcase group, which the form leaves out unless its author picked one (its schema.org category then follows from the group), and its platforms, which the form sets to the three desktops (platformsAtDefault); a UI library's tag and surface, which it sets to theme and both; a template's surface, which it sets to both; an AI tool's type, which it sets to skill; a plugin's surface, which it sets to go; and the tags of a state management library (just state), a template (just template), an AI tool (just ai) and a plugin (none). An entry the discover workflow adds was triaged with these already, and one still at the default is only picked again.
export function formDefaults(kind: EntryKind, entry: Entry): { choices: ChoiceField[]; tags: boolean; platforms: boolean } {
	const tags = Array.isArray(entry.tags) ? entry.tags : [];
	const at = (field: ChoiceField, def?: string) => (entry[field] === undefined || entry[field] === def ? [field] : []);
	switch (kind) {
		case 'app':
			return { choices: at('group'), tags: false, platforms: platformsAtDefault(entry) };
		case 'ui':
			return { choices: [...at('tag', 'theme'), ...at('surface', 'both')], tags: false, platforms: false };
		case 'state':
			return { choices: [], tags: tags.length === 0 || (tags.length === 1 && tags[0] === 'state'), platforms: false };
		case 'template':
			return { choices: at('surface', 'both'), tags: tags.length === 0 || (tags.length === 1 && tags[0] === 'template'), platforms: false };
		case 'ai':
			return { choices: at('type', 'skill'), tags: tags.length === 0 || (tags.length === 1 && tags[0] === 'ai'), platforms: false };
		case 'plugin':
			return { choices: at('surface', 'go'), tags: tags.length === 0, platforms: false };
	}
}

// The platforms the model gave, as the catalog keeps them: only those of APP_PLATFORMS, each once, in its order; empty when it gave none of them.
export function cleanPlatforms(platforms: readonly string[]): string[] {
	const given = new Set(platforms.map((p) => p.trim().toLowerCase()));
	return APP_PLATFORMS.filter((p) => given.has(p));
}

// Sets the app's platforms in place, right after its kind as the form writes them, since the entry is written back in its key order.
export function setPlatforms(entry: Entry, platforms: readonly string[]): void {
	const fields = Object.entries(entry).filter(([k]) => k !== 'platforms');
	for (const k of Object.keys(entry)) delete entry[k];
	for (const [k, v] of fields) {
		entry[k] = v;
		if (k === 'kind') entry.platforms = [...platforms];
	}
	if (!('platforms' in entry)) entry.platforms = [...platforms];
}

// Up to four tags as the site keeps them: lowercase words, each once.
export function cleanTags(tags: readonly string[]): string[] {
	return [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 4);
}

// The homepage a repository's settings give, as an entry's homepage: an https link that is not the repository itself.
export function homepageOf(homepage: string | null | undefined, repo: string): string | undefined {
	const h = homepage?.trim();
	if (!h?.startsWith('https://')) return undefined;
	try {
		const u = new URL(h);
		if (u.hostname === 'github.com' && u.pathname.replace(/\/+$/, '').toLowerCase() === `/${repo.toLowerCase()}`) return undefined;
	} catch {
		return undefined;
	}
	return h;
}

// Records that one of the entry's images stands in until the project gives its own (the catalog's provisional field), in a fixed order, once.
export function markProvisional(entry: Entry, image: 'icon' | 'screenshot'): void {
	const list = Array.isArray(entry.provisional) ? (entry.provisional as string[]) : [];
	entry.provisional = [...new Set([...list, image])].sort();
}

// Sets the entry's group in place, right after its category or else its kind, as in the files written by hand, since the entry is written back in its key order.
export function setGroup(entry: Entry, group: string): void {
	const after = 'category' in entry ? 'category' : 'kind';
	const fields = Object.entries(entry).filter(([k]) => k !== 'group');
	for (const k of Object.keys(entry)) delete entry[k];
	for (const [k, v] of fields) {
		entry[k] = v;
		if (k === after) entry.group = group;
	}
	if (!('group' in entry)) entry.group = group;
}

// Sets the entry's category in place, right after kind as in the files written by hand, since the entry is written back in its key order.
export function setCategory(entry: Entry, category: string): void {
	const fields = Object.entries(entry).filter(([k]) => k !== 'category');
	for (const k of Object.keys(entry)) delete entry[k];
	for (const [k, v] of fields) {
		entry[k] = v;
		if (k === 'kind') entry.category = category;
	}
	if (!('category' in entry)) entry.category = category;
}

export const SITE_LANGS = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko'] as const;

// Whether a text field has a non-empty string in every site language, as one written by hand or completed before does.
export function hasAllLanguages(text: unknown): boolean {
	if (!text || typeof text !== 'object') return false;
	const t = text as Record<string, unknown>;
	return SITE_LANGS.every((l) => typeof t[l] === 'string' && (t[l] as string).trim() !== '');
}

export type Caps = Partial<Record<(typeof SITE_LANGS)[number], number>>;

// The longest text each language has in a field of the example entries: the length new copy should keep within, as hand-written entries set it.
export function lengthCaps(examples: readonly Entry[], field: 'summary' | 'description'): Caps {
	const caps: Caps = {};
	for (const e of examples) {
		const t = e[field] as Record<string, unknown> | undefined;
		for (const l of SITE_LANGS) {
			const v = t?.[l];
			if (typeof v === 'string') caps[l] = Math.max(caps[l] ?? 0, [...v].length);
		}
	}
	return caps;
}

// The languages in which text runs more than a tenth past its cap, as "en 580/405".
export function overCaps(text: Record<string, string>, caps: Caps): string[] {
	return SITE_LANGS.flatMap((l) => {
		const cap = caps[l];
		const len = typeof text[l] === 'string' ? [...text[l]].length : 0;
		return cap && len > cap * 1.1 ? [`${l} ${len}/${cap}`] : [];
	});
}

// The app's name as its nsgo.yaml spells it, when the submitted name is the same word in other letter case: the form offers the repository's name (myskills), while the app calls itself MySkills. A name the visitor chose differently is kept, and so is any name when the configuration's is all lower case, which is more often the executable's name than how the app writes itself (collate, where its README and site say Collate).
export function appNameFrom(submitted: string, nsgo: unknown): string | undefined {
	const name = (nsgo as { name?: unknown } | null)?.name;
	if (typeof name !== 'string' || name === submitted || name === name.toLowerCase()) return undefined;
	return name.trim().toLowerCase() === submitted.trim().toLowerCase() ? name.trim() : undefined;
}

// Image sources in a README, in the order they appear: Markdown images and HTML <img> tags.
export function readmeImages(md: string): string[] {
	const out: { at: number; src: string }[] = [];
	for (const m of md.matchAll(/!\[[^\]\n]*\]\(\s*(?:<([^>\n]+)>|([^)\s]+))(?:\s+"[^"\n]*")?\s*\)/g)) out.push({ at: m.index, src: m[1] ?? m[2] });
	for (const m of md.matchAll(/<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)) out.push({ at: m.index, src: m[1] });
	return out.sort((a, b) => a.at - b.at).map((x) => x.src);
}

// Badges and other images that are never a screenshot of the app.
const NOT_A_SHOT = /(^|\.)(img\.shields\.io|badge\.fury\.io|badgen\.net|codecov\.io|goreportcard\.com|pkg\.go\.dev|deepwiki\.com)$/;

// Whether an image's path says it is not a screenshot of the app: a hero image, banner, cover, logo or social preview, which a README often puts first (LunaBox's screenshot/hero.png), a file under a branding, icon or design-reference directory, or a link to a community, a sponsor page or a QR code.
export function isArtwork(url: string): boolean {
	const parts = url.split(/[?#]/)[0].toLowerCase().split('/').filter(Boolean);
	const file = parts.pop() ?? '';
	const words = file.replace(/\.[a-z0-9]+$/, '').split(/[-_.\s]+/);
	const art = ['hero', 'banner', 'cover', 'logo', 'og', 'social', 'community', 'qq', 'telegram', 'discord', 'wechat', 'weixin', 'sponsor', 'sponsors', 'donate', 'qr', 'qrcode', 'badge'];
	const artFolders = /(^|[-_.])(?:brand(?:ing)?|icons?|logos?|badges?|avatars?|social|references?)([-_.]|$)/;
	return parts.some((part) => artFolders.test(part)) || words.some((w) => art.includes(w));
}

// Where to download a README image from: a link inside the repository becomes its raw file on the default branch, a link elsewhere is kept as long as it is https. SVGs, badges and workflow status images are skipped.
export function resolveImage(src: string, repo: string, branch: string, readmePath: string): string | undefined {
	const s = src.trim();
	if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !s.startsWith('https://')) return undefined;
	if (/\.svg(?:[?#]|$)/i.test(s) || /\/badge(\.svg)?(?:[?#]|$)/i.test(s)) return undefined;
	if (s.startsWith('https://')) {
		const url = new URL(s);
		if (NOT_A_SHOT.test(url.hostname)) return undefined;
		// github.com/<owner>/<name>/blob/<ref>/<path> is an HTML page; its raw file is what can be downloaded.
		const blob = /^\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/.exec(url.pathname);
		if (url.hostname === 'github.com' && blob) return `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}`;
		return url.href;
	}
	if (s.startsWith('//') || s.startsWith('#')) return undefined;
	const rel = s.split(/[?#]/)[0];
	const path = rel.startsWith('/') ? rel.slice(1) : joinRepoPath(readmePath, rel);
	return path ? `https://raw.githubusercontent.com/${repo}/${branch}/${path.split('/').map(encodeURIComponent).join('/')}` : undefined;
}

// The image format from a file's first bytes. Only these formats are handed to ImageMagick, whatever the server or the file name claims. A GIF is read at its first frame, so a project's animated UI demo can supply a still screenshot.
export function sniffImage(bytes: Uint8Array): 'png' | 'jpeg' | 'webp' | 'gif' | undefined {
	const at = (i: number, ...b: number[]) => b.every((x, j) => bytes[i + j] === x);
	if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'png';
	if (at(0, 0xff, 0xd8, 0xff)) return 'jpeg';
	if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'webp';
	if (at(0, 0x47, 0x49, 0x46, 0x38) && (at(4, 0x37, 0x61) || at(4, 0x39, 0x61))) return 'gif';
	return undefined;
}
