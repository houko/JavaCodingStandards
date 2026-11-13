import { readFileSync } from 'node:fs';
import { GAMES } from '@vibe-arcade/catalog';
import { describe, expect, it } from 'vitest';
import { READMES, README_END, README_START, gamesSection, withGamesSection } from './readme';

const read = (name: string) => readFileSync(new URL(`../../../../${name}`, import.meta.url), 'utf8');

describe('the list of games in the READMEs', () => {
	// A failure here means the data changed and the READMEs were not redrawn: run pnpm --filter @vibe-arcade/web readme and commit the result.
	it('matches the data in every README', () => {
		for (const [name, lang] of Object.entries(READMES)) expect(withGamesSection(read(name), lang), `${name} is behind the data; run pnpm --filter @vibe-arcade/web readme`).toBe(read(name));
	});

	it('has a row for every game, linking to its page in the README language', () => {
		const zh = gamesSection('zh-CN');
		expect(zh.split('\n').filter((line) => /^\| \d+ \|/.test(line))).toHaveLength(GAMES.length);
		for (const g of GAMES) {
			expect(zh, g.slug).toContain(`/games/${g.slug}?lang=zh-CN)`);
			expect(zh, g.slug).toContain(g.summary['zh-CN'].replaceAll('|', '\\|'));
		}
		expect(gamesSection('en')).toContain(`/games/${GAMES[0].slug})`);
	});

	it('replaces only what is between the markers, and refuses a README without them', () => {
		const out = withGamesSection(`before\n${README_START}\nOLD-SECTION\n${README_END}\nafter`, 'en');
		expect(out.startsWith(`before\n${README_START}\n`)).toBe(true);
		expect(out.endsWith(`\n${README_END}\nafter`)).toBe(true);
		expect(out).not.toContain('OLD-SECTION');
		expect(() => withGamesSection('no markers', 'en')).toThrow(/needs/);
		expect(() => withGamesSection(`${README_END}${README_START}`, 'en')).toThrow(/needs/);
	});
});
