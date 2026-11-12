// The share card of an app's page: a 1200×630 PNG with the site's mark, the app's icon, name, author, platforms and screenshot, which link previews (X, Slack, Discord, Telegram, Facebook, LinkedIn…) show in place of the raw screenshot, whose height they would crop. One card serves all five languages, so it carries no copy of its own: the localized title and description sit next to it in the preview. renderSiteCard draws the site's own card, the default share image of every other page.
//
// Both cards wear the home page's decoration (src/styles/backdrop.css): the blue, violet and cyan aurora, the dot field, the skewed speed lanes, the gradient ring and halo around the featured surface and the platform chips floating on its edges.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { APPS, APP_PLATFORMS, type App, SITE_URL, byAdded, t } from '@awesome-nsgo/catalog';
import { type CSSProperties, type ReactNode, createElement } from 'react';
import satori, { type Font, type FontWeight } from 'satori';
import sharp from 'sharp';
import { type NotoIndex, WEIGHTS, fetchRetry, googleFace, notoFamily } from './noto';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

type Platform = (typeof APP_PLATFORMS)[number];

// The original look's light tokens (src/styles/base.css); keep in step with them.
const C = { bg: '#f7f9fe', line: '#e1e3e8', fg: '#0c0d10', fg2: '#5b606a', fg3: '#6b707a', blueInk: '#0062cc' };
// The brand gradient of the lane under the home headline (--lane-a/b/c) and of the ring around the featured surface.
const LANE = 'linear-gradient(90deg, #4da3ff, #8b6cff 55%, #22d3ee)';
const RING = 'linear-gradient(135deg, #4da3ff, #8b6cff 50%, #22d3ee)';
// The aurora (--aurora-1/2/3 of the light theme), a little stronger than the page's, as a share card is seen small.
const AURORA = [
	'radial-gradient(circle at 4% 0%, rgba(77, 163, 255, 0.34), rgba(77, 163, 255, 0) 46%)',
	'radial-gradient(circle at 100% 14%, rgba(139, 108, 255, 0.26), rgba(139, 108, 255, 0) 44%)',
	'radial-gradient(circle at 58% 118%, rgba(34, 211, 238, 0.24), rgba(34, 211, 238, 0) 48%)',
].join(', ');
// The short platform names the cards' chips use: one card serves every language, so these stay in English.
const PLATFORM_LABEL: Record<Platform, string> = { mac: 'macOS', win: 'Windows', linux: 'Linux', ios: 'iOS', android: 'Android', web: 'Web', miniprogram: 'Mini' };
const HOST = new URL(SITE_URL).hostname;

// The device glyphs of src/styles/primitives.css (.pglyph), stroked in the link blue; keep in step with them.
const GLYPH_PATHS: Record<Platform, string> = {
	ios: "<rect x='7' y='2.5' width='10' height='19' rx='2.5'/><path d='M11 18.5h2'/>",
	android: "<rect x='7' y='2.5' width='10' height='19' rx='2.5'/><path d='M11 18.5h2'/>",
	mac: "<rect x='3' y='4.5' width='18' height='15' rx='2.5'/><path d='M3 9h18'/><circle cx='6' cy='6.8' r='.6'/>",
	win: "<rect x='3' y='4.5' width='18' height='15' rx='2.5'/><path d='M3 9h18'/><circle cx='18' cy='6.8' r='.6'/>",
	linux: "<rect x='3' y='4.5' width='18' height='15' rx='2.5'/><path d='M3 9h18'/><circle cx='18' cy='6.8' r='.6'/>",
	web: "<circle cx='12' cy='12' r='9'/><path d='M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z'/>",
	miniprogram: "<rect x='2.5' y='8' width='19' height='8' rx='4'/><circle cx='8' cy='12' r='1'/><path d='M12 9.5v5'/><circle cx='16' cy='12' r='1'/>",
};
const glyphUri = (p: Platform) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#0062cc' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'>${GLYPH_PATHS[p]}</svg>`)}`;

const PAD = 72;
// The app card's screenshot, at the 1.6 aspect most screenshots have, so cropping removes little. It runs off the card's right edge, so the card's right margin is the screenshot's.
const SHOT_W = 680;
const SHOT_H = 425;
// The site card's fanned screenshots.
const FAN_W = 400;
const FAN_H = 250;
const ICON = 104;
// The icon on the featured tile of an app without a screenshot. The icons are 128 px (public/icons, the ai-logo avatars), so a larger icon would blur; the letter tile, drawn as shapes, takes the larger size.
const TILE_ICON = 160;
const TILE_LETTER = 230;

export interface Paths {
	// The site's public/ directory, which holds /shots/, /icons/ and the site's mark (favicon.svg).
	publicDir: string;
	// apps/web/og/fonts.
	fontDir: string;
}

const h = (type: string, style: CSSProperties, ...children: ReactNode[]) => createElement(type, { style }, ...children);
const img = (src: string, width: number, height: number, style: CSSProperties = {}) => createElement('img', { src, width, height, style });

const dataUri = (png: Buffer) => `data:image/png;base64,${png.toString('base64')}`;

// Satori only reads PNG, JPEG and GIF, while the screenshots and icons are WebP (and one screenshot SVG), so every image goes through sharp first, at twice its displayed size for sharpness.
export async function asPng(input: Buffer, width: number, height: number): Promise<string> {
	return dataUri(await sharp(input, { density: 144 }).resize(width * 2, height * 2, { fit: 'cover', position: 'top' }).png().toBuffer());
}

// The site's mark (public/favicon.svg) as a PNG data URI at size, rasterised from the vector at the density that size needs (the SVG is drawn on a 32 unit grid), so it stays sharp at any size.
export async function siteMark(publicDir: string, size: number): Promise<string> {
	const svg = await readFile(join(publicDir, 'favicon.svg'));
	return dataUri(await sharp(svg, { density: Math.ceil((72 * size * 2) / 32) }).resize(size * 2, size * 2).png().toBuffer());
}

// An image under public/ (a path such as /shots/x.webp) or on the ai-logo CDN.
async function imageBytes(src: string, publicDir: string, slug: string): Promise<Buffer> {
	if (src.startsWith('/')) return readFile(join(publicDir, src));
	const res = await fetchRetry(src);
	if (!res.ok) throw new Error(`share card for ${slug}: ${src} answered ${res.status}`);
	return Buffer.from(await res.arrayBuffer());
}

// ---- fonts ----

// Inter at 800 and 500 (SIL OFL, og/fonts/OFL-inter.txt). To fetch them again, ask Google Fonts' css2 API for `family=Inter:wght@500;800` with `curl -fsSL -A 'curl/8'` (the URL form googleFont in noto.ts builds): a client that is not a browser gets TrueType, which satori reads, and the two `src: url(…ttf)` entries it lists download as og/fonts/inter-500.ttf and inter-800.ttf.
let latin: Promise<Font[]> | undefined;
export function latinFonts(fontDir: string): Promise<Font[]> {
	latin ??= Promise.all([
		readFile(join(fontDir, 'inter-800.ttf')).then((data): Font => ({ name: 'Inter', data, weight: 800 })),
		readFile(join(fontDir, 'inter-500.ttf')).then((data): Font => ({ name: 'Inter', data, weight: 500 })),
	]);
	return latin;
}

// The bundled fonts cover Latin only. Text in another script (an app named 留白, an author with a Korean name) is set in the matching Noto family (noto.ts), which the full CJK fonts, about 10 MB a weight, make too large to bundle whole: scripts/og-fonts.ts subsets the families to the characters the catalog holds, into og/fonts with noto.json. A character no subset holds yet, as in an app added since, is fetched from Google Fonts subset to just that text, and the build says to run the script again.
let index: Promise<NotoIndex> | undefined;
const notoIndex = (fontDir: string) => (index ??= readFile(join(fontDir, 'noto.json'), 'utf8').then((t) => JSON.parse(t) as NotoIndex));

const extra = new Map<string, Promise<Font[]>>();
function extraFonts(fontDir: string, code: string, segment: string): Promise<Font[]> {
	const key = `${code}\n${segment}`;
	let fonts = extra.get(key);
	if (!fonts) extra.set(key, (fonts = loadExtraFonts(fontDir, code, segment)));
	return fonts;
}

async function loadExtraFonts(fontDir: string, code: string, segment: string): Promise<Font[]> {
	// Colour emoji need SVG glyph images rather than a font; an emoji in a name is left out of the card.
	if (code === 'emoji') return [];
	const family = notoFamily(code, segment);
	const local = (await notoIndex(fontDir))[family];
	if (local && [...segment].every((ch) => !ch.trim() || local.text.includes(ch))) {
		return Promise.all(WEIGHTS.map(async (weight): Promise<Font> => ({ name: family, data: await readFile(join(fontDir, local.files[String(weight)])), weight: weight as FontWeight })));
	}
	console.warn(`share card: og/fonts has no ${family} for ${JSON.stringify(segment)}, so it comes from Google Fonts; run node apps/web/scripts/og-fonts.ts to add it.`);
	return Promise.all(WEIGHTS.map(async (weight): Promise<Font> => ({ name: family, data: await googleFace(family, weight, segment), weight: weight as FontWeight })));
}

async function draw(node: ReactNode, fontDir: string): Promise<Buffer> {
	const svg = await satori(node, { width: CARD_WIDTH, height: CARD_HEIGHT, fonts: await latinFonts(fontDir), loadAdditionalAsset: (code, segment) => extraFonts(fontDir, code, segment) });
	return sharp(Buffer.from(svg)).png().toBuffer();
}

// ---- pieces ----

// Long names step down so that two lines hold any name in the catalog.
function nameSize(name: string): number {
	// A CJK character is about twice as wide as a Latin one.
	const len = [...name].reduce((n, ch) => n + (/[⺀-￯]/u.test(ch) ? 2 : 1), 0);
	if (len <= 8) return 92;
	if (len <= 12) return 76;
	if (len <= 16) return 62;
	return 52;
}

function letterTile(name: string, size: number): ReactNode {
	return h('div', { display: 'flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: size * 0.225, background: 'linear-gradient(135deg, #4da3ff, #0062cc)', color: '#ffffff', fontSize: size * 0.5, fontWeight: 800 }, name.charAt(0).toUpperCase());
}

function iconNode(icon: string | undefined, name: string, size: number): ReactNode {
	return icon ? img(icon, size, size, { borderRadius: size * 0.225 }) : letterTile(name, size);
}

// An absolutely placed box.
const at = (left: number, top: number, style: CSSProperties, ...children: ReactNode[]) => h('div', { display: 'flex', position: 'absolute', left, top, ...style }, ...children);

// The page's backdrop: the aurora on the pale page colour, then the dot field, faded out towards the left where the text sits.
function backdrop(): ReactNode[] {
	return [
		at(0, 0, { width: CARD_WIDTH, height: CARD_HEIGHT, backgroundColor: C.bg, backgroundImage: AURORA }),
		at(0, 0, {
			width: CARD_WIDTH,
			height: CARD_HEIGHT,
			backgroundImage: 'radial-gradient(circle, rgba(12, 13, 16, 0.13) 1.4px, rgba(12, 13, 16, 0) 1.7px)',
			backgroundSize: '26px 26px',
			maskImage: 'linear-gradient(100deg, rgba(0, 0, 0, 0) 28%, rgba(0, 0, 0, 1) 78%)',
		}),
	];
}

// The speed lanes (.streak, .backdrop-lane): skewed pills that brighten towards their head.
function lane(left: number, top: number, width: number, height: number, opacity = 1): ReactNode {
	return at(left, top, { width, height, borderRadius: height / 2, opacity, transform: 'skewX(-14deg)', backgroundImage: 'linear-gradient(90deg, rgba(77, 163, 255, 0), rgba(77, 163, 255, 0.6) 55%, rgba(139, 108, 255, 0.85))' });
}

// The soft light behind the featured surface (.glow-frame::after).
function halo(left: number, top: number, width: number, height: number): ReactNode {
	return at(left, top, { width, height, backgroundImage: 'radial-gradient(ellipse at center, rgba(110, 120, 255, 0.36) 0%, rgba(110, 120, 255, 0) 70%)' });
}

// A surface inside the brand gradient ring, with a deep, tinted shadow.
function ringed(width: number, height: number, radius: number, ring: number, child: ReactNode, style: CSSProperties = {}): ReactNode {
	return h(
		'div',
		{ display: 'flex', padding: ring, borderRadius: radius + ring, backgroundImage: RING, boxShadow: '0 40px 80px -28px rgba(46, 58, 160, 0.45)', ...style },
		h('div', { display: 'flex', width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: '#ffffff' }, child),
	);
}

// A platform chip floating on the featured surface's edge (.float-chip).
function chip(p: Platform, size = 1): ReactNode {
	return h(
		'div',
		{ display: 'flex', alignItems: 'center', height: 46 * size, padding: `0 ${18 * size}px 0 ${14 * size}px`, borderRadius: 23 * size, backgroundColor: '#ffffff', border: '1px solid rgba(0, 98, 204, 0.16)', boxShadow: '0 14px 30px -12px rgba(30, 60, 140, 0.38)', color: C.fg, fontSize: 21 * size, fontWeight: 500 },
		img(glyphUri(p), 22 * size, 22 * size, { marginRight: 9 * size }),
		PLATFORM_LABEL[p],
	);
}

// "Awesome NSGo" with NSGo in the link blue. Satori drops the space at the end of a text run, so the gap is a margin.
function wordmark(size: number): ReactNode {
	return h('div', { display: 'flex', fontSize: size, fontWeight: 800, letterSpacing: '-0.02em', color: C.fg }, 'Awesome', h('span', { marginLeft: size * 0.26, color: C.blueInk }, 'NSGo'));
}

function brandRow(mark: string): ReactNode {
	return h('div', { display: 'flex', alignItems: 'center' }, img(mark, 42, 42, { borderRadius: 12, marginRight: 14 }), wordmark(27));
}

// The address with the lane before it.
function hostRow(): ReactNode {
	return h(
		'div',
		{ display: 'flex', alignItems: 'center', fontSize: 24, fontWeight: 800, color: C.blueInk },
		h('div', { display: 'flex', width: 30, height: 10, marginRight: 14, borderRadius: 5, backgroundImage: LANE, transform: 'skewX(-14deg)' }),
		HOST,
	);
}

// ---- an app's card ----

interface CardImages {
	icon?: string;
	shot?: string;
	site: string;
}

// The chips' places around the featured surface: its top left corner, its bottom edge and its top right.
const APP_CHIPS: [number, number][] = [
	[500, 112],
	[610, 548],
	[960, 100],
];

function card(app: App, im: CardImages): ReactNode {
	const platforms = app.platforms.slice(0, 3);
	// With a screenshot, it runs off the card's right edge, tilted a little; without one, the icon (or letter tile) sits on a ringed, tilted tile.
	const feature = im.shot
		? [halo(500, 60, 760, 600), at(560, 130, { transform: 'rotate(-3deg)' }, ringed(SHOT_W, SHOT_H, 22, 3, img(im.shot, SHOT_W, SHOT_H + 40)))]
		: [halo(560, 40, 600, 560), at(690, 135, { transform: 'rotate(-6deg)' }, ringed(340, 340, 64, 3, h('div', { display: 'flex', width: 340, height: 340, alignItems: 'center', justifyContent: 'center', backgroundImage: 'linear-gradient(160deg, #ffffff, #eef3ff)' }, iconNode(im.icon, app.name, im.icon ? TILE_ICON : TILE_LETTER))))];
	const chips = im.shot ? APP_CHIPS : ([[600, 110], [640, 470], [960, 520]] as [number, number][]);
	return h(
		'div',
		{ display: 'flex', position: 'relative', width: CARD_WIDTH, height: CARD_HEIGHT, overflow: 'hidden', fontFamily: 'Inter', color: C.fg },
		...backdrop(),
		lane(840, 52, 280, 12),
		lane(930, 78, 150, 8, 0.6),
		...feature,
		...platforms.map((p, i) => at(chips[i][0], chips[i][1], {}, chip(p))),
		at(
			PAD,
			60,
			{ flexDirection: 'column', width: 440, height: CARD_HEIGHT - 60 - 64 },
			brandRow(im.site),
			h('div', { display: 'flex', flexGrow: 1 }),
			// The icon is shown here only beside a screenshot; without one it is the featured surface already.
			im.shot ? h('div', { display: 'flex', padding: 5, marginBottom: 26, borderRadius: ICON * 0.225 + 5, backgroundColor: '#ffffff', boxShadow: '0 18px 36px -16px rgba(30, 60, 140, 0.45)', alignSelf: 'flex-start' }, iconNode(im.icon, app.name, ICON)) : null,
			h('div', { display: 'flex', fontSize: nameSize(app.name), fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.04em' }, app.name),
			h('div', { display: 'flex', marginTop: 18, width: 120, height: 12, borderRadius: 6, backgroundImage: LANE, transform: 'skewX(-14deg)' }),
			h('div', { display: 'flex', marginTop: 18, fontSize: 30, fontWeight: 500, color: C.fg2 }, `by ${app.author}`),
			h('div', { display: 'flex', flexGrow: 1 }),
			hostRow(),
		),
	);
}

export async function renderCard(app: App, paths: Paths): Promise<Buffer> {
	const [icon, shot, site] = await Promise.all([
		app.icon ? imageBytes(app.icon, paths.publicDir, app.slug).then((b) => asPng(b, TILE_ICON, TILE_ICON)) : undefined,
		app.image ? imageBytes(app.image, paths.publicDir, app.slug).then((b) => asPng(b, SHOT_W, SHOT_H + 40)) : undefined,
		siteMark(paths.publicDir, 42),
	]);
	return draw(card(app, { icon, shot, site }), paths.fontDir);
}

// ---- the site's card ----

// The fanned screenshots' places, back to front, and the chips around them.
const FAN: { left: number; top: number; rotate: number }[] = [
	{ left: 650, top: 70, rotate: -10 },
	{ left: 880, top: 280, rotate: 9 },
	{ left: 700, top: 170, rotate: -2 },
];
const SITE_CHIPS: [Platform, number, number][] = [
	['mac', 600, 44],
	['ios', 1030, 128],
	['web', 640, 440],
	['win', 1000, 552],
];

// The site's own share card, the default image of every page but an app's: the home headline with its lane, the English lead and the address on the left, and the newest apps' screenshots fanned on the right.
function siteCard(site: string, shots: string[]): ReactNode {
	const en = t('en');
	// The newest screenshot is drawn last, at the front.
	const fan = shots.map((s, i) => {
		const f = FAN[FAN.length - shots.length + i];
		const front = i === shots.length - 1;
		const surface = img(s, FAN_W, FAN_H + 30);
		return at(f.left, f.top, { transform: `rotate(${f.rotate}deg)` }, front ? ringed(FAN_W, FAN_H, 18, 3, surface) : h('div', { display: 'flex', width: FAN_W + 8, height: FAN_H + 8, padding: 4, borderRadius: 22, backgroundColor: '#ffffff', boxShadow: '0 30px 60px -26px rgba(46, 58, 160, 0.4)' }, h('div', { display: 'flex', width: FAN_W, height: FAN_H, borderRadius: 18, overflow: 'hidden' }, surface)));
	});
	return h(
		'div',
		{ display: 'flex', position: 'relative', width: CARD_WIDTH, height: CARD_HEIGHT, overflow: 'hidden', fontFamily: 'Inter', color: C.fg },
		...backdrop(),
		lane(880, 34, 300, 12),
		lane(960, 60, 170, 8, 0.6),
		halo(600, 40, 640, 600),
		...fan,
		...SITE_CHIPS.map(([p, left, top]) => at(left, top, {}, chip(p, 0.92))),
		at(
			PAD,
			60,
			{ flexDirection: 'column', width: 560, height: CARD_HEIGHT - 60 - 64 },
			brandRow(site),
			h('div', { display: 'flex', flexGrow: 1 }),
			h('div', { display: 'flex', fontSize: 64, fontWeight: 800, lineHeight: 1.06, letterSpacing: '-0.045em' }, en.h1_1),
			// The second phrase over its lane, as the home headline sets it (.lane-under).
			h(
				'div',
				{ display: 'flex', position: 'relative', alignSelf: 'flex-start', marginTop: 4, fontSize: 64, fontWeight: 800, lineHeight: 1.06, letterSpacing: '-0.045em' },
				at(-4, 46, { width: '104%', height: 20, borderRadius: 10, opacity: 0.55, backgroundImage: LANE, transform: 'skewX(-14deg)' }),
				h('div', { display: 'flex' }, en.h1_2),
			),
			h('div', { display: 'flex', marginTop: 26, fontSize: 24, fontWeight: 500, lineHeight: 1.45, color: C.fg2 }, en.hero_p),
			h('div', { display: 'flex', flexGrow: 1 }),
			hostRow(),
		),
	);
}

// The newest apps with a raster screenshot, up to the fan's three, oldest first.
const fanApps = () =>
	APPS.filter((a) => a.image && !a.image.endsWith('.svg'))
		.toSorted(byAdded)
		.slice(-FAN.length);

export async function renderSiteCard(paths: Paths): Promise<Buffer> {
	const [site, shots] = await Promise.all([siteMark(paths.publicDir, 42), Promise.all(fanApps().map((a) => imageBytes(a.image as string, paths.publicDir, a.slug).then((b) => asPng(b, FAN_W, FAN_H + 30))))]);
	return draw(siteCard(site, shots), paths.fontDir);
}
