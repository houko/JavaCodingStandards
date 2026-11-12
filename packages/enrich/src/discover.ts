import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { DEFAULT_MODEL, type LlmConfig } from './copy.ts';
import { listDir } from './files.ts';
import { AWESOME_LISTS, BRANCH_PREFIX, type CodeHit, KIND_LABELS, type Listed, NSGO_MODULE, RECHECK_DAYS, type Seen, branchFor, configNear, entryFor, goModsIn, groupHits, isDue, isYoung, isSamplePath, listedAs, listedFrom, moduleOf, quiet, remember, reposInImportedBy, reposInMarkdown, requiresNsgo, tooNewToJudge, uniqueSlug, withoutFailed } from './find.ts';
import { github, rawFile } from './github.ts';
import { ENTRY_DIRS, type Entry, type EntryKind, appKindOf } from './source.ts';
import { triage } from './triage.ts';

// Run by .github/workflows/discover.yml once a day. It looks for projects whose go.mod requires NSGo and that the site does not list yet: through GitHub's code search for such go.mod files, and, as that search leaves out repositories it has not indexed, through code search for nsgo.yaml files, repository search for READMEs that name NSGo's module and for repositories named after it, pkg.go.dev's importers, and the repositories other curated lists of NSGo projects link to (AWESOME_LISTS in find.ts, empty while there are none); a repository found any way but the first has its go.mod checked before anything else. It asks the model whether each belongs on the site and as what, and opens a pull request for each one that does, completed as a submission is (main.ts: icon, screenshot, category and copy in every site language) and checked by the catalog's tests. A maintainer merges or closes it; a repository whose branch has had a pull request is never proposed again.
//
// The script works in the repository's working tree, checked out at main and clean, with origin/main fetched: for each proposal it checks out a branch of its own from origin/main, commits and pushes it, and leaves the tree detached at origin/main.
//
// Environment: GITHUB_TOKEN (the site's GitHub App, which pushes the branches and opens the pull requests, so CI runs on them; an installation token can search all public code), LLM_API_KEY with optional LLM_BASE_URL and LLM_MODEL, SEEN_FILE (where it remembers the repositories it looked at and did not propose), REPORT_FILE (a Markdown summary of the run), MAX_PRS (pull requests to open in a run, default 10), MAX_TRIAGE (repositories to ask the model about in a run, default 30), MAX_OPEN (no new pull request while this many of its own are open, default 20), MAX_CHECK (repositories found without a go.mod hit whose go.mod it looks for in a run, default 150), DRY_RUN=true to report what it would propose without pushing, opening or remembering anything, RETRY_FAILED=true to ask again about the repositories whose entry failed before, and REVIEWER (a GitHub login) to request a review of each pull request from, as the bot triages and a person decides. Without LLM_API_KEY it only lists the repositories it would ask about.

const run = promisify(execFile);
const ROOT = join(import.meta.dirname, '../../..');
const DATA_DIR = 'packages/catalog/data';
const PUBLIC = 'apps/web/public';
const BASE = 'main';

const env = process.env;
const SITE = env.GITHUB_REPOSITORY || 'yldm-tech/awesome-nsgo';
const count = (v: string | undefined, fallback: number) => (v && /^\d+$/.test(v) ? Number(v) : fallback);
const MAX_PRS = count(env.MAX_PRS, 10);
const MAX_TRIAGE = count(env.MAX_TRIAGE, 30);
const MAX_OPEN = count(env.MAX_OPEN, 20);
const MAX_CHECK = count(env.MAX_CHECK, 150);
const DRY_RUN = env.DRY_RUN === 'true';
const REVIEWER = env.REVIEWER?.trim() || undefined;
const now = new Date();

// Where a repository can be found, as the report names them.
const SOURCES = { goMod: 'a go.mod that names NSGo', config: 'an nsgo.yaml', readme: 'a README that names NSGo', name: 'a name, description or topic', pkgGoDev: 'pkg.go.dev', awesome: 'another list of NSGo projects' } as const;

const report: string[] = [];
const say = (line: string): void => {
	report.push(line);
	console.log(line);
};

const git = (...args: string[]) => run('git', args, { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- what the site lists, and what was proposed before ----

// What the site's entries list, with NSGo itself (oneo-me/nsgo, whose own packages are the official plugins) and this site among the repositories.
async function listedOnSite(): Promise<Listed> {
	const entries: Entry[] = [];
	for (const dir of [...Object.values(ENTRY_DIRS), 'articles']) {
		for (const name of await listDir(join(ROOT, DATA_DIR, dir))) {
			if (name.endsWith('.json')) entries.push(JSON.parse(await readFile(join(ROOT, DATA_DIR, dir, name), 'utf8')) as Entry);
		}
	}
	const listed = listedFrom(entries);
	listed.repos.add(NSGO_MODULE.replace('github.com/', ''));
	listed.repos.add(SITE.toLowerCase());
	return listed;
}

// The pull request of the repository's branch, open or closed, when there is one: the repository was proposed before.
async function branchPullRequest(repo: string): Promise<string | undefined> {
	const [owner] = SITE.split('/');
	const prs = await github<{ html_url: string }[]>(`/repos/${SITE}/pulls?state=all&per_page=1&head=${encodeURIComponent(`${owner}:${branchFor(repo)}`)}`);
	return prs?.[0]?.html_url;
}

// A pull request or issue on the site that names the repository, such as a visitor's submission, when there is one. A search, so it is paced, and asked only about a repository that is built with NSGo.
async function namedOnSite(repo: string): Promise<string | undefined> {
	await paced('other');
	const found = await github<{ total_count: number; items: { html_url: string }[] }>(`/search/issues?per_page=1&q=${encodeURIComponent(`repo:${SITE} "${repo}"`)}`);
	return found?.total_count ? found.items[0].html_url : undefined;
}

async function loadSeen(): Promise<Record<string, Seen>> {
	if (!env.SEEN_FILE) return {};
	try {
		const seen = JSON.parse(await readFile(env.SEEN_FILE, 'utf8')) as Record<string, Seen>;
		if (env.RETRY_FAILED !== 'true') return seen;
		const kept = withoutFailed(seen);
		say(`Asked to try the failed repositories again, so ${Object.keys(seen).length - Object.keys(kept).length} are due again.\n`);
		return kept;
	} catch {
		return {};
	}
}

// ---- finding projects ----

// GitHub's search limits: 10 code searches and 30 other searches a minute. Each search waits until its kind's pace allows.
const lastSearch = { code: 0, other: 0 };
async function paced(kind: 'code' | 'other'): Promise<void> {
	const wait = lastSearch[kind] + (kind === 'code' ? 6_500 : 2_200) - Date.now();
	if (wait > 0) await sleep(wait);
	lastSearch[kind] = Date.now();
}

interface CodeItem {
	path: string;
	repository: { full_name: string; fork: boolean };
}

async function codePage(query: string, page: number): Promise<{ total: number; hits: CodeHit[] }> {
	await paced('code');
	const res = await github<{ total_count: number; items: CodeItem[] }>(`/search/code?q=${encodeURIComponent(query)}&per_page=100&page=${page}`);
	return { total: res?.total_count ?? 0, hits: (res?.items ?? []).map((i) => ({ repo: i.repository.full_name, path: i.path, fork: i.repository.fork })) };
}

// Code search answers at most 1000 hits a query, 100 a page; past that the query is asked again in slices of file size, which together cover every hit.
const SIZE_SLICES = ['<1000', '1000..1999', '2000..3999', '>=4000'];

async function searchCode(query: string): Promise<CodeHit[]> {
	const all = async (q: string, first: { total: number; hits: CodeHit[] }) => {
		const hits = [...first.hits];
		for (let page = 2, last = first.hits.length; page <= 10 && last === 100 && hits.length < first.total; page++) {
			const next = await codePage(q, page);
			hits.push(...next.hits);
			last = next.hits.length;
		}
		return hits;
	};
	const first = await codePage(query, 1);
	if (first.total <= 1000) return all(query, first);
	const hits: CodeHit[] = [];
	for (const size of SIZE_SLICES) {
		const q = `${query} size:${size}`;
		hits.push(...(await all(q, await codePage(q, 1))));
	}
	return hits;
}

// Repositories whose name, description, topics or README match, up to the 1000 the search answers.
async function searchRepos(query: string): Promise<{ repo: string; fork: boolean }[]> {
	const out: { repo: string; fork: boolean }[] = [];
	for (let page = 1; page <= 10; page++) {
		await paced('other');
		const res = await github<{ total_count: number; items: { full_name: string; fork: boolean }[] }>(`/search/repositories?q=${encodeURIComponent(query)}&per_page=100&page=${page}`);
		const items = res?.items ?? [];
		out.push(...items.map((i) => ({ repo: i.full_name, fork: i.fork })));
		if (items.length < 100 || out.length >= (res?.total_count ?? 0)) break;
	}
	return out;
}

// The repositories pkg.go.dev knows import NSGo: Go's module proxy sees them, which GitHub's search does not need to have indexed. A page, not an API, so a failure is reported and the other sources carry on.
async function importedBy(): Promise<string[]> {
	const res = await fetch(`https://pkg.go.dev/${NSGO_MODULE}?tab=importedby`, { signal: AbortSignal.timeout(30_000) });
	if (!res.ok) throw new Error(`pkg.go.dev answered ${res.status}`);
	return reposInImportedBy(await res.text());
}

// The repositories the README of another list of NSGo projects links to, but not that list nor this site.
async function linkedFrom(list: string): Promise<string[]> {
	const readme = await github<{ content: string; encoding: string }>(`/repos/${list}/readme`);
	if (!readme) throw new Error('no README');
	return reposInMarkdown(Buffer.from(readme.content, readme.encoding === 'base64' ? 'base64' : 'utf8').toString('utf8'), [list, SITE]);
}

interface RepoMeta {
	full_name: string;
	html_url: string;
	description: string | null;
	homepage: string | null;
	stargazers_count: number;
	pushed_at: string;
	created_at: string;
	// Whether it has a release or a tag.
	released: boolean;
	default_branch: string;
	fork: boolean;
	archived: boolean;
	disabled: boolean;
	private: boolean;
	topics?: string[];
	license?: { spdx_id?: string } | null;
}

interface GqlRepo {
	nameWithOwner: string;
	url: string;
	description: string | null;
	homepageUrl: string | null;
	stargazerCount: number;
	pushedAt: string | null;
	createdAt: string;
	releases: { totalCount: number };
	refs: { totalCount: number } | null;
	isFork: boolean;
	isArchived: boolean;
	isDisabled: boolean;
	isPrivate: boolean;
	defaultBranchRef: { name: string } | null;
	licenseInfo: { spdxId: string | null } | null;
	repositoryTopics: { nodes: { topic: { name: string } }[] };
}

const REPO_FIELDS = 'fragment F on Repository { nameWithOwner url description homepageUrl stargazerCount pushedAt createdAt releases { totalCount } refs(refPrefix: "refs/tags/") { totalCount } isFork isArchived isDisabled isPrivate defaultBranchRef { name } licenseInfo { spdxId } repositoryTopics(first: 10) { nodes { topic { name } } } }';

// The metadata of many repositories, 50 to a GraphQL request rather than one request each. A repository GitHub does not find is left out; a batch that cannot be read counts as unread and waits for the next run.
async function repoMetas(repos: readonly string[]): Promise<{ metas: Map<string, RepoMeta>; unread: number }> {
	const metas = new Map<string, RepoMeta>();
	let unread = 0;
	for (let i = 0; i < repos.length; i += 50) {
		const batch = repos.slice(i, i + 50);
		const fields = batch.map((r, j) => {
			const [owner, name] = r.split('/');
			return `r${j}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { ...F }`;
		});
		const res = await github<{ data?: Record<string, GqlRepo | null> }>('/graphql', { method: 'POST', body: { query: `query { ${fields.join('\n')} }\n${REPO_FIELDS}` } }).catch(() => undefined);
		if (!res?.data) {
			unread += batch.length;
			continue;
		}
		batch.forEach((repo, j) => {
			const v = res.data?.[`r${j}`];
			if (!v) return;
			metas.set(repo.toLowerCase(), {
				full_name: v.nameWithOwner,
				html_url: v.url,
				description: v.description,
				homepage: v.homepageUrl,
				stargazers_count: v.stargazerCount,
				pushed_at: v.pushedAt ?? '',
				created_at: v.createdAt,
				released: v.releases.totalCount > 0 || (v.refs?.totalCount ?? 0) > 0,
				default_branch: v.defaultBranchRef?.name ?? '',
				fork: v.isFork,
				archived: v.isArchived,
				disabled: v.isDisabled,
				private: v.isPrivate,
				topics: v.repositoryTopics.nodes.map((n) => n.topic.name),
				license: v.licenseInfo ? { spdx_id: v.licenseInfo.spdxId ?? undefined } : null,
			});
		});
	}
	return { metas, unread };
}

// ---- one repository ----

interface Candidate {
	meta: RepoMeta;
	// The go.mod files code search matched; empty for a repository found another way, whose go.mod is looked for in its tree.
	goMods: string[];
	// Where the repository was found, for the report and the pull request.
	sources: string[];
}

// On how many days its latest 100 commits on the default branch were made: one for a project pushed in a day. Only read for a repository too young to judge otherwise (tooNewToJudge).
async function commitDays(repo: string): Promise<number> {
	const [owner, name] = repo.split('/');
	const res = await github<{ data?: { repository?: { defaultBranchRef?: { target?: { history?: { nodes: { committedDate: string }[] } } } | null } | null } }>('/graphql', { method: 'POST', body: { query: `query { repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { defaultBranchRef { target { ... on Commit { history(first: 100) { nodes { committedDate } } } } } } }` } });
	const nodes = res?.data?.repository?.defaultBranchRef?.target?.history?.nodes ?? [];
	return new Set(nodes.map((n) => n.committedDate.slice(0, 10))).size;
}

async function triageInput(c: Candidate) {
	const { full_name: repo, default_branch: branch } = c.meta;
	const tree = await github<{ tree: { path: string; type: string }[] }>(`/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
	const paths = (tree?.tree ?? []).filter((t) => t.type === 'blob').map((t) => t.path);
	// The go.mod that requires NSGo, shallowest first, as code search can match one that only names it.
	let goMod: { path: string; text: string } | undefined;
	for (const path of (c.goMods.length ? c.goMods : goModsIn(paths)).slice(0, 5)) {
		const text = await rawFile(repo, branch, path);
		if (text !== undefined && requiresNsgo(text)) {
			goMod = { path, text };
			break;
		}
	}
	if (!goMod) return undefined;
	const configPath = configNear(goMod.path, paths);
	const configText = configPath ? await rawFile(repo, branch, configPath) : undefined;
	const readme = await github<{ content: string; encoding: string }>(`/repos/${repo}/readme`);
	return {
		repo,
		metadata: { description: c.meta.description, homepage: c.meta.homepage, stars: c.meta.stargazers_count, topics: c.meta.topics ?? [], license: c.meta.license?.spdx_id ?? null, pushed_at: c.meta.pushed_at },
		goMod,
		config: configPath && configText !== undefined ? { path: configPath, text: configText } : undefined,
		// The app's kind as its files show it, read from the whole tree rather than the paths the model sees.
		appKind: configPath ? appKindOf(configPath, paths) : undefined,
		paths: paths.filter((p) => !/(^|\/)(node_modules|vendor)\//.test(p)).slice(0, 300),
		readme: readme?.encoding === 'base64' ? Buffer.from(readme.content, 'base64').toString('utf8') : undefined,
	};
}

// Pushing the branch or opening the pull request failed: a fault on GitHub's side or in this workflow, not in the repository, so it is not remembered and the next run tries again.
class PublishError extends Error {}

// Where main as it is now is fetched to, apart from origin/main, which keeps the commit the run began on.
const LATEST = 'refs/discover/latest';

const tail = (text: string, n: number) => (text.length > n ? `…${text.slice(-n)}` : text);
const codeBlock = (text: string) => `\`\`\`\`\n${text.replace(/````/g, '```')}\n\`\`\`\``;

// Adds the entry on a branch of its own, completes it with main.ts, runs the catalog's checks, pushes the branch and opens the pull request. Returns its link; throws with what went wrong, leaving no branch behind. The working tree is back on origin/main either way.
async function propose(c: Candidate, kind: EntryKind, entry: Entry, goModPath: string, reason: string): Promise<string> {
	const repo = c.meta.full_name;
	const branch = branchFor(repo);
	const dir = `${DATA_DIR}/${ENTRY_DIRS[kind]}`;
	const file = `${dir}/${entry.slug}.json`;
	const tmp = await mkdtemp(join(tmpdir(), 'discover-'));
	let pushed = false;
	await git('switch', '-q', '-C', branch, `origin/${BASE}`);
	try {
		// As the submission bot writes the file (entryFileText in packages/catalog): its schema first, the entry, and when it was added. The kind's directory may not exist yet, before its first entry.
		await mkdir(join(ROOT, dir), { recursive: true });
		await writeFile(join(ROOT, file), `${JSON.stringify({ $schema: `../schema/${kind}.schema.json`, ...entry, added: now.toISOString().replace(/\.\d{3}Z$/, 'Z') }, null, '\t')}\n`);

		const reportFile = join(tmp, 'report.md');
		await run('node', [join(import.meta.dirname, 'main.ts')], { cwd: ROOT, env: { ...env, BASE_REF: `origin/${BASE}`, REPORT_FILE: reportFile, PR: '' }, maxBuffer: 16 * 1024 * 1024 });
		const enrichReport = await readFile(reportFile, 'utf8');
		// main.ts adds the screenshot and icon after added; the files written by hand keep added last.
		const { added, ...done } = JSON.parse(await readFile(join(ROOT, file), 'utf8')) as Entry;
		await writeFile(join(ROOT, file), `${JSON.stringify({ ...done, added }, null, '\t')}\n`);
		try {
			await run('pnpm', ['--filter', '@awesome-nsgo/catalog', 'test'], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
		} catch (err) {
			const out = (err as { stdout?: string }).stdout ?? String(err);
			throw new Error(`the catalog checks failed on the completed entry:\n${codeBlock(tail(out, 1500))}`);
		}

		const name = String(done.name).replace(/@/g, '');
		await git('add', '-A', '--', DATA_DIR, PUBLIC);
		await git('commit', '-q', '-m', `feat(catalog): add ${name}`, '-m', `Found by the discover workflow in ${repo}, and completed from its repository: icon, screenshot and copy in every site language.`);
		// The checkout stays at main as the run found it, so every entry is completed by the same code. A branch cut from it carries main's workflow files as they were then, and once a pull request that changes one is merged during the run GitHub refuses the push, as the app has no workflows permission and the branch's workflow files differ from main's. So the entry's one commit is moved onto main as it is now before it is pushed.
		try {
			await git('fetch', '-q', 'origin', `+refs/heads/${BASE}:${LATEST}`);
			await git('rebase', '-q', LATEST);
			await git('push', '-q', '--force', 'origin', `HEAD:refs/heads/${branch}`);
		} catch (err) {
			throw new PublishError(`pushing the branch failed: ${err instanceof Error ? err.message : String(err)}`);
		}
		pushed = true;

		const body = [
			`Found by the scheduled *Discover projects* workflow through ${c.sources.join(', ')}: [${repo}](${c.meta.html_url}) (${c.meta.stargazers_count} stars) requires \`${NSGO_MODULE}\` in \`${goModPath}\`, and the site does not list it yet.`,
			`Category: ${KIND_LABELS[kind]} (\`${file}\`)`,
			`Why it looks like a fit, as the model judged from the repository: ${quiet(reason)}`,
			`## Completed from the repository\n\n${quiet(enrichReport.trim())}`,
			'The catalog checks passed on this entry before it was pushed, and CI runs them again. Before merging, check that the project is built with NSGo and worth listing, read the generated copy, and look at the icon and screenshot. To keep the project off the site, close this pull request: the workflow does not propose a repository again once a pull request of its branch exists.',
		].join('\n\n');
		const pr = await github<{ html_url: string; number: number }>(`/repos/${SITE}/pulls`, { method: 'POST', body: { title: `Add ${name} (${KIND_LABELS[kind]})`, head: branch, base: BASE, body } }).catch((err: unknown) => {
			throw new PublishError(`opening the pull request failed: ${err instanceof Error ? err.message : String(err)}`);
		});
		if (!pr) throw new PublishError('GitHub did not open the pull request');
		// The bot has triaged it; a person decides. A review that cannot be requested (the reviewer has no access) leaves the pull request open all the same.
		if (REVIEWER) await github(`/repos/${SITE}/pulls/${pr.number}/requested_reviewers`, { method: 'POST', body: { reviewers: [REVIEWER] } }).catch((err: unknown) => console.log(`::warning::requesting a review of ${pr.html_url} from ${REVIEWER} failed: ${err instanceof Error ? err.message : String(err)}`));
		return pr.html_url;
	} catch (err) {
		if (pushed) await github(`/repos/${SITE}/git/refs/heads/${branch}`, { method: 'DELETE' }).catch(() => undefined);
		throw err;
	} finally {
		// A rebase that stopped on a conflict, as when main added the same entry meanwhile, is undone before the tree goes back.
		await git('rebase', '--abort').catch(() => undefined);
		await git('reset', '-q', '--hard', `origin/${BASE}`);
		await git('clean', '-qfd', '--', DATA_DIR, PUBLIC);
		await git('switch', '-q', '--detach', `origin/${BASE}`);
		await git('branch', '-q', '-D', branch);
		await rm(tmp, { recursive: true, force: true });
	}
}

// ---- the run ----

async function main(): Promise<void> {
	const { stdout: dirty } = await git('status', '--porcelain', '--', DATA_DIR, PUBLIC);
	if (dirty.trim()) throw new Error(`the working tree has changes under ${DATA_DIR} or ${PUBLIC}; run this on a clean checkout`);

	const cfg: LlmConfig | undefined = env.LLM_API_KEY ? { apiKey: env.LLM_API_KEY, baseURL: env.LLM_BASE_URL || undefined, model: env.LLM_MODEL || DEFAULT_MODEL } : undefined;
	const open = (await github<{ head: { ref: string } }[]>(`/repos/${SITE}/pulls?state=open&per_page=100`)) ?? [];
	const openOwn = open.filter((p) => p.head.ref.startsWith(BRANCH_PREFIX)).length;
	say(`## Discover projects${DRY_RUN ? ' (dry run)' : ''}\n`);
	if (openOwn >= MAX_OPEN && !DRY_RUN) return say(`${openOwn} of this workflow's pull requests are open, the most it keeps open (MAX_OPEN), so it looked no further. Merge or close some first.`);

	const listed = await listedOnSite();
	const seen = await loadSeen();
	// Every source names repositories that may be built with NSGo. A go.mod that requires it is the proof, which code search finds directly; the other sources reach repositories code search has not indexed, and their go.mod is checked before the model is asked.
	const found = new Map<string, { repo: string; goMods: string[]; sources: string[] }>();
	const add = (repo: string, source: string, goMods: readonly string[] = []) => {
		const key = repo.toLowerCase();
		if (listed.repos.has(key)) return;
		const f = found.get(key) ?? { repo, goMods: [], sources: [] };
		for (const g of goMods) if (!f.goMods.includes(g)) f.goMods.push(g);
		if (!f.sources.includes(source)) f.sources.push(source);
		found.set(key, f);
	};
	const goModHits = await searchCode(`"${NSGO_MODULE}" filename:go.mod`);
	// NSGo is young and code search has indexed few of its projects, so finding none is reported rather than fatal: the other sources still run. A token that cannot search would find none either, so the report names that too.
	if (!goModHits.length) say(`Code search found no go.mod that names ${NSGO_MODULE}; if that persists, check that GITHUB_TOKEN can search code.\n`);
	for (const [repo, goMods] of groupHits(goModHits, listed.repos)) add(repo, SOURCES.goMod, goMods);
	for (const h of await searchCode('filename:nsgo.yaml')) if (!h.fork && !isSamplePath(h.path)) add(h.repo, SOURCES.config);
	for (const r of await searchRepos(`${NSGO_MODULE.replace('github.com/', '')} in:readme`)) if (!r.fork) add(r.repo, SOURCES.readme);
	// Many unrelated repositories are named nsgo (no-src/nsgo, a Go toolkit); their go.mod is checked before the model is asked, which passes them over.
	for (const r of await searchRepos('nsgo in:name,description,topics language:Go')) if (!r.fork) add(r.repo, SOURCES.name);
	try {
		for (const repo of await importedBy()) add(repo, SOURCES.pkgGoDev);
	} catch (err) {
		say(`pkg.go.dev could not be read (${err instanceof Error ? err.message : String(err)}), so its importers were left out of this run.\n`);
	}
	for (const list of AWESOME_LISTS) {
		try {
			for (const repo of await linkedFrom(list)) add(repo, SOURCES.awesome);
		} catch (err) {
			say(`${list} could not be read (${err instanceof Error ? err.message : String(err)}), so its links were left out of this run.\n`);
		}
	}
	const bySource = Object.values(SOURCES).map((src) => `${[...found.values()].filter((f) => f.sources.includes(src)).length} ${src}`);
	const due = [...found.values()].filter((f) => isDue(seen[f.repo.toLowerCase()], now));
	say(`Found ${found.size} repositories not on the site that may be built with NSGo (${bySource.join(', ')}; a repository can come from several), and ${due.length} of them are due for a look.\n`);

	// A repository that cannot be read now is left for the next run rather than ending this one.
	const { metas, unread } = await repoMetas(due.map((f) => f.repo));
	if (unread) say(`${unread} repositories could not be read from GitHub and wait for the next run.\n`);
	const fromGoMod = (c: Candidate) => c.sources.includes(SOURCES.goMod);
	// How likely a candidate is built with NSGo, by where it was found: a go.mod hit proves it; an nsgo.yaml, a README or pkg.go.dev say so; a name alone is often another project called nsgo.
	const rank = (c: Candidate) => (fromGoMod(c) ? 0 : c.sources.some((src) => src !== SOURCES.name) ? 1 : 2);
	const candidates = due
		.flatMap((f): Candidate[] => {
			const meta = metas.get(f.repo.toLowerCase());
			if (!meta || meta.fork || meta.archived || meta.disabled || meta.private || !meta.default_branch) return [];
			// Listed under its own homepage or by its owner, without naming the repository.
			return listedAs(listed, meta.full_name, meta.homepage) ? [] : [{ meta, goMods: f.goMods, sources: f.sources }];
		})
		// The likeliest first, and among them the most starred.
		.sort((a, b) => rank(a) - rank(b) || b.meta.stargazers_count - a.meta.stargazers_count || b.meta.pushed_at.localeCompare(a.meta.pushed_at));

	if (!cfg) {
		say(`LLM_API_KEY is not set, so no repository was judged. The first ${MAX_TRIAGE} it would ask about:\n`);
		for (const c of candidates.slice(0, MAX_TRIAGE)) say(`- [${c.meta.full_name}](${c.meta.html_url}), ${c.meta.stargazers_count} stars, from ${c.sources.join(', ')}${c.goMods[0] ? `: \`${c.goMods[0]}\`` : ''}`);
		return;
	}

	const lines = { proposed: [] as string[], deferred: [] as string[], skipped: [] as string[], failed: [] as string[] };
	let triaged = 0;
	let proposed = 0;
	// Repositories found without a go.mod hit whose go.mod was looked for, and those of them built without NSGo, which are counted rather than listed.
	let checked = 0;
	let notNsgo = 0;
	const room = DRY_RUN ? MAX_PRS : Math.min(MAX_PRS, MAX_OPEN - openOwn);
	for (const c of candidates) {
		if (triaged >= MAX_TRIAGE || proposed >= room || (!fromGoMod(c) && checked >= MAX_CHECK)) break;
		const repo = c.meta.full_name;
		const link = `[${repo}](${c.meta.html_url})`;
		// Set once the model has been asked: only then is a failure remembered, so a passing GitHub error costs a day, not two weeks. A failure to push or open the pull request is never remembered (PublishError).
		let asked = false;
		try {
			const pr = await branchPullRequest(repo);
			if (pr) {
				seen[repo.toLowerCase()] = remember('skip', `proposed before in ${pr}`, now);
				lines.skipped.push(`- ${link}: proposed before in ${pr}`);
				continue;
			}
			// A repository pushed in a day and made this week waits a week before it is judged at all (tooNewToJudge); the model is not asked about it yet.
			if (isYoung(c.meta.created_at, now) && !c.meta.released) {
				const days = await commitDays(repo);
				if (tooNewToJudge({ createdAt: c.meta.created_at, released: c.meta.released, commitDays: days }, now)) {
					const why = `made ${c.meta.created_at.slice(0, 10)}, with commits on ${days} day${days === 1 ? '' : 's'} and no release or tag: looked at again in ${RECHECK_DAYS.defer} days`;
					seen[repo.toLowerCase()] = remember('defer', why, now);
					lines.deferred.push(`- ${link}: ${why}`);
					continue;
				}
			}
			if (!fromGoMod(c)) checked++;
			const input = await triageInput(c);
			if (!input) {
				seen[repo.toLowerCase()] = remember('skip', `no go.mod requires ${NSGO_MODULE}`, now);
				if (fromGoMod(c)) lines.skipped.push(`- ${link}: no go.mod among ${c.goMods.join(', ')} requires ${NSGO_MODULE}`);
				else notNsgo++;
				continue;
			}
			const named = await namedOnSite(repo);
			if (named) {
				seen[repo.toLowerCase()] = remember('skip', `named already in ${named}`, now);
				lines.skipped.push(`- ${link}: named already in ${named}`);
				continue;
			}
			triaged++;
			asked = true;
			const v = await triage(cfg, input);
			if (v.verdict.trim().toLowerCase() === 'skip') {
				seen[repo.toLowerCase()] = remember('skip', v.reason, now);
				lines.skipped.push(`- ${link}: ${quiet(v.reason)}`);
				continue;
			}
			const taken = new Set<string>();
			for (const dir of Object.values(ENTRY_DIRS)) for (const n of await listDir(join(ROOT, DATA_DIR, dir))) taken.add(n.replace(/\.json$/, ''));
			// An app's kind follows from its files when it has an nsgo.yaml (appKindOf): the model's guess gives way to them.
			if (v.verdict.trim().toLowerCase() === 'app' && input.appKind) v.kind = input.appKind;
			const built = entryFor(v, { repo, htmlUrl: c.meta.html_url, homepage: c.meta.homepage, module: moduleOf(input.goMod.text) }, uniqueSlug(v.name, repo, taken));
			if ('error' in built) throw new Error(built.error);
			if (DRY_RUN) {
				lines.proposed.push(`- ${link} as ${KIND_LABELS[built.kind]}: would add\n${codeBlock(JSON.stringify(built.entry, null, 2))}\n  ${quiet(v.reason)}`);
				proposed++;
				continue;
			}
			const url = await propose(c, built.kind, built.entry, input.goMod.path, v.reason);
			lines.proposed.push(`- ${link} as ${KIND_LABELS[built.kind]}: ${url}`);
			proposed++;
		} catch (err) {
			const why = err instanceof Error ? err.message : String(err);
			if (asked && !(err instanceof PublishError)) seen[repo.toLowerCase()] = remember('failed', why, now);
			lines.failed.push(`- ${link}: ${quiet(why)}`);
		}
	}

	say(`### ${DRY_RUN ? 'Would propose' : 'Proposed'} (${lines.proposed.length})\n\n${lines.proposed.join('\n') || 'None.'}\n`);
	say(`### Deferred, too new to judge (${lines.deferred.length})\n\n${lines.deferred.join('\n') || 'None.'}\n`);
	say(`### Skipped (${lines.skipped.length})\n\n${lines.skipped.join('\n') || 'None.'}\n`);
	say(`### Failed (${lines.failed.length})\n\n${lines.failed.join('\n') || 'None.'}\n`);
	if (checked) say(`Looked for a go.mod in ${checked} repositories found another way (at most ${MAX_CHECK}); ${notNsgo} of them have none that requires NSGo and are not looked at again for ${RECHECK_DAYS.skip} days.\n`);
	say(`Asked the model about ${triaged} repositories (at most ${MAX_TRIAGE}); the rest wait for the next run.`);
	if (env.SEEN_FILE && !DRY_RUN) await writeFile(env.SEEN_FILE, `${JSON.stringify(seen, null, '\t')}\n`);
}

try {
	await main();
} finally {
	if (env.REPORT_FILE) await writeFile(env.REPORT_FILE, `${report.join('\n')}\n`);
}
