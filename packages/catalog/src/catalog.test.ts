import { describe, expect, it } from 'vitest';
import appSchema from '../data/schema/app.schema.json';
import articleSchema from '../data/schema/article.schema.json';
import docSchema from '../data/schema/doc.schema.json';
import pluginSchema from '../data/schema/plugin.schema.json';
import scoresSchema from '../data/schema/scores.schema.json';
import stateSchema from '../data/schema/state.schema.json';
import templateSchema from '../data/schema/template.schema.json';
import aiSchema from '../data/schema/ai.schema.json';
import uiSchema from '../data/schema/ui.schema.json';
import scoresFile from '../data/scores.json';
import { AI_KIND, AI_TOOL_TYPES, AI_TOOLS, AILOGO_CDN, APP_CATEGORIES, APP_GROUPS, APP_KIND, APP_KINDS, APP_PLATFORMS, APPS, CLI_CMDS, DOCS_BASE, INSTALL_CMDS, INSTALL_TABS, NSGO_MODULE, ARTICLE_KIND, DOC_KIND, ENTRY_GROUPS, type EntryGroup, GROUP_CATEGORY, PLUGIN_KIND, STATE_KIND, TEMPLATE_KIND, TEMPLATES, UI_KIND, appGroup, appSource, ARTICLES, COMMUNITY_PLUGINS, DOCS, PLUGINS, STATE_SOLUTIONS, UI_LIBS, appBySlug, authorProfile, byAdded, byName, byNewest, hostOf, readAppEntry, readAppFile, readApps, readEntry, readDocs, readEntryFile, readAiTools, readPlugins, readTemplates, readUiLibs, docUrl, pluginPath } from './catalog';
import { AGENT_FIELDS, AGENT_INPUT_SCHEMA, AGENT_MAX_BYTES, type AgentSubmission, DEFAULT_PLATFORMS, ENTRY_PLACEHOLDERS, MAX_SUBMISSION, SUBMIT_CATS, SUBMIT_KINDS, type SubmitCat, agentSubmissionReport, alreadyListed, buildEntry, codeFence, descMax, editUrl, entryCats, entryFileText, entryPath, entryProblem, guessFromLink, isBadShot, isBadUrl, isEntryComplete, issueMarker, issueUrl, jsonEntry, missingFields, parseEntryJson, parseSubmission, pastedEntryProblem, pastedName, pastedShotRepo, placeholderProblem, readAgentSubmission, shotRepo, slugify, submissionBody, submissionFromIssue, submittedIssue, takesShot, withScheme } from './entry';
import { LANGS, type LangCode, type Text, fill, langRedirectScript, negotiateLang, pick, validateRootSearch } from './lang';
import { buildSearchIndex, searchCatalog } from './search';
import { LIKE_KEYS, likeKey } from './likes';
import { ACTIVITY_WEEKS, type ScoreSignals, scoreKey, scoreOf, scoreTarget } from './score';
import { type EntryScore, HAS_SCORES, SCORE_FIELDS, SCORE_TARGETS, SCORES_AS_OF, compareByScore, compareScores, entryScore, entrySignals, readScores, scoreRank, scoresFor } from './scores';
import { LOCALES } from './strings';
import { appDescription, t } from './translate';
import { CatalogError, Reader, unique } from './validate';

// The tests run on Node 24; this package has no Node type definitions, so the one function needed is declared here.
declare const process: { getBuiltinModule(id: 'node:fs'): { existsSync(path: URL): boolean } };
const { existsSync } = process.getBuiltinModule('node:fs');

const PUBLIC = new URL('../../../apps/web/public/', import.meta.url);
type ItemSchema = { $id: string; required: string[]; properties: Record<string, unknown> };
const APP_SCHEMA = appSchema as unknown as ItemSchema & { properties: { category: { enum: string[] }; group: { enum: string[] } } };
// Each category's files and the schema they point at.
const KINDS = [
	[APP_KIND, appSchema],
	[UI_KIND, uiSchema],
	[STATE_KIND, stateSchema],
	[TEMPLATE_KIND, templateSchema],
	[AI_KIND, aiSchema],
	[PLUGIN_KIND, pluginSchema],
	[ARTICLE_KIND, articleSchema],
	[DOC_KIND, docSchema],
] as unknown as [typeof APP_KIND, ItemSchema][];
const SCHEMA_OF: Record<SubmitCat, ItemSchema> = { showcase: APP_SCHEMA, ui: uiSchema, state: stateSchema, template: templateSchema, ai: aiSchema, plugin: pluginSchema, article: articleSchema } as unknown as Record<SubmitCat, ItemSchema>;
const texts = (): Text[] => [...APPS.flatMap((a) => [a.desc, a.about]), ...UI_LIBS.map((l) => l.desc), ...STATE_SOLUTIONS.map((s) => s.desc), ...TEMPLATES.map((x) => x.desc), ...AI_TOOLS.map((x) => x.desc), ...PLUGINS.map((p) => p.desc), ...COMMUNITY_PLUGINS.map((p) => p.desc), ...DOCS.map((d) => d.desc)];

describe('catalog data', () => {
	it('loads every data file', () => {
		expect(APPS.length).toBeGreaterThan(0);
		expect(UI_LIBS.length).toBeGreaterThan(0);
		expect(PLUGINS.length).toBeGreaterThan(0);
		expect(DOCS.length).toBeGreaterThan(0);
		expect(ARTICLES.length).toBeGreaterThan(0);
	});

	it('links only to https URLs', () => {
		for (const u of [...APPS.map((a) => a.url), ...UI_LIBS.map((l) => l.url), ...PLUGINS.map((p) => p.url), ...DOCS.map((d) => d.url), ...STATE_SOLUTIONS.map((s) => s.url), ...TEMPLATES.map((x) => x.url), ...AI_TOOLS.map((x) => x.url), ...ARTICLES.map((a) => a.url)]) {
			expect(u.startsWith('https://')).toBe(true);
		}
	});

	it('has English for every entry, and only site languages', () => {
		for (const text of texts()) {
			expect(text.en.trim()).not.toBe('');
			for (const lang of Object.keys(text)) expect(LANGS.map((l) => l.code)).toContain(lang);
		}
	});

	// An official package is one inside NSGo's own module, and its card is headed with its path there; NSGo compiles TSX with no Node, so an npm package can only belong to a community plugin for TSX apps.
	it('gives every official plugin its Go package inside NSGo, and an npm package only to plugins that serve TSX apps', () => {
		for (const p of PLUGINS) {
			expect(p.goImport?.startsWith(`${NSGO_MODULE}/`), p.slug).toBe(true);
			expect(pluginPath(p), p.slug).toBe(`nsgo/${p.goImport?.slice(NSGO_MODULE.length + 1)}`);
			expect(p.npm, p.slug).toBeUndefined();
		}
		for (const p of [...PLUGINS, ...COMMUNITY_PLUGINS]) if (p.npm) expect(p.surface, p.slug).not.toBe('go');
		for (const p of COMMUNITY_PLUGINS) expect(pluginPath(p), p.slug).toBe(`plugins/${p.slug}`);
		expect(pluginPath({ slug: 'ui-chat', official: true, goImport: 'github.com/oneo-me/nsgo/ui/chat' })).toBe('nsgo/ui/chat');
		expect(pluginPath({ slug: 'kit', official: false, goImport: 'github.com/oneo-me/nsgo/kit' })).toBe('plugins/kit');
	});

	it('installs with the nsgo CLI of the module the catalog lists', () => {
		expect(INSTALL_TABS.map((x) => x.key)).toEqual(['go', 'tsx', 'mixed']);
		for (const tab of INSTALL_TABS) expect(INSTALL_CMDS[tab.key], tab.key).toMatch(new RegExp(`^go run ${NSGO_MODULE}/cmd/nsgo@latest init (-template ${tab.key} )?-module example\\.com/my-app my-app$`));
		expect(INSTALL_CMDS.go).not.toMatch(/-template/);
		expect(CLI_CMDS).toEqual([`go get -tool ${NSGO_MODULE}/cmd/nsgo`, 'go tool nsgo doctor']);
	});

	it('rejects a malformed Go import path or npm package name', () => {
		const plugin = { $schema: '../schema/plugin.schema.json', slug: 'kit', name: 'Kit', mark: 'Kt', official: false, surface: 'tsx', tags: [], docs: 'https://x.dev', summary: { en: 'A kit.' }, added: '2026-11-04T12:00:00Z' };
		expect(() => readPlugins({ 'kit.json': { ...plugin, import: 'github.com/you/kit', npm: '@you/kit' } })).not.toThrow();
		expect(() => readPlugins({ 'kit.json': { ...plugin, import: 'go get github.com/you/kit' } })).toThrow(/plugins\/kit.json \(Kit\): import must be a Go import path/);
		expect(() => readPlugins({ 'kit.json': { ...plugin, npm: 'bun add @you/kit' } })).toThrow(/npm must be an npm package name/);
	});

	it('falls back to English for a missing language', () => {
		expect(pick({ en: 'Hello' }, 'ja')).toBe('Hello');
		expect(pick({ en: 'Hello', ja: 'こんにちは' }, 'ja')).toBe('こんにちは');
	});

	it('has every UI string in every language, with the same placeholders', () => {
		const ref = LOCALES['zh-CN'];
		const keys = Object.keys(ref).sort();
		const holes = (s: string) => (s.match(/\{[xn]\}/g) ?? []).sort().join();
		for (const L of LANGS) {
			const dict = LOCALES[L.code];
			expect(Object.keys(dict).sort(), L.code).toEqual(keys);
			for (const k of keys as (keyof typeof ref)[]) {
				expect(typeof dict[k] === 'string' && dict[k].trim() !== '', `${L.code} ${k}`).toBe(true);
				expect(holes(dict[k]), `${L.code} ${k}`).toBe(holes(ref[k]));
			}
		}
	});

	it('keeps UI copy free of manual line breaks and invisible wrap hints', () => {
		for (const L of LANGS) for (const [key, value] of Object.entries(LOCALES[L.code])) expect(value, `${L.code} ${key}`).not.toMatch(/[\r\n\u2028\u2029\u200b\u2060\ufeff]/);
	});

	// Which apps have which kind of icon is the data's business: the submission bot takes an app's icon from where NSGo's CLI finds it (nsgo.yaml's icon, or assets/Icon.png), and it reports which in the pull request.
	it('takes icons from ai-logo or a local official icon named after the app', () => {
		for (const a of APPS) {
			if (!a.icon) continue;
			expect(a.icon).toMatch(a.icon.startsWith(AILOGO_CDN) ? /^https:\/\/ailogo\.yldm\.ai\/avatar\/[a-z0-9]+\.webp$/ : new RegExp(`^/icons/${a.slug}\\.webp$`));
		}
	});

	it('has every screenshot and local icon it names in apps/web/public', () => {
		const files = [...APPS.flatMap((a) => [a.image, a.icon?.startsWith('/') ? a.icon : undefined]), ...UI_LIBS.map((l) => l.image), ...STATE_SOLUTIONS.map((s) => s.image), ...TEMPLATES.map((x) => x.image), ...AI_TOOLS.map((x) => x.image)];
		for (const f of files) if (f) expect(existsSync(new URL(f.slice(1), PUBLIC)), f).toBe(true);
	});

	it('points every category at its schema, which names the file fields', () => {
		for (const [kind, schema] of KINDS) {
			expect(kind.schema, kind.dir).toBe(`../schema/${schema.$id}`);
			expect(Object.keys(schema.properties), kind.dir).toEqual(expect.arrayContaining(['$schema', 'slug']));
			expect(schema.required.includes('added'), kind.dir).toBe(kind.dated);
		}
	});

	// Every category is one file per entry, so that submissions arriving together never edit the same file.
	it('keeps every entry in a file named after its slug, dated where it can be submitted', () => {
		const lib = { $schema: '../schema/ui.schema.json', slug: 'kit', name: 'Kit', author: 'someone', tag: 'theme', surface: 'go', summary: { en: 'A kit.' }, repo: 'someone/kit', url: 'https://github.com/someone/kit', added: '2026-11-04T12:00:00Z' };
		expect(readEntryFile(UI_KIND, 'kit.json', lib).slug).toBe('kit');
		expect(() => readEntryFile(UI_KIND, 'other.json', lib)).toThrow(/ui\/other.json \(Kit\): slug must match the file name/);
		expect(() => readEntryFile(UI_KIND, 'kit.json', { ...lib, added: undefined })).toThrow(/added is required/);
		expect(() => readEntryFile(UI_KIND, 'kit.json', { ...lib, $schema: './schema/ui.schema.json' })).toThrow(/\$schema must be/);
		expect(() => readUiLibs({ 'kit.json': lib, 'kit-2.json': { ...lib, slug: 'kit-2' } })).toThrow(/ui\/: two entries have repo "someone\/kit"/);
		expect(() => readEntryFile(UI_KIND, 'kit.json', { ...lib, surface: undefined })).toThrow(/surface/);
		expect(() => readEntryFile(UI_KIND, 'kit.json', { ...lib, surface: 'desktop' })).toThrow(/surface/);
		const doc = { $schema: '../schema/doc.schema.json', slug: 'ui-button', title: 'Button', file: 'ui/button', summary: { en: 'A push button.' } };
		expect(readDocs({ 'ui-button.json': doc })[0].url).toBe('https://oneo-me.github.io/nsgo/docs/ui/button/');
		expect(() => readDocs({ 'ui-button.json': { ...doc, added: '2026-11-04T12:00:00Z' } })).toThrow(/added is not a known field/);
	});

	it('reads templates by their repository and AI tools by their link, which may be a folder', () => {
		const tpl = { $schema: '../schema/template.schema.json', slug: 'starter', name: 'Starter', author: 'someone', summary: { en: 'A starter.' }, repo: 'someone/starter', url: 'https://github.com/someone/starter', surface: 'tsx', use: 'gh repo create my-app --template someone/starter --clone', tags: ['tailwind'], added: '2026-11-04T12:00:00Z' };
		expect(readTemplates({ 'starter.json': tpl })[0]).toMatchObject({ surface: 'tsx', use: tpl.use, tags: ['tailwind'] });
		expect(() => readTemplates({ 'starter.json': tpl, 'starter-2.json': { ...tpl, slug: 'starter-2' } })).toThrow(/templates\/: two entries have repo "someone\/starter"/);
		expect(() => readEntryFile(TEMPLATE_KIND, 'starter.json', { ...tpl, use: undefined })).toThrow(/use/);
		expect(() => readEntryFile(TEMPLATE_KIND, 'starter.json', { ...tpl, surface: 'desktop' })).toThrow(/surface/);
		const skill = { $schema: '../schema/ai.schema.json', slug: 'nsgo-usage', name: 'nsgo-usage', author: 'someone', summary: { en: 'A skill.' }, repo: 'someone/skills', url: 'https://github.com/someone/skills/tree/main/skills/nsgo-usage', type: 'skill', install: 'npx skills add someone/skills --skill nsgo-usage', tags: ['skill'], added: '2026-11-04T12:00:00Z' };
		const other = { ...skill, slug: 'nsgo-motion', name: 'nsgo-motion', url: 'https://github.com/someone/skills/tree/main/skills/nsgo-motion' };
		expect(readAiTools({ 'nsgo-usage.json': skill, 'nsgo-motion.json': other }).map((x) => x.slug)).toEqual(['nsgo-motion', 'nsgo-usage']);
		expect(() => readAiTools({ 'nsgo-usage.json': skill, 'copy.json': { ...skill, slug: 'copy' } })).toThrow(/ai\/: two entries have url/);
		expect(() => readEntryFile(AI_KIND, 'nsgo-usage.json', { ...skill, type: 'plugin' })).toThrow(/type/);
		expect(AI_TOOL_TYPES).toEqual(['skill', 'mcp', 'rules', 'other']);
	});

	it('lists libraries, state management, templates, AI tools, articles and community plugins oldest first, official plugins and guides by name', () => {
		for (const list of [UI_LIBS, STATE_SOLUTIONS, TEMPLATES, AI_TOOLS, ARTICLES, COMMUNITY_PLUGINS]) for (let i = 1; i < list.length; i++) expect(byAdded(list[i - 1], list[i]), list[i].slug).toBeLessThan(0);
		for (let i = 1; i < PLUGINS.length; i++) expect(byName(PLUGINS[i - 1], PLUGINS[i]), PLUGINS[i].slug).toBeLessThan(0);
		for (let i = 1; i < DOCS.length; i++) expect(DOCS[i - 1].title.localeCompare(DOCS[i].title, 'en', { sensitivity: 'base' }), DOCS[i].slug).toBeLessThan(0);
		const plugin = { $schema: '../schema/plugin.schema.json', mark: 'Kt', surface: 'go', tags: [], docs: 'https://x.dev', summary: { en: 'A kit.' } };
		const files = {
			'b.json': { ...plugin, slug: 'b', name: 'Beta', official: true, added: '2026-11-05T00:00:00Z' },
			'a.json': { ...plugin, slug: 'a', name: 'Alpha', official: true, added: '2026-11-06T00:00:00Z' },
			'new.json': { ...plugin, slug: 'new', name: 'Aardvark', official: false, added: '2026-11-07T00:00:00Z' },
			'old.json': { ...plugin, slug: 'old', name: 'Zebra', official: false, added: '2026-11-01T00:00:00Z' },
		};
		expect(readPlugins(files).map((p) => p.slug)).toEqual(['a', 'b', 'old', 'new']);
	});

	// Apps are one file each so that submissions arriving together never edit the same file; their order comes from when each was added.
	it('keeps each app in a file named after its slug, and lists them by name in natural order', () => {
		const app = { $schema: '../schema/app.schema.json', slug: 'kit', name: 'Kit', author: 'someone', kind: 'go', platforms: ['mac'], url: 'https://x.dev', summary: { en: 'A kit.' }, description: { en: 'A kit.' }, added: '2026-11-04T12:00:00Z' };
		expect(readAppFile('kit.json', app).added).toBe('2026-11-04T12:00:00Z');
		// No default: an entry without platforms would be listed under platforms it does not ship for, which put single-platform apps under the wrong filters.
		expect(() => readAppFile('kit.json', { ...app, platforms: undefined })).toThrow(/platforms must be a list of at least 1/);
		expect(() => readAppFile('kit.json', { ...app, platforms: ['macos'] })).toThrow(/platforms must contain only mac, win, linux, ios, android, web, miniprogram/);
		expect(readAppFile('kit.json', { ...app, platforms: ['ios', 'android', 'miniprogram'] }).platforms).toEqual(['ios', 'android', 'miniprogram']);
		expect(() => readAppFile('kit.json', { ...app, kind: 'native' })).toThrow(/kind must be one of go, tsx/);
		expect(() => readAppFile('other.json', app)).toThrow(/apps\/other.json \(Kit\): slug must match the file name/);
		expect(() => readAppFile('kit.json', { ...app, added: undefined })).toThrow(/added is required/);
		expect(() => readAppFile('kit.json', { ...app, added: '2026-11-04' })).toThrow(/added must be a UTC time/);
		expect(() => readAppFile('kit.json', { ...app, $schema: './schema/apps.schema.json' })).toThrow(/\$schema must be/);
		const files = { 'app-10.json': { ...app, slug: 'app-10', name: 'App 10' }, 'app-9.json': { ...app, slug: 'app-9', name: 'app 9', added: '2026-11-05T00:00:00Z' }, '2048.json': { ...app, slug: '2048', name: '2048' }, 'kit.json': app };
		const apps = readApps(files);
		expect(apps.map((a) => a.slug)).toEqual(['2048', 'app-9', 'app-10', 'kit']);
		expect([...apps].sort(byNewest).map((a) => a.slug)).toEqual(['app-9', '2048', 'app-10', 'kit']);
		for (let i = 1; i < APPS.length; i++) expect(byName(APPS[i - 1], APPS[i]), APPS[i].slug).toBeLessThan(0);
	});

	it('resolves apps by slug', () => {
		for (const a of APPS) expect(appBySlug(a.slug), a.slug).toBe(a);
		expect(appBySlug('nope')).toBeUndefined();
	});

	it('keeps its schemas and its readers to the same kinds and platforms', () => {
		const schema = appSchema as unknown as { properties: { kind: { enum: string[] }; platforms: { items: { enum: string[] } } } };
		expect(schema.properties.kind.enum).toEqual([...APP_KINDS]);
		expect(schema.properties.platforms.items.enum).toEqual([...APP_PLATFORMS]);
		for (const sch of [uiSchema, templateSchema, pluginSchema] as unknown as { properties: { surface: { enum: string[] } } }[]) expect(sch.properties.surface.enum).toEqual(['go', 'tsx', 'both']);
		const docFile = new RegExp((docSchema as unknown as { properties: { file: { pattern: string } } }).properties.file.pattern);
		for (const d of DOCS) expect(d.url, d.slug).toBe(docUrl(d));
		for (const d of DOCS) expect(docFile.test(d.file), d.slug).toBe(true);
	});

	it('links a guide to its page on the NSGo docs, the introduction at their root', () => {
		const doc = { $schema: '../schema/doc.schema.json', slug: 'intro', title: 'Introduction', file: '', summary: { en: 'What NSGo is.' } };
		expect(readDocs({ 'intro.json': doc })[0].url).toBe(DOCS_BASE);
		expect(readDocs({ 'intro.json': { ...doc, file: 'tutorials/todo' } })[0].url).toBe(`${DOCS_BASE}tutorials/todo/`);
		for (const file of ['getting-started.md', '/ui', 'ui/', 'UI/Button', 'docs/public/en/ui.md']) expect(() => readDocs({ 'intro.json': { ...doc, file } }), file).toThrow(/file must be a docs path/);
		expect(() => readDocs({ 'intro.json': { ...doc, file: undefined } })).toThrow(/file must be a docs path/);
	});

	// The category is optional (the submission form and bot write entries without one), so only its value is checked.
	it('takes an app category only from the values its schema allows', () => {
		const schemaEnum = APP_SCHEMA.properties.category.enum;
		expect(schemaEnum).toEqual([...APP_CATEGORIES]);
		for (const a of APPS) if (a.category !== undefined) expect(APP_CATEGORIES, a.slug).toContain(a.category);
		const entry = { slug: 'kit', name: 'Kit', author: 'someone', kind: 'go', platforms: ['mac'], url: 'https://x.dev', summary: { en: 'A kit.' }, description: { en: 'A kit.' } };
		expect(readAppEntry(entry).category).toBeUndefined();
		expect(() => readAppEntry({ ...entry, category: 'DesktopApplication' })).toThrow(/category must be one of/);
	});

	it('lists as provisional only images the entry has, and only kinds of image its category shows', () => {
		const app = { slug: 'kit', name: 'Kit', author: 'a', kind: 'go', platforms: ['mac'], url: 'https://x.dev', summary: { en: 'A kit.' }, description: { en: 'A kit.' }, screenshot: 'kit.webp', icon: { file: 'kit.webp' } };
		expect(readAppEntry({ ...app, provisional: ['icon', 'screenshot'] }).provisional).toEqual(['icon', 'screenshot']);
		expect(readAppEntry(app).provisional).toBeUndefined();
		expect(() => readAppEntry({ ...app, provisional: ['banner'] })).toThrow(/provisional may list only icon and screenshot/);
		expect(() => readAppEntry({ ...app, provisional: ['icon', 'icon'] })).toThrow(/provisional lists an image twice/);
		expect(() => readAppEntry({ ...app, provisional: [] })).toThrow(/provisional/);
		const { screenshot: _shot, ...noShot } = app;
		expect(() => readAppEntry({ ...noShot, provisional: ['screenshot'] })).toThrow(/provisional lists the screenshot, which the entry does not have/);
		const lib = { slug: 'kit', name: 'Kit', author: 'a', tag: 'theme', surface: 'both', summary: { en: 'A kit.' }, repo: 'a/kit', url: 'https://github.com/a/kit', screenshot: 'kit.webp' };
		expect(readEntry(UI_KIND, { ...lib, provisional: ['screenshot'] }).provisional).toEqual(['screenshot']);
		expect(() => readEntry(UI_KIND, { ...lib, provisional: ['icon'] })).toThrow(/provisional may list only screenshot/);
	});

	it('links an author to a GitHub profile only when one of their apps is in a repository they own', () => {
		// The site's own apps: a profile only for an author with an app at github.com/<author>.
		for (const a of APPS) expect(authorProfile(a.author), a.author).toBe(APPS.some((b) => b.author === a.author && new URL(b.url).hostname === 'github.com' && new URL(b.url).pathname.split('/')[1]?.toLowerCase() === a.author.toLowerCase()) ? `https://github.com/${a.author}` : undefined);
		// One app on its own domain and another at github.com/<login> prove the login.
		expect(authorProfile('someone', [{ author: 'someone', url: 'https://reef.someone.dev' }, { author: 'someone', url: 'https://github.com/someone/kit' }])).toBe('https://github.com/someone');
		// An app in github.com/<another login>: the author's name is a name, not that login.
		expect(authorProfile('Some One', [{ author: 'Some One', url: 'https://github.com/someone/kit' }])).toBeUndefined();
		// An author whose apps all live on their own domains has no proven login, whatever their repositories are called; one app at github.com/<login> proves it. Given apps, as the site's own change whenever a project is added.
		const ownDomain = [{ author: 'someone', url: 'https://reef.someone.dev' }];
		expect(authorProfile('someone', ownDomain)).toBeUndefined();
		expect(authorProfile('someone', [...ownDomain, { author: 'someone', url: 'https://github.com/Someone/curl' }])).toBe('https://github.com/someone');
		expect(authorProfile('someone', [{ author: 'someone', url: 'https://github.com/other/curl' }])).toBeUndefined();
	});

	it('strips the scheme and trailing slash for display', () => {
		expect(hostOf('https://oneo.me/')).toBe('oneo.me');
		expect(hostOf('https://github.com/oneo-me/nsgo')).toBe('github.com/oneo-me/nsgo');
	});
});

describe('showcase groups', () => {
	it("puts every app in a group of its own choosing, or its category's, and every group with others", () => {
		for (const c of APP_CATEGORIES) expect(APP_GROUPS).toContain(appGroup({ category: c }));
		expect(appGroup({})).toBe('other');
		expect(appGroup({ group: 'network', category: 'UtilitiesApplication' })).toBe('network');
		for (const [g, c] of Object.entries(GROUP_CATEGORY)) {
			expect(appGroup({ group: g as EntryGroup })).toBe(g);
			expect(APP_CATEGORIES).toContain(c);
		}
		expect(APP_SCHEMA.properties.group.enum).toEqual([...ENTRY_GROUPS]);
		// Every app has a group of its own, so a new category or a renamed group never sends a listed app elsewhere.
		for (const a of APPS) expect([a.slug, a.group !== undefined]).toEqual([a.slug, true]);
		// A group with a single app reads as a mistake on the page: merge it into a neighbour instead.
		const sizes = APPS.reduce<Record<string, number>>((n, a) => ({ ...n, [appGroup(a)]: (n[appGroup(a)] ?? 0) + 1 }), {});
		for (const [g, n] of Object.entries(sizes)) expect([g, n >= 2]).toEqual([g, true]);
	});
});

describe('like keys', () => {
	it('gives every likeable entry its own key', () => {
		expect(LIKE_KEYS.size).toBe(APPS.length + UI_LIBS.length + STATE_SOLUTIONS.length + TEMPLATES.length + AI_TOOLS.length + PLUGINS.length + COMMUNITY_PLUGINS.length);
		for (const a of APPS) expect(LIKE_KEYS.has(likeKey.app(a)), a.slug).toBe(true);
		for (const p of [...PLUGINS, ...COMMUNITY_PLUGINS]) expect(LIKE_KEYS.has(likeKey.plugin(p)), p.slug).toBe(true);
		expect(LIKE_KEYS.has('app:not-an-app')).toBe(false);
	});
});

describe('validation of contributed entries', () => {
	const read = (entry: Record<string, unknown>) => () => {
		const r = new Reader('apps/kit.json', entry);
		r.only(['name', 'url', 'kind', 'summary']);
		return [r.str('name'), r.url('url'), r.oneOf('kind', APP_KINDS), r.text('summary')];
	};
	const ok = { name: 'Kit', url: 'https://x.dev', kind: 'go', summary: { en: 'A kit.' } };

	it('accepts a well-formed entry', () => {
		expect(read(ok)).not.toThrow();
	});

	it('names the file and field of each mistake', () => {
		expect(read({ ...ok, summary: { 'zh-CN': '工具' } })).toThrow(/apps\/kit.json \(Kit\): summary.en is required/);
		expect(read({ ...ok, summary: { en: 'A kit.', fr: 'Un kit.' } })).toThrow(/summary.fr is not a site language/);
		for (const lineBreak of ['\n', '\r', '\u2028', '\u2029']) expect(read({ ...ok, summary: { en: `A kit.${lineBreak}On two lines.` } })).toThrow(/summary.en must be a single line/);
		expect(read({ ...ok, name: 'Two\nlines' })).toThrow(/name must be a single line/);
		expect(() => new Reader('apps/kit.json', { tags: ['one', 'two\nlines'] }).strings('tags')).toThrow(/tags must be a list of single-line strings/);
		for (const control of ['\u200b', '\u2060', '\ufeff']) {
			expect(read({ ...ok, summary: { en: `A kit.${control}With a hidden wrap control.` } })).toThrow(/summary.en must not contain invisible wrap controls/);
			expect(read({ ...ok, name: `Two${control}parts` })).toThrow(/name must not contain invisible wrap controls/);
			expect(() => new Reader('apps/kit.json', { tags: ['one', `two${control}parts`] }).strings('tags')).toThrow(/tags must not contain invisible wrap controls/);
		}
		expect(read({ ...ok, url: 'http://x.dev' })).toThrow(/url must be an https link/);
		expect(read({ ...ok, kind: 'electron' })).toThrow(/kind must be one of go, tsx/);
		expect(read({ ...ok, descripton: 'typo' })).toThrow(/descripton is not a known field/);
		expect(read({ ...ok, name: ' ' })).toThrow(CatalogError);
	});

	it('rejects duplicates', () => {
		expect(() => unique('apps', [{ slug: 'a' }, { slug: 'a' }], 'slug', (x) => x.slug)).toThrow(/apps\/: two entries have slug "a"/);
	});
});

describe('negotiateLang', () => {
	const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

	it('prefers a saved choice', () => {
		expect(negotiateLang('ja', ['en-US'])).toBe('ja');
	});

	it('ignores an unknown saved value', () => {
		expect(negotiateLang('fr', ['ko-KR'])).toBe('ko');
	});

	it('maps Chinese by script, then region', () => {
		for (const tag of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-MO', 'zh-Hant-CN']) expect(negotiateLang(null, [tag]), tag).toBe('zh-TW');
		for (const tag of ['zh', 'zh-CN', 'zh-SG', 'zh-Hans', 'zh-Hans-HK', 'zh-Hans-TW']) expect(negotiateLang(null, [tag]), tag).toBe('zh-CN');
	});

	it("takes the browser's first language the site speaks", () => {
		expect(negotiateLang(null, ['fr-FR', 'de', 'ja-JP', 'en-US'])).toBe('ja');
		expect(negotiateLang(null, ['en-GB', 'zh-CN'])).toBe('en');
		expect(negotiateLang(null, ['ko', 'en'])).toBe('ko');
	});

	it('falls back to English when the browser has none of the site languages', () => {
		expect(negotiateLang(null, ['de-DE', 'fr'])).toBe('en');
		expect(negotiateLang(null, [])).toBe('en');
		expect(negotiateLang(null, undefined)).toBe('en');
	});

	it('keeps crawlers on the language the URL declares', () => {
		const crawlers = [
			'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
			'Mozilla/5.0 (compatible; Google-InspectionTool/1.0)',
			'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36',
			'Mozilla/5.0 (compatible; Baiduspider-render/2.0; +http://www.baidu.com/search/spider.html)',
			'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
			'Mozilla/5.0 (Linux; Android 7.0;) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; PetalBot;+https://webmaster.petalsearch.com/site/petalbot)',
			'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)',
			'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)',
			'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
			'WhatsApp/2.23.20.0',
			'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse',
		];
		for (const userAgent of crawlers) expect(negotiateLang(null, ['en-US'], userAgent), userAgent).toBe('zh-CN');
		expect(negotiateLang(null, ['en-US'], CHROME)).toBe('en');
	});

	it('treats browsers that carry a search brand in their UA as browsers', () => {
		const browsers: [string, string][] = [
			['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 DuckDuckGo/5', 'en-US'],
			['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 DuckDuckGo/7 Safari/605.1.15', 'en-US'],
			['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NAVER(inapp; search; 2000; 12.10.0; 15PRO)', 'ko-KR'],
			['Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 NAVER(inapp; search; 2000; 12.10.0)', 'ko-KR'],
		];
		for (const [userAgent, browser] of browsers) expect(negotiateLang(null, [browser], userAgent), userAgent).toBe(browser.slice(0, 2));
	});
});

describe('langRedirectScript', () => {
	const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
	const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
	// Runs the inline script against a fake page and returns where it redirected, or null.
	// Runs the inline script against a fake page and returns where it redirected, or null. A browser is its navigator.languages; a string is an old browser with navigator.language only.
	const run = (href: string, saved: string | null, browser: readonly string[] | string, userAgent = CHROME) => {
		let to: string | null = null;
		const location = { href, origin: new URL(href).origin, replace: (u: string) => (to = u) };
		const localStorage = { getItem: () => saved };
		const navigator = typeof browser === 'string' ? { language: browser, userAgent } : { languages: browser, language: browser[0], userAgent };
		new Function('location', 'localStorage', 'navigator', langRedirectScript())(location, localStorage, navigator);
		return to;
	};
	const browsers = [['en-US'], ['zh-TW'], ['zh-HK'], ['zh-MO'], ['zh-Hant-MO'], ['zh-Hans-HK'], ['zh-CN'], ['ja-JP'], ['ko-KR'], ['de-DE'], ['fr-FR', 'ko-KR', 'en'], ['de', 'fr'], []];
	const saves = [null, 'ja', 'fr', 'zh-CN'];

	it('picks the same language as negotiateLang', () => {
		for (const browser of browsers) {
			for (const saved of saves) {
				for (const userAgent of [CHROME, GOOGLEBOT]) {
					const want = negotiateLang(saved, browser, userAgent);
					const to = run('https://awesomensgo.dev/showcase?app=gallery', saved, browser, userAgent);
					expect(to ? new URL(to).searchParams.get('lang') : 'zh-CN', `${browser} ${saved} ${userAgent}`).toBe(want);
				}
			}
		}
	});

	it('reads navigator.language when the browser has no navigator.languages', () => {
		expect(run('https://awesomensgo.dev/', null, 'ja-JP')).toBe('https://awesomensgo.dev/?lang=ja');
		expect(run('https://awesomensgo.dev/', null, 'zh-CN')).toBeNull();
	});

	it('keeps the path and other parameters', () => {
		expect(run('https://awesomensgo.dev/showcase?app=gallery', null, ['en-US'])).toBe('https://awesomensgo.dev/showcase?app=gallery&lang=en');
	});

	it('leaves a page that already names a language', () => {
		expect(run('https://awesomensgo.dev/?lang=ja', null, ['en-US'])).toBeNull();
	});

	it('leaves an explicit ?lang= of the default language', () => {
		expect(run('https://awesomensgo.dev/?lang=zh-CN', null, ['en-US'])).toBeNull();
		expect(run('https://awesomensgo.dev/?lang=zh-CN', 'ja', ['en-US'])).toBeNull();
	});

	it('does not redirect crawlers', () => {
		expect(run('https://awesomensgo.dev/', null, ['en-US'], GOOGLEBOT)).toBeNull();
	});
});

describe('validateRootSearch', () => {
	it('drops a lang that is not a site language, so it never reaches the render', () => {
		for (const lang of ['fr', 'EN', 'zh-cn', '', 123, ['en', 'ja'], null]) {
			const v = validateRootSearch({ lang });
			// The key must be present (as undefined) to override the raw value TanStack merges the result over.
			expect('lang' in v, JSON.stringify(lang)).toBe(true);
			expect(v.lang, JSON.stringify(lang)).toBeUndefined();
		}
		for (const L of LANGS) expect(validateRootSearch({ lang: L.code }).lang).toBe(L.code);
	});

	it('keeps app slugs, numeric ones included, and drops anything else', () => {
		expect(validateRootSearch({ app: 2048 }).app).toBe('2048');
		expect(validateRootSearch({ app: 'gallery' }).app).toBe('gallery');
		for (const app of ['Bad Slug', '', 'a'.repeat(65), ['gallery', 'orbit'], { x: 1 }]) {
			const v = validateRootSearch({ app });
			expect('app' in v, JSON.stringify(app)).toBe(true);
			expect(v.app, JSON.stringify(app)).toBeUndefined();
		}
	});

	it('round-trips every app slug through the URL as the router writes and reads it', () => {
		// The router writes strings as plain text (stringifySearchWith(JSON.stringify)) and its default reader JSON-parses each value that can begin JSON, which turns ?app=2048 into a number.
		const parse = (v: string): unknown => {
			try {
				return JSON.parse(v);
			} catch {
				return v;
			}
		};
		const read = (query: string) => Object.fromEntries([...new URLSearchParams(query)].map(([k, v]) => [k, parse(v)]));
		for (const a of APPS) expect(validateRootSearch(read(new URLSearchParams({ app: a.slug, lang: 'ja' }).toString())), a.slug).toEqual({ app: a.slug, lang: 'ja' });
	});
});

describe('t', () => {
	it('falls back to the default language for a value that is not a site language', () => {
		expect(t('fr' as LangCode)).toBe(t('zh-CN'));
		expect(t('' as LangCode).nf_h).toBe(LOCALES['zh-CN'].nf_h);
	});
});

describe('search snippets', () => {
	// Display width as search results measure it: CJK, kana, Hangul and full-width forms take two columns.
	const width = (s: string) => Array.from(s).reduce((w, c) => w + (/[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/.test(c) ? 2 : 1), 0);
	const PAGES = [
		['title_home', 'desc_home'],
		['title_ui', 'desc_ui'],
		['title_state', 'desc_state'],
		['title_templates', 'desc_templates'],
		['title_ai', 'desc_ai'],
		['title_plugins', 'desc_plugins'],
		['title_showcase', 'desc_showcase'],
		['title_learn', 'desc_learn'],
	] as const;

	it('puts the site name first in the home title and keeps every title short enough to show whole', () => {
		for (const [title] of PAGES) {
			for (const L of LANGS) {
				const topic = LOCALES[L.code][title];
				const full = title === 'title_home' ? topic : `${topic} · Awesome NSGo`;
				if (title === 'title_home') expect(full.startsWith('Awesome NSGo · '), `${title} ${L.code}`).toBe(true);
				expect(width(full), `${title} ${L.code}: ${full}`).toBeLessThanOrEqual(64);
			}
		}
	});

	it('gives every page its own description that fits the snippet', () => {
		LANGS.forEach((L) => {
			const descs = PAGES.map(([, desc]) => LOCALES[L.code][desc]);
			expect(new Set(descs).size, L.code).toBe(PAGES.length);
			for (const d of descs) expect(width(d), `${L.code}: ${d}`).toBeLessThanOrEqual(160);
		});
	});

	it('gives every page keywords that pair NSGo with Go and repeat no phrase', () => {
		const KEYWORDS = ['kw_home', 'kw_ui', 'kw_state', 'kw_templates', 'kw_ai', 'kw_plugins', 'kw_showcase', 'kw_learn', 'kw_app'] as const;
		for (const L of LANGS) {
			for (const key of KEYWORDS) {
				const terms = LOCALES[L.code][key].split(', ');
				expect(terms.every((x) => x.trim() === x && x.length > 0), `${key} ${L.code}`).toBe(true);
				expect(new Set(terms).size, `${key} ${L.code}`).toBe(terms.length);
				expect(terms.length, `${key} ${L.code}`).toBeLessThanOrEqual(10);
				// NSGo alone is a new word that also names unrelated projects, so a page's keywords name it and, as a word of its own, Go or Golang.
				expect(terms.some((x) => /\bNSGo\b/.test(x)), `${key} ${L.code}`).toBe(true);
				expect(terms.some((x) => /\bGo(lang)?\b/.test(x)), `${key} ${L.code}`).toBe(true);
			}
		}
	});

	it('gives every app page its own description that fits the snippet', () => {
		for (const L of LANGS) {
			const descs = APPS.map((a) => appDescription(a, L.code));
			expect(new Set(descs).size, L.code).toBe(APPS.length);
			for (const d of descs) expect(width(d), `${L.code}: ${d}`).toBeLessThanOrEqual(160);
		}
		const kit = readAppEntry({ slug: 'kit', name: 'Kit', author: 'someone', kind: 'go', platforms: ['mac'], url: 'https://x.dev', summary: { en: 'Keeps notes.', 'zh-CN': '记笔记。' }, description: { en: 'Keeps notes.' } });
		expect(appDescription(kit, 'en')).toBe('Keeps notes. An app by someone, built with Go and NSGo.');
		expect(appDescription(kit, 'zh-CN')).toBe('记笔记。由 someone 用 Go 与 NSGo 开发的应用。');
		// A language the summary lacks falls back to English, followed by a space.
		expect(appDescription(kit, 'ja')).toBe(`Keeps notes. ${fill(t('ja').app_desc_tail, { x: 'someone' })}`);
		expect(pick(kit.desc, 'ja')).toBe('Keeps notes.');
	});
});

describe('fill', () => {
	it('replaces both placeholders', () => {
		expect(fill(t('en').live_badge, { n: 17 })).toBe('17 community apps listed');
		expect(fill(t('en').more_by, { x: 'oneo-me' })).toBe('More by oneo-me');
	});
});

describe('search', () => {
	const index = buildSearchIndex('en');

	it('returns nothing for a blank query', () => {
		expect(searchCatalog(index, '   ')).toEqual([]);
	});

	it('matches case-insensitively', () => {
		for (const a of APPS) {
			expect(searchCatalog(index, a.name.toUpperCase()).map((r) => r.name), a.slug).toContain(a.name);
			expect(searchCatalog(index, a.name.toUpperCase()), a.slug).toEqual(searchCatalog(index, a.name.toLowerCase()));
		}
	});

	it('matches app descriptions in any language', () => {
		// Every app's summary is written in every site language, so each is found from the English index by the start of its Chinese one.
		for (const a of APPS) {
			const zh = a.desc['zh-CN'];
			expect(zh, a.slug).toBeDefined();
			expect(searchCatalog(index, zh?.slice(0, 4) ?? '').map((r) => r.name), a.slug).toContain(a.name);
		}
	});

	it('finds state solutions by tag', () => {
		for (const st of STATE_SOLUTIONS) expect(searchCatalog(index, st.tags[0]).map((r) => r.name), st.slug).toContain(st.name);
	});

	it('finds plugins by tag and the cli by command', () => {
		for (const p of [...PLUGINS, ...COMMUNITY_PLUGINS].filter((x) => x.tags.length > 0)) expect(searchCatalog(index, p.tags[0].toUpperCase()).map((r) => r.name), p.slug).toContain(p.name);
		for (const q of ['doctor', 'go tool nsgo', 'nsgo cli']) expect(searchCatalog(index, q).map((r) => r.target), q).toContainEqual({ type: 'page', path: '/plugins' });
	});
});

describe('submission entry', () => {
	const ph = { name: 'Name', desc: 'One-line description.' };
	const draft = { name: 'My "Kit"', author: 'someone', url: 'https://github.com/someone/my-kit', desc: 'Widgets for NSGo.' };

	it('reads a link typed without its scheme as https, and leaves other schemes for the check', () => {
		expect(withScheme(' github.com/you/app ')).toBe('https://github.com/you/app');
		expect(withScheme('nsgo.dev')).toBe('https://nsgo.dev');
		expect(withScheme('https://x.dev')).toBe('https://x.dev');
		expect(withScheme('http://x.dev')).toBe('http://x.dev');
		expect(isBadUrl(withScheme('http://x.dev'))).toBe(true);
		expect(withScheme('my app')).toBe('my app');
		expect(withScheme('')).toBe('');
	});

	it('offers the repository name and owner of a GitHub link', () => {
		expect(guessFromLink('https://github.com/you/my-app.git')).toEqual({ name: 'my-app', author: 'you' });
		expect(guessFromLink('https://my-app.dev')).toBeUndefined();
	});

	it('lists what a draft still lacks, and nothing once it is complete', () => {
		const empty = { name: '', author: '', url: '', desc: '' };
		expect(missingFields('showcase', empty)).toEqual(['url', 'name', 'author', 'desc']);
		expect(missingFields('article', empty)).toEqual(['url', 'name']);
		expect(missingFields('ui', { ...draft, url: 'http://x.dev' })).toEqual(['url']);
		for (const cat of SUBMIT_CATS) expect(missingFields(cat, draft).length === 0).toBe(isEntryComplete(cat, draft));
	});

	it('writes the picked group into a showcase entry, and none when none was picked', () => {
		expect(JSON.parse(jsonEntry('showcase', { ...draft, group: 'game' }, 'go', ph)).group).toBe('game');
		// The platforms until the submission workflow reads the ones the app ships for: the desktops, not every target NSGo builds for.
		expect(JSON.parse(jsonEntry('showcase', draft, 'go', ph)).platforms).toEqual(['mac', 'win', 'linux']);
		expect(DEFAULT_PLATFORMS).toEqual(['mac', 'win', 'linux']);
		expect(JSON.parse(jsonEntry('showcase', draft, 'go', ph)).kind).toBe('go');
		expect('group' in JSON.parse(jsonEntry('showcase', draft, 'go', ph))).toBe(false);
		expect('category' in JSON.parse(jsonEntry('showcase', { ...draft, group: 'game' }, 'go', ph))).toBe(false);
		expect(readAppEntry(buildEntry('showcase', { ...draft, group: 'game' }, 'go', ph)).category).toBe('GameApplication');
	});

	it('writes, for every category, an entry with the fields its schema requires and no others', () => {
		for (const cat of SUBMIT_CATS) {
			// The file adds $schema and added, which the bot writes when it files the entry.
			const item = SCHEMA_OF[cat];
			const entry = JSON.parse(jsonEntry(cat, draft, 'go', ph));
			for (const field of item.required.filter((f) => f !== 'added')) expect(entry, `${cat} ${field}`).toHaveProperty(field);
			for (const field of Object.keys(entry)) expect(Object.keys(item.properties), `${cat} ${field}`).toContain(field);
		}
	});

	it('derives the slug and the GitHub repo, and escapes quotes', () => {
		const app = JSON.parse(jsonEntry('showcase', draft, 'tsx', ph));
		expect(app).toMatchObject({ slug: 'my-kit', name: 'My "Kit"', kind: 'tsx', summary: { en: 'Widgets for NSGo.' } });
		expect(JSON.parse(jsonEntry('ui', draft, 'go', ph)).repo).toBe('someone/my-kit');
		expect(slugify('留白 Liubai')).toBe('liubai');
		// A name with no Latin letter or digit takes its slug from the link rather than becoming my-app, which a second such entry could not be filed as.
		expect(buildEntry('ui', { ...draft, name: '留白' }, 'go', ph).slug).toBe('my-kit');
		expect(buildEntry('article', { ...draft, name: '用桌面应用', url: 'https://zhuanlan.zhihu.com/p/123' }, 'go', ph).slug).toBe('zhuanlan-zhihu-com-p-123');
	});

	it('opens a prefilled issue, or the entry\'s new file in GitHub\'s editor', () => {
		const entry = jsonEntry('ui', draft, 'go', ph);
		const u = new URL(issueUrl('https://github.com/yldm-tech/awesome-nsgo', 'ui', 'UI', draft, entry, ph));
		expect(u.origin + u.pathname).toBe('https://github.com/yldm-tech/awesome-nsgo/issues/new');
		expect(u.searchParams.get('title')).toBe('Add My "Kit" (UI)');
		expect(u.searchParams.get('body')).toBe(`UI: \`packages/catalog/data/ui/my-kit.json\`\n\n\`\`\`json\n${entry}\n\`\`\`\n`);
		// Every category is a new file: GitHub's new-file page in its directory, named after the slug and filled in.
		for (const cat of SUBMIT_CATS) {
			const e = buildEntry(cat, draft, 'go', ph);
			const n = new URL(editUrl('https://github.com/yldm-tech/awesome-nsgo', cat, e));
			expect(n.origin + n.pathname, cat).toBe(`https://github.com/yldm-tech/awesome-nsgo/new/main/packages/catalog/data/${SUBMIT_KINDS[cat].dir}`);
			expect(n.searchParams.get('filename'), cat).toBe('my-kit.json');
			const filed = JSON.parse(n.searchParams.get('value') ?? '');
			expect(() => readEntryFile(SUBMIT_KINDS[cat], 'my-kit.json', filed), cat).not.toThrow();
		}
		const app = buildEntry('showcase', draft, 'go', ph);
		expect(() => readAppFile('my-kit.json', JSON.parse(new URL(editUrl('https://github.com/yldm-tech/awesome-nsgo', 'showcase', app)).searchParams.get('value') ?? ''))).not.toThrow();
		expect(new URL(issueUrl('https://github.com/yldm-tech/awesome-nsgo', 'showcase', 'App', draft, JSON.stringify(app), ph)).searchParams.get('body')).toMatch(/^App: `packages\/catalog\/data\/apps\/my-kit.json`/);
	});

	it('flags non-https links only once something is typed', () => {
		expect(isBadUrl('')).toBe(false);
		expect(isBadUrl('http://x.dev')).toBe(true);
		expect(isBadUrl('https://x.dev')).toBe(false);
	});

	it('is complete only with every field it needs and a valid link', () => {
		expect(isEntryComplete('ui', draft)).toBe(true);
		expect(isEntryComplete('ui', { ...draft, author: '' })).toBe(false);
		expect(isEntryComplete('ui', { ...draft, url: 'http://x' })).toBe(false);
		expect(isEntryComplete('ui', { ...draft, desc: ' ' })).toBe(false);
		expect(isEntryComplete('article', { name: 'Post', author: '', url: 'https://x.dev/post', desc: '' })).toBe(true);
	});

	it('allows a longer description for apps', () => {
		expect(descMax('showcase')).toBeGreaterThan(descMax('ui'));
	});

	it('fences text that itself contains backticks', () => {
		expect(codeFence('a', 'json')).toBe('```json\na\n```');
		expect(codeFence('x ``` y')).toBe('````\nx ``` y\n````');
	});

	it('derives the install command of a state solution from its repo', () => {
		expect(buildEntry('state', draft, 'go', ph).install).toBe('go get github.com/someone/my-kit');
	});

	it('derives how to start from a template, and how to install an AI tool, from its repo', () => {
		// A template and a UI library serve both kinds of app until the workflow says otherwise; a plugin, Go apps.
		expect(buildEntry('ui', draft, 'go', ph).surface).toBe('both');
		expect(buildEntry('plugin', draft, 'go', ph).surface).toBe('go');
		expect(buildEntry('template', draft, 'go', ph)).toMatchObject({ repo: 'someone/my-kit', surface: 'both', use: 'gh repo create my-app --template someone/my-kit --clone', tags: ['template'] });
		expect(buildEntry('ai', draft, 'go', ph)).toMatchObject({ repo: 'someone/my-kit', type: 'skill', install: 'npx skills add someone/my-kit', tags: ['ai'] });
		// Without a repository link the command is the form's placeholder, which an issue cannot send.
		const noRepo = { ...draft, url: '' };
		expect(placeholderProblem(buildEntry('template', noRepo, 'go', ph))).toMatch(/placeholder/);
		expect(placeholderProblem(buildEntry('ai', noRepo, 'go', ph))).toMatch(/placeholder/);
		for (const cat of ['template', 'ai'] as const) expect(entryProblem(cat, { ...draft, url: 'https://my-kit.dev' })).toMatch(/GitHub repository/);
	});
});

describe('bot submission', () => {
	const ph = { name: 'Name', desc: 'One-line description.' };
	const draft = { name: 'Brand New Kit', author: 'someone', url: 'https://github.com/someone/brand-new-kit', desc: 'Widgets for NSGo.' };

	it('accepts a complete draft and says what is wrong with the rest', () => {
		expect(entryProblem('ui', draft)).toBeUndefined();
		expect(entryProblem('article', { name: 'Post', author: '', url: 'https://x.dev/post', desc: '' })).toBeUndefined();
		expect(entryProblem('ui', { ...draft, author: '' })).toMatch(/required/);
		expect(entryProblem('ui', { ...draft, url: 'https://example.com/kit' })).toMatch(/GitHub repository/);
		expect(entryProblem('ui', { ...draft, desc: 'x'.repeat(descMax('ui') + 1) })).toMatch(/longer than/);
		expect(entryProblem('ui', { ...draft, name: 'a\nb' })).toMatch(/single line/);
		expect(entryProblem('showcase', { ...draft, url: 'https://x.dev/a b' })).toMatch(/spaces/);
	});

	it('files every category\'s entry as a file of its own, with its schema and the time it was added', () => {
		for (const cat of SUBMIT_CATS) {
			const entry = buildEntry(cat, draft, 'go', ph);
			const path = entryPath(cat, entry);
			expect(path, cat).toBe(`${SUBMIT_KINDS[cat].dir}/brand-new-kit.json`);
			const text = entryFileText(cat, entry, '2026-11-04T12:00:00Z');
			const file = JSON.parse(text);
			expect(Object.keys(file)[0], cat).toBe('$schema');
			expect(file, cat).toMatchObject({ ...entry, added: '2026-11-04T12:00:00Z' });
			expect(() => readEntryFile(SUBMIT_KINDS[cat], 'brand-new-kit.json', file), cat).not.toThrow();
		}
	});

	it('keeps the homepage of an app and its optional GitHub repository apart', () => {
		const home = { ...draft, url: 'https://my-kit.dev' };
		const withRepo = buildEntry('showcase', { ...home, repo: 'https://github.com/someone/my-kit' }, 'go', ph);
		expect(withRepo).toMatchObject({ url: 'https://my-kit.dev', repo: 'someone/my-kit' });
		expect('repo' in buildEntry('showcase', home, 'go', ph)).toBe(false);
		expect(readAppEntry(withRepo).repo).toBe('someone/my-kit');
		expect(() => readAppEntry({ ...withRepo, repo: 'https://github.com/someone/my-kit' })).toThrow(/repo must be owner\/name/);
		expect(entryProblem('showcase', { ...home, repo: '' })).toBeUndefined();
		expect(entryProblem('showcase', { ...home, repo: 'https://gitlab.com/someone/my-kit' })).toMatch(/GitHub repository/);
	});

	it("takes an app's optional screenshot link, which stays out of the entry", () => {
		const home = { ...draft, url: 'https://my-kit.dev' };
		const shot = 'https://my-kit.dev/img/window.png';
		expect(entryProblem('showcase', { ...home, screenshot: shot })).toBeUndefined();
		expect(entryProblem('showcase', { ...home, screenshot: '' })).toBeUndefined();
		expect('screenshot' in buildEntry('showcase', { ...home, screenshot: shot }, 'go', ph)).toBe(false);
		// An app, UI components and state management take a screenshot, and only an https link without characters that could break out of the pull request's quoting.
		expect(entryProblem('ui', { ...draft, screenshot: shot })).toBeUndefined();
		expect(entryProblem('plugin', { ...draft, screenshot: shot })).toMatch(/screenshot/);
		for (const bad of ['http://my-kit.dev/a.png', 'https://my-kit.dev/a b.png', 'https://my-kit.dev/a.png-->x', 'https://x.dev/`a`.png', 'https://x.dev/"a".png', `https://x.dev/${'a'.repeat(300)}.png`]) {
			expect(isBadShot(bad), bad).toBe(true);
			expect(entryProblem('showcase', { ...home, screenshot: bad }), bad).toMatch(/screenshot/);
		}
		expect(isBadShot('')).toBe(false);
		const app = JSON.stringify(buildEntry('showcase', home, 'go', ph));
		const body = new URL(issueUrl('https://github.com/yldm-tech/awesome-nsgo', 'showcase', 'App', { ...home, screenshot: shot }, app, ph)).searchParams.get('body') ?? '';
		expect(body).toContain(`Screenshot: ${shot}`);
		expect(new URL(issueUrl('https://github.com/yldm-tech/awesome-nsgo', 'showcase', 'App', home, app, ph)).searchParams.get('body')).not.toContain('Screenshot:');
	});

	it('looks for the screenshot in the repository of an app or a library', () => {
		expect([takesShot('showcase'), takesShot('ui'), takesShot('state'), takesShot('template'), takesShot('ai'), takesShot('plugin'), takesShot('article')]).toEqual([true, true, true, true, true, false, false]);
		expect(shotRepo('showcase', { url: 'https://my-kit.dev', repo: 'https://github.com/someone/my-kit' })).toBe('someone/my-kit');
		expect(shotRepo('showcase', { url: 'https://github.com/someone/my-kit' })).toBe('someone/my-kit');
		// A closed-source app has no repository to look in.
		expect(shotRepo('showcase', { url: 'https://my-kit.dev' })).toBeUndefined();
		expect(shotRepo('ui', { url: 'https://github.com/someone/icons' })).toBe('someone/icons');
		expect(shotRepo('plugin', { url: 'https://github.com/a/b' })).toBeUndefined();
		expect(pastedShotRepo('state', { repo: 'someone/store', url: 'https://github.com/someone/store' })).toBe('someone/store');
		expect(pastedShotRepo('showcase', { url: 'https://github.com/someone/my-app' })).toBe('someone/my-app');
		expect(pastedShotRepo('showcase', { url: 'https://my-app.dev/' })).toBeUndefined();
	});

	it('links the source of an app only when its homepage is not that repository already', () => {
		expect(appSource({ url: 'https://my-kit.dev', repo: 'someone/my-kit' })).toBe('https://github.com/someone/my-kit');
		expect(appSource({ url: 'https://github.com/Someone/My-Kit/', repo: 'someone/my-kit' })).toBeUndefined();
		expect(appSource({ url: 'https://my-kit.dev' })).toBeUndefined();
	});

	it('reads a pasted entry, and says when the text is not one', () => {
		expect(parseEntryJson('{"name":"x"}')).toEqual({ entry: { name: 'x' } });
		expect(parseEntryJson('{"name":')).toEqual({ error: 'json' });
		expect(parseEntryJson('[{"name":"x"}]')).toEqual({ error: 'object' });
		expect(parseEntryJson('null')).toEqual({ error: 'object' });
	});

	it('finds the one category whose file takes a pasted entry, for every category', () => {
		for (const cat of SUBMIT_CATS) {
			const entry = buildEntry(cat, draft, 'go', ph);
			expect(entryCats(entry), cat).toEqual([cat]);
			expect(pastedEntryProblem(cat, entry), cat).toBeUndefined();
		}
		expect(entryCats({ name: 'x' })).toEqual([]);
	});

	it('keeps what the form cannot write, such as translations, and names the field of a mistake', () => {
		const pail = { slug: 'pail', name: 'Pail', author: 'DejavuMoe', kind: 'go', url: 'https://github.com/DejavuMoe/Pail', summary: { en: 'S3 manager.', 'zh-CN': 'S3 管理器。' }, description: { en: 'A desktop S3 manager.' } };
		expect(pastedEntryProblem('showcase', pail)).toBeUndefined();
		expect(pastedEntryProblem('showcase', { ...pail, kind: 'tui' })).toMatch(/kind/);
		expect(pastedEntryProblem('showcase', { ...pail, extra: 1 })).toMatch(/extra/);
		expect(pastedEntryProblem('ui', pail)).toBeDefined();
	});

	it('refuses images a visitor cannot add, and names that are not one short line', () => {
		const pail = { slug: 'pail', name: 'Pail', author: 'DejavuMoe', kind: 'go', url: 'https://github.com/DejavuMoe/Pail', summary: { en: 'S3 manager.' }, description: { en: 'S3 manager.' } };
		expect(pastedEntryProblem('showcase', { ...pail, screenshot: 'pail.webp' })).toMatch(/screenshot/);
		expect(pastedEntryProblem('showcase', { ...pail, icon: { file: 'pail.webp' } })).toMatch(/icon/);
		expect(pastedEntryProblem('showcase', { ...pail, icon: { ailogo: 'abc' } })).toBeUndefined();
		expect(pastedEntryProblem('showcase', { ...pail, name: 'a\nb' })).toMatch(/single line/);
		expect(pastedEntryProblem('showcase', { ...pail, name: 'x'.repeat(81) })).toMatch(/80/);
		expect(pastedName({ title: ' An article ' })).toBe('An article');
	});

	it('says which entry on the site a submission repeats, by the field its category keeps unique', () => {
		for (const lib of UI_LIBS) expect(alreadyListed('ui', { ...buildEntry('ui', draft, 'go', ph), repo: lib.repo }), lib.slug).toBe(lib.name);
		for (const st of STATE_SOLUTIONS) expect(alreadyListed('state', { repo: st.repo }), st.slug).toBe(st.name);
		for (const p of [...PLUGINS, ...COMMUNITY_PLUGINS]) expect(alreadyListed('plugin', { slug: p.slug }), p.slug).toBe(p.name);
		for (const ar of ARTICLES) expect(alreadyListed('article', { url: ar.url }), ar.slug).toBe(ar.title);
		for (const a of APPS) expect(alreadyListed('showcase', { slug: a.slug }), a.slug).toBe(a.name);
		for (const cat of SUBMIT_CATS) expect(alreadyListed(cat, buildEntry(cat, draft, 'go', ph)), cat).toBeUndefined();
	});

	it('writes an entry\'s file with the time given, now otherwise, and refuses one that breaks its check', () => {
		const app = buildEntry('showcase', draft, 'go', ph);
		const text = entryFileText('showcase', app, '2026-11-04T12:00:00Z');
		expect(text.endsWith('}\n')).toBe(true);
		expect(entryFileText('showcase', { ...app, added: '1999-01-01T00:00:00Z' }, '2026-11-04T12:00:00Z')).toBe(text);
		expect(JSON.parse(entryFileText('ui', buildEntry('ui', draft, 'go', ph))).added).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
		expect(() => entryFileText('showcase', { ...app, summary: { ja: 'x' } })).toThrow(CatalogError);
		expect(() => entryFileText('ui', { ...buildEntry('ui', draft, 'go', ph), summary: { ja: 'x' } })).toThrow(/summary\.en/);
	});
});

describe('submission pull request', () => {
	const ph = { name: 'Name', desc: 'One-line description.' };
	const draft = { name: 'Brand New Kit', author: 'someone', url: 'https://github.com/someone/brand-new-kit', desc: 'Widgets for NSGo.' };
	const shot = 'https://x.dev/s.png';
	const closing = "The entry passed the catalog checks before it was submitted, and CI runs them again. The *Complete submission* workflow then adds what the form cannot ask for (an app's icon, the screenshot uploaded with the form, from its link or from the project's repository, a library's homepage, the copy in every site language, and a value for each field the form leaves at a default, such as `tag`, `tags` or `surface`) and comments what it did. Before merging, check that the project exists and is built with NSGo, and read the generated copy and the values it picked.";

	it('writes the body of a submission from the form as it always has', () => {
		const entry = buildEntry('ui', draft, 'go', ph);
		const fence = `\`\`\`json\n${JSON.stringify(entry, null, 2)}\n\`\`\``;
		const first = "Submitted through the form on https://awesomensgo.dev by a visitor without a GitHub account, so the site's bot opened this pull request.";
		const category = 'Category: UI components (`packages/catalog/data/ui/brand-new-kit.json`)';
		expect(submissionBody({ cat: 'ui', name: 'Brand New Kit', entry })).toBe([first, category, fence, closing].join('\n\n'));
		// The shape packages/enrich reads the link from (submittedScreenshot).
		expect(submissionBody({ cat: 'ui', name: 'Brand New Kit', entry, screenshot: shot })).toBe([first, category, fence, `Screenshot from the form: \`${shot}\`\n<!-- submitted-screenshot: ${shot} -->`, closing].join('\n\n'));
		const staged = "Screenshot uploaded with the form, staged as `submissions/brand-new-kit.png`; the workflow turns it into the site's WebP and removes it:\n\n![Screenshot of Brand New Kit](https://raw.githubusercontent.com/yldm-tech/awesome-nsgo/abc123/submissions/brand-new-kit.png)";
		expect(submissionBody({ cat: 'ui', name: 'Brand [New] Kit', entry, staged: { path: 'submissions/brand-new-kit.png', commit: 'abc123' } })).toBe([first, category, fence, staged, closing].join('\n\n'));
		expect(submittedIssue(submissionBody({ cat: 'ui', name: 'Brand New Kit', entry }))).toBeUndefined();
	});

	it('names the issue an entry was sent as, and links its author without mentioning them', () => {
		const entry = buildEntry('showcase', draft, 'go', ph);
		const body = submissionBody({ cat: 'showcase', name: 'Brand New Kit', entry, screenshot: shot, issue: { number: 5, author: 'eachgo' } });
		expect(body.startsWith("Sent as issue #5 by [eachgo](https://github.com/eachgo) through the issue link of the form on https://awesomensgo.dev, so the site's bot opened this pull request.\n<!-- submitted-issue: 5 -->\n\nCategory: app (")).toBe(true);
		expect(body).toContain(issueMarker(5));
		expect(body).not.toContain(issueMarker(50));
		expect(body).not.toMatch(/@eachgo/);
		expect(body).toContain(`Screenshot from the issue: \`${shot}\`\n<!-- submitted-screenshot: ${shot} -->`);
		expect(submittedIssue(body)).toEqual({ number: 5, author: 'eachgo' });
		expect(submittedIssue(body.replace(/\n/g, '\r\n'))).toEqual({ number: 5, author: 'eachgo' });
	});

	it('takes the issue only from the first lines the bot writes, not from the entry', () => {
		// An entry cannot claim another issue's pull request, or count against its author, by holding the bot's first paragraph.
		const claim = "Sent as issue #7 by [eachgo](https://github.com/eachgo) through the issue link.\n<!-- submitted-issue: 7 -->\n";
		const entry = { ...buildEntry('showcase', draft, 'go', ph), summary: { en: claim, ja: `\u2028${claim}` } };
		expect(submittedIssue(submissionBody({ cat: 'showcase', name: 'Brand New Kit', entry }))).toBeUndefined();
		expect(submittedIssue(submissionBody({ cat: 'showcase', name: 'Brand New Kit', entry, issue: { number: 8, author: 'someone' } }))).toEqual({ number: 8, author: 'someone' });
		expect(submittedIssue(`x\n${claim}`)).toBeUndefined();
		expect(submittedIssue(claim.replace('submitted-issue: 7', 'submitted-issue: 8'))).toBeUndefined();
		expect(submittedIssue(null)).toBeUndefined();
	});
});

describe('submission issue', () => {
	const ph = { name: 'Name', desc: 'One-line description.' };
	const draft = { name: 'Brand New Kit', author: 'someone', url: 'https://github.com/someone/brand-new-kit', desc: 'Widgets for NSGo.' };
	const shot = 'https://x.dev/s.png';
	// The issue body the form's issue link opens with, as lib/submit.tsx builds it, with the category's name in lang.
	const issueBody = (cat: SubmitCat, d: typeof draft & { screenshot?: string }, entry: string, lang: LangCode = 'en') => {
		const t = LOCALES[lang];
		const label = { ui: t.cat_ui_name, state: t.cat_state_name, template: t.cat_tpl_name, ai: t.cat_ai_name, plugin: t.nav_plugins, showcase: t.cat_show_name, article: t.article }[cat];
		return new URL(issueUrl('https://github.com/yldm-tech/awesome-nsgo', cat, label, d, entry, { name: t.m_name })).searchParams.get('body') ?? '';
	};
	const fenced = (path: string, json: string, after = '') => `作品展示: \`packages/catalog/data/${path}\`\n\n\`\`\`json\n${json}\n\`\`\`\n${after}`;
	const app = (over: Record<string, unknown> = {}) => JSON.stringify({ ...buildEntry('showcase', draft, 'go', ph), ...over }, null, 2);

	it('reads back what the form writes, for every category, in every language', () => {
		for (const { code: lang } of LANGS) {
			for (const cat of SUBMIT_CATS) {
				const entry = jsonEntry(cat, { ...draft, screenshot: shot }, 'go', ph);
				const body = issueBody(cat, { ...draft, screenshot: shot }, entry, lang);
				expect(submissionFromIssue(body), `${lang} ${cat}`).toEqual({ cat, entry: JSON.parse(entry), ...(takesShot(cat) ? { screenshot: shot } : {}) });
				// A body edited in the browser comes back with \r\n.
				expect(submissionFromIssue(body.replace(/\n/g, '\r\n')), `${lang} ${cat}`).toEqual(submissionFromIssue(body));
			}
		}
	});

	it('reads an entry that holds backticks, which the form fences with more of them', () => {
		const entry = app({ summary: { en: 'Renders ``` fences.' } });
		const body = issueBody('showcase', draft, entry);
		expect(body).toContain('````json\n');
		expect(submissionFromIssue(body)).toEqual({ cat: 'showcase', entry: JSON.parse(entry) });
	});

	it('leaves other issues alone, and finds the path line under a sentence the sender added', () => {
		expect(submissionFromIssue('Bug: the page is blank')).toBeUndefined();
		expect(submissionFromIssue('')).toBeUndefined();
		expect(submissionFromIssue('See packages/catalog/data/apps/hop.json for the icon')).toBeUndefined();
		expect(submissionFromIssue(`Please add my app!\n\n${fenced('apps/brand-new-kit.json', app())}`)).toEqual({ cat: 'showcase', entry: JSON.parse(app()) });
	});

	it("takes the category from the path's directory and the file name from the entry", () => {
		expect(submissionFromIssue(fenced('apps/whatever.json', app()))).toMatchObject({ cat: 'showcase' });
		expect(submissionFromIssue(fenced('plugins/brand-new-kit.json', JSON.stringify(buildEntry('plugin', draft, 'go', ph))))).toMatchObject({ cat: 'plugin' });
		// A slug the file could not be named after is the entry's check to name.
		expect(submissionFromIssue(fenced('apps/Bad Slug.json', app({ slug: 'Bad Slug' })))).toEqual({ problem: expect.stringMatching(/slug/) });
		// The catalog's single file per category, before every entry had its own (#21).
		expect(submissionFromIssue(fenced('apps.json', app()))).toEqual({ problem: expect.stringMatching(/a file of its own, `packages\/catalog\/data\/<ui\|state\|templates\|ai\|plugins\|apps\|articles>\/<slug>\.json`/) });
		expect(submissionFromIssue(fenced('docs/x.json', app()))).toEqual({ problem: expect.stringMatching(/a file of its own/) });
	});

	it('says what is wrong with the code block', () => {
		// Without one it is not an entry sent from the form, such as a report that names a listed app's file.
		expect(submissionFromIssue('作品展示: `packages/catalog/data/apps/x.json`\n\nno entry here')).toBeUndefined();
		expect(submissionFromIssue(fenced('apps/x.json', '{'))).toEqual({ problem: expect.stringMatching(/does not parse/) });
		expect(submissionFromIssue(fenced('apps/x.json', '[]'))).toEqual({ problem: expect.stringMatching(/one JSON object/) });
		expect(submissionFromIssue(fenced('apps/x.json', app({ description: { en: 'x'.repeat(MAX_SUBMISSION) } })))).toEqual({ problem: 'the entry is longer than 16 KB' });
	});

	it('refuses what the form writes for a field left empty, in every category and language', () => {
		const empty = { name: '', author: '', url: '', desc: '' };
		for (const { code: lang } of LANGS) {
			const t = LOCALES[lang];
			for (const cat of SUBMIT_CATS) {
				const entry = jsonEntry(cat, empty, 'go', { name: t.m_name, desc: t.md_desc });
				expect(submissionFromIssue(issueBody(cat, { ...empty }, entry, lang)), `${lang} ${cat}`).toEqual({ problem: expect.stringMatching(/placeholder/) });
			}
		}
		const complete = buildEntry('showcase', draft, 'go', ph);
		expect(placeholderProblem(complete)).toBeUndefined();
		expect(placeholderProblem({ ...complete, name: '名称' })).toMatch(/name/);
		expect(placeholderProblem({ ...complete, summary: { en: LOCALES.ko.md_desc } })).toMatch(/summary/);
		expect(placeholderProblem({ ...buildEntry('state', draft, 'go', ph), install: ENTRY_PLACEHOLDERS.install })).toMatch(/install/);
		expect(buildEntry('showcase', { ...draft, author: '' }, 'go', ph).author).toBe(ENTRY_PLACEHOLDERS.author);
	});

	it('takes the screenshot line under the code block, for what shows one', () => {
		expect(submissionFromIssue(fenced('apps/x.json', app(), `\nScreenshot: ${shot}\n`))).toEqual({ cat: 'showcase', entry: JSON.parse(app()), screenshot: shot });
		expect(submissionFromIssue(fenced('apps/x.json', app(), '\nScreenshot: http://x.dev/s.png\n'))).toEqual({ problem: expect.stringMatching(/screenshot/) });
		const plugin = JSON.stringify(buildEntry('plugin', draft, 'go', ph));
		expect(submissionFromIssue(fenced('plugins/x.json', plugin, `\nScreenshot: ${shot}\n`))).toEqual({ problem: expect.stringMatching(/screenshot/) });
		// The example the bot's comment shows, pasted as written.
		expect(isBadShot(ENTRY_PLACEHOLDERS.url)).toBe(false);
		expect(submissionFromIssue(fenced('apps/x.json', app(), `\nScreenshot: ${ENTRY_PLACEHOLDERS.url}\n`))).toEqual({ problem: expect.stringMatching(/example link/) });
		// Above the code block it is not the form's line.
		expect(submissionFromIssue(`Screenshot: ${shot}\n${fenced('apps/x.json', app())}`)).toEqual({ cat: 'showcase', entry: JSON.parse(app()) });
	});

	it("takes an entry as a pasted one: with its file's $schema and added, without images", () => {
		// #263 pasted the file itself; entryFileText writes both anew.
		const hop = app({ $schema: '../schema/app.schema.json', added: '2026-11-04T12:00:00Z' });
		expect(submissionFromIssue(fenced('apps/x.json', hop))).toEqual({ cat: 'showcase', entry: JSON.parse(hop) });
		expect(submissionFromIssue(fenced('apps/x.json', app({ screenshot: 'kit.webp' })))).toEqual({ problem: expect.stringMatching(/screenshot and icon\.file/) });
	});
});

describe('agent submission', () => {
	const fields = { name: 'Brand New Kit', author: 'someone', url: 'github.com/someone/brand-new-kit', desc: 'Widgets for NSGo.' };
	const read = (input: unknown) => {
		const r = readAgentSubmission(input);
		if ('problems' in r) throw new Error(r.problems.join('; '));
		return r.submission;
	};
	const problemsOf = (input: unknown) => {
		const r = readAgentSubmission(input);
		return 'problems' in r ? r.problems.join('; ') : '';
	};

	// The request useSubmit's send (apps/web/src/lib/submit.tsx) makes from the form once fill-submission has filled it in (webmcp.ts, formOf, which sets every field): a pasted entry as read back from the form's JSON field, else the fields, with repo and group only for an app, the screenshot link only when it is a good one, and no author for an article. Both live in React code, so they are restated; the token is as long as the server takes.
	const sent = (sub: AgentSubmission): string => {
		const token = 'x'.repeat(2048);
		if (sub.via === 'json') return JSON.stringify({ cat: sub.cat, entry: JSON.parse(JSON.stringify(sub.entry, null, 2)), token });
		const d = sub.draft;
		const isShow = sub.cat === 'showcase';
		const shot = takesShot(sub.cat) && d.screenshot?.trim() && !isBadShot(d.screenshot) ? d.screenshot.trim() : undefined;
		return JSON.stringify({ cat: sub.cat, mode: sub.mode, name: d.name, author: sub.cat === 'article' ? '' : d.author, url: d.url, repo: isShow ? (d.repo ?? '') : undefined, screenshot: shot, desc: d.desc, group: isShow ? d.group : undefined, token });
	};
	// Whether the Worker takes that request: its size, parseSubmission, which is the server's own, then the checks the route (routes/api/submit.ts) and openSubmission (server/pull.ts) make before opening the pull request, which need the Worker and are restated with the catalog functions they call.
	const serverAccepts = (sub: AgentSubmission): boolean => {
		const text = sent(sub);
		if (new TextEncoder().encode(text).length > MAX_SUBMISSION) return false;
		const req = parseSubmission(text);
		if (!req) return false;
		if (req.kind === 'entry' ? (pastedEntryProblem(req.cat, req.entry) ?? placeholderProblem(req.entry)) : entryProblem(req.cat, req.draft)) return false;
		const entry = req.kind === 'entry' ? req.entry : buildEntry(req.cat, req.draft, req.mode, { name: '', desc: '' });
		try {
			entryFileText(req.cat, entry);
		} catch (err) {
			if (err instanceof CatalogError) return false;
			throw err;
		}
		return !alreadyListed(req.cat, entry);
	};

	it('reads the fields, adding https:// to links as the form does when a field is left', () => {
		const sub = read({ category: 'showcase', ...fields, repo: 'github.com/someone/brand-new-kit', screenshot: 'example.com/shot.png' });
		expect(sub).toEqual({ cat: 'showcase', via: 'form', mode: 'go', draft: { ...fields, url: 'https://github.com/someone/brand-new-kit', repo: 'https://github.com/someone/brand-new-kit', screenshot: 'https://example.com/shot.png' } });
		expect(read({ category: 'showcase', ...fields, mode: 'tsx', group: 'dev' })).toMatchObject({ mode: 'tsx', draft: { group: 'dev' } });
		expect(read({ category: 'article', name: 'Post', url: 'https://x.dev/post' })).toEqual({ cat: 'article', via: 'form', mode: 'go', draft: { name: 'Post', author: '', url: 'https://x.dev/post', desc: '' } });
		expect(read({ category: 'state', entry: { name: 'x' } })).toEqual({ cat: 'state', via: 'json', entry: { name: 'x' } });
	});

	it('refuses, naming the field, what the server would refuse or drop', () => {
		for (const bad of [null, 'x', [], 1]) expect(problemsOf(bad)).toMatch(/JSON object/);
		expect(problemsOf({ category: 'ui', ...fields, foo: 1 })).toMatch(/unknown fields: foo/);
		expect(problemsOf({ category: 'nope', ...fields })).toMatch(/category must be one of/);
		expect(problemsOf({ ...fields })).toMatch(/category/);
		expect(problemsOf({ category: 'ui', ...fields, name: 5 })).toMatch(/name must be a string/);
		expect(problemsOf({ category: 'showcase', ...fields, group: 'other' })).toMatch(/group must be one of/);
		expect(problemsOf({ category: 'ui', ...fields, group: 'dev' })).toMatch(/group: only an app/);
		expect(problemsOf({ category: 'plugin', ...fields, repo: 'https://github.com/a/b' })).toMatch(/repo: only an app/);
		expect(problemsOf({ category: 'showcase', ...fields, mode: 'tui' })).toMatch(/mode must be go or tsx/);
		expect(problemsOf({ category: 'plugin', ...fields, screenshot: 'https://x.dev/a.png' })).toMatch(/screenshot: only/);
		expect(problemsOf({ category: 'article', name: 'Post', url: 'https://x.dev/post', author: 'me' })).toMatch(/an article takes no author/);
		expect(problemsOf({ category: 'showcase', name: 'x', entry: {} })).toMatch(/either entry or the fields \(name\)/);
		expect(problemsOf({ category: 'showcase', entry: [] })).toMatch(/entry must be a JSON object/);
		expect(problemsOf({ category: 'showcase', entry: { name: 'x'.repeat(AGENT_MAX_BYTES) } })).toMatch(/larger than 12 KB/);
		// Every problem at once, so one call can fix them all.
		expect(problemsOf({ category: 'nope', foo: 1, name: 5 }).split('; ')).toHaveLength(3);
	});

	it('refuses to fill a link the form would show with no error, or the file would refuse', () => {
		const report = (input: object) => agentSubmissionReport(read(input));
		// http: the form, opened afresh, shows it filled in and only says the field is still needed.
		expect(report({ category: 'showcase', ...fields, url: 'http://brand-new-kit.example.com' }).problems).toEqual([expect.stringMatching(/url must be an https link/)]);
		expect(report({ category: 'ui', name: 'Brand New Kit', url: 'http://github.com/someone/brand-new-kit' }).problems).toEqual([expect.stringMatching(/url must be an https link/)]);
		// Links the form's rules take and the entry's file does not, which the Worker would refuse only after the captcha.
		for (const [cat, url] of [['showcase', 'https://'], ['plugin', 'https://'], ['article', 'https://'], ['article', 'https:///x'], ['ui', 'https://github.com/a/.git'], ['state', 'https://github.com/a/.git']] as const) {
			const input = cat === 'article' ? { category: cat, name: 'Brand New Post', url } : { category: cat, ...fields, url };
			const r = report(input);
			expect(r.problems, `${cat} ${url}`).toHaveLength(1);
			expect(serverAccepts(read(input)), `${cat} ${url}`).toBe(false);
			// Also while another field is still missing.
			expect(report({ ...input, name: undefined }).problems, `${cat} ${url}`).toHaveLength(1);
		}
	});

	it('only accepts what the server takes, for every category and every optional field', () => {
		const extras = [{}, { repo: 'github.com/someone/brand-new-kit' }, { repo: '' }, { screenshot: 'https://x.dev/a.png' }, { screenshot: '' }, { group: 'game' }, { mode: 'tsx' }, { author: undefined, desc: undefined }, { url: 'https://' }, { url: 'https://github.com/a/.git' }];
		let accepted = 0;
		for (const cat of SUBMIT_CATS) {
			const base = cat === 'article' ? { name: 'Brand New Post', url: 'https://x.dev/brand-new-post' } : fields;
			for (const extra of extras) {
				const r = readAgentSubmission({ category: cat, ...base, ...extra });
				if ('problems' in r) continue;
				const report = agentSubmissionReport(r.submission);
				if (report.needs.length > 0 || report.problems.length > 0) continue;
				accepted++;
				expect(serverAccepts(r.submission), `${cat} ${JSON.stringify(extra)}`).toBe(true);
			}
			const entry = buildEntry(cat, { ...fields, url: `https://github.com/someone/brand-new-kit` }, 'go', { name: '', desc: '' });
			const pasted = readAgentSubmission({ category: cat, entry });
			expect('submission' in pasted && agentSubmissionReport(pasted.submission).problems, cat).toEqual([]);
			if ('submission' in pasted) expect(serverAccepts(pasted.submission), cat).toBe(true);
		}
		expect(accepted).toBeGreaterThan(SUBMIT_CATS.length * 2);
	});

	it('lists what the form asks for apart from what it would not show', () => {
		const empty = agentSubmissionReport(read({ category: 'showcase' }));
		expect(empty.needs).toEqual(['still needed: url, name, author, desc (url must be an https link)']);
		expect(empty.problems).toEqual([]);
		// A missing field does not hide another problem, which the form would not explain.
		expect(agentSubmissionReport(read({ category: 'ui', name: 'Brand New Kit', desc: 'x'.repeat(descMax('ui') + 1) })).problems).toEqual([expect.stringMatching(/longer than 120/)]);
		expect(agentSubmissionReport(read({ category: 'ui', ...fields, url: 'https://example.com/kit' })).problems).toEqual([expect.stringMatching(/GitHub repository/)]);
		const ok = agentSubmissionReport(read({ category: 'ui', ...fields }));
		expect(ok).toMatchObject({ needs: [], problems: [], file: 'packages/catalog/data/ui/brand-new-kit.json' });
		expect(ok.entry).toEqual(buildEntry('ui', { ...fields, url: 'https://github.com/someone/brand-new-kit' }, 'go', { name: 'Name', desc: 'Description.' }));
		expect(agentSubmissionReport(read({ category: 'showcase', entry: { slug: 'x', name: 'x', screenshot: 'x.webp' } })).problems).toHaveLength(1);
	});

	it('flags an entry the site already lists, by its unique field or its slug', () => {
		const app = APPS.find((a) => slugify(a.name) === a.slug) ?? APPS[0];
		expect(agentSubmissionReport(read({ category: 'showcase', ...fields, name: app.name })).problems).toEqual([`already listed on the site as ${app.name}`]);
		const lib = UI_LIBS[0];
		expect(agentSubmissionReport(read({ category: 'ui', ...fields, url: `https://github.com/${lib.repo}` })).problems).toEqual([`already listed on the site as ${lib.name}`]);
		// Another library under the same name would need the same file.
		expect(agentSubmissionReport(read({ category: 'ui', ...fields, name: lib.slug })).problems).toEqual([expect.stringMatching(new RegExp(`slug ${lib.slug} is already listed`))]);
		expect(agentSubmissionReport(read({ category: 'showcase', entry: buildEntry('showcase', { ...fields, url: 'https://github.com/someone/brand-new-kit', name: app.name }, 'go', { name: '', desc: '' }) })).problems).toEqual([`already listed on the site as ${app.name}`]);
		// Looked up as soon as the fields it is told apart by are there: an app's slug comes from its name alone, a library is listed by its link.
		expect(agentSubmissionReport(read({ category: 'showcase', name: app.name })).problems).toEqual([`already listed on the site as ${app.name}`]);
		expect(agentSubmissionReport(read({ category: 'ui', name: lib.slug })).problems).toEqual([expect.stringMatching(new RegExp(`slug ${lib.slug} is already listed`))]);
		expect(agentSubmissionReport(read({ category: 'ui', ...fields, url: undefined, name: lib.name })).problems.filter((p) => p.startsWith('already listed'))).toEqual([]);
		// A name with no Latin letter or digit takes its slug from the link, and nothing is looked up before there is one.
		expect(agentSubmissionReport(read({ category: 'showcase', name: '小工具' })).problems).toEqual([]);
		// A pasted entry that still holds the form's placeholders is refused, as the Worker refuses it.
		expect(agentSubmissionReport(read({ category: 'ui', entry: buildEntry('ui', { ...fields, url: '' }, 'go', { name: 'x', desc: 'y' }) })).problems).toEqual([expect.stringMatching(/placeholder/)]);
	});

	it('describes its input in a schema that matches the reader', () => {
		const props = AGENT_INPUT_SCHEMA.properties;
		expect(AGENT_FIELDS).toEqual(Object.keys(props));
		expect(AGENT_INPUT_SCHEMA.required).toEqual(['category']);
		expect(props.category.enum).toEqual([...SUBMIT_CATS]);
		expect(props.group.enum).toEqual([...ENTRY_GROUPS]);
		for (const [k, p] of Object.entries(props)) expect(p.description.length, k).toBeLessThanOrEqual(150);
		// Every field the schema names is one the reader takes.
		for (const k of AGENT_FIELDS) expect(problemsOf({ category: 'showcase', [k]: undefined })).not.toMatch(/unknown/);
		expect(AGENT_MAX_BYTES).toBeLessThan(MAX_SUBMISSION - 2048);
	});
});

describe('scores', () => {
	const kit: ScoreSignals = { repo: 'someone/kit', stars: 40, weeks: 12, activeWeeks: 5, license: 'MIT', osi: true, released: '2026-10-20', releaseDays: 3, likes: 1 };
	const file = (entries: Record<string, unknown>, asOf: string | null = '2026-11-02') => ({ $schema: './schema/scores.schema.json', asOf, entries });
	const read = (entry: object, key = 'app:kit') => () => readScores(file({ [key]: entry }));

	it('reads the bundled file', () => {
		expect(() => readScores(scoresFile)).not.toThrow();
		expect(SCORES_AS_OF).toBe(readScores(scoresFile).asOf);
		expect(readScores(file({ 'app:kit': kit, 'app:reef': { likes: 2 }, 'plugin:kit': { repo: 'someone/tools', path: 'plugins/kit', weeks: 3, activeWeeks: 0, license: null, likes: 0 }, 'ui:someone/old': { ...kit, license: 'NOASSERTION', osi: false, released: undefined, archived: true } })).entries['app:reef']).toEqual({ likes: 2 });
		expect(readScores(file({}, null))).toEqual({ asOf: null, entries: {} });
		// A record written before release days were counted still reads, without them.
		expect(readScores(file({ 'app:kit': { ...kit, releaseDays: undefined } })).entries['app:kit'].releaseDays).toBeUndefined();
		expect(readScores(file({ 'app:kit': { ...kit, releaseDays: 0 } })).entries['app:kit'].releaseDays).toBe(0);
		expect(readScores(file({ 'app:kit': { ...kit, releaseDays: 84 } })).entries['app:kit'].releaseDays).toBe(84);
	});

	it('names the entry\'s key and the field of each mistake', () => {
		expect(read({ ...kit, forks: 3 })).toThrow(/scores.json \(app:kit\): forks is not a known field/);
		expect(read({ ...kit, stars: -1 })).toThrow(/scores.json \(app:kit\): stars must be a whole number, 0 or more/);
		expect(read({ ...kit, likes: 1.5 })).toThrow(/\(app:kit\): likes must be a whole number/);
		expect(read({ ...kit, stars: '40' })).toThrow(/\(app:kit\): stars must be a whole number/);
		expect(read({ ...kit, likes: undefined })).toThrow(/\(app:kit\): likes is required/);
		expect(read({ ...kit, weeks: 4, activeWeeks: 5 })).toThrow(/\(app:kit\): activeWeeks must be at most weeks \(4\)/);
		expect(read({ ...kit, weeks: 13, activeWeeks: 5 })).toThrow(/\(app:kit\): weeks must be at most 12/);
		expect(read({ ...kit, activeWeeks: undefined })).toThrow(/\(app:kit\): activeWeeks is required with weeks/);
		expect(read({ ...kit, path: 'plugins/kit' }, 'plugin:kit')).toThrow(/scores.json \(plugin:kit\): stars is not recorded for an entry in a folder/);
		expect(read({ ...kit, released: '2026-10-2' })).toThrow(/\(app:kit\): released must be a day like 2026-11-02/);
		expect(read({ ...kit, released: '2026-02-30' })).toThrow(/\(app:kit\): released must be a day that exists/);
		expect(read({ ...kit, license: 7 })).toThrow(/\(app:kit\): license must be an SPDX id/);
		expect(read({ ...kit, license: null })).toThrow(/\(app:kit\): osi is recorded only with a license/);
		expect(read({ ...kit, archived: false })).toThrow(/\(app:kit\): archived is written only as true/);
		expect(read({ ...kit, releaseDays: 85 })).toThrow(/\(app:kit\): releaseDays must be at most 84, got 85/);
		expect(read({ ...kit, releaseDays: 1.5 })).toThrow(/\(app:kit\): releaseDays must be a whole number/);
		expect(read({ likes: 2, releaseDays: 0 }, 'app:reef')).toThrow(/\(app:reef\): releaseDays is recorded only for an entry with a repository/);
		expect(read({ likes: 2, stars: 40 }, 'app:reef')).toThrow(/\(app:reef\): stars is recorded only for an entry with a repository/);
		expect(read({ ...kit, repo: 'kit' })).toThrow(/\(app:kit\): repo must be owner\/name/);
		expect(read(kit, 'apps:kit')).toThrow(/scores.json: entries.apps:kit is not an entry key/);
		expect(() => readScores(file({ 'app:kit': kit }, null))).toThrow(/scores.json: asOf is required once there are entries/);
		expect(() => readScores(file({}, '2026/11/02'))).toThrow(/scores.json: asOf must be a day/);
		expect(() => readScores({ ...file({}), $schema: '../schema/scores.schema.json' })).toThrow(/scores.json: \$schema must be/);
		expect(() => readScores({ ...file({}), scores: {} })).toThrow(/scores.json: scores is not a known field/);
		expect(read(kit)).not.toThrow();
	});

	it('keys every score as its like, and scores only community plugins', () => {
		for (const a of APPS) expect(scoreKey('app', a)).toBe(likeKey.app(a));
		for (const l of UI_LIBS) expect(scoreKey('ui', l)).toBe(likeKey.ui(l));
		for (const s of STATE_SOLUTIONS) expect(scoreKey('state', s)).toBe(likeKey.state(s));
		for (const x of TEMPLATES) expect(scoreKey('template', x)).toBe(likeKey.template(x));
		for (const x of AI_TOOLS) expect(scoreKey('ai', x)).toBe(likeKey.ai(x));
		for (const p of [...PLUGINS, ...COMMUNITY_PLUGINS]) expect(scoreKey('plugin', p)).toBe(likeKey.plugin(p));
		expect([...SCORE_TARGETS.keys()].every((key) => LIKE_KEYS.has(key))).toBe(true);
		for (const p of PLUGINS) {
			expect(Object.keys(scoresFile.entries), p.slug).not.toContain(scoreKey('plugin', p));
			expect(SCORE_TARGETS.has(scoreKey('plugin', p)), p.slug).toBe(false);
		}
		for (const p of COMMUNITY_PLUGINS) expect(SCORE_TARGETS.has(scoreKey('plugin', p)), p.slug).toBe(true);
	});

	it('measures every community plugin from its repository or folder, and an app without a repo field by its repository link', () => {
		for (const p of COMMUNITY_PLUGINS) expect(SCORE_TARGETS.get(scoreKey('plugin', p)), p.slug).toEqual(expect.objectContaining({ repo: expect.any(String) }));
		// An app is measured by its repo field, else by its link when that is a GitHub repository; one with neither is closed-source and has only its likes.
		for (const a of APPS) expect(SCORE_TARGETS.get(scoreKey('app', a)), a.slug).toEqual(scoreTarget({ repo: a.repo, url: a.url }));
		expect(scoreTarget({ url: 'https://github.com/someone/game-2048' })).toEqual({ repo: 'someone/game-2048' });
		expect(scoreTarget({ url: 'https://reef.someone.dev' })).toEqual({});
	});

	it('scores an entry only from signals taken of the repository and folder it has now, and ignores entries that are gone', () => {
		// Targets as SCORE_TARGETS holds them, for two open-source apps in different repositories, a closed-source one and a community plugin in a folder of its repository: given here rather than taken from the site, which may list none of some.
		const keys = { app: 'app:kit', other: 'app:other', closed: 'app:reef', plugin: 'plugin:kit' };
		const targets = new Map([
			[keys.app, scoreTarget({ repo: 'someone/kit', url: 'https://kit.someone.dev' })],
			[keys.other, scoreTarget({ url: 'https://github.com/someone/other' })],
			[keys.closed, scoreTarget({ url: 'https://reef.someone.dev' })],
			[keys.plugin, scoreTarget({ url: 'https://github.com/someone/tools/tree/main/plugins/kit', goImport: 'github.com/someone/tools/plugins/kit' })],
		]);
		const at = (key: string) => targets.get(key)!;
		const app = { repo: 'someone/kit' };
		const scores = scoresFor(readScores(file({
			[keys.app]: { ...kit, ...at(keys.app) },
			[keys.other]: { ...kit, repo: 'someone/elsewhere' },
			[keys.closed]: { likes: 2 },
			[keys.plugin]: { ...kit, stars: undefined, repo: at(keys.plugin).repo, path: 'plugins/renamed' },
			'app:gone': kit,
		})), targets);
		expect([...scores.keys()].sort()).toEqual([keys.app, keys.closed].sort());
		expect(scores.get(keys.app)?.signals.repo).toBe(app.repo);
		expect(scores.get(keys.closed)?.score.total).toBe(37);
		const matched = scoresFor(readScores(file({ [keys.plugin]: { ...kit, stars: undefined, ...at(keys.plugin) }, [keys.closed]: { ...kit } })), targets);
		expect([...matched.keys()]).toEqual([keys.plugin]);
		expect(matched.get(keys.plugin)?.score.measured).toBeCloseTo(0.7, 10);
		expect(scoresFor(readScores(file({}, null)), targets).size).toBe(0);
		expect(scoresFor(readScores(file({}, null)), SCORE_TARGETS).size).toBe(0);
	});

	it('ranks an entry by its score, and one without a score after every scored one', () => {
		for (const key of LIKE_KEYS) {
			expect(scoreRank(key), key).toBe(entryScore(key)?.total ?? -1);
			expect(entrySignals(key) === undefined, key).toBe(entryScore(key) === undefined);
		}
		expect(HAS_SCORES).toBe([...LIKE_KEYS].some((k) => entryScore(k) !== undefined));
		expect(scoreRank('app:not-an-app')).toBe(-1);
		expect(entryScore('app:not-an-app')).toBeUndefined();
	});

	it('orders equal totals by the unrounded sum, then the raw stars, active weeks and release days, and an entry without a score last', () => {
		const at = (s: ScoreSignals): EntryScore => ({ signals: s, score: scoreOf(s, '2026-11-02') });
		const order = (...list: (EntryScore | undefined)[]) => [...list.keys()].sort((i, j) => compareScores(list[i], list[j]));
		const base = at(kit);
		// The total first: a higher one goes first whatever else.
		const higher = at({ ...kit, activeWeeks: 8 });
		expect(higher.score.total).toBeGreaterThan(base.score.total);
		expect(order(base, higher)).toEqual([1, 0]);
		// 40 and 41 stars give the same total, 60, but not the same sum: 59.7 and 59.8.
		const more = at({ ...kit, stars: 41 });
		expect([base.score.total, base.score.exact, more.score.total, more.score.exact]).toEqual([60, 59.7, 60, 59.8]);
		expect(order(base, more)).toEqual([1, 0]);
		// The same sum from more stars past the anchor, more active weeks past the full eight, or more release days past twelve.
		const big = { ...kit, stars: 1000, activeWeeks: 8, releaseDays: 12 };
		expect(order(at(big), at({ ...big, stars: 1639 }))).toEqual([1, 0]);
		expect(order(at(big), at({ ...big, activeWeeks: 12 }))).toEqual([1, 0]);
		expect(order(at(big), at({ ...big, releaseDays: 40 }))).toEqual([1, 0]);
		expect(at({ ...big, stars: 1639, activeWeeks: 12, releaseDays: 40 }).score.exact).toBe(at(big).score.exact);
		// Stars come before active weeks, and active weeks before release days.
		expect(order(at({ ...big, activeWeeks: 12, releaseDays: 40 }), at({ ...big, stars: 1001 }))).toEqual([1, 0]);
		expect(order(at({ ...big, releaseDays: 40 }), at({ ...big, activeWeeks: 9 }))).toEqual([1, 0]);
		// A count that was not measured goes after 0: an entry in a folder has no stars of its own.
		const folder = { ...big, stars: undefined, path: 'plugins/kit' };
		expect(compareScores(at(folder), at({ ...folder, stars: 0 }))).toBeGreaterThan(0);
		// Nothing tells identical signals apart: 0, so that a stable sort keeps the list's own order.
		expect(compareScores(at(kit), at({ ...kit }))).toBe(0);
		expect(order(at(kit), at({ ...kit }), at({ ...kit }))).toEqual([0, 1, 2]);
		// Without a score, after every scored entry, however low; two without are equal.
		const low = at({ likes: 0 });
		expect(order(undefined, low, undefined, base)).toEqual([3, 1, 0, 2]);
		expect(compareScores(undefined, undefined)).toBe(0);
		// By key, as the site sorts: the bundled scores, highest first, and a key without a score last.
		const keys = [...LIKE_KEYS, 'app:not-an-app'].sort(compareByScore);
		expect(keys.at(-1)).toBe('app:not-an-app');
		for (let i = 1; i < keys.length; i++) expect(scoreRank(keys[i]), keys[i]).toBeLessThanOrEqual(scoreRank(keys[i - 1]));
	});

	it('describes in its schema the fields the reader takes', () => {
		expect(scoresFile.$schema).toBe(`./schema/${scoresSchema.$id}`);
		expect(Object.keys(scoresSchema.properties).sort()).toEqual(['$schema', 'asOf', 'entries']);
		expect(Object.keys(scoresSchema.$defs.signals.properties).sort()).toEqual([...SCORE_FIELDS].sort());
		expect(scoresSchema.$defs.signals.required).toEqual(['likes']);
		expect(scoresSchema.$defs.signals.properties.weeks.maximum).toBe(ACTIVITY_WEEKS);
		expect(scoresSchema.$defs.signals.properties.releaseDays.maximum).toBe(ACTIVITY_WEEKS * 7);
	});
});
