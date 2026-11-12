// Requests the link of every game in packages/catalog/data/games and reports the ones that no longer answer. Run by .github/workflows/links.yml; it has no dependencies and never edits the data.
// With GH_TOKEN (or GITHUB_TOKEN) set it also keeps one issue titled ISSUE_TITLE in step with the result through the gh CLI. Without a token it is a dry run that only prints the report.
import { execFileSync } from 'node:child_process';
import { appendFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const GAMES_DIR = fileURLToPath(new URL('../../packages/catalog/data/games/', import.meta.url));
const ISSUE_TITLE = 'Dead game links';
const TIMEOUT_MS = 15_000;
const RETRIES = 2;
const BACKOFF_MS = 2_000;
const AT_ONCE = 4;
// Many hosts answer a bare script user agent with 403, so the request looks like a desktop browser.
const HEADERS = {
	'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
	accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
	'accept-language': 'en-US,en;q=0.9',
};
// X answers every signed-out request the same way whatever the post's state, so links to it say nothing and are skipped.
const SKIPPED_HOSTS = ['x.com', 'twitter.com'];
// Failures that still stand after every retry and mean the game is gone: no such host, nothing listening, or a certificate no browser accepts. A timeout is not one of them, as hosts often drop a runner's requests without a word.
const DEAD_ERRORS = new Set(['ENOTFOUND', 'EAI_NONAME', 'EAI_NODATA', 'ECONNREFUSED', 'ECONNRESET', 'CERT_HAS_EXPIRED', 'ERR_TLS_CERT_ALTNAME_INVALID', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE']);

function isSkipped(url) {
	const host = new URL(url).hostname;
	return SKIPPED_HOSTS.some((skipped) => host === skipped || host.endsWith(`.${skipped}`));
}

function readLinks() {
	const links = [];
	for (const file of readdirSync(GAMES_DIR).filter((name) => name.endsWith('.json')).sort()) {
		const game = JSON.parse(readFileSync(join(GAMES_DIR, file), 'utf8'));
		const url = game.link.url;
		if (!url || isSkipped(url)) continue;
		links.push({ slug: game.slug, name: game.name, type: game.link.type, url });
	}
	return links;
}

// One request. Returns the HTTP status, or the error code of a request that got no answer.
async function request(url) {
	try {
		const response = await fetch(url, { headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
		await response.body?.cancel();
		return { status: response.status };
	} catch (error) {
		return { error: error.cause?.code ?? error.name };
	}
}

// 404 and 410 are a definite answer and so is a refusal (401, 403, 429): none is retried. A 5xx or a request with no answer is retried, since both are often momentary.
async function check(link) {
	let answer;
	for (let attempt = 0; attempt <= RETRIES; attempt++) {
		if (attempt > 0) await sleep(BACKOFF_MS * 2 ** (attempt - 1));
		answer = await request(link.url);
		if (answer.status !== undefined && answer.status < 500) break;
	}
	return { ...link, ...classify(answer) };
}

function classify({ status, error }) {
	if (error !== undefined) return { state: DEAD_ERRORS.has(error) ? 'dead' : 'unknown', detail: error };
	if (status === 404 || status === 410 || status >= 500) return { state: 'dead', detail: `HTTP ${status}` };
	if (status >= 400) return { state: 'unknown', detail: `HTTP ${status}` };
	return { state: 'ok', detail: `HTTP ${status}` };
}

async function checkAll(links) {
	const results = new Array(links.length);
	let next = 0;
	const worker = async () => {
		while (next < links.length) {
			const index = next++;
			results[index] = await check(links[index]);
		}
	};
	await Promise.all(Array.from({ length: AT_ONCE }, worker));
	return results;
}

function table(rows) {
	const cell = (text) => text.replaceAll('|', '\\|');
	const lines = ['| Game | Link | Result | File |', '| --- | --- | --- | --- |'];
	for (const row of rows) {
		lines.push(`| ${cell(row.name)} | ${row.type}: <${row.url}> | ${row.state} (${row.detail}) | \`packages/catalog/data/games/${row.slug}.json\` |`);
	}
	return lines.join('\n');
}

function gh(...args) {
	return execFileSync('gh', args, { encoding: 'utf8' });
}

// Creates, updates or closes the one issue. The open issues are listed and matched by exact title rather than searched, because the search index lags and a second issue would be opened. Only an issue a bot opened counts, so a report a person files under the same title is never rewritten or closed.
function syncIssue(dead, unknown) {
	const open = JSON.parse(gh('issue', 'list', '--state', 'open', '--limit', '1000', '--json', 'number,title,author')).find((issue) => issue.title === ISSUE_TITLE && issue.author.is_bot);
	if (dead.length === 0) {
		if (open) gh('issue', 'close', String(open.number), '--comment', 'Every game link answered in the latest check.');
		return;
	}
	const parts = [
		`${dead.length} game ${dead.length === 1 ? 'link' : 'links'} did not answer in the latest weekly check. Open each one in a browser before changing its file: fix the link, switch the entry to \`watch\`, or remove the game. This issue is rewritten by every check and closes by itself once nothing is dead.`,
		table(dead),
	];
	if (unknown.length > 0) parts.push('These could not be judged, usually because the host refuses automated requests:', table(unknown));
	parts.push(`Checked on ${new Date().toISOString().slice(0, 10)}.${process.env.RUN_URL ? ` [Run](${process.env.RUN_URL})` : ''}`);
	const bodyFile = join(tmpdir(), 'dead-game-links.md');
	writeFileSync(bodyFile, `${parts.join('\n\n')}\n`);
	if (open) gh('issue', 'edit', String(open.number), '--body-file', bodyFile);
	else gh('issue', 'create', '--title', ISSUE_TITLE, '--body-file', bodyFile);
}

const links = readLinks();
const results = await checkAll(links);
const order = { dead: 0, unknown: 1, ok: 2 };
results.sort((a, b) => order[a.state] - order[b.state] || a.slug.localeCompare(b.slug));
const dead = results.filter((row) => row.state === 'dead');
const unknown = results.filter((row) => row.state === 'unknown');

const summary = `## Game links\n\n${results.length} checked: ${dead.length} dead, ${unknown.length} unknown, ${results.length - dead.length - unknown.length} ok.\n\n${table(results)}\n`;
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(summary);

if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) syncIssue(dead, unknown);
else console.log('No GH_TOKEN or GITHUB_TOKEN: dry run, the issue was not touched.');
