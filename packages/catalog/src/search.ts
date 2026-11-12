import { AI_TOOLS, APPS, ARTICLES, CLI_CMDS, COMMUNITY_PLUGINS, PLUGINS, STATE_SOLUTIONS, TEMPLATES, UI_LIBS } from './catalog';
import { type LangCode, type Text, pick } from './lang';
import { t } from './translate';

export type SearchCat = 'ui' | 'state' | 'template' | 'ai' | 'plugin' | 'showcase' | 'article';

export type SearchTarget = { type: 'url'; url: string } | { type: 'page'; path: '/plugins' } | { type: 'app'; slug: string };

export interface SearchItem {
	cat: SearchCat;
	name: string;
	desc: string;
	target: SearchTarget;
	// Lowercased text the query is matched against.
	hay: string;
}

// Every language of an entry's text, so a query in any language finds it.
const all = (text: Text) => Object.values(text).join(' ');

const TAG_KEY = { theme: 'tag_theme', retro: 'tag_retro', icons: 'tag_icons' } as const;

export function buildSearchIndex(lang: LangCode): SearchItem[] {
	const tr = t(lang);
	const items: SearchItem[] = [];
	for (const l of UI_LIBS) {
		items.push({ cat: 'ui', name: l.name, desc: pick(l.desc, lang), target: { type: 'url', url: l.url }, hay: [l.name, l.author, all(l.desc), tr[TAG_KEY[l.key]]].join(' ') });
	}
	for (const st of STATE_SOLUTIONS) {
		items.push({ cat: 'state', name: st.name, desc: pick(st.desc, lang), target: { type: 'url', url: st.homepage ?? st.url }, hay: [st.name, st.author, all(st.desc), ...st.tags].join(' ') });
	}
	for (const x of TEMPLATES) {
		items.push({ cat: 'template', name: x.name, desc: pick(x.desc, lang), target: { type: 'url', url: x.homepage ?? x.url }, hay: [x.name, x.author, all(x.desc), ...x.tags].join(' ') });
	}
	for (const x of AI_TOOLS) {
		items.push({ cat: 'ai', name: x.name, desc: pick(x.desc, lang), target: { type: 'url', url: x.homepage ?? x.url }, hay: [x.name, x.author, all(x.desc), x.type, ...x.tags].join(' ') });
	}
	for (const p of [...PLUGINS, ...COMMUNITY_PLUGINS]) {
		items.push({ cat: 'plugin', name: p.name, desc: pick(p.desc, lang), target: { type: 'url', url: p.url }, hay: [p.name, all(p.desc), ...p.tags].join(' ') });
	}
	// NSGo's CLI, which has no entry of its own: the plugins page shows its commands.
	items.push({ cat: 'plugin', name: 'nsgo CLI', desc: tr.tool_p, target: { type: 'page', path: '/plugins' }, hay: `nsgo cli ${CLI_CMDS.join(' ')} init dev build ${tr.tool_p}` });
	for (const a of APPS) {
		items.push({ cat: 'showcase', name: a.name, desc: pick(a.desc, lang), target: { type: 'app', slug: a.slug }, hay: [a.name, a.author, all(a.desc), all(a.about), a.kind].join(' ') });
	}
	for (const ar of ARTICLES) {
		items.push({ cat: 'article', name: ar.title, desc: ar.site, target: { type: 'url', url: ar.url }, hay: `${ar.title} ${ar.site} ${tr.article}` });
	}
	for (const item of items) item.hay = item.hay.toLowerCase();
	return items;
}

export function searchCatalog(index: readonly SearchItem[], query: string): SearchItem[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	return index.filter((item) => item.hay.includes(q));
}
