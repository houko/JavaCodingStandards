import { appendFile, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { TwitterApi } from 'twitter-api-v2';
import { composeIssue, ISSUE_TITLE, isScored, newestRelease, notTold, projectRepo, type RepoFacts, type ScoreTip, scoreTips } from './issue.ts';
import { type Counts, ENTRY_DIRS, type Entry, type EntryKind, composePost, githubUrl, sitePage } from './tweet.ts';
import { scoreKey } from '../../catalog/src/score.ts';

// Run by .github/workflows/announce.yml once for each entry a push to main adds: node src/main.ts <dir>/<slug>.json, the path under packages/catalog/data (apps/, ui/, state/, templates/, ai/ or plugins/). It waits until the site lists the entry, so the links work, then posts it to X and opens an issue on the project's repository saying it was listed, with its page, the post, the README badge, and where its score will show with what would raise it (issue.ts).
//
// Environment: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN and X_ACCESS_SECRET (the posting account's OAuth 1.0a keys; without them nothing is posted, and the issue goes without a post); NOTIFY_GITHUB_TOKEN (a classic personal access token with the public_repo scope of the account that opens the issues, as neither the workflow's token nor a GitHub App's can open one on a repository they are not installed on; without it the issue is only printed); DRY_RUN=true to only print both anyway; ISSUE_ONLY=true to open the issue without posting, for an entry announced before issues were opened (the argument may then end in =<its post on X>, which the issue links to); WAIT_SECONDS (how long to wait for the site, default 900; 0 skips the check); GITHUB_TOKEN for the repository's stars, license and releases (the last of which GraphQL answers only with a token) and its owner's X account; GITHUB_REPOSITORY_OWNER, whose own repositories are not told; and GITHUB_STEP_SUMMARY.

const ROOT = join(import.meta.dirname, '../../..');
const DATA_DIR = join(ROOT, 'packages/catalog/data');
const env = process.env;

function kindOf(dir: string): EntryKind {
	const kind = (Object.keys(ENTRY_DIRS) as EntryKind[]).find((k) => ENTRY_DIRS[k] === dir);
	if (!kind) throw new Error(`${dir}/ is not a directory of entries the site announces (${Object.values(ENTRY_DIRS).join(', ')})`);
	return kind;
}

// The names in a directory of entries, or none when git dropped it, as it keeps no empty directory.
async function listDir(dir: string): Promise<string[]> {
	try {
		return await readdir(dir);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
		throw err;
	}
}

async function counts(): Promise<Counts> {
	const n = async (kind: EntryKind) => (await listDir(join(DATA_DIR, ENTRY_DIRS[kind]))).filter((f) => f.endsWith('.json')).length;
	return { app: await n('app'), ui: await n('ui'), state: await n('state'), template: await n('template'), ai: await n('ai'), plugin: await n('plugin') };
}

// Whether data/scores.json has a record of the entry under the key the site reads its score by (scoreKey), so the site shows its score already. A file that cannot be read gives false, with a warning: the issue then says the score shows from the next measurement, which is not worth holding it back.
async function hasScore(kind: EntryKind, entry: Entry): Promise<boolean> {
	const key = scoreKey(kind, { slug: String(entry.slug), repo: typeof entry.repo === 'string' ? entry.repo : undefined });
	try {
		const file = JSON.parse(await readFile(join(DATA_DIR, 'scores.json'), 'utf8')) as { entries?: unknown };
		return typeof file.entries === 'object' && file.entries !== null && Object.hasOwn(file.entries, key);
	} catch (err) {
		console.log(`::warning::packages/catalog/data/scores.json could not be read (${err instanceof Error ? err.message : String(err)}); the issue says ${key}'s score shows from the next daily measurement.`);
		return false;
	}
}

// GitHub's answer for path, or undefined, with a warning, when it gives none: what the post and the issue take from GitHub is not worth holding them back.
async function github<T>(path: string): Promise<T | undefined> {
	const res = await fetch(`https://api.github.com${path}`, {
		headers: { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...(env.GITHUB_TOKEN ? { authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}) },
		signal: AbortSignal.timeout(30_000),
	}).catch(() => undefined);
	if (!res?.ok) return void console.log(`::warning::GitHub did not answer for ${path} (${res?.status ?? 'no response'}); the post and the issue leave out what they would have taken from it.`);
	return (await res.json()) as T;
}

// A repository's releases and tags, as the score run reads them (REPO_FIELDS in packages/enrich/src/signals.ts): GitHub's latest release, the newest releases, prereleases included, and the newest tags by their commits' dates, so that one dated in the future does not hide the real ones.
const RELEASES = 'query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { latestRelease { publishedAt } releases(first: 100, orderBy: { field: CREATED_AT, direction: DESC }) { nodes { publishedAt } } refs(refPrefix: "refs/tags/", first: 100, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) { nodes { target { ... on Commit { committedDate } ... on Tag { tagger { date } } } } } } }';

interface GqlReleases {
	latestRelease?: { publishedAt: string | null } | null;
	releases?: { nodes: { publishedAt: string | null }[] } | null;
	refs?: { nodes: { target: { committedDate?: string; tagger?: { date: string | null } | null } | null }[] } | null;
}

// The newest release or tag of repo not after now (newestRelease), null when it has none, or undefined, with a warning, when GitHub gives no full answer: the issue then gives no tip on releasing.
async function newestReleaseOf(repo: string, now: number): Promise<number | null | undefined> {
	if (!env.GITHUB_TOKEN) return void console.log(`::warning::GITHUB_TOKEN is not set, so GitHub's GraphQL cannot be asked about ${repo}'s releases; the issue gives no tip on releasing.`);
	const [owner, name] = repo.split('/');
	const res = await fetch('https://api.github.com/graphql', {
		method: 'POST',
		headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, 'content-type': 'application/json' },
		body: JSON.stringify({ query: RELEASES, variables: { owner, name } }),
		signal: AbortSignal.timeout(30_000),
	}).catch(() => undefined);
	const answer = res?.ok ? ((await res.json()) as { data?: { repository?: GqlReleases | null } | null; errors?: unknown[] }) : undefined;
	const r = answer?.errors?.length ? undefined : answer?.data?.repository;
	if (!r) return void console.log(`::warning::GitHub did not answer about ${repo}'s releases (${res ? res.status : 'no response'}); the issue gives no tip on releasing.`);
	return newestRelease([r.latestRelease?.publishedAt, ...(r.releases?.nodes ?? []).map((n) => n.publishedAt), ...(r.refs?.nodes ?? []).map((n) => n.target?.committedDate ?? n.target?.tagger?.date)], now);
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

// Workers Builds deploys main on its own after the push; the page the post links to lists the entry once it has.
async function waitForSite(page: string, name: string, seconds: number): Promise<void> {
	const deadline = Date.now() + seconds * 1000;
	for (;;) {
		const res = await fetch(page, { signal: AbortSignal.timeout(30_000), headers: { 'cache-control': 'no-cache' } }).catch(() => undefined);
		const html = res?.ok ? await res.text() : '';
		if (html.includes(name) || html.includes(escapeHtml(name))) return console.log(`${page} lists ${name}.`);
		if (Date.now() >= deadline) throw new Error(`${page} still does not list ${name} after ${seconds} s; run the workflow again once the site is deployed`);
		await sleep(20_000);
	}
}

// A call to GitHub as the account that opens the issues; any answer but a success is an error.
async function githubAs<T>(token: string, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
	const res = await fetch(`https://api.github.com${path}`, {
		method: init.method ?? 'GET',
		headers: { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', authorization: `Bearer ${token}`, ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}) },
		body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
		signal: AbortSignal.timeout(30_000),
	});
	if (!res.ok) throw new Error(`GitHub ${init.method ?? 'GET'} ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`);
	return (await res.json()) as T;
}

// Opens the issue on the project's repository, once: a repository that already has an issue of this account with the title is not told again, nor is one with issues turned off, an archived one, or one of the site's own owner or of NSGo's author (notTold). Returns what the summary says.
async function tellProject(repo: string, title: string, body: string): Promise<string> {
	const token = env.NOTIFY_GITHUB_TOKEN;
	if (!token) return `not opened on ${repo}, as NOTIFY_GITHUB_TOKEN is not set`;
	const skip = notTold(repo, env.GITHUB_REPOSITORY_OWNER);
	if (skip) return `not opened on ${repo}, as ${skip}`;
	const info = await githubAs<{ has_issues: boolean; archived: boolean; full_name: string }>(token, `/repos/${repo}`);
	if (!info.has_issues) return `not opened on ${info.full_name}, which has issues turned off`;
	if (info.archived) return `not opened on ${info.full_name}, which is archived`;
	const me = await githubAs<{ login: string }>(token, '/user');
	const mine = await githubAs<{ title: string; html_url: string }[]>(token, `/repos/${info.full_name}/issues?creator=${encodeURIComponent(me.login)}&state=all&per_page=100`);
	const before = mine.find((i) => i.title === title);
	if (before) return `not opened again, as ${before.html_url} was opened before`;
	const issue = await githubAs<{ html_url: string }>(token, `/repos/${info.full_name}/issues`, { method: 'POST', body: { title, body } });
	return `opened ${issue.html_url}`;
}

async function main(): Promise<void> {
	// <dir>/<slug>.json, or, for an entry posted before, <dir>/<slug>.json=<its post on X>, which the issue then links to.
	const [path, earlierPost] = (process.argv[2] ?? '').split('=');
	if (!path || !/^[a-z]+\/[a-z0-9-]+\.json$/.test(path)) throw new Error('usage: node src/main.ts <dir>/<slug>.json[=https://x.com/i/status/<id>], e.g. ui/nsgo-kubai-icons.json');
	if (earlierPost !== undefined && !/^https:\/\/x\.com\/[\w/]+\/status\/\d+$/.test(earlierPost)) throw new Error(`${earlierPost} is not a post on X`);
	// Only the issue, for an entry announced before issues were opened: posting it again would repeat the post.
	const issueOnly = env.ISSUE_ONLY === 'true';
	const [dir] = path.split('/');
	const kind = kindOf(dir);
	const entry = JSON.parse(await readFile(join(DATA_DIR, path), 'utf8')) as Entry;
	const name = typeof entry.name === 'string' ? entry.name : String(entry.slug);
	const repo = githubUrl(entry)?.slice('https://github.com/'.length);
	const info = repo ? await github<{ stargazers_count?: number; owner?: { login?: string }; license?: { spdx_id?: string | null } | null }>(`/repos/${repo}`) : undefined;
	const owner = info?.owner?.login ? await github<{ twitter_username?: string | null }>(`/users/${encodeURIComponent(info.owner.login)}`) : undefined;
	const text = composePost({ kind, entry, stars: info?.stargazers_count, handle: owner?.twitter_username ?? undefined, counts: await counts() });
	console.log(`---- post ----\n${text}\n--------------`);

	const [appKey, appSecret, accessToken, accessSecret] = [env.X_API_KEY, env.X_API_SECRET, env.X_ACCESS_TOKEN, env.X_ACCESS_SECRET];
	const canPost = !issueOnly && !!(appKey && appSecret && accessToken && accessSecret);
	const summary = (md: string) => (env.GITHUB_STEP_SUMMARY ? appendFile(env.GITHUB_STEP_SUMMARY, `${md}\n`) : Promise.resolve());
	// A fence one longer than any run of backticks in the text, as the issue's body holds a code block of its own.
	const block = (t: string) => {
		const fence = '`'.repeat(Math.max(3, ...[...t.matchAll(/`+/g)].map((m) => m[0].length + 1)));
		return `\n\n${fence}\n${t}\n${fence}\n`;
	};
	const repoToTell = projectRepo(kind, entry);
	// How the project can raise its score, from what GitHub says of its repository now; the license as the score run reads it, NOASSERTION for one GitHub cannot name. An entry scores.json has a record of already shows its score, and is measured next by the next week's run.
	const now = Date.now();
	const measured = repoToTell && isScored(kind, entry) ? await hasScore(kind, entry) : false;
	let tips: ScoreTip[] = [];
	if (repo && repoToTell && isScored(kind, entry)) {
		const facts: RepoFacts = { repo, released: await newestReleaseOf(repo, now) };
		if (info && info.license !== undefined) facts.license = info.license ? (info.license.spdx_id ?? 'NOASSERTION') : null;
		tips = scoreTips(facts, now, measured);
	}
	const printIssue = (postUrl?: string) => {
		if (!repoToTell) return undefined;
		const issue = composeIssue({ kind, entry, postUrl, tips, measured });
		console.log(`---- issue on ${repoToTell} ----\n${issue.body}--------------`);
		return issue;
	};

	if (env.DRY_RUN === 'true') {
		console.log(`::notice::${name} was not posted, as this is a dry run.`);
		const issue = printIssue(earlierPost);
		await summary(`### ${name}: not posted, as this is a dry run${block(text)}`);
		return summary(issue ? `Issue on ${repoToTell}, not opened in a dry run:${block(issue.body)}` : 'No GitHub repository to open an issue on.');
	}
	if (issueOnly && !env.NOTIFY_GITHUB_TOKEN) {
		console.log(`::notice::${name}: no issue opened, as NOTIFY_GITHUB_TOKEN is not set.`);
		printIssue(earlierPost);
		return summary(`### ${name}: no issue opened, as NOTIFY_GITHUB_TOKEN is not set`);
	}
	if (!canPost && !issueOnly && !env.NOTIFY_GITHUB_TOKEN) {
		const why = 'the X keys are not set (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET), nor NOTIFY_GITHUB_TOKEN';
		console.log(`::notice::${name} was not posted, as ${why}.`);
		printIssue();
		return summary(`### ${name}: not posted, as ${why}${block(text)}`);
	}

	const wait = Number(env.WAIT_SECONDS ?? 900);
	if (wait > 0) await waitForSite(sitePage(kind, entry), name, wait);
	let postUrl: string | undefined = earlierPost;
	let postError: string | undefined;
	if (issueOnly) {
		console.log(`::notice::${name} was not posted, as only its issue was asked for.`);
		await summary(`### ${name}: not posted, as only its issue was asked for${earlierPost ? `; the issue links ${earlierPost}` : ''}`);
	} else if (canPost) {
		// A post X refuses (402 once the account's credits are spent, 429 when it is busy) does not keep the project from being told: the issue goes without a post, and the job fails afterwards, so running it again posts and finds the issue opened.
		try {
			const client = new TwitterApi({ appKey, appSecret, accessToken, accessSecret });
			const { data } = await client.v2.tweet(text);
			postUrl = `https://x.com/i/status/${data.id}`;
			console.log(`Posted ${postUrl}`);
			await summary(`### ${name}: posted ${postUrl}${block(text)}`);
		} catch (err) {
			postError = err instanceof Error ? err.message : String(err);
			console.log(`::error::${name} could not be posted: ${postError}`);
			await summary(`### ${name}: could not be posted: ${postError}${block(text)}`);
		}
	} else {
		console.log(`::notice::${name} was not posted, as the X keys are not set; the issue goes without a post.`);
		await summary(`### ${name}: not posted, as the X keys are not set${block(text)}`);
	}

	// The post is out by now, unless X refused it, so nothing here may fail the job: running it again would post it twice. What went wrong is a warning instead.
	const issue = printIssue(postUrl);
	if (!issue || !repoToTell) {
		await summary('Issue: none, as the entry has no GitHub repository to open one on.');
		if (postError) throw new Error(`${name} could not be posted: ${postError}; run the job again to post it`);
		return;
	}
	try {
		const done = await tellProject(repoToTell, ISSUE_TITLE, issue.body);
		console.log(`Issue: ${done}.`);
		await summary(`Issue: ${done}.`);
	} catch (err) {
		const why = err instanceof Error ? err.message : String(err);
		console.log(`::warning::The issue on ${repoToTell} could not be opened: ${why}`);
		await summary(`Issue: could not be opened on ${repoToTell}: ${why}`);
	}
	if (postError) throw new Error(`${name} could not be posted: ${postError}; run the job again to post it, and its issue, opened already, is not opened twice`);
}

await main();
