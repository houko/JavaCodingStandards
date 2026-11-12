// Which Noto family sets text the share card's bundled Latin fonts cannot, and how it is fetched: shared by card.ts, which picks a family for each run of text satori asks about, and scripts/og-fonts.ts, which subsets those families for the characters in the catalog. No imports, so the script runs it under plain Node.

const NOTO: Record<string, string> = {
	'ko-KR': 'Noto Sans KR',
	'zh-TW': 'Noto Sans TC',
	'zh-HK': 'Noto Sans TC',
	'th-TH': 'Noto Sans Thai',
	'bn-IN': 'Noto Sans Bengali',
	'ar-AR': 'Noto Sans Arabic',
	'ta-IN': 'Noto Sans Tamil',
	'ml-IN': 'Noto Sans Malayalam',
	'he-IL': 'Noto Sans Hebrew',
	'te-IN': 'Noto Sans Telugu',
	devanagari: 'Noto Sans Devanagari',
	kannada: 'Noto Sans Kannada',
	symbol: 'Noto Sans Symbols 2',
	math: 'Noto Sans Math',
};

// The family for a run of text satori asks about, by the locale code it gives and the characters themselves: satori files every Han character under ja-JP, so Chinese is told from Japanese by its lack of kana.
export function notoFamily(code: string, segment: string): string {
	if (code === 'ko-KR' || /\p{scx=Hangul}/u.test(segment)) return 'Noto Sans KR';
	if (/\p{scx=Hira}|\p{scx=Kana}/u.test(segment)) return 'Noto Sans JP';
	if (code === 'ja-JP' || code === 'zh-CN' || /\p{scx=Han}/u.test(segment)) return NOTO[code] ?? 'Noto Sans SC';
	return NOTO[code] ?? 'Noto Sans';
}

// The script codes satori gives for the scripts the catalog may hold, as notoFamily takes them.
const SCRIPT_CODES: [RegExp, string][] = [
	[/\p{scx=Thai}/u, 'th-TH'],
	[/\p{scx=Bengali}/u, 'bn-IN'],
	[/\p{scx=Arabic}/u, 'ar-AR'],
	[/\p{scx=Tamil}/u, 'ta-IN'],
	[/\p{scx=Malayalam}/u, 'ml-IN'],
	[/\p{scx=Hebrew}/u, 'he-IL'],
	[/\p{scx=Telugu}/u, 'te-IN'],
	[/\p{scx=Devanagari}/u, 'devanagari'],
	[/\p{scx=Kannada}/u, 'kannada'],
];

// The families a name or author needs beyond the Latin fonts, with the characters of each: what notoFamily would give each character, and the Han characters of a text with kana under Japanese too, as satori may ask about them in one run with the kana. Characters in Latin, Greek or Cyrillic, spaces and emoji (which the card leaves out) are not counted.
export function familiesOf(text: string): Map<string, string> {
	const out = new Map<string, string>();
	const add = (family: string, ch: string) => out.set(family, (out.get(family) ?? '') + ch);
	const kana = /\p{scx=Hira}|\p{scx=Kana}/u.test(text);
	for (const ch of new Set(text)) {
		if (/[\p{scx=Latin}\p{scx=Greek}\p{scx=Cyrillic}\p{Zs}\p{Cc}\p{Extended_Pictographic}]/u.test(ch) || ch.codePointAt(0)! < 0x250) continue;
		const code = SCRIPT_CODES.find(([re]) => re.test(ch))?.[1] ?? '';
		add(notoFamily(code, ch), ch);
		if (kana && /\p{scx=Han}/u.test(ch)) add('Noto Sans JP', ch);
	}
	return out;
}

// The file of a family's subset at a weight, under og/fonts: Noto Sans SC at 800 is noto-sans-sc-800.ttf.
export function notoFile(family: string, weight: number): string {
	return `${family.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${weight}.ttf`;
}

// What og/fonts/noto.json lists: for each family subset there, the characters it holds and its file at each weight the card sets text in.
export type NotoIndex = Record<string, { text: string; files: Record<string, string> }>;

// A request tried up to three times, 20 seconds each, when the connection fails or the server answers 5xx: a build fetches from Google Fonts and the ai-logo CDN, and one timed-out request used to fail it.
export async function fetchRetry(url: string): Promise<Response> {
	for (let attempt = 1; ; attempt++) {
		try {
			const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
			if (res.status < 500 || attempt === 3) return res;
		} catch (err) {
			if (attempt === 3) throw new Error(`${url}: ${err instanceof Error ? err.message : String(err)}, three times`);
		}
		await new Promise((r) => setTimeout(r, 1_000 * 2 ** attempt));
	}
}

// A family subset to text from Google Fonts, which answers a client that is not a browser with TrueType, the format satori reads. undefined when Google Fonts has no such family or weight.
export async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | undefined> {
	const css = await fetchRetry(`https://fonts.googleapis.com/css2?family=${family.replaceAll(' ', '+')}:wght@${weight}&text=${encodeURIComponent(text)}`);
	if (!css.ok) return undefined;
	const url = (await css.text()).match(/src: url\((.+?)\)/)?.[1];
	if (!url) return undefined;
	const font = await fetchRetry(url);
	if (!font.ok) throw new Error(`font ${family} ${weight}: ${url} answered ${font.status}`);
	// satori reads TrueType and OpenType, and set a font it could not read as empty boxes rather than failing: the deployed card of 留白 Liubai showed two. Anything else, such as WOFF2 served to a client taken for a browser, is an error.
	const data = await font.arrayBuffer();
	const magic = new TextDecoder('latin1').decode(new Uint8Array(data, 0, 4));
	if (magic !== '\0\x01\0\0' && magic !== 'OTTO' && magic !== 'true') throw new Error(`font ${family} ${weight}: ${url} is not TrueType or OpenType (it starts ${JSON.stringify(magic)})`);
	return data;
}

// The weights the card sets text in: 800 for the name, 500 for the author. A family without one (most Noto families outside CJK stop short of 800) has its regular face in its place.
export const WEIGHTS = [800, 500];

// A family's face at weight, or its regular one in its place.
export async function googleFace(family: string, weight: number, text: string): Promise<ArrayBuffer> {
	const data = (await googleFont(family, weight, text)) ?? (await googleFont(family, 400, text));
	if (!data) throw new Error(`Google Fonts has no ${family} for ${JSON.stringify(text)}`);
	return data;
}
