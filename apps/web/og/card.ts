// The share images, drawn with satori and rasterised with sharp. renderCard is a game's card: a 1200x630 PNG with the site's mark, the game's cover, name, creator, genre, model and like count, which link previews (X, Slack, Discord, Telegram…) show for the game's page. renderSiteCard is the site's own card, the share image of every other page, and renderBanner is the same scene at the README banner's size (scripts/banner.ts). One image serves all ten languages, so the cards carry no translated copy: the localized title and description sit next to them in the preview.
//
// Everything a card needs is on disk (the covers in public/covers, the mark in public/favicon.svg, the fonts in og/fonts), so a build makes no network request. The fonts cover Latin, as the games' names and their creators' handles do.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GAMES, GENRE_COLORS, type Game, SITE_NAME, SITE_URL, formatCount, t, topLiked } from '@vibe-arcade/catalog';
import { type CSSProperties, type ReactNode, createElement } from 'react';
import satori, { type Font } from 'satori';
import sharp from 'sharp';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
export const BANNER_WIDTH = 1280;
export const BANNER_HEIGHT = 420;

// The site's dark tokens (src/styles.css); keep in step with them.
const C = { bg: '#101012', surface: '#18181D', line: '#2A2A31', fg: '#F2F0E9', muted: '#A3A1AA', lime: '#D4FF3A' };
// The page colour as an rgba() stem, for the gradients that fade a cover into it.
const BG = '16, 16, 18';
const HOST = new URL(SITE_URL).hostname;
const DISPLAY = 'Bricolage Grotesque, Inter';
const MONO = 'JetBrains Mono';

const PAD = 64;
// A game's cover on its card: the card's full height at the covers' 16:10, against the right edge.
const COVER_H = CARD_HEIGHT;
const COVER_W = (COVER_H * 16) / 10;
// The site card's wall of covers: three columns of five, tilted, running off the right edge.
const TILE_W = 264;
const TILE_H = 165;
const TILE_GAP = 14;
const WALL_COLS = 3;
const WALL_ROWS = 5;

export interface Paths {
	// The site's public/ directory, which holds /covers/ and the site's mark (favicon.svg).
	publicDir: string;
	// apps/web/og/fonts.
	fontDir: string;
}

const h = (type: string, style: CSSProperties, ...children: ReactNode[]) => createElement(type, { style }, ...children);
const img = (src: string, width: number, height: number, style: CSSProperties = {}) => createElement('img', { src, width, height, style });
// An absolutely placed box.
const at = (left: number, top: number, style: CSSProperties, ...children: ReactNode[]) => h('div', { display: 'flex', position: 'absolute', left, top, ...style }, ...children);

// ---- images ----

// The site's mark (public/favicon.svg, drawn on a 64 unit grid) as a PNG data URI, rasterised from the vector at twice the size it is shown at. Its tile is the page colour, so on a card only the lime mark shows.
async function siteMark(publicDir: string, size: number): Promise<string> {
	const svg = await readFile(join(publicDir, 'favicon.svg'));
	const png = await sharp(svg, { density: (72 * size * 2) / 64 }).resize(size * 2, size * 2).png().toBuffer();
	return `data:image/png;base64,${png.toString('base64')}`;
}

// A game's cover as a JPEG data URI at the given size: satori reads PNG and JPEG but not the covers' WebP. A game without a cover file gets none, and its card is drawn on the plain page colour.
async function cover(game: Game, publicDir: string, width: number, height: number): Promise<string | undefined> {
	const file = await readFile(join(publicDir, game.cover)).catch((err: NodeJS.ErrnoException) => {
		if (err.code === 'ENOENT') return undefined;
		throw err;
	});
	if (!file) return undefined;
	const jpeg = await sharp(file).resize(Math.round(width), Math.round(height), { fit: 'cover' }).jpeg({ quality: 86 }).toBuffer();
	return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

// ---- fonts ----

// Bricolage Grotesque 800 for names and headlines, Inter 500 for text (and 800 where a name has a glyph Bricolage lacks) and JetBrains Mono 600 for the chips and figures, all SIL OFL (the OFL-*.txt files beside them). To fetch them again, ask Google Fonts' css2 API for `family=Bricolage+Grotesque:wght@800&family=Inter:wght@500;800&family=JetBrains+Mono:wght@600` with `curl -fsSL -A 'curl/8'`: a client that is not a browser gets static TrueType instances, which satori reads, where a browser gets the variable woff2 it cannot.
const FONT_FILES: [string, string, 500 | 600 | 800][] = [
	['Bricolage Grotesque', 'bricolage-grotesque-800.ttf', 800],
	['Inter', 'inter-800.ttf', 800],
	['Inter', 'inter-500.ttf', 500],
	['JetBrains Mono', 'jetbrains-mono-600.ttf', 600],
];
let fonts: Promise<Font[]> | undefined;
function loadFonts(fontDir: string): Promise<Font[]> {
	fonts ??= Promise.all(FONT_FILES.map(async ([name, file, weight]): Promise<Font> => ({ name, data: await readFile(join(fontDir, file)), weight })));
	return fonts;
}

// The drawing as a PNG, scale times its drawn size. A palette PNG: at full quality it shows no banding on these dark scenes and is a quarter of the truecolour file (about 250 KB a card instead of 600 KB to 1.3 MB).
async function draw(node: ReactNode, fontDir: string, width: number, height: number, scale = 1): Promise<Buffer> {
	const svg = await satori(node, { width, height, fonts: await loadFonts(fontDir) });
	return sharp(Buffer.from(svg), { density: 72 * scale }).png({ palette: true, quality: 100, effort: 7 }).toBuffer();
}

// ---- pieces ----

// The mark and the site's name, as the page's header sets them.
function brandRow(mark: string, size: number): ReactNode {
	return h('div', { display: 'flex', alignItems: 'center' }, img(mark, size * 1.6, size * 1.6, { marginLeft: -size * 0.2, marginRight: size * 0.2 }), h('div', { display: 'flex', fontFamily: DISPLAY, fontSize: size, fontWeight: 800, letterSpacing: '-0.02em', color: C.fg }, SITE_NAME));
}

function chip(label: string, color: string, size: number): ReactNode {
	return h('div', { display: 'flex', alignItems: 'center', height: size * 1.9, padding: `0 ${size * 0.8}px`, marginRight: size * 0.6, borderRadius: size, border: `2px solid ${color}`, backgroundColor: `rgba(${BG}, 0.72)`, color, fontFamily: MONO, fontSize: size, fontWeight: 600 }, label);
}

const HEART = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='${C.lime}'><path d='M12 21s-7.5-4.6-10-9.3C.3 8.300 2 4.500 5.800 4.500c2.200 0 3.600 1.200 4.400 2.400h3.600c.8-1.200 2.200-2.400 4.400-2.400 3.800 0 5.500 3.800 3.800 7.200C19.500 16.400 12 21 12 21z'/></svg>`)}`;

// Long names step down so that two lines hold any name in the catalog.
function nameSize(name: string): number {
	if (name.length <= 9) return 112;
	if (name.length <= 14) return 92;
	if (name.length <= 22) return 76;
	return 62;
}

// ---- a game's card ----

function card(game: Game, mark: string, shot: string | undefined): ReactNode {
	return h(
		'div',
		{ display: 'flex', position: 'relative', width: CARD_WIDTH, height: CARD_HEIGHT, overflow: 'hidden', backgroundColor: C.bg, fontFamily: 'Inter', fontWeight: 500, color: C.fg },
		shot ? at(CARD_WIDTH - COVER_W, 0, {}, img(shot, COVER_W, COVER_H)) : null,
		// The cover fades into the page colour towards the left, where the text sits, and a little towards the bottom.
		at(0, 0, { width: CARD_WIDTH, height: CARD_HEIGHT, backgroundImage: `linear-gradient(90deg, rgba(${BG}, 1) 0%, rgba(${BG}, 1) 22%, rgba(${BG}, 0.86) 44%, rgba(${BG}, 0.3) 74%, rgba(${BG}, 0.1) 100%)` }),
		at(0, CARD_HEIGHT / 2, { width: CARD_WIDTH, height: CARD_HEIGHT / 2, backgroundImage: `linear-gradient(180deg, rgba(${BG}, 0) 0%, rgba(${BG}, 0.7) 100%)` }),
		at(0, 0, { width: 10, height: CARD_HEIGHT, backgroundColor: C.lime }),
		at(
			PAD,
			52,
			{ flexDirection: 'column', width: 760, height: CARD_HEIGHT - 52 - 56 },
			brandRow(mark, 30),
			h('div', { display: 'flex', flexGrow: 1 }),
			h('div', { display: 'flex' }, chip(game.genre, GENRE_COLORS[game.genre], 20), chip(game.model, C.fg, 20)),
			h('div', { display: 'flex', marginTop: 22, fontFamily: DISPLAY, fontSize: nameSize(game.name), fontWeight: 800, lineHeight: 1, letterSpacing: '-0.035em' }, game.name),
			h(
				'div',
				{ display: 'flex', alignItems: 'center', marginTop: 24, fontSize: 32 },
				h('div', { display: 'flex', color: C.muted }, `@${game.creator}`),
				game.likes ? h('div', { display: 'flex', alignItems: 'center', marginLeft: 28, fontFamily: MONO, fontWeight: 600, fontSize: 30, color: C.lime }, img(HEART, 30, 30, { marginRight: 10 }), formatCount(game.likes, 'en')) : null,
			),
		),
	);
}

export async function renderCard(game: Game, paths: Paths): Promise<Buffer> {
	const [mark, shot] = await Promise.all([siteMark(paths.publicDir, 48), cover(game, paths.publicDir, COVER_W, COVER_H)]);
	return draw(card(game, mark, shot), paths.fontDir, CARD_WIDTH, CARD_HEIGHT);
}

// ---- the site's card and the README banner ----

// The most-liked games' covers as a tilted wall, its top left corner at left, top before the tilt. The middle column hangs lower, as a wall of posters would.
function wall(left: number, top: number, shots: string[]): ReactNode {
	const columns = Array.from({ length: WALL_COLS }, (_, c) => shots.filter((_, i) => i % WALL_COLS === c));
	return at(
		left,
		top,
		{ transform: 'rotate(-9deg)' },
		...columns.map((column, c) =>
			h(
				'div',
				{ display: 'flex', flexDirection: 'column', marginRight: TILE_GAP, marginTop: c % 2 ? TILE_H / 2 : 0 },
				...column.map((s) => h('div', { display: 'flex', width: TILE_W, height: TILE_H, marginBottom: TILE_GAP, borderRadius: 14, overflow: 'hidden', border: `1px solid ${C.line}`, backgroundColor: C.surface }, img(s, TILE_W, TILE_H))),
			),
		),
	);
}

// The scene both share: the mark, the site's name, the English headline with its lime caret and the address on the left, the wall of covers on the right, fading into the page colour under the text.
function scene(width: number, height: number, mark: string, shots: string[], headline: number): ReactNode {
	const wallHeight = WALL_ROWS * (TILE_H + TILE_GAP) + TILE_H / 2;
	const words = t('en').h1.split(' ');
	return h(
		'div',
		{ display: 'flex', position: 'relative', width, height, overflow: 'hidden', backgroundColor: C.bg, fontFamily: 'Inter', fontWeight: 500, color: C.fg },
		wall(width * 0.5, (height - wallHeight) / 2, shots),
		at(0, 0, { width, height, backgroundImage: `linear-gradient(90deg, rgba(${BG}, 1) 0%, rgba(${BG}, 1) 40%, rgba(${BG}, 0.74) 54%, rgba(${BG}, 0.16) 76%, rgba(${BG}, 0.1) 100%)` }),
		at(0, 0, { width: 10, height, backgroundColor: C.lime }),
		at(
			PAD,
			height * 0.085,
			{ flexDirection: 'column', width: width * 0.6, height: height * 0.83 },
			brandRow(mark, 30),
			h('div', { display: 'flex', flexGrow: 1 }),
			// The headline with the page's lime caret after it. Satori lays a text run and a box beside it out as two blocks, which would put the caret on a line of its own, so each word is a box and the caret sits in the last one; the gaps are margins, as satori drops the space at the end of a run.
			h(
				'div',
				{ display: 'flex', flexWrap: 'wrap', maxWidth: headline * 7.2, fontFamily: DISPLAY, fontSize: headline, fontWeight: 800, lineHeight: 0.98, letterSpacing: '-0.04em' },
				...words.map((word, i) => h('div', { display: 'flex', marginRight: headline * 0.22 }, word, i === words.length - 1 ? h('span', { color: C.lime }, '_') : null)),
			),
			h('div', { display: 'flex', flexGrow: 1 }),
			h('div', { display: 'flex', alignItems: 'center', fontFamily: MONO, fontWeight: 600, fontSize: 24 }, h('div', { display: 'flex', color: C.lime }, HOST), h('div', { display: 'flex', marginLeft: 22, color: C.muted }, `${GAMES.length} ${t('en').statGames}`)),
		),
	);
}

async function sceneImages(paths: Paths): Promise<[string, string[]]> {
	// Twice the tiles' drawn size, as the banner is rasterised at 2x.
	const shots = await Promise.all(topLiked(GAMES.length).map((g) => cover(g, paths.publicDir, TILE_W * 2, TILE_H * 2)));
	return [await siteMark(paths.publicDir, 48), shots.filter((s) => s !== undefined).slice(0, WALL_COLS * WALL_ROWS)];
}

export async function renderSiteCard(paths: Paths): Promise<Buffer> {
	const [mark, shots] = await sceneImages(paths);
	return draw(scene(CARD_WIDTH, CARD_HEIGHT, mark, shots, 100), paths.fontDir, CARD_WIDTH, CARD_HEIGHT);
}

// The repository's banner (.github/assets/banner.png), at twice its drawn size for sharp display in the README.
export async function renderBanner(paths: Paths): Promise<Buffer> {
	const [mark, shots] = await sceneImages(paths);
	return draw(scene(BANNER_WIDTH, BANNER_HEIGHT, mark, shots, 84), paths.fontDir, BANNER_WIDTH, BANNER_HEIGHT, 2);
}
