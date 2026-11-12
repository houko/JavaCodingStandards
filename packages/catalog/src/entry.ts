import { CatalogError } from './validate';
import { AI_KIND, AI_TOOLS, APP_KIND, APP_KINDS, APPS, type AppKind, APP_PLATFORMS, ARTICLE_KIND, ARTICLES, COMMUNITY_PLUGINS, DATA_DIR, ENTRY_GROUPS, type EntryGroup, type Kind, PLUGIN_KIND, PLUGINS, SITE_REPO, SITE_URL, STATE_KIND, STATE_SOLUTIONS, TEMPLATE_KIND, TEMPLATES, UI_KIND, UI_LIBS, hostOf, readEntry, readEntryFile } from './catalog';
import { LOCALES } from './strings';

// Submission form: it writes the JSON entry for the category. The site's bot opens a pull request with it, or a contributor with a GitHub account sends it as an issue or adds it themselves. Every entry gets a file of its own, data/<dir>/<slug>.json, so entries submitted together never conflict.

export const SUBMIT_CATS = ['ui', 'state', 'template', 'ai', 'plugin', 'showcase', 'article'] as const;
export type SubmitCat = (typeof SUBMIT_CATS)[number];

// The files each category's entries go in.
export const SUBMIT_KINDS: Record<SubmitCat, Kind<{ slug: string; added?: string }>> = { showcase: APP_KIND, ui: UI_KIND, state: STATE_KIND, template: TEMPLATE_KIND, ai: AI_KIND, plugin: PLUGIN_KIND, article: ARTICLE_KIND };

// Each category's name in a pull request title.
export const SUBMIT_LABELS: Record<SubmitCat, string> = { showcase: 'app', ui: 'UI components', state: 'state management', template: 'template', ai: 'AI tool', plugin: 'plugin', article: 'article' };

// When an entry is filed: now, in UTC to the second.
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

// The slug an entry's file is named after: its own, or for a pasted entry without one, its name's.
const slugOf = (entry: Record<string, unknown>): string => (typeof entry.slug === 'string' && entry.slug ? entry.slug : slugify(pastedName(entry)));

// Where an entry goes, under DATA_DIR: its own file in the category's directory, named after its slug.
export function entryPath(cat: SubmitCat, entry: Record<string, unknown>): string {
	return `${SUBMIT_KINDS[cat].dir}/${slugOf(entry)}.json`;
}

// The platforms an app's entry names until the submission workflow reads the ones it ships for: the three desktops. Listing every target NSGo builds for would claim phones, the web and mini programs that many apps never ship to.
export const DEFAULT_PLATFORMS = APP_PLATFORMS.filter((p) => p === 'mac' || p === 'win' || p === 'linux');

// The entry as its file holds it: an app submitted without platforms, as a pasted entry may be, gets the desktop ones (DEFAULT_PLATFORMS), as the form writes them without asking; the submission workflow then picks the ones it runs on.
function withPlatforms(cat: SubmitCat, entry: Record<string, unknown>): Record<string, unknown> {
	return cat === 'showcase' && entry.platforms === undefined ? { ...entry, platforms: [...DEFAULT_PLATFORMS] } : entry;
}

// Throws a CatalogError, naming the field, when entry would not pass its file's check.
export function checkEntry(cat: SubmitCat, entry: Record<string, unknown>): void {
	readEntry(SUBMIT_KINDS[cat], withPlatforms(cat, entry));
}

// What checkEntry would throw for entry, as text, or undefined when it passes.
function fileProblem(cat: SubmitCat, entry: Record<string, unknown>): string | undefined {
	try {
		checkEntry(cat, entry);
	} catch (err) {
		if (err instanceof CatalogError) return err.message;
		throw err;
	}
	return undefined;
}

// The entry's file as the repository keeps it: its schema first, the entry, and when it was added.
function fileOf(cat: SubmitCat, entry: Record<string, unknown>, added: string): Record<string, unknown> {
	const { $schema: _schema, added: _added, ...rest } = entry;
	return { $schema: SUBMIT_KINDS[cat].schema, ...withPlatforms(cat, rest), added };
}

// The entry's file as text, added now unless given. Throws a CatalogError, naming the field, when it would not pass the file's check.
export function entryFileText(cat: SubmitCat, entry: Record<string, unknown>, added = now()): string {
	const file = fileOf(cat, entry, added);
	readEntryFile(SUBMIT_KINDS[cat], entryPath(cat, file).slice(SUBMIT_KINDS[cat].dir.length + 1), file);
	return `${JSON.stringify(file, null, '\t')}\n`;
}

// The name of the entry on the site that entry would repeat, by the field its category keeps unique across files (an app's or plugin's slug, a library's or template's repository, an AI tool's or article's link), or undefined. A new slug is checked against the repository itself, as a file of that name.
export function alreadyListed(cat: SubmitCat, entry: Record<string, unknown>): string | undefined {
	switch (cat) {
		case 'showcase':
			return APPS.find((a) => a.slug === entry.slug)?.name;
		case 'ui':
			return UI_LIBS.find((l) => l.repo === entry.repo)?.name;
		case 'state':
			return STATE_SOLUTIONS.find((s) => s.repo === entry.repo)?.name;
		case 'template':
			return TEMPLATES.find((x) => x.repo === entry.repo)?.name;
		case 'ai':
			return AI_TOOLS.find((x) => x.url === entry.url)?.name;
		case 'plugin':
			return [...PLUGINS, ...COMMUNITY_PLUGINS].find((p) => p.slug === entry.slug)?.name;
		case 'article':
			return ARTICLES.find((a) => a.url === entry.url)?.title;
	}
}

// A card's line stays short; an app's description may run to a sentence or two.
export function descMax(cat: SubmitCat): number {
	return cat === 'showcase' ? 300 : 120;
}

export interface EntryDraft {
	name: string;
	author: string;
	// The showcase's homepage, a plugin's docs, an article; for UI components, state management, a template and an AI tool, the GitHub repository (an AI tool's may be its folder in one).
	url: string;
	desc: string;
	// Showcase only: the app's GitHub repository link, for an open-source app. Optional, since an app need not be open source.
	repo?: string;
	// Showcase only: the showcase group its author picked. Left out when none was picked; the submission workflow picks one then.
	group?: EntryGroup;
	// An app, UI components, state management, a template or an AI tool (takesShot): a link to a screenshot, for a project whose README and repository show none. Not part of the entry: the bot passes it to the submission workflow in the pull request, which downloads it into apps/web/public/shots. The form can upload an image instead, which the bot puts on the pull request's branch.
	screenshot?: string;
}

// Empty is not "bad": the error only shows once something that is not an https link has been typed.
export function isBadUrl(url: string): boolean {
	return url.length > 0 && !url.startsWith('https://');
}

// Articles have no author; every other category needs one.
export function needsAuthor(cat: SubmitCat): boolean {
	return cat !== 'article';
}

export function isEntryComplete(cat: SubmitCat, d: EntryDraft): boolean {
	return Boolean(d.name.trim() && d.url.trim() && !isBadUrl(d.url) && (cat === 'article' || d.desc.trim()) && (!needsAuthor(cat) || d.author.trim()));
}

export function slugify(name: string): string {
	return (
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'my-app'
	);
}

// The slug, and so the file name, of a new entry: from its name, or, for a name with no Latin letter or digit (留白), from its link (a repository's name, or the address), since every such name would otherwise become my-app and the second one could not be filed.
function entrySlug(name: string, url: string): string {
	if (/[a-z0-9]/i.test(name)) return slugify(name);
	return slugify(repoOf(url)?.split('/')[1] ?? url.replace(/^https:\/\//, '').slice(0, 60));
}

// owner/name of a GitHub link, which UI libraries, state management, templates and AI tools ask for.
export function repoOf(url: string): string | undefined {
	const m = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)/.exec(url.trim());
	return m ? `${m[1]}/${m[2].replace(/\.git$/, '')}` : undefined;
}

// A link typed or pasted without its scheme (github.com/you/app) is meant as https; anything else is left for isBadUrl to judge.
export function withScheme(url: string): string {
	const u = url.trim();
	if (!u || /^[a-z][a-z0-9+.-]*:/i.test(u)) return u;
	return /^[^\s/]+\.[^\s/]+/.test(u) ? `https://${u}` : u;
}

// For a GitHub repository link, the repository's name and its owner, which the form offers as the entry's name and author.
export function guessFromLink(url: string): { name: string; author: string } | undefined {
	const repo = repoOf(url);
	if (!repo) return undefined;
	const [author, name] = repo.split('/');
	return { name, author };
}

export type DraftField = 'url' | 'name' | 'author' | 'desc';

// What the draft still lacks before it can be submitted, in the form's order. Empty exactly when isEntryComplete holds (the description's length is capped by the field itself).
export function missingFields(cat: SubmitCat, d: EntryDraft): DraftField[] {
	const out: DraftField[] = [];
	if (!d.url.trim() || isBadUrl(d.url)) out.push('url');
	if (!d.name.trim()) out.push('name');
	if (needsAuthor(cat) && !d.author.trim()) out.push('author');
	if (cat !== 'article' && !d.desc.trim()) out.push('desc');
	return out;
}

// What buildEntry writes for a field the form left empty, besides the name and description it is given in the visitor's language. The form's issue link is there before the form is complete, so an issue can still hold them (placeholderProblem).
export const ENTRY_PLACEHOLDERS = { author: 'your-github-login', url: 'https://…', repo: 'owner/name', install: 'go get …', use: 'gh repo create my-app --template owner/name --clone', aiInstall: 'npx skills add owner/name' } as const;

// The entry as it goes into its data file. Missing fields show as placeholders, so the preview always has the final shape. mode is an app's kind, the language it is written in. A UI library and a template default to both kinds of app, as NSGo's TSX apps use Go components and its own ui package serves both; a plugin to Go apps, a Go package being what most are.
export function buildEntry(cat: SubmitCat, d: EntryDraft, mode: AppKind, placeholders: { name: string; desc: string }): Record<string, unknown> {
	const name = d.name.trim() || placeholders.name;
	const author = d.author.trim() || ENTRY_PLACEHOLDERS.author;
	const url = d.url.trim() || ENTRY_PLACEHOLDERS.url;
	const summary = { en: d.desc.trim() || placeholders.desc };
	const repo = repoOf(url);
	switch (cat) {
		case 'showcase':
			return { slug: entrySlug(name, url), name, author, kind: mode, platforms: [...DEFAULT_PLATFORMS], ...(d.group ? { group: d.group } : {}), url, ...(repoOf(d.repo ?? '') ? { repo: repoOf(d.repo ?? '') } : {}), summary, description: summary };
		case 'ui':
			return { slug: entrySlug(name, url), name, author, tag: 'theme', surface: 'both', summary, repo: repo ?? ENTRY_PLACEHOLDERS.repo, url };
		case 'state':
			return { slug: entrySlug(name, url), name, author, summary, repo: repo ?? ENTRY_PLACEHOLDERS.repo, url, install: repo ? `go get github.com/${repo}` : ENTRY_PLACEHOLDERS.install, tags: ['state'] };
		case 'template':
			return { slug: entrySlug(name, url), name, author, summary, repo: repo ?? ENTRY_PLACEHOLDERS.repo, url, surface: 'both', use: repo ? `gh repo create my-app --template ${repo} --clone` : ENTRY_PLACEHOLDERS.use, tags: ['template'] };
		case 'ai':
			return { slug: entrySlug(name, url), name, author, summary, repo: repo ?? ENTRY_PLACEHOLDERS.repo, url, type: 'skill', install: repo ? `npx skills add ${repo}` : ENTRY_PLACEHOLDERS.aiInstall, tags: ['ai'] };
		case 'plugin':
			return { slug: entrySlug(name, url), name, mark: name.replace(/\s/g, '').slice(0, 2), official: false, surface: 'go', tags: [], docs: url, summary };
		case 'article':
			return { slug: entrySlug(name, url), title: name, site: d.url.trim() ? hostOf(url).split('/')[0] : 'example.com', url };
	}
}

export function jsonEntry(cat: SubmitCat, d: EntryDraft, mode: AppKind, placeholders: { name: string; desc: string }): string {
	return JSON.stringify(buildEntry(cat, d, mode, placeholders), null, 2);
}

// A screenshot link the form accepts: https, at most 300 characters, and none of the characters that could break out of where the bot quotes it in the pull request (an HTML comment and a code span).
const SHOT_URL = /^https:\/\/[^\s<>"'`]+$/;

// A screenshot link that is filled in but is not one the form accepts.
export function isBadShot(link: string): boolean {
	const v = link.trim();
	return v.length > 0 && (v.length > 300 || !SHOT_URL.test(v));
}

// A showcase app's optional GitHub link that is filled in but is not a repository link.
export function isBadRepo(link: string): boolean {
	return link.trim().length > 0 && !repoOf(link);
}

// UI components, state management, templates and AI tools are listed by their GitHub repository.
export function needsRepo(cat: SubmitCat): boolean {
	return cat === 'ui' || cat === 'state' || cat === 'template' || cat === 'ai';
}

// The categories whose cards show a screenshot, which the form asks for when the project's repository has none to take.
export function takesShot(cat: SubmitCat): boolean {
	return cat === 'showcase' || needsRepo(cat);
}

// The GitHub repository (owner/name) the screenshot is looked for in: an app's repository, or its link when that is one; a library's link. undefined for an app without one, which then needs a screenshot from the form.
export function shotRepo(cat: SubmitCat, d: { url: string; repo?: string }): string | undefined {
	if (!takesShot(cat)) return undefined;
	return (cat === 'showcase' ? repoOf(d.repo ?? '') : undefined) ?? repoOf(d.url);
}

// The same for an entry pasted whole: its repo field, or its link when that is a repository.
export function pastedShotRepo(cat: SubmitCat, entry: Record<string, unknown>): string | undefined {
	if (!takesShot(cat)) return undefined;
	if (typeof entry.repo === 'string' && /^[^/\s]+\/[^/\s]+$/.test(entry.repo)) return entry.repo;
	return typeof entry.url === 'string' ? repoOf(entry.url) : undefined;
}

// Why the bot cannot submit this draft as it stands, or undefined when it can. The form shows the same rules; this is the server's copy of them for requests that skip the form.
export function entryProblem(cat: SubmitCat, d: EntryDraft): string | undefined {
	if (!isEntryComplete(cat, d)) return 'name, link, description and author are required, and the link must be https';
	if (d.desc.length > descMax(cat)) return `the description is longer than ${descMax(cat)} characters`;
	if (d.name.length > 80 || d.author.length > 80 || d.url.length > 300) return 'a field is too long';
	if ([d.name, d.author, d.url, d.desc].some((v) => /[\u0000-\u001f\u007f]/.test(v))) return 'fields must be a single line of text';
	if (/\s/.test(d.url.trim())) return 'the link must not contain spaces';
	if (needsRepo(cat) && !repoOf(d.url)) return 'UI components, state management, templates and AI tools need a GitHub repository link';
	if (cat === 'showcase' && d.repo?.trim() && (isBadRepo(d.repo) || d.repo.length > 300)) return 'the GitHub repository must be a link like https://github.com/owner/name';
	if (d.screenshot?.trim() && (!takesShot(cat) || isBadShot(d.screenshot))) return 'the screenshot must be an https link to an image, for an app, UI components, state management, a template or an AI tool';
	return undefined;
}

// ---- a pasted entry ----

// A contributor may paste a whole entry instead of filling in the form: it then goes into its data file as written, translations and all, once it passes the same check the file does.

// The most text the bot takes for one submission, in characters: the request the site's form sends the Worker (routes/api/submit.ts, which also holds its length in bytes to it), and the json code block of an issue sent from the form (submissionFromIssue).
export const MAX_SUBMISSION = 16 * 1024;

// The pasted text as one entry, or why it is not one.
export function parseEntryJson(text: string): { entry: Record<string, unknown> } | { error: 'json' | 'object' } {
	let v: unknown;
	try {
		v = JSON.parse(text);
	} catch {
		return { error: 'json' };
	}
	return v && typeof v === 'object' && !Array.isArray(v) ? { entry: v as Record<string, unknown> } : { error: 'object' };
}

// Why entry cannot be submitted as a cat entry, or undefined when it can. The file's own check names the field; the rest are the limits the form's fields have.
export function pastedEntryProblem(cat: SubmitCat, entry: Record<string, unknown>): string | undefined {
	const problem = fileProblem(cat, entry);
	if (problem) return problem;
	// Images live in the repository, and a visitor cannot add one; a maintainer adds them after merging.
	if (entry.screenshot !== undefined || (entry.icon as { file?: unknown } | undefined)?.file !== undefined) return 'screenshot and icon.file name images in the repository, which a maintainer adds; leave them out';
	const name = pastedName(entry);
	if (name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) return 'the name must be a single line of at most 80 characters';
	const url = String(entry.url ?? entry.docs ?? '');
	if (url.length > 300) return 'the link is longer than 300 characters';
	return undefined;
}

// Why entry still holds what the form writes for a field left empty, or undefined: a placeholder link, author, repository or install command, or the name or one-line description the form shows in any of the site's languages. pastedEntryProblem lets them through, as they are well-formed, and the paste box's category detection relies on that.
export function placeholderProblem(entry: Record<string, unknown>): string | undefined {
	const held = new Set<unknown>(Object.values(ENTRY_PLACEHOLDERS));
	const field = Object.keys(entry).find((k) => held.has(entry[k]));
	if (field) return `${field} is still the form's placeholder ${JSON.stringify(entry[field])}; fill it in`;
	const locales = Object.values(LOCALES);
	if (locales.some((l) => l.m_name === pastedName(entry))) return "the name is still the form's placeholder; fill it in";
	const summary = (entry.summary as { en?: unknown } | undefined)?.en;
	if (locales.some((l) => l.md_desc === summary)) return "the summary is still the form's placeholder; fill it in";
	return undefined;
}

// The categories whose file accepts entry. The form switches to the category when exactly one does.
export function entryCats(entry: Record<string, unknown>): SubmitCat[] {
	return SUBMIT_CATS.filter((cat) => !pastedEntryProblem(cat, entry));
}

// The entry's name, for pull request and issue titles: articles have a title instead.
export function pastedName(entry: Record<string, unknown>): string {
	const v = entry.name ?? entry.title;
	return typeof v === 'string' ? v.trim() : '';
}

// A Markdown code fence longer than any run of backticks in text, so the text cannot close it early.
export function codeFence(text: string, lang = ''): string {
	const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
	const fence = '`'.repeat(Math.max(3, longest + 1));
	return `${fence}${lang}\n${text}\n${fence}`;
}

// A new-issue link on repo, prefilled with the entry.
export function issueUrl(repo: string, cat: SubmitCat, catLabel: string, d: EntryDraft, entry: string, placeholders: { name: string }): string {
	const parsed = parseEntryJson(entry);
	const path = entryPath(cat, 'entry' in parsed ? parsed.entry : {});
	const shot = takesShot(cat) && d.screenshot?.trim() && !isBadShot(d.screenshot) ? `\nScreenshot: ${d.screenshot.trim()}\n` : '';
	const q = new URLSearchParams({ title: `Add ${d.name.trim() || placeholders.name} (${catLabel})`, body: `${catLabel}: \`${DATA_DIR}/${path}\`\n\n${codeFence(entry, 'json')}\n${shot}` });
	return `${repo}/issues/new?${q}`;
}

// GitHub's editor for the entry: a new file in the category's directory, named after its slug, with the entry filled in. For a visitor without write access it forks the repository and opens a pull request.
export function editUrl(repo: string, cat: SubmitCat, entry: Record<string, unknown>): string {
	const { dir } = SUBMIT_KINDS[cat];
	const value = `${JSON.stringify(fileOf(cat, entry, now()), null, '\t')}\n`;
	const q = new URLSearchParams({ filename: entryPath(cat, entry).slice(dir.length + 1), value });
	return `${repo}/new/main/${DATA_DIR}/${dir}?${q}`;
}

// ---- the request the form sends ----

// What the site's form sends /api/submit (apps/web/src/routes/api/submit.ts), read here rather than in the route so the catalog's tests can check that what the WebMCP tools accept is a request the Worker takes: either the form's fields, from which the entry is built, or an entry pasted whole, which goes in as written.
export type SubmitRequest = { cat: SubmitCat; token: string } & ({ kind: 'form'; draft: EntryDraft; mode: AppKind } | { kind: 'entry'; entry: Record<string, unknown> });

// The request body is untrusted: anything but the expected shape is undefined, before any field is used.
export function parseSubmission(text: string): SubmitRequest | undefined {
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		return undefined;
	}
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
	const r = raw as Record<string, unknown>;
	const str = (k: string) => (typeof r[k] === 'string' ? (r[k] as string) : undefined);
	const cat = SUBMIT_CATS.find((c) => c === r.cat);
	const token = str('token');
	if (!cat || !token || token.length > 2048) return undefined;
	if (r.entry !== undefined) return r.entry && typeof r.entry === 'object' && !Array.isArray(r.entry) ? { cat, token, kind: 'entry', entry: r.entry as Record<string, unknown> } : undefined;
	const mode = r.mode === undefined ? 'go' : APP_KINDS.find((k) => k === r.mode);
	const [name, author, url, desc, repo, screenshot] = [str('name'), str('author') ?? '', str('url'), str('desc') ?? '', str('repo'), str('screenshot')];
	// A showcase entry may name its group; anything not in the schema's list is refused rather than dropped.
	const group = r.group === undefined ? undefined : ENTRY_GROUPS.find((g) => g === r.group);
	if (r.group !== undefined && (!group || cat !== 'showcase')) return undefined;
	// Only a showcase app has a repository besides its link.
	if (r.repo !== undefined && (repo === undefined || cat !== 'showcase')) return undefined;
	// A screenshot link only for what shows one; entryProblem judges the link itself.
	if (r.screenshot !== undefined && (screenshot === undefined || !takesShot(cat))) return undefined;
	if (!mode || name === undefined || url === undefined) return undefined;
	return { cat, token, kind: 'form', mode, draft: { name, author, url, desc, group, repo, screenshot } };
}

// ---- the bot's pull request ----

// The marker the submission workflow reads an app's screenshot link from (packages/enrich, submittedScreenshot), on a line of its own: the entry's JSON above it cannot start a line with it, as every line of it starts with a space or a brace. The link has passed isBadShot, so it holds no space, quote, backtick or angle bracket and cannot end the comment.
const shotMarker = (url: string) => `<!-- submitted-screenshot: ${url} -->`;

// The marker of the issue a pull request was opened from, on the line under the first, by which the issue workflow finds the pull request it opened.
export const issueMarker = (n: number) => `<!-- submitted-issue: ${n} -->`;

// The body of the pull request the site's bot opens for a submission (apps/web/src/server/pull.ts). name is the entry's name as the title has it. screenshot is the link from the form or the issue, which is not part of the entry; staged is where an image uploaded with the form went on the branch, and the commit that put it there. issue is the issue the entry was sent as, and its author's login, which is linked rather than mentioned so nobody is notified.
export function submissionBody(s: { cat: SubmitCat; name: string; entry: Record<string, unknown>; screenshot?: string; staged?: { path: string; commit: string }; issue?: { number: number; author: string } }): string {
	return [
		s.issue ? `Sent as issue #${s.issue.number} by [${s.issue.author}](https://github.com/${s.issue.author}) through the issue link of the form on ${SITE_URL}, so the site's bot opened this pull request.\n${issueMarker(s.issue.number)}` : `Submitted through the form on ${SITE_URL} by a visitor without a GitHub account, so the site's bot opened this pull request.`,
		`Category: ${SUBMIT_LABELS[s.cat]} (\`${DATA_DIR}/${entryPath(s.cat, s.entry)}\`)`,
		codeFence(JSON.stringify(s.entry, null, 2), 'json'),
		// In a code span, so the visitor's link does not become a link here; the workflow downloads it and the report says whether it was used.
		...(s.screenshot ? [`Screenshot from the ${s.issue ? 'issue' : 'form'}: \`${s.screenshot}\`\n${shotMarker(s.screenshot)}`] : []),
		...(s.staged ? [`Screenshot uploaded with the form, staged as \`${s.staged.path}\`; the workflow turns it into the site's WebP and removes it:\n\n![Screenshot of ${s.name.replace(/[[\]]/g, '')}](${SITE_REPO.replace('https://github.com/', 'https://raw.githubusercontent.com/')}/${s.staged.commit}/${s.staged.path})`] : []),
		'The entry passed the catalog checks before it was submitted, and CI runs them again. The *Complete submission* workflow then adds what the form cannot ask for (an app\'s icon, the screenshot uploaded with the form, from its link or from the project\'s repository, a library\'s homepage, the copy in every site language, and a value for each field the form leaves at a default, such as `tag`, `tags` or `surface`) and comments what it did. Before merging, check that the project exists and is built with NSGo, and read the generated copy and the values it picked.',
	].join('\n\n');
}

// The issue a pull request's body says it was opened from, and the issue's author, or undefined for one from the form. Only the body's first two lines are read, which submissionBody writes above the entry, so nothing in the entry can pass for them; a body edited in the browser has \r\n line ends.
export function submittedIssue(body: string | null | undefined): { number: number; author: string } | undefined {
	const m = /^Sent as issue #(\d+) by \[([A-Za-z0-9-]+)\]\(https:\/\/github\.com\/\2\) [^\n]*\n<!-- submitted-issue: \1 -->\n/.exec((body ?? '').replace(/\r\n/g, '\n'));
	return m ? { number: Number(m[1]), author: m[2] } : undefined;
}

// ---- an entry sent as an issue ----

// The line issueUrl starts an issue with: the category's name in the sender's language, then the path of the entry's file. It is looked for on any line, so a sentence the sender put above it does not hide the submission.
const ISSUE_PATH = new RegExp(`^[^\\n\`]*: \`${DATA_DIR}/([^\`\\n]+)\`[ \\t]*$`, 'm');
// The json code block under it, fenced with as many backticks as codeFence needed.
const ISSUE_FENCE = /^(`{3,})(?:json)?[ \t]*\n([\s\S]*?)\n\1(?!`)[ \t]*$/im;
// The screenshot link issueUrl writes under the code block.
const ISSUE_SHOT = /^Screenshot: (\S+)[ \t]*$/m;

// What an issue written by issueUrl submits: the category, from the directory its path line names (the name before it is in the sender's language), the entry, from its json code block, and the link of its Screenshot line. undefined when the issue is not one issueUrl wrote, so other issues are left alone; a problem, saying what to fix, when it is one that cannot be submitted as it stands. The checks are the ones the site's form applies to a pasted entry; whether the site lists it already is checked against the repository when the pull request is opened.
export function submissionFromIssue(body: string): { cat: SubmitCat; entry: Record<string, unknown>; screenshot?: string } | { problem: string } | undefined {
	const text = body.replace(/\r\n?/g, '\n');
	const line = ISSUE_PATH.exec(text);
	if (!line) return undefined;
	// Any file name: whether the slug is a valid one is the entry's check to say. A path without a directory is the single file per category the catalog had before (data/apps.json).
	// The code block is what makes it an entry sent from the form: an issue that only names an entry's file, such as a report about a listed app, is left alone.
	const rest = text.slice(line.index + line[0].length);
	const fence = ISSUE_FENCE.exec(rest);
	if (!fence) return undefined;
	const dir = /^([^/]+)\/[^/]+\.json$/.exec(line[1])?.[1];
	const cat = SUBMIT_CATS.find((c) => SUBMIT_KINDS[c].dir === dir);
	if (!cat) return { problem: `the issue names \`${DATA_DIR}/${line[1]}\`, but every entry goes in a file of its own, \`${DATA_DIR}/<${SUBMIT_CATS.map((c) => SUBMIT_KINDS[c].dir).join('|')}>/<slug>.json\`; send the entry again from the form on ${SITE_URL}` };
	if (fence[2].length > MAX_SUBMISSION) return { problem: `the entry is longer than ${MAX_SUBMISSION / 1024} KB` };
	const parsed = parseEntryJson(fence[2]);
	if ('error' in parsed) return { problem: parsed.error === 'json' ? 'the json code block does not parse as JSON' : 'the json code block must hold one JSON object, the entry' };
	const shot = ISSUE_SHOT.exec(rest.slice(fence.index + fence[0].length))?.[1];
	if (shot !== undefined && (!takesShot(cat) || isBadShot(shot))) return { problem: 'the screenshot must be an https link to an image, for an app, UI components, state management, a template or an AI tool' };
	// The bot's comment asking for a screenshot shows the line with the form's placeholder link, which passes isBadShot.
	if (shot === ENTRY_PLACEHOLDERS.url) return { problem: `the Screenshot line still holds the example link ${shot}; put the link to the image in its place` };
	const problem = pastedEntryProblem(cat, parsed.entry) ?? placeholderProblem(parsed.entry);
	if (problem) return { problem };
	return { cat, entry: parsed.entry, ...(shot !== undefined ? { screenshot: shot } : {}) };
}

// ---- a submission from an AI agent ----

// The site offers WebMCP tools (apps/web/src/lib/webmcp.ts) through which an AI agent in the visitor's browser checks an entry and fills in the submit form for the visitor to check and send. Their input is untrusted and read more strictly than /api/submit reads a request, which ignores keys it does not know: unknown keys, wrong types and fields the category does not take are refused in words an agent can act on.

// The tools' input schema. It names the fields, the category and the closed lists, but leaves out what depends on the category (which fields each one takes and needs) and does not forbid other keys, so that readAgentSubmission and agentSubmissionReport name those problems in words an agent can act on, which a schema violation would not. Each description stays within the 150 characters Chrome recommends.
export const AGENT_INPUT_SCHEMA = {
	type: 'object',
	required: ['category'],
	properties: {
		category: { type: 'string', enum: [...SUBMIT_CATS], description: 'showcase: an NSGo app; ui: UI components; state: state management; template: an NSGo app template; ai: an AI tool for NSGo; plugin; article.' },
		name: { type: 'string', description: "The project's name as its author writes it; an article's title. At most 80 characters." },
		author: { type: 'string', description: "The author's GitHub login or name. Not for articles." },
		url: { type: 'string', description: 'An https link. showcase: homepage or repository; ui, state, template, ai: the GitHub repository; plugin: its docs; article: the article.' },
		desc: { type: 'string', description: 'One plain English sentence on what it is for: at most 300 characters for showcase, 120 otherwise. Not for articles.' },
		repo: { type: 'string', description: "showcase only: the app's GitHub repository link, when url is its homepage." },
		screenshot: { type: 'string', description: "showcase, ui, state, template, ai only: an https link to a screenshot, needed when the repository's README shows none." },
		group: { type: 'string', enum: [...ENTRY_GROUPS], description: 'showcase only: agents (tools for AI coding agents), dev, ai (assistants), network (proxy, VPN), notes, system, devices, media, game, chat.' },
		mode: { type: 'string', enum: [...APP_KINDS], description: 'showcase only: go when the NSGo app is written in Go, tsx when in TSX (with or without Go of its own). Defaults to go.' },
		entry: { type: 'object', description: "Instead of the fields: a whole entry in the category's JSON format, as in packages/catalog/data on GitHub, without screenshot or icon.file." },
	},
} as const;

export type AgentField = keyof typeof AGENT_INPUT_SCHEMA.properties;
export const AGENT_FIELDS = Object.keys(AGENT_INPUT_SCHEMA.properties) as AgentField[];

// Below what /api/submit takes (MAX_SUBMISSION), leaving room for the captcha token (up to 2 KB) and the rest of the request, so what the tools accept is never refused for its size on sending.
export const AGENT_MAX_BYTES = MAX_SUBMISSION - 4 * 1024;

// The form's fields, from which the entry is built, or an entry pasted whole, as /api/submit takes them.
export type AgentSubmission = { cat: SubmitCat } & ({ via: 'form'; draft: EntryDraft; mode: AppKind } | { via: 'json'; entry: Record<string, unknown> });

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// The agent's input as a submission, or every problem with it at once, so one call can fix them all. Links typed without https:// get it, as the form adds it when the visitor leaves the field.
export function readAgentSubmission(input: unknown): { submission: AgentSubmission } | { problems: string[] } {
	if (!isRecord(input)) return { problems: ['the input must be a JSON object'] };
	const problems: string[] = [];
	const unknown = Object.keys(input).filter((k) => !(AGENT_FIELDS as string[]).includes(k));
	if (unknown.length > 0) problems.push(`unknown fields: ${unknown.join(', ')} (the fields are ${AGENT_FIELDS.join(', ')})`);
	if (new TextEncoder().encode(JSON.stringify(input)).length > AGENT_MAX_BYTES) problems.push(`the input is larger than ${AGENT_MAX_BYTES / 1024} KB`);
	const cat = SUBMIT_CATS.find((c) => c === input.category);
	if (!cat) problems.push(`category must be one of ${SUBMIT_CATS.join(', ')}`);
	const fields = AGENT_FIELDS.filter((k) => k !== 'category' && k !== 'entry' && input[k] !== undefined);

	if (input.entry !== undefined) {
		if (fields.length > 0) problems.push(`pass either entry or the fields (${fields.join(', ')}), not both`);
		if (!isRecord(input.entry)) problems.push('entry must be a JSON object');
		if (problems.length > 0 || !cat || !isRecord(input.entry)) return { problems };
		return { submission: { cat, via: 'json', entry: input.entry } };
	}

	const text = (k: 'name' | 'author' | 'url' | 'desc' | 'repo' | 'screenshot'): string | undefined => {
		const v = input[k];
		if (v === undefined || typeof v === 'string') return v;
		problems.push(`${k} must be a string`);
		return undefined;
	};
	const [name, author, url, desc, repo, screenshot] = [text('name'), text('author'), text('url'), text('desc'), text('repo'), text('screenshot')];
	const mode = input.mode === undefined ? 'go' : APP_KINDS.find((k) => k === input.mode);
	if (!mode) problems.push(`mode must be ${APP_KINDS.join(' or ')}`);
	const group = input.group === undefined ? undefined : ENTRY_GROUPS.find((g) => g === input.group);
	if (input.group !== undefined && !group) problems.push(`group must be one of ${ENTRY_GROUPS.join(', ')}`);
	if (cat && cat !== 'showcase') {
		const appOnly = fields.filter((k) => k === 'repo' || k === 'group' || k === 'mode');
		if (appOnly.length > 0) problems.push(`${appOnly.join(', ')}: only an app (showcase) takes ${appOnly.length > 1 ? 'these' : 'this'}`);
	}
	if (cat && !takesShot(cat) && input.screenshot !== undefined) problems.push(`screenshot: only ${SUBMIT_CATS.filter(takesShot).join(', ')} take one`);
	if (cat === 'article') {
		const extra = fields.filter((k) => k === 'author' || k === 'desc');
		if (extra.length > 0) problems.push(`${extra.join(', ')}: an article takes no ${extra.join(' or ')}`);
	}
	if (problems.length > 0 || !cat || !mode) return { problems };
	const draft: EntryDraft = { name: name ?? '', author: author ?? '', url: withScheme(url ?? ''), desc: desc ?? '', ...(repo !== undefined ? { repo: withScheme(repo) } : {}), ...(screenshot !== undefined ? { screenshot: withScheme(screenshot) } : {}), ...(group ? { group } : {}) };
	return { submission: { cat, via: 'form', mode, draft } };
}

// What keeps a submission from being sent, split by whether the submit form shows it. needs are what the form itself asks for (the fields still missing here; the site adds a screenshot the repository lacks). problems are what the form would only find out on sending or would not explain, such as an entry already listed or a description that is too long; the fill tool leaves the form alone while there are any, so the visitor never faces a Submit button that is greyed out with no reason given.
export interface AgentReport {
	needs: string[];
	problems: string[];
	// The entry's file under the repository's root, and the entry as it will be filed.
	file: string;
	entry: Record<string, unknown>;
}

// The site's entries of the categories alreadyListed tells apart by their link, by their slugs, which name their files: another entry under the same name would need the same file. An app's and a plugin's slug is what alreadyListed compares already.
const LISTED_SLUGS: Partial<Record<SubmitCat, () => readonly { slug: string }[]>> = { ui: () => UI_LIBS, state: () => STATE_SOLUTIONS, template: () => TEMPLATES, ai: () => AI_TOOLS, article: () => ARTICLES };

// Why the bot would refuse entry as a repeat, as openSubmission does: an entry the site lists under the field its category keeps unique (alreadyListed), or a file of its slug. known says which of the two the fields given so far decide; an unknown one is not looked up, as entry holds a placeholder there. The bundled catalog is the deployed one, so an entry merged since then is only caught on sending.
function repeats(cat: SubmitCat, entry: Record<string, unknown>, known: { slug: boolean; link: boolean }): string[] {
	const bySlug = cat === 'showcase' || cat === 'plugin';
	const listed = (bySlug ? known.slug : known.link) ? alreadyListed(cat, entry) : undefined;
	if (listed) return [`already listed on the site as ${listed}`];
	const slug = slugOf(entry);
	return known.slug && LISTED_SLUGS[cat]?.().some((e) => e.slug === slug) ? [`an entry with the slug ${slug} is already listed; give this one a name that tells it apart`] : [];
}

// Valid stand-ins for the fields still missing, so the rest of the draft is judged too: entryProblem stops at the first problem, and a missing name would hide a description that is too long. They are also the name and description the reported entry shows until those are given.
const STAND_IN: Record<DraftField, string> = { url: 'https://github.com/owner/name', name: 'Name', author: 'author', desc: 'Description.' };

export function agentSubmissionReport(sub: AgentSubmission): AgentReport {
	if (sub.via === 'json') {
		const problem = pastedEntryProblem(sub.cat, sub.entry) ?? placeholderProblem(sub.entry);
		return { needs: [], problems: problem ? [problem] : repeats(sub.cat, sub.entry, { slug: true, link: true }), file: `${DATA_DIR}/${entryPath(sub.cat, sub.entry)}`, entry: sub.entry };
	}
	const { cat, draft, mode } = sub;
	const missing = missingFields(cat, draft);
	const whole = { ...draft, ...Object.fromEntries(missing.map((f) => [f, STAND_IN[f]])) };
	// A link given but not https counts as missing, yet the form, opened afresh on it, shows it filled in with no error until the visitor leaves the field.
	const badUrl = draft.url.trim() !== '' && isBadUrl(draft.url);
	// The entry's file check after the form's rules, as openSubmission writes the file only once it passes: entryProblem takes a link that is only https://, which the file refuses, as it does an article whose link has no host or a repository link with no name.
	const problem = badUrl ? `url must be an https link, got ${JSON.stringify(draft.url)}` : (entryProblem(cat, whole) ?? fileProblem(cat, buildEntry(cat, whole, mode, { name: '', desc: '' })));
	const entry = buildEntry(cat, draft, mode, STAND_IN);
	// The slug comes from the name, or from the link when the name has no Latin letter or digit; a library, a template, an AI tool and an article are told apart by their link.
	const known = { slug: !missing.includes('name') && (!missing.includes('url') || /[a-z0-9]/i.test(draft.name)), link: !missing.includes('url') };
	const problems = problem ? [problem] : repeats(cat, entry, known);
	const needs = missing.length > 0 ? [`still needed: ${missing.join(', ')}${missing.includes('url') ? ' (url must be an https link)' : ''}`] : [];
	return { needs, problems, file: `${DATA_DIR}/${entryPath(cat, entry)}`, entry };
}
