// The characters of the share cards that the Latin fonts do not have: Chinese, Japanese and Korean. scripts/og-cjk-fonts.ts fetches Noto Sans subsets holding exactly these characters into og/fonts and lists them in og/fonts/cjk.json, which card.ts loads after the Latin fonts; satori draws each character with the first font that has it.

// Han (with its compatibility forms), kana, Hangul, CJK punctuation and full-width forms. Satori falls back per character, so Latin text in the same name keeps the display face.
export const CJK = /[⺀-⿿　-ヿ㄀-ㇿ㈀-鿿가-힯豈-﫿︰-﹏＀-￯\u{20000}-\u{3134F}]/u;
// Hangul is drawn from Noto Sans KR; Noto Sans SC holds everything else, kana included.
export const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/u;

// The text a game's card prints: its name, its creator's handle and its model.
export interface CardText {
	name: string;
	creator: string;
	model: string;
}

// The CJK characters the cards of these games need, each once, in code point order.
export function cjkChars(games: readonly CardText[]): string[] {
	const chars = new Set<string>();
	for (const g of games) for (const c of `${g.name}${g.creator}${g.model}`) if (CJK.test(c)) chars.add(c);
	return [...chars].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!);
}

export interface CjkFonts {
	// The characters the subsets were made for, as one string.
	chars: string;
	// Each subset: the family name satori knows it by, the file in og/fonts and its weight.
	files: [string, string, 500 | 800][];
}
