// The rules of the link check, apart from the requests themselves and from GitHub: how an answer is judged, how failures are counted from one check to the next, and when a game's file is marked. .github/scripts/check-links.mjs runs them; the site's tests cover them (apps/web/src/lib/link-health.test.ts).

// A game is marked as down after this many checks in a row found its link dead. The checks are a day apart, so a host that is out for an afternoon, or a deploy caught halfway, never marks a game.
export const DOWN_AFTER = 3;

// Failures that still stand after every retry and mean the game is gone: no such host, nothing listening, or a certificate no browser accepts. A timeout is not one of them, as hosts often drop a runner's requests without a word.
const DEAD_ERRORS = new Set(['ENOTFOUND', 'EAI_NONAME', 'EAI_NODATA', 'ECONNREFUSED', 'ECONNRESET', 'CERT_HAS_EXPIRED', 'ERR_TLS_CERT_ALTNAME_INVALID', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE']);

// What an answer says about a link: ok, dead, or unknown for an answer that proves nothing either way (a refusal, a timeout).
export function classify({ status, error }) {
	if (error !== undefined) return { state: DEAD_ERRORS.has(error) ? 'dead' : 'unknown', detail: error };
	if (status === 404 || status === 410 || status >= 500) return { state: 'dead', detail: `HTTP ${status}` };
	if (status >= 400) return { state: 'unknown', detail: `HTTP ${status}` };
	return { state: 'ok', detail: `HTTP ${status}` };
}

// ---- failures in a row ----

// The count is kept between checks in the body of the tracking issue, in an HTML comment, as { "<slug>": { "fails": 2, "since": "2026-11-13" } }: how many checks in a row found the link dead and the day of the first. Only games whose last judged answer was dead are in it.
const STATE = /<!-- link-health: (.*?) -->/s;

export function readState(body) {
	const match = body?.match(STATE);
	if (!match) return {};
	try {
		const parsed = JSON.parse(match[1]);
		const state = {};
		// The issue can be edited by hand, so only entries of the right shape are kept.
		for (const [slug, entry] of Object.entries(parsed)) if (Number.isInteger(entry?.fails) && entry.fails > 0 && typeof entry.since === 'string') state[slug] = { fails: entry.fails, since: entry.since };
		return state;
	} catch {
		return {};
	}
}

export const writeState = (state) => `<!-- link-health: ${JSON.stringify(state)} -->`;

// The counts after a check: a dead link adds one, an ok link starts over, and an unknown answer changes nothing, since it is no evidence. A game that is no longer checked (removed, or its link changed to its post) drops out.
export function nextState(previous, results, today) {
	const state = {};
	for (const row of results) {
		const before = previous[row.slug];
		if (row.state === 'dead') state[row.slug] = { fails: (before?.fails ?? 0) + 1, since: before?.since ?? today };
		else if (row.state === 'unknown' && before) state[row.slug] = before;
	}
	return state;
}

// ---- marking a game ----

// What the check wants changed in the data: a game whose link has been dead DOWN_AFTER checks in a row is marked with the day, and a marked game whose link answers again is unmarked at once, as one good answer is proof. `down` is the day a game's file is already marked with, if it is.
export function decide(results, state) {
	const mark = results.filter((row) => row.down === undefined && row.state === 'dead' && (state[row.slug]?.fails ?? 0) >= DOWN_AFTER);
	const unmark = results.filter((row) => row.down !== undefined && row.state === 'ok');
	return { mark, unmark };
}

// A game file's text with the `down` day set, or removed for undefined. The files are written the way JSON.stringify writes them with tabs, so the rest of the file comes out as it went in; a file that is not is refused rather than reformatted.
export function withDown(text, day) {
	const game = JSON.parse(text);
	if (`${JSON.stringify(game, null, '\t')}\n` !== text) throw new Error(`${game.slug}: the file is not formatted as JSON.stringify(game, null, '\\t') writes it`);
	delete game.down;
	if (day !== undefined) game.down = day;
	return `${JSON.stringify(game, null, '\t')}\n`;
}
