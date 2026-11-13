import { describe, expect, it } from 'vitest';
// @ts-expect-error The workflow's script is plain JavaScript with no type declarations.
import { MAX_OPEN, MIN_ACCOUNT_DAYS, TRANSLATED, guardProblem, normalizeModel, readBlocklist, readVerdict, translationPrompt } from '../../../../.github/scripts/submission-guards.mjs';

const NOW = '2026-11-13T00:00:00Z';
const ok = { login: 'someone', createdAt: '2020-01-01T00:00:00Z', openOthers: 0, creator: 'maker', blocklist: new Set<string>(), now: NOW };

describe('who may submit', () => {
	it('lets an established account with few open submissions through', () => {
		expect(guardProblem(ok)).toBeUndefined();
	});

	it(`stops accounts younger than ${MIN_ACCOUNT_DAYS} days, more than ${MAX_OPEN} open submissions, and the blocklist`, () => {
		expect(guardProblem({ ...ok, createdAt: '2026-11-10T00:00:00Z' })).toMatch(/younger than/);
		expect(guardProblem({ ...ok, createdAt: 'not a date' })).toMatch(/younger than/);
		expect(guardProblem({ ...ok, openOthers: MAX_OPEN })).toMatch(/already have/);
		expect(guardProblem({ ...ok, blocklist: readBlocklist('# spam\n@SomeOne\n') })).toMatch(/not listed automatically/);
		expect(guardProblem({ ...ok, blocklist: readBlocklist('MAKER # their bot') })).toMatch(/not listed automatically/);
	});
});

describe('model names', () => {
	const known = ['Claude Fable 5.2', 'GPT-6.2 Sol vs Fable'];
	it('takes the spelling of a model already listed', () => {
		expect(normalizeModel('claude  fable 5.2', known)).toBe('Claude Fable 5.2');
		expect(normalizeModel('Claude-Fable-5.2', known)).toBe('Claude Fable 5.2');
	});

	it("writes makers' names their way and joins several models with +", () => {
		expect(normalizeModel('Gemini and chat gpt', known)).toBe('Gemini + ChatGPT');
		expect(normalizeModel('claude opus 5.5 / gpt-6.2', known)).toBe('Claude Opus 5.5 + GPT-6.2');
		expect(normalizeModel('deepseek, qwen & grok', known)).toBe('DeepSeek + Qwen + Grok');
		expect(normalizeModel('Some New Model 1', known)).toBe('Some New Model 1');
	});
});

describe('the translation and the look at the text', () => {
	const game = { name: 'Kit', creator: 'maker', model: 'Gemini', genre: 'Racing', link: { url: 'https://kit.example' }, summary: { en: 'A kart racer.' } };
	const summary = Object.fromEntries(TRANSLATED.map((l: string) => [l, `Kart (${l})`]));

	it('asks for every language and names the submission', () => {
		const prompt = translationPrompt(game);
		for (const lang of TRANSLATED) expect(prompt).toContain(`"${lang}"`);
		expect(prompt).toContain('Summary in English: A kart racer.');
	});

	it('reads a good answer, with or without a code fence', () => {
		expect(readVerdict(JSON.stringify({ ok: true, summary }), 'A kart racer.')).toEqual({ ok: true, summary });
		expect(readVerdict(`\`\`\`json\n${JSON.stringify({ ok: true, summary })}\n\`\`\``, 'A kart racer.')).toEqual({ ok: true, summary });
	});

	it('reads a refusal with its reason', () => {
		expect(readVerdict('{"ok": false, "reason": "an ad for a casino"}', 'x')).toEqual({ ok: false, reason: 'an ad for a casino' });
	});

	it('gives up on anything else, so the summary stays English', () => {
		expect(readVerdict('not json', 'A kart racer.')).toBeUndefined();
		expect(readVerdict(JSON.stringify({ ok: true, summary: { ...summary, ja: '' } }), 'A kart racer.')).toBeUndefined();
		expect(readVerdict(JSON.stringify({ ok: true, summary: { ...summary, ko: 'two\nlines' } }), 'A kart racer.')).toBeUndefined();
		expect(readVerdict(JSON.stringify({ ok: true, summary: { ...summary, de: 'x'.repeat(200) } }), 'A kart racer.')).toBeUndefined();
		expect(readVerdict(JSON.stringify({ summary }), 'A kart racer.')).toBeUndefined();
	});
});
