import de from '../locales/de.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import ja from '../locales/ja.json';
import ko from '../locales/ko.json';
import ptBR from '../locales/pt-BR.json';
import ru from '../locales/ru.json';
import zhCN from '../locales/zh-CN.json';
import zhTW from '../locales/zh-TW.json';
import type { LangCode } from './lang';

// UI copy, one flat JSON file per language under locales/. `{name}` placeholders are filled by `fill()`.
//
// en.json is the reference: its keys are the StringKey type, and a file missing one fails the type check below. The tests check that every file has exactly the reference's keys and the same placeholders.
//
// Notes on some keys, since JSON has no comments:
// - siteTitle and siteDescription are the home page's <title> and meta description; gameTitle ({name}, {creator}) and gameDescription ({summary}, {model}, {genre}) are a game page's. ogAlt describes the site's share image.
// - showing takes {a} (games shown) and {b} (games in all); moreIn takes {g}, a genre's label; madeBy takes {maker}. nGames takes {n}, a creator's count of games, and oneGame is its form for a single game; gamesBy takes {c}, a creator's @handle.
// - heroL1 and heroL2 are the two lines of the hero's headline. nowPlaying labels the hero's screen and its row of dots.
// - buildNotes heads what a creator reported about building a game: buildTime, apiCost, tokens, prompts, lines, fileSize and agents label its figures, promptLabel the prompt, and featuredStatsNote says whose figures they are.
// - linkDown is the badge of a game marked as down, and linkDownNote, which takes {date}, the sentence on its page.
// - a5 names the curator's handle; removal is the footer's link to them.
// - a2 takes {models}, the names of the models the listed games were built with.
// - gShooter … gPuzzle are the genres' labels (GENRE_KEYS in games.ts). play, source and watch are a card's short action labels; playLabel, sourceLabel and watchLabel are the long forms on a game's page.
// - by, builtWith and posted are followed by a creator's handle, a model's name and a date. tag and follow are followed by the curator's handle, curatedBy too.
// - submitOnGitHub is the submit block's button, which opens the issue form; pauseMotion names the hero's button that stops everything that moves by itself. clear removes the search text or the creator filter; reset clears every filter.
// - footer1 follows the site's name as a sentence fragment; footer2 is a sentence of its own.
export type StringKey = keyof typeof en;
export type Translations = Record<StringKey, string>;

export const LOCALES: Record<LangCode, Translations> = { en, 'zh-CN': zhCN, 'zh-TW': zhTW, ja, ko, es, fr, de, 'pt-BR': ptBR, ru };
