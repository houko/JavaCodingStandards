// The checks a submission passes before the bot lists it with no one in the loop, besides the form's own (draft-submission.mjs): who may submit, how the model is named, and, when a model API key is set, a translation of the summary and a look at whether the text is spam. Pure functions here are tested by the site's tests; the requests are made by draft-submission.mjs.

// ---- who may submit ----

// A GitHub account this young cannot list a game by itself, which keeps throwaway accounts from flooding the site.
export const MIN_ACCOUNT_DAYS = 7;
// Open submissions one person may have at a time; the bot closes an issue when its game is listed, so these are the ones still failing.
export const MAX_OPEN = 3;

// The blocklist, .github/submission-blocklist.txt: GitHub logins and X handles, one per line, # starting a comment. Compared without case.
export function readBlocklist(text) {
	return new Set(
		text
			.split('\n')
			.map((line) => line.replace(/#.*/, '').trim().replace(/^@/, '').toLowerCase())
			.filter(Boolean),
	);
}

// Why this person may not list this game now, or undefined. `openOthers` counts the submitter's other open submission issues.
export function guardProblem({ login, createdAt, openOthers, creator, blocklist, now }) {
	if (blocklist.has(login.toLowerCase()) || blocklist.has(creator.toLowerCase())) return 'Submissions from this account or for this creator are not listed automatically.';
	const days = (Date.parse(now) - Date.parse(createdAt)) / 86_400_000;
	if (!(days >= MIN_ACCOUNT_DAYS)) return `GitHub accounts younger than ${MIN_ACCOUNT_DAYS} days cannot list a game automatically yet. Edit the issue after that to try again.`;
	if (openOthers >= MAX_OPEN) return `You already have ${openOthers} submissions waiting. Fix or close those first.`;
	return undefined;
}

// ---- model names ----

// Vendor and model words as their makers write them.
const NAMES = [
	[/\bchat ?gpt\b/gi, 'ChatGPT'],
	[/\bgpt\b/gi, 'GPT'],
	[/\bgemini\b/gi, 'Gemini'],
	[/\bclaude\b/gi, 'Claude'],
	[/\bfable\b/gi, 'Fable'],
	[/\bopus\b/gi, 'Opus'],
	[/\bsonnet\b/gi, 'Sonnet'],
	[/\bhaiku\b/gi, 'Haiku'],
	[/\bgrok\b/gi, 'Grok'],
	[/\bdeepseek\b/gi, 'DeepSeek'],
	[/\bqwen\b/gi, 'Qwen'],
	[/\bkimi\b/gi, 'Kimi'],
	[/\bllama\b/gi, 'Llama'],
	[/\bmistral\b/gi, 'Mistral'],
	[/\bcursor\b/gi, 'Cursor'],
	[/\bcopilot\b/gi, 'Copilot'],
];
const squash = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// A model name as the site lists it: the spelling of a model already listed when it is the same name written differently ("claude fable 5.2"), else the makers' spellings, with several models joined by " + " ("Gemini and chat gpt" becomes "Gemini + ChatGPT").
export function normalizeModel(text, known) {
	const line = text.trim().replace(/\s+/g, ' ');
	const same = known.find((k) => squash(k) === squash(line));
	if (same) return same;
	let name = line;
	for (const [pattern, spelling] of NAMES) name = name.replace(pattern, spelling);
	name = name.replace(/\s*(?:\+|&|,|\band\b|\bwith\b|\/)\s*/gi, ' + ').replace(/^\s*\+\s*|\s*\+\s*$/g, '');
	return known.find((k) => squash(k) === squash(name)) ?? name;
}

// ---- translation and a look at the text ----

export const TRANSLATED = ['zh-CN', 'zh-TW', 'ja', 'ko', 'es', 'fr', 'de', 'pt-BR', 'ru'];

// The request for the model: the summary in nine languages, and whether the submission looks like spam or abuse rather than a game.
export function translationPrompt(game) {
	return [
		'You check and translate submissions to Vibe Arcade, a curated list of browser games people built with AI models.',
		'Reply with JSON only, no prose and no code fence, of this shape:',
		'{"ok": true or false, "reason": "why not, if not ok", "summary": {"zh-CN": "...", "zh-TW": "...", "ja": "...", "ko": "...", "es": "...", "fr": "...", "de": "...", "pt-BR": "...", "ru": "..."}}',
		'Set ok to false only when the submission is clearly not a game (an ad, a link farm, spam), or its text is hateful, sexual or abusive. A plain or odd but honest game is ok.',
		'Translate the summary into each language as one natural line, keeping the game name, model names and other proper nouns as written. Traditional Chinese uses Taiwan usage. Do not add anything the English does not say.',
		'',
		`Game name: ${game.name}`,
		`Creator on X: @${game.creator}`,
		`Model: ${game.model}`,
		`Genre: ${game.genre}`,
		`Link: ${game.link.url ?? '(the post)'}`,
		`Summary in English: ${game.summary.en}`,
	].join('\n');
}

const LINE_BREAK = /[\r\n\u2028\u2029\u200b\u2060\ufeff]/;

// The model's answer read strictly: undefined when it is not what was asked for, so a bad answer leaves the summary in English rather than putting something odd on the site.
export function readVerdict(text, english) {
	let answer;
	try {
		answer = JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
	} catch {
		return undefined;
	}
	if (typeof answer?.ok !== 'boolean') return undefined;
	if (!answer.ok) return { ok: false, reason: typeof answer.reason === 'string' && answer.reason.trim() ? answer.reason.trim() : 'it does not look like a game submission' };
	const summary = {};
	for (const lang of TRANSLATED) {
		const line = answer.summary?.[lang];
		if (typeof line !== 'string' || !line.trim() || LINE_BREAK.test(line) || line.length > english.length * 3 + 40) return undefined;
		summary[lang] = line.trim();
	}
	return { ok: true, summary };
}
