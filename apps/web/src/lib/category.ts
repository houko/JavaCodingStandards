import { AI_TOOLS, type AiToolType, type StringKey, type Surface, TEMPLATES, fill, likeKey, pick } from '@awesome-nsgo/catalog';
import type { CategoryCopy, CategoryItem } from '../components/CategoryPage';
import { useLang, useT } from './lang';

// The templates and AI tools pages list their entries the same way in both looks: these give each look the page's words and cards in the visitor's language.

const SURFACE_KEY: Record<Surface, StringKey> = { go: 'surf_go', tsx: 'surf_tsx', both: 'surf_both' };
const AI_TYPE_KEY: Record<AiToolType, StringKey> = { skill: 'aitype_skill', mcp: 'aitype_mcp', rules: 'aitype_rules', other: 'aitype_other' };

export function useTemplatesPage(): { copy: CategoryCopy; items: CategoryItem[] } {
	const t = useT();
	const lang = useLang();
	return {
		copy: { kicker: t.nav_templates, name: t.cat_tpl_name, desc: t.cat_tpl_desc, lead: t.tpl_p, count: fill(t.cat_tpl_count, { n: TEMPLATES.length }), badge: t.cat_tpl_badge, listed: t.tpl_listed_h, more: t.tpl_more_h, emptyH: t.tpl_empty_h, emptyP: t.tpl_empty_p, submit: t.sub_tpl },
		items: TEMPLATES.map((x) => ({ key: x.repo, name: x.name, author: x.author, repo: x.repo, url: x.url, homepage: x.homepage, desc: pick(x.desc, lang), cmd: x.use, copyKey: `template:${x.slug}`, item: likeKey.template(x), image: x.image, kind: t[SURFACE_KEY[x.surface]], surface: x.surface, tags: x.tags })),
	};
}

export function useAiToolsPage(): { copy: CategoryCopy; items: CategoryItem[] } {
	const t = useT();
	const lang = useLang();
	return {
		copy: { kicker: t.nav_ai, name: t.cat_ai_name, desc: t.cat_ai_desc, lead: t.ai_p, count: fill(t.cat_ai_count, { n: AI_TOOLS.length }), badge: t.cat_ai_badge, listed: t.ai_listed_h, more: t.ai_more_h, emptyH: t.ai_empty_h, emptyP: t.ai_empty_p, submit: t.sub_aitool },
		items: AI_TOOLS.map((x) => ({ key: x.slug, name: x.name, author: x.author, repo: x.repo, url: x.url, homepage: x.homepage, desc: pick(x.desc, lang), cmd: x.install, copyKey: `ai:${x.slug}`, item: likeKey.ai(x), image: x.image, kind: t[AI_TYPE_KEY[x.type]], tags: x.tags })),
	};
}
