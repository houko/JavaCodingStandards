import { describe, expect, it } from 'vitest';
// @ts-expect-error The workflow's script is plain JavaScript with no type declarations.
import { gameFromForm, readForm, sentence, slugOf } from '../../../../.github/scripts/draft-submission.mjs';

// An issue body as GitHub writes a filled-in "Submit a game" form.
const form = (answers: Record<string, string>) => Object.entries(answers).map(([label, value]) => `### ${label}\n\n${value || '_No response_'}`).join('\n\n');
const GOOD = {
	'Game name': 'Kit Racer',
	"Creator's X handle": '@someone',
	'X post URL': 'https://x.com/someone/status/2119925633564463610?s=20',
	'Play, source or watch URL': 'https://kit.example/play',
	'Link type': 'play',
	Genre: 'Racing',
	'AI model': 'Claude Fable 5.2',
	'One-line description in English': 'A  kart racer\non a rug.',
	'Before you submit': '- [X] The game runs in a browser',
};
const taken = { slugs: new Set(['kit-racer-old']), posts: new Map([['2119925633564463609', 'saltline']]) };
type Result = { game?: Record<string, unknown> & { link: unknown; summary: unknown }; problem?: string };
const draft = (changes: Record<string, string> = {}, used = taken): Result => gameFromForm(readForm(form({ ...GOOD, ...changes })), used);

describe('a description', () => {
	it('becomes one sentence with a capital and a full stop, the rest as written', () => {
		expect(sentence('arcade-style game inspired by the Indonesian archipelago')).toBe('Arcade-style game inspired by the Indonesian archipelago.');
		expect(sentence('  A kart\nracer!  ')).toBe('A kart racer!');
		expect(sentence('Ends with a full stop.')).toBe('Ends with a full stop.');
		expect(sentence('雾锁山门')).toBe('雾锁山门');
		expect(sentence('Version 2')).toBe('Version 2.');
		expect(sentence('')).toBe('');
	});
});

describe('reading the submit form', () => {
	it('reads each answer by its question, empty for no response', () => {
		const answers = readForm(form({ ...GOOD, 'Play, source or watch URL': '' }));
		expect(answers['Game name']).toBe('Kit Racer');
		expect(answers['Play, source or watch URL']).toBe('');
		expect(answers['Link type']).toBe('play');
	});

	it('makes a game file with the summary in English only', () => {
		expect(draft().game).toEqual({ $schema: '../schema/game.schema.json', slug: 'kit-racer', name: 'Kit Racer', creator: 'someone', genre: 'Racing', link: { type: 'play', url: 'https://kit.example/play' }, post: '2119925633564463610', likes: 0, model: 'Claude Fable 5.2', cover: 'kit-racer.webp', summary: { en: 'A kart racer on a rug.' } });
	});

	it('lets a watch-only game leave its link out', () => {
		expect(draft({ 'Link type': 'watch', 'Play, source or watch URL': '' }).game?.link).toEqual({ type: 'watch' });
	});

	it('makes a slug for a name without Latin letters, and never reuses one', () => {
		expect(draft({ 'Game name': '雾锁山门' }).game?.slug).toBe('someone-463610');
		expect(draft({}, { ...taken, slugs: new Set(['kit-racer']) }).game?.slug).toBe('kit-racer-2');
		expect(slugOf('Portals: Endless Worlds')).toBe('portals-endless-worlds');
	});

	it('says what is wrong instead of writing a bad file', () => {
		expect(draft({ 'X post URL': 'https://example.com/post/1' }).problem).toMatch(/post on X/);
		expect(draft({ 'X post URL': 'https://x.com/someone/status/2119925633564463609' }).problem).toMatch(/already listed, as saltline/);
		expect(draft({ Genre: 'Puzzle' }).problem).toMatch(/genre must be one of/);
		expect(draft({ "Creator's X handle": 'not a handle!' }).problem).toMatch(/not an X handle/);
		expect(draft({ 'Play, source or watch URL': 'http://kit.example' }).problem).toMatch(/https/);
		expect(draft({ 'Game name': '' }).problem).toMatch(/missing/);
		expect(draft({ 'One-line description in English': 'x'.repeat(161) }).problem).toMatch(/162 characters long/);
	});
});
