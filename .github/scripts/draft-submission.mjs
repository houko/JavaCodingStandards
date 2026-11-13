// Turns a "Submit a game" issue into a game file, for .github/workflows/submissions.yml, which lists the game without anyone in the loop. It reads the issue form's answers from ISSUE_BODY and checks them; then it checks the claims against the world: the post must exist and be the stated creator's, and a play or source link must answer. Only then does it write packages/catalog/data/games/<slug>.json, with the like count from the post and the summary in English, which the other languages show until they are translated.
//
// The issue is anyone's text, so it is only ever read as data: nothing in it is run, and the only address requested is X's, built from the post's digits.
//
// It writes its outcome for the workflow to GITHUB_OUTPUT: slug and name, or problem, a sentence to post back on the issue when it cannot become a game. When X does not answer at all it exits with an error instead, as that is no fault of the issue. Run it without GITHUB_OUTPUT to see the outcome printed.
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { classify } from './link-health.mjs';

const GAMES_DIR = fileURLToPath(new URL('../../packages/catalog/data/games/', import.meta.url));
const META_FILE = fileURLToPath(new URL('../../packages/catalog/data/meta.json', import.meta.url));
const SCHEMA = JSON.parse(readFileSync(new URL('../../packages/catalog/data/schema/game.schema.json', import.meta.url), 'utf8'));
const GENRES = SCHEMA.properties.genre.enum;
const LINK_TYPES = SCHEMA.properties.link.properties.type.enum;
const HANDLE = /^[A-Za-z0-9_]{1,15}$/;
const POST_URL = /^https:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status\/([1-9][0-9]{17,19})(?:[/?#].*)?$/;
// The longest summary: it is one line on a card.
export const SUMMARY_MAX = 160;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

// The answers of an issue form, by the label of each question: GitHub writes every answer as a "### <label>" heading followed by the answer, or "_No response_".
export function readForm(body) {
	const answers = {};
	const parts = `\n${body.replace(/\r\n/g, '\n')}`.split('\n### ').slice(1);
	for (const part of parts) {
		const newline = part.indexOf('\n');
		const label = (newline === -1 ? part : part.slice(0, newline)).trim();
		const value = newline === -1 ? '' : part.slice(newline + 1).trim();
		answers[label] = value === '_No response_' ? '' : value;
	}
	return answers;
}

// The site's slug rule (slugOf in packages/catalog/src/games.ts).
export const slugOf = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-/, '').replace(/-$/, '');

// A description as one sentence on a card: one line, a capital first letter and a full stop at the end where it has none, the rest as written.
export function sentence(text) {
	const line = text.trim().replace(/\s+/g, ' ');
	if (!line) return '';
	const capital = line[0].toUpperCase() + line.slice(1);
	// Only a sentence ending in a Latin letter or digit gets a full stop; one in another script keeps its own punctuation.
	return /[A-Za-z0-9]$/.test(capital) ? `${capital}.` : capital;
}

// The game a form describes, or a problem saying what is wrong with it. `taken` holds the slugs and posts already listed.
export function gameFromForm(answers, taken) {
	const name = answers['Game name']?.trim();
	const creator = answers["Creator's X handle"]?.trim().replace(/^@/, '');
	const postUrl = answers['X post URL']?.trim();
	const link = answers['Play, source or watch URL']?.trim();
	const type = answers['Link type']?.trim();
	const genre = answers['Genre']?.trim();
	const model = answers['AI model']?.trim();
	const summary = sentence(answers['One-line description in English'] ?? '');
	if (!name || !creator || !postUrl || !type || !genre || !model || !summary) return { problem: 'Some required answers are missing. Edit the issue to fill them in.' };
	if (!HANDLE.test(creator)) return { problem: `"${creator}" is not an X handle.` };
	if (summary.length > SUMMARY_MAX) return { problem: `The description is ${summary.length} characters long; keep it to ${SUMMARY_MAX}, one line on a card.` };
	const post = postUrl.match(POST_URL);
	if (!post) return { problem: 'The post must be the address of a post on X, like https://x.com/name/status/2119925633564463609.' };
	if (!LINK_TYPES.includes(type)) return { problem: `The link type must be one of ${LINK_TYPES.join(', ')}.` };
	if (!GENRES.includes(genre)) return { problem: `The genre must be one of ${GENRES.join(', ')}.` };
	if (type !== 'watch' && !/^https:\/\/\S+$/.test(link ?? '')) return { problem: 'A play or source game needs its https link.' };
	if (link && !/^https:\/\/\S+$/.test(link)) return { problem: 'The link must be an https address.' };
	const id = post[2];
	if (taken.posts.has(id)) return { problem: `That post is already listed, as ${taken.posts.get(id)}.` };
	// A name without Latin letters or digits makes no slug; the creator's handle and the end of the post's id stand in, and the curator may choose a better one.
	let slug = slugOf(name) || `${slugOf(creator)}-${id.slice(-6)}`;
	for (let n = 2; taken.slugs.has(slug); n++) slug = `${slugOf(name) || slugOf(creator)}-${n}`;
	const game = { $schema: '../schema/game.schema.json', slug, name, creator, genre, link: type === 'watch' && !link ? { type } : { type, url: link }, post: id, likes: 0, model, cover: `${slug}.webp`, summary: { en: summary } };
	return { game, postAuthor: post[1] };
}

const token = (id) => ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');

// The post's like count and author from X's syndication endpoint, or undefined when it does not answer.
async function lookUp(id) {
	try {
		const res = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${token(id)}&lang=en`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20_000) });
		if (!res.ok) return undefined;
		const post = await res.json();
		return post.__typename === 'Tweet' ? { likes: post.favorite_count ?? 0, author: post.user?.screen_name } : undefined;
	} catch {
		return undefined;
	}
}

// A play or source link that the daily link check would call dead (link-health.mjs) is refused; one that refuses automated requests is given the benefit of the doubt, as it is in that check.
async function deadLink(link) {
	if (link.type === 'watch') return undefined;
	let answer;
	try {
		const res = await fetch(link.url, { headers: { 'User-Agent': UA, accept: 'text/html,*/*;q=0.8' }, redirect: 'follow', signal: AbortSignal.timeout(20_000) });
		await res.body?.cancel();
		answer = { status: res.status };
	} catch (error) {
		answer = { error: error.cause?.code ?? error.name };
	}
	const { state, detail } = classify(answer);
	return state === 'dead' ? `The link ${link.url} does not answer (${detail}). Fix it in the issue.` : undefined;
}

function output(values) {
	const lines = Object.entries(values).map(([key, value]) => `${key}<<EOF_${key}\n${value}\nEOF_${key}`);
	if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
	else console.log(values);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const games = readdirSync(GAMES_DIR).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(GAMES_DIR + f, 'utf8')));
	const taken = { slugs: new Set(games.map((g) => g.slug)), posts: new Map(games.map((g) => [g.post, g.slug])) };
	// The workflow passes the body of the issue that started it, or a file holding the body of the issue it was asked to retry.
	const body = process.env.ISSUE_BODY || (process.env.ISSUE_BODY_FILE ? readFileSync(process.env.ISSUE_BODY_FILE, 'utf8') : '');
	const result = gameFromForm(readForm(body), taken);
	if (result.problem) output({ problem: result.problem });
	else {
		const { game } = result;
		const found = await lookUp(game.post);
		if (!found) throw new Error('X did not answer for the post; edit the issue later to try again');
		const problem = found.author?.toLowerCase() !== game.creator.toLowerCase() ? `The post was made by @${found.author}, not @${game.creator}. The creator's handle must be the account that posted the game.` : await deadLink(game.link);
		if (problem) output({ problem });
		else {
			game.likes = found.likes;
			// The day it joins, which marks it as new for a while; the site's "last updated" day moves with it.
			const today = new Date().toISOString().slice(0, 10);
			game.added = today;
			const file = `${GAMES_DIR}${game.slug}.json`;
			if (existsSync(file)) throw new Error(`${file} exists`);
			writeFileSync(file, `${JSON.stringify(game, null, '\t')}\n`);
			const meta = JSON.parse(readFileSync(META_FILE, 'utf8'));
			writeFileSync(META_FILE, `${JSON.stringify({ ...meta, updated: today }, null, '\t')}\n`);
			output({ slug: game.slug, name: game.name });
		}
	}
}
