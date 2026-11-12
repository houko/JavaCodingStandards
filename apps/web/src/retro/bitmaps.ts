// 16x16 pixel icons of the retro theme, one string per row: each letter is a palette colour, a dot is transparent. Folders take an emblem stamped onto their front.

export const PAL: Record<string, string> = {"k": "#10233a", "w": "#fbf8ef", "y": "#ffd23f", "p": "#5b4bd8", "b": "#00a6d4", "c": "#bfe9f7", "g": "#d8d1bf", "d": "#26384d", "o": "#e88a3a", "r": "#e24b3b"};

export const BITMAPS = {
	globe: ["................", ".....kkkkkk.....", "...kkbbwbbbkk...", "..kbbbwbbbbbbk..", ".kbwwwwwwwwwwbk.", ".kbbbwbbbwbbbbk.", "kbbbbwbbbwbbbbbk", "kwwwwwwwwwwwwwwk", "kbbbbwbbbwbbbbbk", "kbbbbwbbbwbbbbbk", ".kbbbwbbbwbbbbk.", ".kbwwwwwwwwwwbk.", "..kbbbwbbbbbbk..", "...kkbbwbbbkk...", ".....kkkkkk.....", "................"],
	arrows: ["................", "..........k.....", "..........kk....", "..kkkkkkkkkyk...", "..kyyyyyyyyyyk..", "..kkkkkkkkkyk...", "..........kk....", "..........k.....", ".....k..........", "....kk..........", "...kpkkkkkkkkk..", "..kppppppppppk..", "...kpkkkkkkkkk..", "....kk..........", ".....k..........", "................"],
	db: ["................", "....kkkkkkkk....", "..kkwwwwwwwwkk..", ".kwwwwwwwwwwwwk.", ".kkwwwwwwwwwwkk.", ".kbkkkkkkkkkkbk.", ".kbbbbbbbbbbbbk.", ".kkbbbbbbbbbbkk.", ".kbkkkkkkkkkkbk.", ".kbbbbbbbbbbbbk.", ".kkbbbbbbbbbbkk.", ".kbkkkkkkkkkkbk.", ".kbbbbbbbbbbbbk.", "..kkbbbbbbbbkk..", "....kkkkkkkk....", "................"],
	eye: ["................", "................", "................", ".....kkkkkk.....", "...kkwwwwwwkk...", "..kwwwwkkwwwwk..", ".kwwwwkbbkwwwwk.", "kwwwwkbkkbkwwwwk", "kwwwwkbkkbkwwwwk", ".kwwwwkbbkwwwwk.", "..kwwwwkkwwwwk..", "...kkwwwwwwkk...", ".....kkkkkk.....", "................", "................", "................"],
	update: ["................", "......kkkk......", "......kyyk......", "......kyyk......", "......kyyk......", "...kkkkyykkkk...", "....kyyyyyyk....", ".....kyyyyk.....", "......kyyk......", ".......kk.......", "kkkk........kkkk", "kwwk........kwwk", "kwwkkkkkkkkkkwwk", "kwwwwwwwwwwwwwwk", "kkkkkkkkkkkkkkkk", "................"],
	term: ["................", "kkkkkkkkkkkkkkkk", "kwwwwwwwwwwwwwwk", "kkkkkkkkkkkkkkkk", "kddddddddddddddk", "kdyddddddddddddk", "kddydddddddddddk", "kdyddddddddddddk", "kddddddddddddddk", "kddddyyyyddddddk", "kddddddddddddddk", "kddddddddddddddk", "kkkkkkkkkkkkkkkk", "................", "................", "................"],
	glass: ["................", ".kkkkkkkkkkkkkk.", ".kccccccwwcccck.", ".kcccccwwccccck.", ".kccccwwcccccck.", ".kcccwwccccwwck.", ".kccwwccccwwcck.", ".kcwwccccwwccck.", ".kwwccccwwcccck.", ".kwccccwwccccck.", ".kccccwwcccccck.", ".kcccwwccccccck.", ".kcccccccccccck.", ".kkkkkkkkkkkkkk.", "................", "................"],
	pad: ["................", "................", "................", "................", "...kkkkkkkkkk...", "..kggggggggggk..", ".kggkggggggpggk.", ".kgkkkggggpgpgk.", ".kggkggggggpggk.", ".kggggggggggggk.", ".kgggkkkkkkgggk.", ".kggk......kggk.", "..kk........kk..", "................", "................", "................"],
	hourglass: ["................", "...kkkkkkkkkk...", "...kwwwwwwwwk...", "....kyyyyyyk....", "....kwyyyywk....", ".....kwyywk.....", "......kyyk......", ".......kk.......", "......kwwk......", ".....kwwywk.....", "....kwwwywwk....", "....kwyyyyyk....", "...kyyyyyyyyk...", "...kkkkkkkkkk...", "................", "................"],
	cursor: ["................", ".k..........y...", ".kk.........y...", ".kwk......yyyyy.", ".kwwk.......y...", ".kwwwk......y...", ".kwwwwk.........", ".kwwwwwk........", ".kwwwwwwk.......", ".kwwwwwwwk......", ".kwwwwwkkkk.....", ".kwwkwwk........", ".kwk.kwwk.......", ".kk..kwwk.......", ".k....kwwk......", ".......kk......."],
	lock: ["................", ".....kkkkkk.....", "....kk....kk....", "....k......k....", "....k......k....", "....k......k....", "..kkkkkkkkkkkk..", "..kyyyyyyyyyyk..", "..kyyyykkyyyyk..", "..kyyyykkyyyyk..", "..kyyyyykyyyyk..", "..kyyyyykyyyyk..", "..kyyyyyyyyyyk..", "..kkkkkkkkkkkk..", "................", "................"],
	hammer: ["................", "....kkkkkkk.....", "...kgggggggkk...", "...kgggggggggk..", "...kkkkkkkkkk...", "......kook......", "......kook......", "......kook......", "......kook......", "......kook......", "......kook......", "......kook......", "......kook......", "......kook......", "......kkkk......", "................"],
	page: ["................", "..kkkkkkkkk.....", "..kwwwwwwwkk....", "..kwwwwwwwkwk...", "..kwkkkkwwkkkk..", "..kwwwwwwwwwwk..", "..kwkkkkkkkwwk..", "..kwwwwwwwwwwk..", "..kwkkkkkkwwwk..", "..kwwwwwwwwwwk..", "..kwkkkkkkkwwk..", "..kwwwwwwwwwwk..", "..kwwwwwwwwwwk..", "..kkkkkkkkkkkk..", "................", "................"],
	inbox: ["................", "....kkkkkkkk....", "....kwwwwwwk....", "....kwkkkkwk....", "....kwwwwwwk....", "....kwkkkwwk....", "....kwwwwwwk....", "k...kwkkkkwk...k", "kk..kwwwwwwk..kk", "kgkkkkkkkkkkkkgk", "kggggggggggggggk", "kgggkkkkkkkkgggk", "kggggggggggggggk", "kkkkkkkkkkkkkkkk", "................", "................"],
} as const satisfies Record<string, readonly string[]>;

export type BitmapName = keyof typeof BITMAPS;

export const FOLDER: readonly string[] = ["................", "................", ".kkkkkk.........", "kyyyyyyk........", "kyyyyyyykkkkkkk.", "kyyyyyyyyyyyyyyk", "kffffffffffffffk", "kffffffffffffffk", "kffffffffffffffk", "kffffffffffffffk", "kffffffffffffffk", "kffffffffffffffk", "kffffffffffffffk", "kffffffffffffffk", "kkkkkkkkkkkkkkkk", "................"];

export const EMBLEMS = {
	apps: ["kkkkkk", "kkkkkk", "k....k", "k....k", "kkkkkk"],
	plug: [".k..k.", ".k..k.", "kkkkkk", ".kkkk.", "..kk.."],
	ui: [".kkkk.", "k..kkk", "k..kkk", ".kkkk.", "......"],
	state: ["......", ".k...k", "k.k.k.", "...k..", "......"],
	template: ["kkkkkk", "k..k.k", "kkkkkk", "k..k.k", "kkkkkk"],
	ai: ["..k...", ".kkk.k", "kkkkk.", ".kkk.k", "..k..."],
} as const satisfies Record<string, readonly string[]>;

export type EmblemName = keyof typeof EMBLEMS;

// Folder colours: [tab, front].
export const FOLDER_PAL = {
	blue: ["#bfe9f7", "#4cc3ea"],
	yellow: ["#fff0a8", "#ffd23f"],
	purple: ["#c4bcf7", "#8577f0"],
	green: ["#cdeec0", "#77cf6c"],
	orange: ["#ffd9b0", "#f29b45"],
	pink: ["#f8c6dd", "#e872a8"],
} as const satisfies Record<string, readonly [string, string]>;

export type FolderColor = keyof typeof FOLDER_PAL;
