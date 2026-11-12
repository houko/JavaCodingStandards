import { execFile } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { DEFAULT_MODEL, README_LIMIT, type LlmConfig, writeCopy } from './copy.ts';
import { github } from './github.ts';
import { downloadImage, writeCard, writeIcon, writeShot } from './image.ts';
import { type RepoFacts, type ShotSource, firstShot, latestReleaseAssets, ownIcon, repoFacts as readRepoFacts } from './repo.ts';
import { listDir } from './files.ts';
import { FORM_PLATFORMS, type ChoiceField, ENTRY_DIRS, STAGED_SHOTS, type Entry, type EntryKind, addedFiles, appNameFrom, knownFiles, formDefaults, hasAllLanguages, homepageOf, markProvisional, platformsFromConfig, repoOfEntry, repoShotSources, schemaEnum, setCategory, setGroup, setPlatforms, sniffImage, stagedShotOf, submittedScreenshot } from './source.ts';

// Run by .github/workflows/enrich-submission.yml on a pull request the submission bot opened, and by discover.ts on each entry it proposes. It finds the entries the branch adds, then for each fills in what the form cannot ask for: an app's icon (where its nsgo.yaml places it); the screenshot of an app, a UI library or a state management library (the first image in its README that can be one, or else in a screenshot folder of the repository); a UI library's or state management library's homepage (from the repository's settings); what the form fills in with a default (an app's group and platforms, a UI library's tag and surface, a plugin's surface, the tags of state management and plugins), picked by the model, or for an app's platforms read from its nsgo.yaml's build targets when it names them; and the copy in every site language. An entry with a repository is never left without an image: an app without an icon of its own gets its owner's GitHub avatar, and an entry without a screenshot gets the repository's social preview, or else a card drawn here from the owner's avatar, and the report says so. It changes files in the working tree and writes a Markdown report for the pull request; the workflow runs the catalog checks and commits.
//
// Environment: BASE_REF (the branch the entries are compared with, default origin/main), REPORT_FILE (where the report goes), GITHUB_TOKEN (for the GitHub API), and LLM_API_KEY with optional LLM_BASE_URL and LLM_MODEL for the copy; without LLM_API_KEY the copy is left as submitted.

const run = promisify(execFile);
const ROOT = join(import.meta.dirname, '../../..');
const DATA_DIR = 'packages/catalog/data';
const PUBLIC = 'apps/web/public';

const env = process.env;
const BASE_REF = env.BASE_REF || 'origin/main';
const report: string[] = [];
const say = (line: string): void => {
	report.push(line);
};

// The repository's facts, with an nsgo.yaml that cannot be read noted in the report.
const repoFacts = (repo: string) => readRepoFacts(repo, say);

// Adds the app's icon: its own, or else its owner's GitHub avatar, so an app with a repository never shows a bare letter tile. Returns where its own icon was taken from, for the screenshot search.
async function addIcon(entry: Entry, slug: string, facts: RepoFacts): Promise<string | undefined> {
	if (entry.icon !== undefined) return void say('- Icon: kept the one submitted.');
	const own = await ownIcon(slug, facts);
	if ('path' in own) {
		entry.icon = { file: `${slug}.webp` };
		if (own.guessed) say(`- The repository has no nsgo.yaml that places an icon, so the icon is \`${own.path}\`, the likeliest icon file in it.`);
		say(`- Icon: \`${own.path}\`, cut to its plate and saved as \`${PUBLIC}/icons/${slug}.webp\`. Check that it looks right.`);
		return own.url;
	}
	const avatar = `https://github.com/${facts.repo.split('/')[0]}.png?size=512`;
	const img = await downloadImage(avatar);
	if (img && (await writeIcon(img, join(ROOT, PUBLIC, 'icons', `${slug}.webp`)))) {
		entry.icon = { file: `${slug}.webp` };
		markProvisional(entry, 'icon');
		say(`- Icon: ${own.why}, so the owner's GitHub avatar (${avatar}) stands in, saved as \`${PUBLIC}/icons/${slug}.webp\`. Replace it with the app's own icon when there is one.`);
	} else say(`- Icon: ${own.why}, and the owner's GitHub avatar could not be used either; the app shows a letter tile. **Add an icon before merging.**`);
	return own.url;
}

// The link the visitor gave in the form first, as they picked it; then the README's images, as the project picked them to show itself; then the images in the repository's screenshot folders, which a project with none in its README often keeps for its website. Each source gets its own number of tries, so a README full of badges does not use up the folders' turn. An app without a repository can still get the form's screenshot.
// what names what the screenshot should show, for the report: the app, or the library.
// staged: the image the visitor uploaded with the form, which the site's bot put on the branch under submissions/ (stagedShot); it comes first, as they picked it, and is removed once it is the site's WebP.
async function addScreenshot(entry: Entry, slug: string, what: string, facts: RepoFacts | undefined, iconUrl: string | undefined, submitted: string | undefined, staged?: string): Promise<void> {
	if (entry.screenshot !== undefined) return say('- Screenshot: kept the one submitted.');
	if (!facts && !submitted && !staged) return;
	const out = join(ROOT, PUBLIC, 'shots', `${slug}.webp`);
	const tried: string[] = [];
	const skipped: string[] = [];
	if (staged) {
		const bytes = new Uint8Array(await readFile(join(ROOT, staged)));
		const format = sniffImage(bytes);
		const result = format ? await writeShot({ bytes, format }, out) : 'not a PNG, JPEG or WebP';
		await rm(join(ROOT, staged));
		if (result === 'ok') {
			entry.screenshot = `${slug}.webp`;
			return say(`- Screenshot: the image uploaded with the form (\`${staged}\`), saved as \`${PUBLIC}/shots/${slug}.webp\` and removed from \`${STAGED_SHOTS}/\`. Check that it shows ${what}.`);
		}
		skipped.push(`\`${staged}\`, uploaded with the form and removed (${result})`);
	}
	// picked: the visitor chose the image, so it is taken as it is; the repository's images may be artwork.
	const sources: ShotSource[] = [
		{ from: 'the link given in the form', urls: submitted ? [submitted] : [], tries: 1, picked: true },
		...(facts ? repoShotSources(facts).map((s) => ({ ...s, picked: false })) : []),
		// The last resort, so an entry with a repository is never without an image: the preview its owner set for the repository, or else the card GitHub draws of it.
		{ from: facts?.preview?.custom ? "the repository's social preview, as no screenshot was found" : "GitHub's card for the repository (its social preview), as no screenshot was found", urls: facts?.preview ? [facts.preview.url] : [], tries: 1, picked: true },
	];
	const hit = await firstShot(sources, out, iconUrl, tried, skipped);
	if (hit) {
		const { url } = hit;
		entry.screenshot = `${slug}.webp`;
		// GitHub's own card of the repository stands in; a preview its owner set is the project's image.
		if (url === facts?.preview?.url && !facts.preview.custom) markProvisional(entry, 'screenshot');
		const passed = skipped.length ? ` It passed over ${skipped.join(', ')}.` : '';
		const check = url === facts?.preview?.url ? ' Replace it with a screenshot when there is one.' : ` Check that it shows ${what}.`;
		return say(`- Screenshot: ${url} from ${hit.from}, saved as \`${PUBLIC}/shots/${slug}.webp\`.${check}${passed}`);
	}
	// Nothing the project has, nor GitHub's card: a card drawn here from the owner's avatar, so the entry is not left without an image.
	const passed = skipped.length ? ` The images tried: ${skipped.join(', ')}.` : '';
	if (facts) {
		const owner = facts.repo.split('/')[0];
		const avatar = await downloadImage(`https://github.com/${owner}.png?size=512`);
		if (avatar) {
			await writeCard(avatar, facts.repo, out);
			entry.screenshot = `${slug}.webp`;
			markProvisional(entry, 'screenshot');
			return say(`- Screenshot: none found, so a card of ${owner}'s GitHub avatar and ${facts.repo} was drawn, saved as \`${PUBLIC}/shots/${slug}.webp\`. Replace it with a screenshot when there is one.${passed}`);
		}
	}
	const none = '**Add a screenshot before merging.**';
	if (skipped.length) return say(`- Screenshot: none added. The images tried: ${skipped.join(', ')}. ${none}`);
	say(!facts ? `- Screenshot: none added, as the entry has no GitHub repository to take one from. ${none}` : `- Screenshot: none added, as the repository has no image and GitHub gave no social preview. ${none}`);
}

// A UI library's, state management library's, template's or AI tool's homepage, its website, demo or docs, which the form does not ask for: the one in the repository's settings, unless that is the repository itself.
function addHomepage(entry: Entry, facts: RepoFacts): void {
	if (entry.homepage !== undefined) return say('- Homepage: kept the one submitted.');
	const home = homepageOf(facts.homepage, facts.repo);
	if (!home) return say("- Homepage: none added, as the repository's settings name none.");
	entry.homepage = home;
	say(`- Homepage: ${home}, from the repository's settings.`);
}

const FIELD_NAMES: Record<ChoiceField | 'tags' | 'platforms', string> = { category: 'Category', group: 'Group', tag: 'Tag', surface: 'Surface', type: 'Type', tags: 'Tags', platforms: 'Platforms' };

// What the report says of a field the form filled in with a default that the model did not pick: an app with no category fails the catalog checks, the rest still pass at the default but are likely wrong. An app with no platforms, as the discover workflow adds it, fails the checks too, so it gets the three desktops, the form's default, and the report asks for a look.
function unpicked(field: ChoiceField | 'tags' | 'platforms', entry: Entry, why: string): string {
	if (field === 'group' || field === 'category') return `- ${FIELD_NAMES[field]}: none submitted, and none picked, ${why}. **Add one before merging.**`;
	if (field === 'platforms' && entry.platforms === undefined) {
		setPlatforms(entry, FORM_PLATFORMS);
		return `- Platforms: none submitted, and none picked, ${why}, so the entry lists the three desktops, the form's default. **Check them before merging.**`;
	}
	return `- ${FIELD_NAMES[field]}: left at the form's default, ${JSON.stringify(entry[field])}, ${why}. Check it before merging.`;
}

// The copy, and with it what the form fills in with a default rather than asking (formDefaults): an app needs a category, as without one it is the only app in the showcase's other group, which the catalog checks reject; a UI library's tag and surface, a plugin's surface and the tags pass the checks at their defaults but put the entry under the wrong filter. An app's category is picked from the ones the apps on the site already have: a group of a single app reads as a mistake, and the checks reject that too (godraw's Design was such a group).
// used: the categories of the apps on the site.
async function addCopy(cfg: LlmConfig | undefined, kind: EntryKind, entry: Entry, facts: RepoFacts | undefined, examples: Entry[], used: ReadonlySet<string>): Promise<void> {
	const picks = formDefaults(kind, entry);
	// The build targets in nsgo.yaml say what the app builds for, which settles its platforms without asking the model.
	const targeted = picks.platforms && facts?.nsgo ? platformsFromConfig(facts.nsgo.config) : undefined;
	if (targeted) {
		const was = entry.platforms;
		setPlatforms(entry, targeted);
		picks.platforms = false;
		say(`- Platforms: ${targeted.join(', ')}, from build.targets in \`${facts?.nsgo?.path}\`, as the ${was === undefined ? 'entry had none' : 'form writes the three desktops without asking'}. Check them.`);
	}
	const left = (why: string) => [...picks.choices.map((f) => unpicked(f, entry, why)), ...(picks.tags ? [unpicked('tags', entry, why)] : []), ...(picks.platforms ? [unpicked('platforms', entry, why)] : [])];
	if (hasAllLanguages(entry.summary) && (kind !== 'app' || hasAllLanguages(entry.description))) {
		say('- Copy: kept, as it is already in every site language.');
		return left('as the copy was kept').forEach(say);
	}
	if (!cfg) {
		say('- Copy: left as submitted, as LLM_API_KEY is not set for this workflow.');
		return left('as no model was asked').forEach(say);
	}
	if (facts?.readme && facts.readme.text.length > README_LIMIT) say(`- The README is ${facts.readme.text.length} characters long; the copy was written from its first ${README_LIMIT}.`);
	try {
		const schema: unknown = picks.choices.length ? JSON.parse(await readFile(join(ROOT, DATA_DIR, `schema/${kind}.schema.json`), 'utf8')) : undefined;
		const choices = picks.choices.map((field) => {
			const allowed = schemaEnum(schema, field);
			return { field, values: field === 'group' ? allowed.filter((g) => used.has(g)) : allowed };
		});
		// The release's file names say which platforms the app ships for; a failed request only leaves the model with the README and nsgo.yaml.
		const releaseAssets = picks.platforms && facts ? await latestReleaseAssets(facts.repo).catch(() => undefined) : undefined;
		const copy = await writeCopy(cfg, { kind, entry, readme: facts?.readme?.text, nsgoConfig: facts?.nsgo ? { path: facts.nsgo.path, text: facts.nsgo.text } : undefined, examples, choices, tags: picks.tags, platforms: picks.platforms, releaseAssets });
		entry.summary = copy.summary;
		if (kind === 'app' && copy.description) entry.description = copy.description;
		say(`- Copy: written by ${cfg.model} in all five languages from the submission${facts?.readme ? ' and the README' : ''}. Read it before merging.`);
		for (const field of picks.choices) {
			const pick = copy.choices[field];
			const bad = copy.badChoices[field];
			if (pick) {
				const was = entry[field];
				if (field === 'category') setCategory(entry, pick);
				else if (field === 'group') setGroup(entry, pick);
				else entry[field] = pick;
				say(`- ${FIELD_NAMES[field]}: ${pick}, picked by the model, as the form ${was === undefined ? 'leaves it out' : `left it at ${JSON.stringify(was)}`}. Check it.`);
			} else say(unpicked(field, entry, `as the model's pick${bad ? ` (${bad})` : ''} is not one ${field === 'group' ? "of the showcase's groups" : 'the schema allows'}`));
		}
		if (picks.tags && copy.tags) {
			entry.tags = copy.tags;
			say(`- Tags: ${copy.tags.join(', ')}, written by the model, as the form leaves them at a default. Check them.`);
		} else if (picks.tags) say(unpicked('tags', entry, 'as the model gave none'));
		if (picks.platforms && copy.platforms) {
			const was = entry.platforms;
			setPlatforms(entry, copy.platforms);
			const from = releaseAssets?.length ? "the latest release's files and the README" : facts?.nsgo ? 'the README and nsgo.yaml' : 'the README';
			say(`- Platforms: ${copy.platforms.join(', ')}, picked by the model from ${from}, as the ${was === undefined ? 'entry had none' : 'form writes the three desktops without asking'}. Check them.`);
		} else if (picks.platforms) say(unpicked('platforms', entry, 'as the model gave none'));
		if (copy.notes) say(`- Model's notes: ${copy.notes.replace(/\s+/g, ' ')}`);
		if (copy.tooLong.length) say(`- Still longer than the hand-written examples after one rewrite (length/limit): ${copy.tooLong.join(', ')}. Shorten before merging.`);
	} catch (err) {
		say(`- Copy: left as submitted, as writing it failed: ${err instanceof Error ? err.message : String(err)}`);
		left('as writing the copy failed').forEach(say);
	}
}

// Fills in one added entry, in place: for an app its name, icon and screenshot from its repository, for a UI library, state management library, template or AI tool its homepage and screenshot, and for every kind the copy.
// used: the categories of the apps on the site. submitted: the screenshot link from the site's form, for an app, a UI library, state management, a template or an AI tool.
async function complete(cfg: LlmConfig | undefined, kind: EntryKind, where: string, entry: Entry, examples: Entry[], used: ReadonlySet<string>, submitted?: string): Promise<void> {
	const staged = stagedShotOf(await listDir(join(ROOT, STAGED_SHOTS)), String(entry.slug));
	say(`### ${String(entry.name ?? entry.slug ?? '?')} (\`${where}\`)`);
	const repo = repoOfEntry(entry);
	const facts = repo ? await repoFacts(repo) : undefined;
	if (!repo) say('- No GitHub repository in the entry, so nothing was taken from one.');
	else if (!facts) say(`- The repository ${repo} could not be found.`);
	if (kind === 'app') {
		const slug = String(entry.slug);
		const better = facts?.nsgo ? appNameFrom(String(entry.name), facts.nsgo.config) : undefined;
		if (better) {
			say(`- Name: ${better}, as \`${facts?.nsgo?.path}\` spells it (submitted as ${String(entry.name)}).`);
			entry.name = better;
		}
		const iconUrl = facts ? await addIcon(entry, slug, facts) : undefined;
		await addScreenshot(entry, slug, 'the app', facts, iconUrl, submitted, staged);
	} else if (kind === 'ui' || kind === 'state' || kind === 'template' || kind === 'ai') {
		if (facts) addHomepage(entry, facts);
		await addScreenshot(entry, String(entry.slug), kind === 'template' ? 'the template' : kind === 'ai' ? 'the tool' : 'the library', facts, undefined, submitted, staged);
	}
	await addCopy(cfg, kind, entry, facts, examples, used);
}

// The entry's file, with added last as in the files written by hand, after the fields completed here.
function json(entry: Entry): string {
	const { added, ...rest } = entry;
	return `${JSON.stringify(added === undefined ? rest : { ...rest, added }, null, '\t')}\n`;
}

// The file names in a directory of the base branch, one a line; none when the base branch has no such directory, as a kind with no entry yet may not.
async function lsTree(dir: string): Promise<string> {
	try {
		return (await run('git', ['ls-tree', '--name-only', `${BASE_REF}:${dir}`], { cwd: ROOT, maxBuffer: 4 * 1024 * 1024 })).stdout;
	} catch (err) {
		const { stdout: has } = await run('git', ['ls-tree', '--name-only', BASE_REF, '--', dir], { cwd: ROOT });
		if (has.trim()) throw err;
		return '';
	}
}

async function main(): Promise<void> {
	const cfg: LlmConfig | undefined = env.LLM_API_KEY ? { apiKey: env.LLM_API_KEY, baseURL: env.LLM_BASE_URL || undefined, model: env.LLM_MODEL || DEFAULT_MODEL } : undefined;

	// Each kind's new entries: the files in its directory that the base branch does not have.
	const added: { kind: EntryKind; dir: string; known: string[]; names: string[] }[] = [];
	for (const kind of Object.keys(ENTRY_DIRS) as EntryKind[]) {
		const dir = `${DATA_DIR}/${ENTRY_DIRS[kind]}`;
		const listed = await lsTree(dir);
		const head = await listDir(join(ROOT, dir));
		// Only the entry files the branch still has: one it deletes or renames cannot be read as an example.
		const known = knownFiles(listed.split('\n'), head);
		const names = addedFiles(known, head);
		if (names.length) added.push({ kind, dir, known, names });
	}
	// The bot's pull request adds one entry, and its body may carry the screenshot link from the form; with several entries it would be unclear whose it is, so it is left out.
	const single = added.reduce((n, a) => n + a.names.length, 0) === 1;
	const pr = single && env.PR && env.GITHUB_REPOSITORY ? await github<{ body: string | null }>(`/repos/${env.GITHUB_REPOSITORY}/pulls/${env.PR}`) : undefined;
	const submitted = single ? submittedScreenshot(pr?.body) : undefined;
	// The showcase groups that have apps already: a new app picks its own from them, as a group of a single app fails the catalog checks.
	const used = new Set<string>();
	const appsDir = `${DATA_DIR}/${ENTRY_DIRS.app}`;
	const listedApps = await lsTree(appsDir);
	for (const name of listedApps.split('\n').filter((n) => n.endsWith('.json'))) {
		const { stdout } = await run('git', ['show', `${BASE_REF}:${appsDir}/${name}`], { cwd: ROOT, maxBuffer: 4 * 1024 * 1024 });
		const group = (JSON.parse(stdout) as Entry).group;
		if (typeof group === 'string') used.add(group);
	}
	for (const { kind, dir, known, names } of added) {
		const read = async (name: string) => JSON.parse(await readFile(join(ROOT, dir, name), 'utf8')) as Entry;
		// The voice to match: the two entries of the kind added last before this branch, none for the first of its kind.
		const examples = (await Promise.all(known.map(read))).sort((a, b) => String(a.added ?? '').localeCompare(String(b.added ?? ''))).slice(-2);
		for (const name of names) {
			const entry = await read(name);
			await complete(cfg, kind, `${dir}/${name}`, entry, examples, used, kind === 'plugin' ? undefined : submitted);
			await writeFile(join(ROOT, dir, name), json(entry));
		}
	}

	const text = report.length ? report.join('\n') : 'The branch adds no entry this workflow completes.';
	if (env.REPORT_FILE) await writeFile(env.REPORT_FILE, `${text}\n`);
	console.log(text);
}

await main();
