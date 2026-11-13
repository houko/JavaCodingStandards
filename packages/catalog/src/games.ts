import media from '../data/media.json';
import meta from '../data/meta.json';
import moved from '../data/moved.json';
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

// What the creator reported about building the game, each as they wrote it ("8h", "~$550", "2.7M out · 445M in"). The order here is the order the site lists them in.
export const NOTE_FIELDS = ['time', 'cost', 'tokens', 'prompts', 'lines', 'size', 'agents'] as const;
export type NoteField = (typeof NOTE_FIELDS)[number];

export interface Notes {
	facts: { field: NoteField; value: string }[];
	// The prompt the game was made from, where the creator shared it.
	prompt?: string;
}

export interface Game {
	slug: string;
	name: string;
	// The creator's handle on X, without the @.
	creator: string;
	// The creator's page: the file's creatorUrl, or their X profile.
	creatorUrl: string;
	genre: Genre;
	// url is the file's link, or the X post for a game that can only be watched there. A game marked as down is one of those for as long as the mark stands, whatever its file's link says.
	link: { type: LinkType; url: string };
	// The day (UTC, YYYY-MM-DD) the game joined the site, for the games added since the field was introduced; it makes a game new (isNew) for NEW_DAYS.
	added?: string;
	// The day (UTC, YYYY-MM-DD) the game was marked as down: its link had stopped answering the daily check (.github/workflows/links.yml). The game stays listed and points at its post.
	down?: string;
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
	// A longer description, shown on the game's page and where it is a pick.
	pitch?: Text;
	notes?: Notes;
	// A short silent clip of the post's video, /videos/<slug>.mp4, for the games that have one (data/media.json), and the larger one the hero screen plays, /videos/hero/<slug>.mp4.
	video?: string;
	heroVideo?: string;
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
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// The fields of a game's file, of its link and of its notes block: the reader rejects any other, and the tests hold the schema to the same lists.
export const GAME_FIELDS = ['$schema', 'slug', 'name', 'creator', 'creatorUrl', 'genre', 'link', 'post', 'likes', 'model', 'cover', 'summary', 'pitch', 'notes', 'down', 'added'] as const;
export const GAME_REQUIRED = ['$schema', 'slug', 'name', 'creator', 'genre', 'link', 'post', 'likes', 'model', 'cover', 'summary'] as const;
export const LINK_FIELDS = ['type', 'url'] as const;
export const NOTES_FIELDS = [...NOTE_FIELDS, 'prompt'] as const;

// X ids are snowflakes: the bits above the low 22 are milliseconds since X's epoch, 2010-11-04T01:42:54.657Z. They exceed 2^53, hence BigInt.
const X_EPOCH_MS = 1288834974657n;
function postTime(post: string): string {
	return new Date(Number((BigInt(post) >> 22n) + X_EPOCH_MS)).toISOString();
}

// What scripts/fetch-media.ts found for the games: which have a clip, which a hero clip, and which creators (handles in lowercase) an avatar.
const mediaReader = new Reader('media.json', media);
const VIDEOS = new Set(mediaReader.strs('videos'));
const HERO_VIDEOS = new Set(mediaReader.strs('heroVideos'));
const AVATARS = new Set(mediaReader.strs('avatars'));

function readNotes(n: Reader): Notes {
	n.only(NOTES_FIELDS);
	const facts = NOTE_FIELDS.filter((field) => n.raw[field] !== undefined).map((field) => ({ field, value: n.str(field) }));
	return { facts, prompt: n.raw.prompt === undefined ? undefined : n.str('prompt') };
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
	const down = r.raw.down === undefined ? undefined : r.match('down', DAY, 'a day, YYYY-MM-DD');
	const added = r.raw.added === undefined ? undefined : r.match('added', DAY, 'a day, YYYY-MM-DD');
	const cover = r.match('cover', COVER, 'a .webp file name');
	if (cover !== `${slug}.webp`) r.fail('cover', `must be "${slug}.webp", the file in apps/web/public/covers named after the slug`);
	const n = r.optObj('notes');
	if (n && Object.keys(n.raw).length === 0) r.fail('notes', 'must hold at least one note');
	return {
		slug,
		name,
		creator,
		creatorUrl,
		genre,
		link: down === undefined ? { type, url } : { type: 'watch', url: postUrl },
		down,
		added,
		post,
		postUrl,
		postedAt: postTime(post),
		likes: r.int('likes', 0),
		model: r.str('model'),
		cover: `/covers/${cover}`,
		summary: r.text('summary'),
		pitch: r.optText('pitch'),
		notes: n && readNotes(n),
		video: VIDEOS.has(slug) ? `/videos/${slug}.mp4` : undefined,
		heroVideo: HERO_VIDEOS.has(slug) ? `/videos/hero/${slug}.mp4` : undefined,
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

// Slugs a game had before it was renamed, each to the game's slug now (data/moved.json), so an old link still finds the game: the site answers /games/<old> with a permanent redirect. An old slug must not be a game's slug, and its target must be one.
function readMoved(): Map<string, string> {
	const r = new Reader('moved.json', moved);
	const map = new Map<string, string>();
	for (const old of Object.keys(moved)) {
		const now = r.str(old);
		if (old !== slugOf(old)) r.fail(old, 'is not a slug');
		if (BY_SLUG.has(old)) r.fail(old, `is the slug of a game; a game that took it back must leave this list`);
		if (!BY_SLUG.has(now)) r.fail(old, `points at "${now}", which is not a game`);
		map.set(old, now);
	}
	return map;
}
const MOVED = readMoved();

// The game's slug now, for a slug it had before.
export function movedSlug(slug: string): string | undefined {
	return MOVED.get(slug);
}

// ---- derived from the games ----

// This week's picks, in the order data/meta.json lists their slugs. The home page builds a block around them, so there must be at least one and each must be a game.
function readPicks(): Game[] {
	const picks = new Reader('meta.json', meta).strs('picks').map((slug) => BY_SLUG.get(slug) ?? fail(`meta.json: picks names "${slug}", which is not a game`));
	if (picks.length === 0) fail('meta.json: picks must name at least one game');
	unique('meta.json picks', picks, 'slug', (g) => g.slug);
	return picks;
}
function fail(message: string): never {
	throw new CatalogError(message);
}
export const PICKS = readPicks();

// The games the hero screen rotates through: the most liked ones with a hero clip.
export const HERO_GAMES = GAMES.filter((g) => g.heroVideo !== undefined);

// Each model games were built with and how many, the most used first.
export const MODELS: { name: string; count: number }[] = [...new Set(GAMES.map((g) => g.model))].map((name) => ({ name, count: GAMES.filter((g) => g.model === name).length })).sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

// How many games each genre has.
export const GENRE_COUNTS = Object.fromEntries(GENRES.map((genre) => [genre, GAMES.filter((g) => g.genre === genre).length])) as Record<Genre, number>;

// A creator and what they have listed. X handles are not case-sensitive: key is the handle in lowercase, which the URL's ?creator= and the avatar's file name use, while handle keeps the spelling of their most liked game's file.
export interface Creator {
	key: string;
	handle: string;
	url: string;
	// /avatars/<key>.webp, for the creators whose avatar was fetched (data/media.json).
	avatar?: string;
	games: number;
	likes: number;
}

function readCreators(): Creator[] {
	const byKey = new Map<string, Creator>();
	for (const g of GAMES) {
		const key = g.creator.toLowerCase();
		const c = byKey.get(key) ?? { key, handle: g.creator, url: g.creatorUrl, avatar: AVATARS.has(key) ? `/avatars/${key}.webp` : undefined, games: 0, likes: 0 };
		c.games++;
		c.likes += g.likes;
		byKey.set(key, c);
	}
	return [...byKey.values()].sort((a, b) => b.likes - a.likes || (a.key < b.key ? -1 : 1));
}

// Every creator, the one whose games have the most likes first.
export const CREATORS = readCreators();
export const creatorsCount = CREATORS.length;

const CREATOR_BY_KEY = new Map(CREATORS.map((c) => [c.key, c]));
export function creatorByHandle(handle: string): Creator | undefined {
	return CREATOR_BY_KEY.get(handle.toLowerCase());
}

// The day (UTC) the data last changed, e.g. 2026-11-12: a game added or the like counts refreshed. It is written in data/meta.json rather than derived, since neither change shows in the games' post dates.
export const LAST_UPDATED = new Reader('meta.json', meta).match('updated', DAY, 'a day, YYYY-MM-DD');

// How long a game added to the site counts as new.
export const NEW_DAYS = 14;
const DAY_MS = 86_400_000;

// Whether a game was added in the NEW_DAYS before the data last changed. Counted from that day rather than from today, so the server and every visitor's browser agree, and so the mark moves with each deploy of new data rather than with the clock.
export function isNew(game: Game): boolean {
	if (game.added === undefined) return false;
	const age = (Date.parse(LAST_UPDATED) - Date.parse(game.added)) / DAY_MS;
	return age >= 0 && age < NEW_DAYS;
}

export function topLiked(n: number): Game[] {
	return GAMES.slice(0, n);
}

export interface GameFilter {
	// Free text, matched without regard to case against a game's name, @creator, summary (in the visitor's language and in English), model and genre label.
	q?: string;
	genre?: Genre;
	model?: string;
	// A creator's handle, in any case.
	creator?: string;
	// Most liked first (the default) or newest post first.
	sort?: 'liked' | 'new';
}

export function filterGames({ q, genre, model, creator, sort = 'liked' }: GameFilter, lang: LangCode): Game[] {
	const needle = (q ?? '').toLowerCase().trim();
	const labels = t(lang);
	const by = creator?.toLowerCase();
	const found = GAMES.filter((g) => {
		if (by !== undefined && g.creator.toLowerCase() !== by) return false;
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
