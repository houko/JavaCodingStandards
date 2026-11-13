// Requests the link of every game in packages/catalog/data/games, once a day from .github/workflows/links.yml, and acts on what it finds in two steps (the rules are in link-health.mjs):
//
// 1. A link that does not answer is reported in one issue titled ISSUE_TITLE, which also carries how many checks in a row have found each link dead.
// 2. A link dead DOWN_AFTER checks in a row gets its game marked: the script writes "down": "<today>" into the game's file, and removes it from a marked game whose link answers again. It only changes the working tree; the workflow turns the change into a pull request, so a person still decides.
//
// It has no dependencies. With GH_TOKEN (or GITHUB_TOKEN) set it reads and writes the issue through the gh CLI. Without a token it is a dry run: it prints the report and touches neither the issue nor the files.
import { execFileSync } from 'node:child_process';
import { appendFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { DOWN_AFTER, classify, decide, nextState, readState, withDown, writeState } from './link-health.mjs';

const GAMES_DIR = fileURLToPath(new URL('../../packages/catalog/data/games/', import.meta.url));
const META_FILE = fileURLToPath(new URL('../../packages/catalog/data/meta.json', import.meta.url));
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

const today = new Date().toISOString().slice(0, 10);
const live = Boolean(process.env.GH_TOKEN || process.env.GITHUB_TOKEN);
const gameFile = (slug) => join(GAMES_DIR, `${slug}.json`);

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
		links.push({ slug: game.slug, name: game.name, type: game.link.type, url, down: game.down });
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

const cell = (text) => text.replaceAll('|', '\\|');

// The rows as a table. `state` adds how long each link has been dead.
function table(rows, state) {
	const lines = [`| Game | Link | Result |${state ? ' Dead for |' : ''} File |`, `| --- | --- | --- |${state ? ' --- |' : ''} --- |`];
	for (const row of rows) {
		const streak = state?.[row.slug];
		const since = state ? ` ${streak ? `${streak.fails} ${streak.fails === 1 ? 'check' : 'checks'}, since ${streak.since}` : ''} |` : '';
		lines.push(`| ${cell(row.name)}${row.down ? ' (marked down)' : ''} | ${row.type}: <${row.url}> | ${row.state} (${row.detail}) |${since} \`packages/catalog/data/games/${row.slug}.json\` |`);
	}
	return lines.join('\n');
}

function gh(...args) {
	return execFileSync('gh', args, { encoding: 'utf8' });
}

// The one open issue. The open issues are listed and matched by exact title rather than searched, because the search index lags and a second issue would be opened. Only an issue a bot opened counts, so a report a person files under the same title is never read, rewritten or closed.
function findIssue() {
	return JSON.parse(gh('issue', 'list', '--state', 'open', '--limit', '1000', '--json', 'number,title,author,body')).find((issue) => issue.title === ISSUE_TITLE && issue.author.is_bot);
}

// Creates, updates or closes the issue. It is about the dead links of games not yet marked, the ones still being counted; once a game is marked its dead link is expected and only the run's summary lists it.
function syncIssue(open, dead, unknown, state) {
	if (dead.length === 0) {
		if (open) gh('issue', 'close', String(open.number), '--comment', 'Every game link answered in the latest check.');
		return;
	}
	const parts = [
		`${dead.length} game ${dead.length === 1 ? 'link' : 'links'} did not answer in the latest daily check. A link that is dead ${DOWN_AFTER} checks in a row gets a pull request that marks its game as down, and one that takes the mark off when the link answers again. Before then, open the link in a browser: fix it, switch the entry to \`watch\`, or remove the game. This issue is rewritten by every check and closes by itself once nothing is dead.`,
		table(dead, state),
	];
	if (unknown.length > 0) parts.push('These could not be judged, usually because the host refuses automated requests:', table(unknown));
	parts.push(`Checked on ${today}.${process.env.RUN_URL ? ` [Run](${process.env.RUN_URL})` : ''}`, writeState(state));
	const bodyFile = join(tmpdir(), 'dead-game-links.md');
	writeFileSync(bodyFile, `${parts.join('\n\n')}\n`);
	if (open) gh('issue', 'edit', String(open.number), '--body-file', bodyFile);
	else gh('issue', 'create', '--title', ISSUE_TITLE, '--body-file', bodyFile);
}

// Writes the marks into the game files and, since the data has changed, moves the site's "last updated" to today. Returns the pull request's description, or undefined when nothing changed.
function applyMarks({ mark, unmark }, state) {
	if (mark.length === 0 && unmark.length === 0) return undefined;
	for (const row of mark) writeFileSync(gameFile(row.slug), withDown(readFileSync(gameFile(row.slug), 'utf8'), today));
	for (const row of unmark) writeFileSync(gameFile(row.slug), withDown(readFileSync(gameFile(row.slug), 'utf8'), undefined));
	const meta = JSON.parse(readFileSync(META_FILE, 'utf8'));
	writeFileSync(META_FILE, `${JSON.stringify({ ...meta, updated: today }, null, '\t')}\n`);
	const parts = ['## Summary', 'The daily link check wants these marks changed. A marked game stays listed: its card says the link is down and sends visitors to the creator\'s post instead. Open each link in a browser before merging; if a game has moved, fix its `link.url` instead and close this.'];
	if (mark.length > 0) parts.push(`**Marked as down** (dead ${DOWN_AFTER} or more checks in a row):`, table(mark, state));
	if (unmark.length > 0) parts.push('**No longer down** (the link answers again):', table(unmark));
	parts.push(`Checked on ${today}.${process.env.RUN_URL ? ` [Run](${process.env.RUN_URL})` : ''} This pull request is rewritten by every check while it is open, and closed if nothing needs changing any more.`, '## Screenshots', 'None.');
	return `${parts.join('\n\n')}\n`;
}

const links = readLinks();
const results = await checkAll(links);
const order = { dead: 0, unknown: 1, ok: 2 };
results.sort((a, b) => order[a.state] - order[b.state] || a.slug.localeCompare(b.slug));
const dead = results.filter((row) => row.state === 'dead');
const unknown = results.filter((row) => row.state === 'unknown');
const unmarked = (rows) => rows.filter((row) => row.down === undefined);

const open = live ? findIssue() : undefined;
const state = nextState(readState(open?.body), unmarked(results), today);
const marks = decide(results, state);

const summary = `## Game links\n\n${results.length} checked: ${dead.length} dead, ${unknown.length} unknown, ${results.length - dead.length - unknown.length} ok. To mark: ${marks.mark.length}. To unmark: ${marks.unmark.length}.\n\n${table(results, state)}\n`;
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(summary);

if (!live) console.log('No GH_TOKEN or GITHUB_TOKEN: dry run, neither the issue nor the files were touched.');
else {
	syncIssue(open, unmarked(dead), unmarked(unknown), state);
	const body = applyMarks(marks, state);
	// The workflow reads these to decide whether to open, rewrite or close the pull request.
	if (body !== undefined && process.env.PR_BODY_FILE) writeFileSync(process.env.PR_BODY_FILE, body);
	if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${body !== undefined}\n`);
}
