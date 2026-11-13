import { describe, expect, it } from 'vitest';
import schema from '../data/schema/game.schema.json';
import { CREATORS, GAMES, GAME_FIELDS, GAME_REQUIRED, GAME_SCHEMA, GENRES, GENRE_COLORS, GENRE_COUNTS, GENRE_KEYS, HERO_GAMES, LAST_UPDATED, LINK_FIELDS, LINK_TYPES, MODELS, NOTES_FIELDS, NOTE_FIELDS, PICKS, creatorByHandle, creatorsCount, filterGames, formatCount, formatDay, gameBySlug, movedSlug, readGames, relatedGames, slugOf, topLiked } from './games';
import { LANGS, type Text } from './lang';
import { LOCALES } from './strings';
import { t } from './translate';
import { CatalogError } from './validate';

// The tests run on Node 24; this package has no Node type definitions, so the functions needed are declared here.
declare const process: { getBuiltinModule(id: 'node:fs'): { existsSync(path: URL): boolean; readdirSync(path: URL): string[]; readFileSync(path: URL, encoding: 'utf8'): string } };
const { existsSync, readdirSync, readFileSync } = process.getBuiltinModule('node:fs');

const DATA = new URL('../data/games/', import.meta.url);
const COVERS = new URL('../../../apps/web/public/covers/', import.meta.url);
const PUBLIC = new URL('../../../apps/web/public', import.meta.url);
const names = (games: readonly { name: string }[]) => games.map((g) => g.name);

const TEXT = Object.fromEntries(LANGS.map((lang) => [lang, `A kit (${lang}).`])) as Text;
const KIT = { $schema: '../schema/game.schema.json', slug: 'kit', name: 'Kit', creator: 'someone', genre: 'Action', link: { type: 'play', url: 'https://kit.example' }, post: '2119925633564463609', likes: 12, model: 'Some Model 1', cover: 'kit.webp', summary: TEXT };
const KIT_POSTED_AT = new Date(Number((2119925633564463609n >> 22n) + 1288834974657n)).toISOString();
const read = (changes: Record<string, unknown>, name = 'kit.json') => () => readGames({ [name]: { ...KIT, ...changes } });

// These tests hold the data to its rules, never to its contents of the day: a new game, another model or refreshed like counts must not fail them.
describe('the games', () => {
	it('are one per file of data/games', () => {
		expect(readdirSync(DATA).sort()).toEqual(GAMES.map((g) => `${g.slug}.json`).sort());
	});

	it('have unique slugs, each the slug of the name where the name has Latin letters or digits to make one from, found by gameBySlug', () => {
		expect(new Set(GAMES.map((g) => g.slug)).size).toBe(GAMES.length);
		for (const g of GAMES) {
			if (slugOf(g.name)) expect(g.slug, g.name).toBe(slugOf(g.name));
			expect(gameBySlug(g.slug)).toBe(g);
		}
		expect(gameBySlug('not-a-game')).toBeUndefined();
		expect(gameBySlug('')).toBeUndefined();
	});

	it('turn a name into its slug', () => {
		expect(slugOf('Portals: Endless Worlds')).toBe('portals-endless-worlds');
		expect(slugOf('3D action game')).toBe('3d-action-game');
		expect(slugOf('I Would Have Gotten Away With It')).toBe('i-would-have-gotten-away-with-it');
		expect(slugOf('Fortnite in Three.js')).toBe('fortnite-in-three-js');
		expect(slugOf('  --Story & sim!  ')).toBe('story-sim');
	});

	it('have unique posts, ids that decode to a time', () => {
		expect(new Set(GAMES.map((g) => g.post)).size).toBe(GAMES.length);
		for (const g of GAMES) {
			expect(g.post, g.slug).toMatch(/^[1-9][0-9]{17,19}$/);
			expect(g.postUrl, g.slug).toBe(`https://x.com/i/status/${g.post}`);
			expect(g.postedAt, g.slug).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		}
	});

	it('decode the time of a post from its id', () => {
		expect(read({})()[0].postedAt).toBe(KIT_POSTED_AT);
		expect(KIT_POSTED_AT.slice(0, 10)).toBe('2026-11-09');
		// The reference page read the id as a floating-point number, which is exact only to the day's precision it showed: the two agree on every game's day.
		for (const g of GAMES) expect(g.postedAt.slice(0, 10), g.slug).toBe(new Date(Math.floor(Number(g.post) / 4194304) + 1288834974657).toISOString().slice(0, 10));
	});

	it('are summarised in all ten languages, on one line each', () => {
		for (const g of GAMES) {
			for (const text of g.pitch ? [g.summary, g.pitch] : [g.summary]) {
				expect(Object.keys(text).sort(), g.slug).toEqual([...LANGS].sort());
				for (const lang of LANGS) expect(text[lang].trim(), `${g.slug} ${lang}`).not.toBe('');
			}
		}
	});

	it('name a genre, a kind of link and an https link of the site', () => {
		for (const g of GAMES) {
			expect(GENRES, g.slug).toContain(g.genre);
			expect(LINK_TYPES, g.slug).toContain(g.link.type);
			expect(g.link.url, g.slug).toMatch(/^https:\/\/\S+$/);
			expect(g.creatorUrl, g.slug).toMatch(/^https:\/\/\S+$/);
		}
		expect(new Set(GAMES.map((g) => g.link.type))).toEqual(new Set(LINK_TYPES));
		expect(new Set(GAMES.map((g) => g.genre))).toEqual(new Set(GENRES));
	});

	it('link a game that can only be watched to its post', () => {
		for (const g of GAMES.filter((g) => g.link.type === 'watch')) expect(g.link.url, g.slug).toBe(g.postUrl);
		for (const g of GAMES) if (g.link.type !== 'watch') expect(g.link.url, g.slug).not.toBe(g.postUrl);
	});

	it("link a creator to their X profile unless the file names another page", () => {
		for (const g of GAMES) {
			const file: { creatorUrl?: string } = JSON.parse(readFileSync(new URL(`${g.slug}.json`, DATA), 'utf8'));
			expect(g.creatorUrl, g.slug).toBe(file.creatorUrl ?? `https://x.com/${g.creator}`);
		}
		for (const g of GAMES) expect(g.creator, g.slug).toMatch(/^[A-Za-z0-9_]{1,15}$/);
	});

	it('count likes in whole numbers and list the most liked first', () => {
		for (const g of GAMES) expect(Number.isInteger(g.likes) && g.likes >= 0, g.slug).toBe(true);
		for (let i = 1; i < GAMES.length; i++) expect(GAMES[i - 1].likes, GAMES[i].slug).toBeGreaterThanOrEqual(GAMES[i].likes);
	});

	it('name the model that built them, counted in MODELS with the most used first', () => {
		expect(new Set(MODELS.map((m) => m.name))).toEqual(new Set(GAMES.map((g) => g.model)));
		expect(new Set(MODELS.map((m) => m.name)).size).toBe(MODELS.length);
		for (const m of MODELS) expect(m.count, m.name).toBe(GAMES.filter((g) => g.model === m.name).length);
		for (let i = 1; i < MODELS.length; i++) expect(MODELS[i - 1].count, MODELS[i].name).toBeGreaterThanOrEqual(MODELS[i].count);
	});

	it('are counted by genre', () => {
		expect(Object.keys(GENRE_COUNTS)).toEqual([...GENRES]);
		for (const genre of GENRES) expect(GENRE_COUNTS[genre], genre).toBe(GAMES.filter((g) => g.genre === genre).length);
	});

	it('point at a cover named after the slug', () => {
		for (const g of GAMES) expect(g.cover, g.slug).toBe(`/covers/${g.slug}.webp`);
	});

	// The covers are not part of this package: they are fetched into the site's public directory (pnpm --filter @vibe-arcade/web covers). A failure here means that step has not run, or a new game's cover was not added with it.
	it('have their cover file in apps/web/public/covers', () => {
		const missing = GAMES.filter((g) => !existsSync(new URL(`${g.slug}.webp`, COVERS))).map((g) => `apps/web/public${g.cover}`);
		expect(missing, `${missing.length} of ${GAMES.length} covers are missing from apps/web/public/covers; each game needs a 960x600 <slug>.webp there`).toEqual([]);
	});

	it('list what their creators reported in the order of NOTE_FIELDS', () => {
		for (const g of GAMES.filter((g) => g.notes)) {
			const fields = g.notes!.facts.map((f) => f.field);
			expect(fields, g.slug).toEqual(NOTE_FIELDS.filter((f) => fields.includes(f)));
			expect(fields.length > 0 || g.notes!.prompt !== undefined, g.slug).toBe(true);
		}
	});

	it('send each old slug in data/moved.json to a game, and no slug of a game', () => {
		const moved: Record<string, string> = JSON.parse(readFileSync(new URL('../data/moved.json', import.meta.url), 'utf8'));
		for (const [old, now] of Object.entries(moved)) {
			expect(gameBySlug(old), old).toBeUndefined();
			expect(gameBySlug(now), old).toBeDefined();
			expect(movedSlug(old)).toBe(now);
		}
		expect(movedSlug(GAMES[0].slug)).toBeUndefined();
	});

	it('name at least one pick of the week, each a game and none twice', () => {
		expect(PICKS.length).toBeGreaterThan(0);
		expect(new Set(PICKS).size).toBe(PICKS.length);
		for (const g of PICKS) expect(gameBySlug(g.slug)).toBe(g);
	});

	// The clips and avatars are not part of this package: scripts/fetch-media.ts of the site writes them into its public directory and lists them in data/media.json. A failure here means the list and the files have come apart; run the script again.
	it('have the clip files data/media.json lists, and the hero plays the most liked of them', () => {
		for (const g of GAMES) {
			if (g.video) expect(existsSync(new URL(`public${g.video}`, PUBLIC)), g.video).toBe(true);
			if (g.heroVideo) expect(existsSync(new URL(`public${g.heroVideo}`, PUBLIC)), g.heroVideo).toBe(true);
			if (g.heroVideo) expect(g.video, g.slug).toBeDefined();
		}
		expect(HERO_GAMES.length).toBeGreaterThan(0);
		expect(HERO_GAMES).toEqual(GAMES.filter((g) => g.video).slice(0, HERO_GAMES.length));
	});

	it('count each creator once, whatever the case of the handle, with their games and likes', () => {
		expect(creatorsCount).toBe(new Set(GAMES.map((g) => g.creator.toLowerCase())).size);
		expect(CREATORS.length).toBe(creatorsCount);
		for (const c of CREATORS) {
			const theirs = GAMES.filter((g) => g.creator.toLowerCase() === c.key);
			expect(c.games, c.key).toBe(theirs.length);
			expect(c.likes, c.key).toBe(theirs.reduce((sum, g) => sum + g.likes, 0));
			expect(creatorByHandle(c.handle.toUpperCase())).toBe(c);
			if (c.avatar) expect(existsSync(new URL(`public${c.avatar}`, PUBLIC)), c.avatar).toBe(true);
		}
		for (let i = 1; i < CREATORS.length; i++) expect(CREATORS[i - 1].likes, CREATORS[i].key).toBeGreaterThanOrEqual(CREATORS[i].likes);
		expect(creatorByHandle('no_such_creator')).toBeUndefined();
	});

	it('were last updated on the day data/meta.json names, no earlier than the newest post', () => {
		expect(LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(new Date(LAST_UPDATED).toISOString().slice(0, 10)).toBe(LAST_UPDATED);
		expect(LAST_UPDATED >= GAMES.map((g) => g.postedAt).sort().at(-1)!.slice(0, 10), LAST_UPDATED).toBe(true);
	});
});

describe('the genres', () => {
	it('each have a colour and a label in the UI copy', () => {
		expect(GENRES).toEqual(['Shooter', 'Racing', 'Action', 'Exploration', 'Sandbox', 'Story & sim', 'Puzzle & toys']);
		expect(Object.keys(GENRE_COLORS)).toEqual([...GENRES]);
		expect(Object.keys(GENRE_KEYS)).toEqual([...GENRES]);
		for (const genre of GENRES) {
			expect(GENRE_COLORS[genre], genre).toMatch(/^#[0-9A-F]{6}$/);
			expect(LOCALES.en[GENRE_KEYS[genre]], genre).toBe(genre);
		}
		expect(new Set(Object.values(GENRE_COLORS)).size).toBe(GENRES.length);
	});
});

describe("a game's file", () => {
	it('is read with its derived fields', () => {
		expect(readGames({ 'kit.json': KIT })).toEqual([
			{ slug: 'kit', name: 'Kit', creator: 'someone', creatorUrl: 'https://x.com/someone', genre: 'Action', link: { type: 'play', url: 'https://kit.example' }, post: '2119925633564463609', postUrl: 'https://x.com/i/status/2119925633564463609', postedAt: KIT_POSTED_AT, likes: 12, model: 'Some Model 1', cover: '/covers/kit.webp', summary: TEXT, pitch: undefined, notes: undefined, video: undefined, heroVideo: undefined, down: undefined },
		]);
		const [full] = read({ creatorUrl: 'https://github.com/someone', pitch: TEXT, notes: { prompt: 'Make a kit', cost: '~$5', time: '1h' } })();
		expect(full.creatorUrl).toBe('https://github.com/someone');
		expect(full.pitch).toBe(TEXT);
		expect(full.notes).toEqual({ facts: [{ field: 'time', value: '1h' }, { field: 'cost', value: '~$5' }], prompt: 'Make a kit' });
	});

	it('must be named after its slug and point at the schema', () => {
		expect(read({}, 'other.json')).toThrow(/^games\/other.json \(Kit\): slug must match the file name, other.json$/);
		expect(read({ $schema: '../schema/app.schema.json' })).toThrow(/\$schema must be "..\/schema\/game.schema.json"/);
		expect(read({ $schema: undefined })).toThrow(/\$schema must be/);
		expect(() => readGames({ 'kit.json': [KIT] })).toThrow(/^games\/kit.json: must be an object$/);
		expect(() => readGames({ 'kit.json': null })).toThrow(CatalogError);
	});

	it('must have a well-formed slug, creator, genre, post, likes, model and cover', () => {
		for (const slug of ['Kit', 'kit_one', '-kit', 'kit-', 'kit--one', 'kit one']) expect(read({ slug, cover: `${slug}.webp` }, `${slug}.json`), slug).toThrow(/slug must be lowercase letters and digits in hyphen-separated groups/);
		expect(read({ creator: '@someone' })).toThrow(/creator must be an X handle without the @, got "@someone"/);
		expect(read({ creator: 'https://x.com/someone' })).toThrow(/creator must be an X handle/);
		expect(read({ creatorUrl: 'github.com/someone' })).toThrow(/creatorUrl must be an https link/);
		expect(read({ genre: 'Strategy' })).toThrow(/genre must be one of Shooter, Racing, Action, Exploration, Sandbox, Story & sim, Puzzle & toys, got "Strategy"/);
		expect(read({ genre: 'action' })).toThrow(/genre must be one of/);
		expect(read({ post: 2119925633564463609 })).toThrow(/post must be a non-empty string/);
		// A number that large has already lost its last digits by the time JSON is parsed, so it must be a string.
		for (const post of ['https://x.com/i/status/2119925633564463609', '12a', '1', '12345678901234567', '0119925633564463609', '2'.repeat(21), '2'.repeat(30)]) expect(read({ post }), post).toThrow(/^games\/kit.json \(Kit\): post must be the id of an X post, 18 to 20 digits, got /);
		for (const post of ['211992563356446360', '2119925633564463609', '21199256335644636090']) expect(read({ post }), post).not.toThrow();
		for (const likes of [-1, 1.5, '12', null]) expect(read({ likes }), String(likes)).toThrow(/likes must be a whole number of at least 0/);
		expect(read({ model: '' })).toThrow(/model must be a non-empty string/);
		expect(read({ model: undefined })).toThrow(/model must be a non-empty string/);
		expect(read({ model: 'Some Model 1 ' })).toThrow(/model must not start or end with a space/);
		expect(read({ cover: 'other.webp' })).toThrow(/cover must be "kit.webp"/);
		expect(read({ cover: 'kit.png' })).toThrow(/cover must be a .webp file name/);
		expect(read({ cover: '/covers/kit.webp' })).toThrow(/cover must be a .webp file name/);
		expect(read({ screenshot: 'kit.webp' })).toThrow(/screenshot is not a known field/);
	});

	it('must link to the game unless it can only be watched', () => {
		expect(read({ link: { type: 'play' } })).toThrow(/^games\/kit.json \(Kit\): link.url must be a non-empty string$/);
		expect(read({ link: { type: 'source' } })).toThrow(/link.url must be a non-empty string/);
		expect(read({ link: { type: 'play', url: 'http://kit.example' } })).toThrow(/link.url must be an https link/);
		expect(read({ link: { type: 'Play', url: 'https://kit.example' } })).toThrow(/link.type must be one of play, source, watch, got "Play"/);
		expect(read({ link: { type: 'play', url: 'https://kit.example', label: 'Go' } })).toThrow(/link.label is not a known field/);
		expect(read({ link: 'https://kit.example' })).toThrow(/link must be an object/);
		expect(read({ link: undefined })).toThrow(/link must be an object/);
		expect(read({ link: { type: 'watch' } })()[0].link).toEqual({ type: 'watch', url: 'https://x.com/i/status/2119925633564463609' });
		expect(read({ link: { type: 'watch', url: 'https://video.example/kit' } })()[0].link).toEqual({ type: 'watch', url: 'https://video.example/kit' });
	});

	it('must be summarised in every language', () => {
		const { ko: _dropped, ...rest } = TEXT;
		expect(read({ summary: rest })).toThrow(/summary.ko is required/);
		expect(read({ pitch: rest })).toThrow(/pitch.ko is required/);
		expect(read({ summary: undefined })).toThrow(/summary must be an object of texts by language/);
	});

	it('points at its post instead of its link while it is marked as down', () => {
		const [down] = read({ down: '2026-11-13' })();
		expect(down.down).toBe('2026-11-13');
		expect(down.link).toEqual({ type: 'watch', url: down.postUrl });
		expect(read({ down: 'yesterday' })).toThrow(/down must be a day, YYYY-MM-DD, got "yesterday"/);
		expect(read({ down: true })).toThrow(/down must be a non-empty string/);
	});

	it('must have notes that say something, in the words of the creator, or none', () => {
		expect(read({ notes: {} })).toThrow(/^games\/kit.json \(Kit\): notes must hold at least one note$/);
		expect(read({ notes: { cost: 550 } })).toThrow(/notes.cost must be a non-empty string/);
		expect(read({ notes: { prompt: ' ' } })).toThrow(/notes.prompt must be a non-empty string/);
		expect(read({ notes: { time: '1h', likes: '3' } })).toThrow(/notes.likes is not a known field/);
		expect(read({ notes: true })).toThrow(/notes must be an object/);
		expect(read({ notes: { prompt: 'Make a kit' } })()[0].notes).toEqual({ facts: [], prompt: 'Make a kit' });
	});

	it('must not share its slug or its post with another', () => {
		const other = { ...KIT, slug: 'other', name: 'Other', cover: 'other.webp' };
		expect(() => readGames({ 'kit.json': KIT, 'other.json': other })).toThrow(/^games\/: two entries have post "2119925633564463609"$/);
		expect(names(readGames({ 'kit.json': KIT, 'other.json': { ...other, post: '2119925633564463610', likes: 13 } }))).toEqual(['Other', 'Kit']);
	});

	it('orders games with the same likes by slug, whatever order the files come in', () => {
		const b = { ...KIT, slug: 'b', cover: 'b.webp', post: '2119925633564463610' };
		const a = { ...KIT, slug: 'a', cover: 'a.webp', post: '2119925633564463611' };
		expect(readGames({ 'b.json': b, 'a.json': a }).map((g) => g.slug)).toEqual(['a', 'b']);
		expect(readGames({ 'a.json': a, 'b.json': b }).map((g) => g.slug)).toEqual(['a', 'b']);
	});
});

describe('game.schema.json', () => {
	const link = schema.properties.link;
	const notes = schema.properties.notes;
	const text = schema.$defs.text;

	it('is the schema every file points at', () => {
		expect(GAME_SCHEMA).toBe(`../schema/${schema.$id}`);
		expect(schema.properties.$schema.const).toBe(GAME_SCHEMA);
	});

	it('names the fields the reader knows, and requires the ones it requires', () => {
		expect(Object.keys(schema.properties)).toEqual([...GAME_FIELDS]);
		expect(schema.required).toEqual([...GAME_REQUIRED]);
		expect(schema.additionalProperties).toBe(false);
		expect(Object.keys(link.properties)).toEqual([...LINK_FIELDS]);
		expect(link.required).toEqual(['type']);
		expect(link.else.required).toEqual([...LINK_FIELDS]);
		expect(link.if.properties.type.const).toBe('watch');
		expect(link.additionalProperties).toBe(false);
		expect(Object.keys(notes.properties)).toEqual([...NOTES_FIELDS]);
		expect(notes.minProperties).toBe(1);
		expect(notes.additionalProperties).toBe(false);
	});

	it('lists the genres, the kinds of link and the languages', () => {
		expect(schema.properties.genre.enum).toEqual([...GENRES]);
		expect(link.properties.type.enum).toEqual([...LINK_TYPES]);
		expect(text.required).toEqual([...LANGS]);
		expect(Object.keys(text.properties)).toEqual([...LANGS]);
		expect(text.additionalProperties).toBe(false);
		expect(schema.properties.summary.$ref).toBe('#/$defs/text');
		expect(schema.properties.pitch.$ref).toBe('#/$defs/text');
	});

	it('has patterns that accept every game and reject what the reader rejects', () => {
		const slug = new RegExp(schema.properties.slug.pattern);
		const creator = new RegExp(schema.properties.creator.pattern);
		const post = new RegExp(schema.properties.post.pattern);
		const cover = new RegExp(schema.properties.cover.pattern);
		const url = new RegExp(link.properties.url.pattern);
		for (const g of GAMES) {
			expect(slug.test(g.slug), g.slug).toBe(true);
			expect(creator.test(g.creator), g.slug).toBe(true);
			expect(post.test(g.post), g.slug).toBe(true);
			expect(cover.test(`${g.slug}.webp`), g.slug).toBe(true);
			expect(url.test(g.link.url), g.slug).toBe(true);
		}
		for (const bad of ['Kit', 'kit_one', '-kit', 'kit-', 'kit--one', 'kit one', '']) expect(slug.test(bad), bad).toBe(false);
		for (const good of ['kit', 'kit-one', '3d-kit', 'a', '2048']) expect(slug.test(good), good).toBe(true);
		expect(creator.test('@someone')).toBe(false);
		for (const bad of ['12a', '1', '12345678901234567', '0119925633564463609', '2'.repeat(21)]) expect(post.test(bad), bad).toBe(false);
		expect(cover.test('kit.png')).toBe(false);
		expect(url.test('http://kit.example')).toBe(false);
		expect(schema.properties.likes).toMatchObject({ type: 'integer', minimum: 0 });
		expect(new RegExp(schema.properties.down.pattern).test('2026-11-13')).toBe(true);
		expect(new RegExp(schema.properties.down.pattern).test('13/11/2026')).toBe(false);
	});
});

describe('filterGames', () => {
	it('lists every game, most liked first, when nothing is asked', () => {
		for (const lang of LANGS) expect(filterGames({}, lang)).toEqual(GAMES);
		expect(filterGames({ q: '   ', sort: 'liked' }, 'en')).toEqual(GAMES);
		expect(filterGames({}, 'en')).not.toBe(GAMES);
	});

	it('keeps to a creator, whatever the case of the handle', () => {
		for (const c of CREATORS) {
			const theirs = filterGames({ creator: c.handle.toUpperCase() }, 'en');
			expect(theirs.length, c.key).toBe(c.games);
			for (const g of theirs) expect(g.creator.toLowerCase(), g.slug).toBe(c.key);
		}
		expect(filterGames({ creator: 'no_such_creator' }, 'en')).toEqual([]);
	});

	it('keeps to a genre and a model', () => {
		let total = 0;
		for (const genre of GENRES) {
			const found = filterGames({ genre }, 'en');
			expect(found.length, genre).toBeGreaterThan(0);
			expect(found, genre).toEqual(GAMES.filter((g) => g.genre === genre));
			total += found.length;
		}
		expect(total).toBe(GAMES.length);
		for (const m of MODELS) expect(filterGames({ model: m.name }, 'en'), m.name).toEqual(GAMES.filter((g) => g.model === m.name));
		expect(filterGames({ model: 'No Such Model' }, 'en')).toEqual([]);
		const g = GAMES[0];
		expect(filterGames({ genre: g.genre, model: g.model, q: g.name }, 'en')).toContain(g);
		expect(filterGames({ genre: GENRES.find((genre) => genre !== g.genre), q: g.name }, 'en')).not.toContain(g);
	});

	it('searches names and creators without regard to case', () => {
		for (const g of GAMES) {
			expect(filterGames({ q: g.name.toLowerCase() }, 'en'), g.slug).toContain(g);
			expect(filterGames({ q: `  ${g.name.toUpperCase()} ` }, 'ja'), g.slug).toContain(g);
			const byCreator = filterGames({ q: `@${g.creator.toUpperCase()}` }, 'de');
			expect(byCreator, g.slug).toEqual(expect.arrayContaining(GAMES.filter((other) => other.creator === g.creator)));
			for (let i = 1; i < byCreator.length; i++) expect(byCreator[i - 1].likes, g.slug).toBeGreaterThanOrEqual(byCreator[i].likes);
		}
		expect(filterGames({ q: 'no such game anywhere' }, 'en')).toEqual([]);
	});

	it("searches the summary in the visitor's language and in English, the model and the genre's label", () => {
		for (const g of GAMES) {
			expect(filterGames({ q: g.summary.en }, 'en'), g.slug).toContain(g);
			expect(filterGames({ q: g.summary.en }, 'ja'), g.slug).toContain(g);
			expect(filterGames({ q: g.summary.ja }, 'ja'), g.slug).toContain(g);
			expect(filterGames({ q: g.summary.ja }, 'en'), g.slug).not.toContain(g);
			expect(filterGames({ q: g.model.toLowerCase() }, 'ko'), g.slug).toContain(g);
			for (const lang of LANGS) expect(filterGames({ q: t(lang)[GENRE_KEYS[g.genre]] }, lang), `${g.slug} ${lang}`).toContain(g);
		}
	});

	it('sorts by the newest post when asked', () => {
		const before = [...GAMES];
		const newest = filterGames({ sort: 'new' }, 'en');
		expect(newest).toHaveLength(GAMES.length);
		for (let i = 1; i < newest.length; i++) expect(BigInt(newest[i - 1].post) > BigInt(newest[i].post), newest[i].slug).toBe(true);
		for (const genre of GENRES) expect(filterGames({ sort: 'new', genre }, 'en'), genre).toEqual(newest.filter((g) => g.genre === genre));
		// Sorting a result never reorders the catalog itself.
		expect(GAMES).toEqual(before);
	});
});

describe('relatedGames', () => {
	it('lists the most liked other games of the genre, topped up with the most liked of the others', () => {
		for (const g of GAMES) {
			for (const n of [3, 4, GAMES.length]) {
				const related = relatedGames(g, n);
				const same = related.filter((r) => r.genre === g.genre);
				expect(same, g.slug).toEqual(GAMES.filter((other) => other !== g && other.genre === g.genre).slice(0, n));
				expect(related.slice(same.length), g.slug).toEqual(GAMES.filter((other) => other.genre !== g.genre).slice(0, n - same.length));
			}
		}
	});

	it('never lists the game itself, and takes any number', () => {
		for (const g of GAMES) {
			const related = relatedGames(g);
			expect(related, g.slug).toHaveLength(3);
			expect(related, g.slug).not.toContain(g);
			expect(new Set(related).size, g.slug).toBe(3);
		}
		expect(relatedGames(GAMES[0], 0)).toEqual([]);
		expect(relatedGames(GAMES[0], 1)).toHaveLength(1);
		expect(relatedGames(GAMES[0], GAMES.length + 10)).toHaveLength(GAMES.length - 1);
	});
});

describe('topLiked', () => {
	it('lists the most liked games', () => {
		expect(topLiked(6)).toEqual(GAMES.slice(0, 6));
		expect(topLiked(0)).toEqual([]);
		expect(topLiked(GAMES.length + 10)).toEqual(GAMES);
		expect(topLiked(GAMES.length + 10)).not.toBe(GAMES);
	});
});

describe('formatCount', () => {
	it("writes a count in the language's compact form", () => {
		expect(formatCount(14382, 'en')).toBe('14.4K');
		expect(formatCount(2700000, 'en')).toBe('2.7M');
		expect(formatCount(743, 'en')).toBe('743');
		expect(formatCount(1, 'en')).toBe('1');
		expect(formatCount(14382, 'ja')).toBe('1.4万');
		expect(formatCount(14382, 'zh-CN')).toBe('1.4万');
		expect(formatCount(2000, 'de')).toBe('2000');
		for (const lang of LANGS) expect(formatCount(14382, lang), lang).not.toBe('14382');
	});

	it('writes a dash for none', () => {
		for (const lang of LANGS) expect(formatCount(0, lang), lang).toBe('—');
	});
});

describe('formatDay', () => {
	it("writes the day in the language's short form", () => {
		expect(formatDay('2026-11-12', 'en')).toBe('Nov 12');
		expect(formatDay('2026-11-12', 'ja')).toBe('11月12日');
		expect(formatDay('2026-11-12', 'zh-CN')).toBe('11月12日');
		expect(new Set(LANGS.map((lang) => formatDay('2026-11-12', lang))).size).toBeGreaterThan(5);
		for (const lang of LANGS) expect(formatDay('2026-11-12', lang), lang).toContain('12');
	});

	it('reads the day in UTC, wherever it is rendered', () => {
		expect(formatDay('2026-11-12T00:00:00.000Z', 'en')).toBe('Nov 12');
		expect(formatDay('2026-11-12T23:59:59.999Z', 'en')).toBe('Nov 12');
		expect(formatDay('2026-03-01T00:30:00.000Z', 'en')).toBe('Mar 1');
	});
});
