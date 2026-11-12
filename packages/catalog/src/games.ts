import meta from '../data/meta.json';
import { type LangCode, type Text, pick } from './lang';
import type { StringKey } from './strings';
import { t } from './translate';
import { CatalogError, Reader, unique } from './validate';

// The games live in packages/catalog/data/games, one file each, named after the game's slug, so submissions that arrive together never touch the same file. data/schema/game.schema.json describes the fields for editors; readGame below is what actually checks them.

// ---- genres ----

// The genres in the order the filter lists them. A game's file names its genre in English; GENRE_KEYS gives the UI string of its label.
export const GENRES = ['Shooter', 'Racing', 'Action', 'Exploration', 'Sandbox', 'Story & sim', 'Puzzle & toys'] as const;
export type Genre = (typeof GENRES)[number];

export const GENRE_COLORS: Record<Genre, string> = {
	Shooter: '#FF7A45',
	Racing: '#FFD23F',
	Action: '#FF5C8A',
	Exploration: '#4FD1C5',
	Sandbox: '#8BD45C',
	'Story & sim': '#B9A3FF',
	'Puzzle & toys': '#7CB8FF',
};

export const GENRE_KEYS = {
	Shooter: 'gShooter',
	Racing: 'gRacing',
	Action: 'gAction',
	Exploration: 'gExploration',
	Sandbox: 'gSandbox',
	'Story & sim': 'gStory',
	'Puzzle & toys': 'gPuzzle',
} as const satisfies Record<Genre, StringKey>;

// ---- a game ----

// What a game's link leads to: the game itself in a browser, its source repository, or only a video of it (the X post).
export const LINK_TYPES = ['play', 'source', 'watch'] as const;
export type LinkType = (typeof LINK_TYPES)[number];

// What the creator reported about building the featured game.
export interface Featured {
	apiCost: string;
	buildTime: string;
	outputTokens: number;
}

export interface Game {
	slug: string;
	name: string;
	// The creator's handle on X, without the @.
	creator: string;
	// The creator's page: the file's creatorUrl, or their X profile.
	creatorUrl: string;
	genre: Genre;
	// url is the file's link, or the X post for a game that can only be watched there.
	link: { type: LinkType; url: string };
	// The id of the creator's post on X, a string of digits (too large for a JSON number).
	post: string;
	postUrl: string;
	// When the post was made, as an ISO time, decoded from its id.
	postedAt: string;
	// Likes on the post when the entry was last updated.
	likes: number;
	// The AI model the game was built with, as the creator names it.
	model: string;
	// The cover's path on the site, /covers/<slug>.webp.
	cover: string;
	// The one-line description on the game's card.
	summary: Text;
	// A longer description, shown where the game is featured.
	pitch?: Text;
	featured?: Featured;
}

// The slug a game's name gives: lowercase, every run of other characters than a-z and 0-9 turned into one hyphen, none at either end.
export function slugOf(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-/, '')
		.replace(/-$/, '');
}

const HANDLE = /^[A-Za-z0-9_]{1,15}$/;
const COVER = /^[a-z0-9-]+\.webp$/;
// An X post's id: 18 to 20 digits. A shorter number is some other id (a user's, a cut-off paste) and would decode to a day in 2010; a longer one decodes to no date at all.
const POST_ID = /^[1-9][0-9]{17,19}$/;

// The fields of a game's file, of its link and of its featured block: the reader rejects any other, and the tests hold the schema to the same lists.
export const GAME_FIELDS = ['$schema', 'slug', 'name', 'creator', 'creatorUrl', 'genre', 'link', 'post', 'likes', 'model', 'cover', 'summary', 'pitch', 'featured'] as const;
export const GAME_REQUIRED = ['$schema', 'slug', 'name', 'creator', 'genre', 'link', 'post', 'likes', 'model', 'cover', 'summary'] as const;
export const LINK_FIELDS = ['type', 'url'] as const;
export const FEATURED_FIELDS = ['apiCost', 'buildTime', 'outputTokens'] as const;

// X ids are snowflakes: the bits above the low 22 are milliseconds since X's epoch, 2010-11-04T01:42:54.657Z. They exceed 2^53, hence BigInt.
const X_EPOCH_MS = 1288834974657n;
function postTime(post: string): string {
	return new Date(Number((BigInt(post) >> 22n) + X_EPOCH_MS)).toISOString();
}

function readGame(r: Reader): Game {
	r.only(GAME_FIELDS);
	const slug = r.str('slug');
	if (slug !== slugOf(slug)) r.fail('slug', `must be lowercase letters and digits in hyphen-separated groups, like "${slugOf(slug) || 'my-game'}"`);
	const name = r.str('name');
	const creator = r.match('creator', HANDLE, 'an X handle without the @');
	const creatorUrl = r.optUrl('creatorUrl') ?? `https://x.com/${creator}`;
	const genre = r.oneOf('genre', GENRES);
	const post = r.match('post', POST_ID, 'the id of an X post, 18 to 20 digits');
	const postUrl = `https://x.com/i/status/${post}`;
	const l = r.obj('link');
	l.only(LINK_FIELDS);
	const type = l.oneOf('type', LINK_TYPES);
	// Only a game that can just be watched may leave the link out: its post is where the video is.
	const url = type === 'watch' ? (l.optUrl('url') ?? postUrl) : l.url('url');
	const cover = r.match('cover', COVER, 'a .webp file name');
	if (cover !== `${slug}.webp`) r.fail('cover', `must be "${slug}.webp", the file in apps/web/public/covers named after the slug`);
	const f = r.optObj('featured');
	f?.only(FEATURED_FIELDS);
	return {
		slug,
		name,
		creator,
		creatorUrl,
		genre,
		link: { type, url },
		post,
		postUrl,
		postedAt: postTime(post),
		likes: r.int('likes', 0),
		model: r.str('model'),
		cover: `/covers/${cover}`,
		summary: r.text('summary'),
		pitch: r.optText('pitch'),
		featured: f && { apiCost: f.str('apiCost'), buildTime: f.str('buildTime'), outputTokens: f.int('outputTokens', 1) },
	};
}

// ---- one file per game ----

const GAMES_DIR = 'games';
export const GAME_SCHEMA = '../schema/game.schema.json';

// One game's file, data/games/<name>: its game, named after its slug and pointing at the schema. Throws a CatalogError naming the file and field of the first mistake.
function readGameFile(name: string, json: unknown): Game {
	const file = `${GAMES_DIR}/${name}`;
	if (!json || typeof json !== 'object' || Array.isArray(json)) throw new CatalogError(`${file}: must be an object`);
	const r = new Reader(file, json as Record<string, unknown>);
	const game = readGame(r);
	if (name !== `${game.slug}.json`) r.fail('slug', `must match the file name, ${name}`);
	if (r.raw.$schema !== GAME_SCHEMA) r.fail('$schema', `must be "${GAME_SCHEMA}"`);
	return game;
}

// import.meta.glob's result keyed by file name rather than path.
const byFileName = (files: Record<string, unknown>) => Object.fromEntries(Object.entries(files).map(([path, json]) => [path.slice(path.lastIndexOf('/') + 1), json]));

// The most liked first; games with the same likes go by slug, so the order never depends on how the files were listed. Slugs are compared by code unit rather than with localeCompare, whose order follows the locale of whoever runs it: the server and a visitor's browser must sort alike.
const byLikes = (a: Game, b: Game) => b.likes - a.likes || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
// The latest post first. Ids of one length compare as numbers do, and a longer id is a later one.
const byNewest = (a: Game, b: Game) => b.post.length - a.post.length || (a.post < b.post ? 1 : a.post > b.post ? -1 : 0);

// The games of a directory's files keyed by file name, most liked first. No two may share a slug or a post.
export function readGames(files: Record<string, unknown>): Game[] {
	const games = Object.entries(files).map(([name, json]) => readGameFile(name, json));
	unique(GAMES_DIR, games, 'slug', (g) => g.slug);
	unique(GAMES_DIR, games, 'post', (g) => g.post);
	return games.sort(byLikes);
}

export const GAMES: Game[] = readGames(byFileName(import.meta.glob<unknown>('../data/games/*.json', { eager: true, import: 'default' })));

const BY_SLUG = new Map(GAMES.map((g) => [g.slug, g]));

export function gameBySlug(slug: string): Game | undefined {
	return BY_SLUG.get(slug);
}

// ---- derived from the games ----

// The featured game: the one whose file has a featured block. The home page is built around it, so the data must name exactly one.
function featuredGame(): Game & { featured: Featured } {
	const featured = GAMES.filter((g): g is Game & { featured: Featured } => g.featured !== undefined);
	if (featured.length !== 1) throw new CatalogError(`${GAMES_DIR}/: exactly one game must have a featured block, found ${featured.length}`);
	return featured[0];
}
export const FEATURED = featuredGame();

// Each model games were built with and how many, the most used first.
export const MODELS: { name: string; count: number }[] = [...new Set(GAMES.map((g) => g.model))].map((name) => ({ name, count: GAMES.filter((g) => g.model === name).length })).sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

// How many games each genre has.
export const GENRE_COUNTS = Object.fromEntries(GENRES.map((genre) => [genre, GAMES.filter((g) => g.genre === genre).length])) as Record<Genre, number>;

// How many creators are credited. X handles are not case-sensitive.
export const creatorsCount = new Set(GAMES.map((g) => g.creator.toLowerCase())).size;

// The day (UTC) the data last changed, e.g. 2026-11-12: a game added or the like counts refreshed. It is written in data/meta.json rather than derived, since neither change shows in the games' post dates.
export const LAST_UPDATED = new Reader('meta.json', meta).match('updated', /^\d{4}-\d{2}-\d{2}$/, 'a day, YYYY-MM-DD');

export function topLiked(n: number): Game[] {
	return GAMES.slice(0, n);
}

export interface GameFilter {
	// Free text, matched without regard to case against a game's name, @creator, summary (in the visitor's language and in English), model and genre label.
	q?: string;
	genre?: Genre;
	model?: string;
	// Most liked first (the default) or newest post first.
	sort?: 'liked' | 'new';
}

export function filterGames({ q, genre, model, sort = 'liked' }: GameFilter, lang: LangCode): Game[] {
	const needle = (q ?? '').toLowerCase().trim();
	const labels = t(lang);
	const found = GAMES.filter((g) => {
		if (genre && g.genre !== genre) return false;
		if (model && g.model !== model) return false;
		if (!needle) return true;
		return `${g.name} @${g.creator} ${pick(g.summary, lang)} ${g.summary.en} ${g.model} ${labels[GENRE_KEYS[g.genre]]}`.toLowerCase().includes(needle);
	});
	return sort === 'new' ? found.sort(byNewest) : found;
}

// Up to n other games to show beside one: the most liked of its genre, topped up with the most liked of the others when the genre has too few.
export function relatedGames(game: Game, n = 3): Game[] {
	const others = GAMES.filter((g) => g.slug !== game.slug);
	return [...others.filter((g) => g.genre === game.genre), ...others.filter((g) => g.genre !== game.genre)].slice(0, n);
}

// ---- formatting ----

const COUNT_FORMATS = new Map<LangCode, Intl.NumberFormat>();
const DAY_FORMATS = new Map<LangCode, Intl.DateTimeFormat>();

// A count in the language's compact form (14K, 1.4万), or a dash for none.
export function formatCount(n: number, lang: LangCode): string {
	if (!n) return '—';
	let format = COUNT_FORMATS.get(lang);
	if (!format) COUNT_FORMATS.set(lang, (format = new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: 1 })));
	return format.format(n);
}

// The day of an ISO time or date in the language's short form (Nov 12, 11月12日), in UTC so the server and every visitor's browser render the same text.
export function formatDay(iso: string, lang: LangCode): string {
	let format = DAY_FORMATS.get(lang);
	if (!format) DAY_FORMATS.set(lang, (format = new Intl.DateTimeFormat(lang, { month: 'short', day: 'numeric', timeZone: 'UTC' })));
	return format.format(new Date(iso));
}
