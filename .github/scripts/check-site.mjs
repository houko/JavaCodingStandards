// Checks that the live site answers as it should, for .github/workflows/uptime.yml: the pages in two languages, a game's page and a missing one, the sitemap and feed, the share cards, a cover, a clip by byte range, and the move from plain HTTP. Each check gets three tries a little apart before it counts as failing, so a single dropped request raises nothing.
//
// It prints a table, writes it to GITHUB_STEP_SUMMARY and, when something fails, to REPORT_FILE for the alert issue, and exits non-zero. It has no dependencies.
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = new URL('../../', import.meta.url);
const SITE = readFileSync(new URL('packages/catalog/src/site.ts', ROOT), 'utf8').match(/SITE_URL = '([^']+)'/)[1];
const media = JSON.parse(readFileSync(new URL('packages/catalog/data/media.json', ROOT), 'utf8'));
const game = JSON.parse(readFileSync(new URL(`packages/catalog/data/games/${media.videos[0]}.json`, ROOT), 'utf8'));
const TRIES = 3;
const PAUSE_MS = 15_000;

// What to ask for and what must come back: a status, a content type, and text the body must hold.
const CHECKS = [
	{ path: '/', status: 200, type: 'text/html', body: 'Vibe Arcade' },
	{ path: '/?lang=ja', status: 200, type: 'text/html', body: 'lang="ja"' },
	{ path: `/games/${game.slug}`, status: 200, type: 'text/html', body: game.name.replaceAll('&', '&amp;') },
	{ path: '/games/no-such-game-anywhere', status: 404, type: 'text/html' },
	{ path: '/sitemap.xml', status: 200, type: 'xml', body: '<urlset' },
	{ path: '/feed.xml', status: 200, type: 'atom+xml', body: '<feed' },
	{ path: '/og-site-v2-1200x630.png', status: 200, type: 'image/png' },
	{ path: `/og/v2/${game.slug}.png`, status: 200, type: 'image/png' },
	{ path: `/covers/${game.slug}.webp`, status: 200, type: 'image/webp' },
	{ path: `/videos/${game.slug}.mp4`, status: 206, type: 'video/mp4', headers: { Range: 'bytes=0-99' } },
	{ url: `${SITE.replace('https://', 'http://')}/`, status: 301, location: `${SITE}/` },
];

async function once(check) {
	const url = check.url ?? `${SITE}${check.path}`;
	try {
		const res = await fetch(url, { headers: { 'User-Agent': 'vibe-arcade-site-check', ...check.headers }, redirect: 'manual', signal: AbortSignal.timeout(20_000) });
		const type = res.headers.get('content-type') ?? '';
		const body = check.body ? await res.text() : (await res.body?.cancel(), '');
		const problems = [];
		if (res.status !== check.status) problems.push(`HTTP ${res.status}, wanted ${check.status}`);
		if (check.type && !type.includes(check.type)) problems.push(`type ${type || 'none'}`);
		if (check.body && !body.includes(check.body)) problems.push(`no "${check.body}" in the body`);
		if (check.location && res.headers.get('location') !== check.location) problems.push(`goes to ${res.headers.get('location')}`);
		return problems.join('; ');
	} catch (error) {
		return `no answer (${error.cause?.code ?? error.name})`;
	}
}

const rows = [];
for (const check of CHECKS) {
	let problem = '';
	for (let attempt = 1; attempt <= TRIES; attempt++) {
		problem = await once(check);
		if (!problem) break;
		if (attempt < TRIES) await sleep(PAUSE_MS);
	}
	rows.push({ what: check.url ?? check.path, problem });
}

const failed = rows.filter((r) => r.problem);
const table = ['| Check | Result |', '| --- | --- |', ...rows.map((r) => `| \`${r.what}\` | ${r.problem ? `failing: ${r.problem}` : 'ok'} |`)].join('\n');
const report = `${failed.length} of ${rows.length} checks of ${SITE} failed after ${TRIES} tries each.\n\n${table}\n`;
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Site check\n\n${report}`);
if (failed.length) {
	if (process.env.REPORT_FILE) writeFileSync(process.env.REPORT_FILE, report);
	process.exit(1);
}
