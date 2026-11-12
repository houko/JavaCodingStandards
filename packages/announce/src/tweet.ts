// The post announcing one entry, in Simplified Chinese, the site's default language: what was listed and by whom, its page on the site, its summary, its stars, and how much the site lists now. The site's page is the post's first link, as X shows a card for the first link in a post and the post is there to bring readers to the site; the project's GitHub repository follows, with its stars. It is a post of its own rather than a quote of the site's launch post, as X shows no link card in a post that quotes another.

export const SITE_URL = 'https://awesomensgo.dev';

// The site's own repository, where a project sends a fix to its entry.
export const SITE_REPO = 'https://github.com/yldm-tech/awesome-nsgo';

export type EntryKind = 'app' | 'ui' | 'state' | 'template' | 'ai' | 'plugin';
export const ENTRY_DIRS: Record<EntryKind, string> = { app: 'apps', ui: 'ui', state: 'state', template: 'templates', ai: 'ai', plugin: 'plugins' };

export type Entry = Record<string, unknown>;
export type Counts = Record<EntryKind, number>;

// ---- X's weighted length ----

// X counts a post in weights out of 280: a code point in these ranges (Latin, most European scripts, general punctuation) weighs 1, any other (CJK, emoji, ★, …) 2, and every link 23 whatever its length. The ranges are twitter-text's v3 configuration.
const LIGHT: readonly [number, number][] = [
	[0, 4351],
	[8192, 8205],
	[8208, 8223],
	[8242, 8247],
];
export const MAX_WEIGHT = 280;
const URL_WEIGHT = 23;

const weightOf = (cp: number) => (LIGHT.some(([lo, hi]) => cp >= lo && cp <= hi) ? 1 : 2);

// The weight of text in which the given links appear; X normalizes a post to NFC before it counts.
export function weightedLength(text: string, urls: readonly string[] = []): number {
	let rest = text.normalize('NFC');
	let weight = 0;
	for (const url of urls) {
		const parts = rest.split(url);
		weight += (parts.length - 1) * URL_WEIGHT;
		rest = parts.join('');
	}
	for (const ch of rest) weight += weightOf(ch.codePointAt(0) ?? 0);
	return weight;
}

// ---- the post ----

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

// The entry's text in Simplified Chinese, or English when it has none.
function zh(text: unknown): string | undefined {
	if (!text || typeof text !== 'object') return undefined;
	const t = text as Record<string, unknown>;
	return str(t['zh-CN']) ?? str(t.en);
}

// What kind of entry the post says was listed.
export function kindLabel(kind: EntryKind, entry: Entry): string {
	switch (kind) {
		case 'app':
			return '作品';
		case 'ui':
			return 'UI 组件';
		case 'state':
			return '状态管理';
		case 'template':
			return '模板';
		case 'ai':
			return 'AI 工具';
		case 'plugin':
			return entry.official === true ? '官方插件' : '社区插件';
	}
}

// Where the entry is on the site: an app's own page, or its category's page, which lists the rest.
export function sitePage(kind: EntryKind, entry: Entry): string {
	return kind === 'app' ? `${SITE_URL}/apps/${String(entry.slug)}` : `${SITE_URL}/${kind === 'plugin' ? 'plugins' : kind === 'template' ? 'templates' : kind}`;
}

// The entry's GitHub repository: its repo field, or else its link when that is a repository.
export function githubUrl(entry: Entry): string | undefined {
	if (typeof entry.repo === 'string' && /^[\w.-]+\/[\w.-]+$/.test(entry.repo)) return `https://github.com/${entry.repo}`;
	const m = typeof entry.url === 'string' ? /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/#?]|$)/.exec(entry.url) : null;
	return m ? `https://github.com/${m[1]}/${m[2]}` : undefined;
}

// What X accepts as a username: letters, digits and underscores, at most 15.
const X_HANDLE = /^[A-Za-z0-9_]{1,15}$/;

export interface PostInput {
	kind: EntryKind;
	entry: Entry;
	// The repository's stars on GitHub, when it has one and they could be read.
	stars?: number;
	// The X account of the repository's owner, from their GitHub profile, which the post mentions so they can share it.
	handle?: string;
	// How many entries of each kind the site lists, this one included.
	counts: Counts;
}

// The numbers the post ends with. Templates and AI tools are named only once the site lists some, so the line stays short while they are new.
export function statsLine(counts: Counts): string {
	const total = counts.app + counts.plugin + counts.ui + counts.state + counts.template + counts.ai;
	const newer = [...(counts.template ? [`模板 ${counts.template}`] : []), ...(counts.ai ? [`AI 工具 ${counts.ai}`] : [])];
	return [`已收录 ${total} 项：作品 ${counts.app}`, `插件 ${counts.plugin}`, `UI 组件 ${counts.ui}`, `状态管理 ${counts.state}`, ...newer].join(' · ');
}

// The post's text, its summary cut short with … when the whole would weigh more than X allows. Throws when even without a summary it would.
export function composePost({ kind, entry, stars, handle, counts }: PostInput): string {
	const name = str(entry.name) ?? String(entry.slug);
	const author = handle && X_HANDLE.test(handle) ? `@${handle}` : str(entry.author);
	const page = sitePage(kind, entry);
	const github = githubUrl(entry);
	const urls = [page, ...(github ? [github] : [])];
	const summary = zh(entry.summary) ?? '';
	const label = kindLabel(kind, entry);
	const head = `Awesome NSGo 新收录${/^[A-Za-z]/.test(label) ? ' ' : ''}${label}：${name}${author ? ` by ${author}` : ''}\n${page}`;
	const stats = [...(github ? [`GitHub：${github}${stars !== undefined ? `（${stars} star）` : ''}`] : []), statsLine(counts)].join('\n');
	// Paragraphs: what was listed and where on the site, its summary when there is room, its repository and the numbers.
	const build = (desc: string) => [head, desc, stats].filter(Boolean).join('\n\n');

	const full = build(summary);
	if (weightedLength(full, urls) <= MAX_WEIGHT) return full;
	const chars = [...summary];
	for (let n = chars.length - 1; n > 0; n--) {
		const text = build(`${chars.slice(0, n).join('').trimEnd()}…`);
		if (weightedLength(text, urls) <= MAX_WEIGHT) return text;
	}
	const bare = build('');
	if (weightedLength(bare, urls) <= MAX_WEIGHT) return bare;
	throw new Error(`the post for ${name} weighs ${weightedLength(bare, urls)} without its summary, over X's ${MAX_WEIGHT}`);
}
