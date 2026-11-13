import { GAMES, GENRE_KEYS, type Game, type LangCode, MODELS, creatorsCount, pick, t } from '@vibe-arcade/catalog';
import { gamePath, pageUrl } from './seo';

// The list of games in the repository's READMEs, drawn from the same data as the site so the two cannot disagree: scripts/readme-games.ts writes it between the markers below, and the tests fail when a README has fallen behind the data. Like counts are left out, so refreshing them does not touch the READMEs; the order, most liked first, is what they show of them.

export const README_START = '<!-- games:start -->';
export const README_END = '<!-- games:end -->';

// The READMEs and the language each is written in. The other site languages have no README.
export const READMES: Record<string, LangCode> = { 'README.md': 'en', 'README.zh-CN.md': 'zh-CN', 'README.zh-TW.md': 'zh-TW', 'README.ja.md': 'ja', 'README.ko.md': 'ko' };

// A table cell's text: a pipe would end the cell.
const cell = (text: string) => text.replaceAll('|', '\\|');

function row(game: Game, index: number, lang: LangCode): string {
	const tr = t(lang);
	const links = [`[${tr[game.link.type]}](${game.link.url})`, ...(game.link.url === game.postUrl ? [] : [`[${tr.post}](${game.postUrl})`])];
	return `| ${index + 1} | [**${cell(game.name)}**](${pageUrl(gamePath(game.slug), lang)})<br>${cell(pick(game.summary, lang))} | [@${game.creator}](${game.creatorUrl}) | ${tr[GENRE_KEYS[game.genre]]} | ${cell(game.model)} | ${links.join(' · ')} |`;
}

// The counts and the table, without the markers.
export function gamesSection(lang: LangCode): string {
	const tr = t(lang);
	const counts = `**${GAMES.length}** ${tr.statGames} · **${creatorsCount}** ${tr.statCreators} · **${MODELS.length}** ${tr.statModels}`;
	const head = `| # | ${tr.games} | ${tr.creatorsH} | ${tr.genre} | ${tr.model} | |\n| --- | --- | --- | --- | --- | --- |`;
	return `${counts}\n\n${head}\n${GAMES.map((g, i) => row(g, i, lang)).join('\n')}`;
}

// A README's text with the section between its markers replaced. Throws when the markers are missing or out of order, rather than writing the section somewhere else.
export function withGamesSection(readme: string, lang: LangCode): string {
	const start = readme.indexOf(README_START);
	const end = readme.indexOf(README_END);
	if (start === -1 || end < start) throw new Error(`the README needs ${README_START} followed by ${README_END}`);
	return `${readme.slice(0, start + README_START.length)}\n${gamesSection(lang)}\n${readme.slice(end)}`;
}
