import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { type Counts, ENTRY_DIRS, type Entry, type EntryKind, MAX_WEIGHT, SITE_URL, composePost, githubUrl, kindLabel, sitePage, statsLine, weightedLength } from './tweet.ts';

const DATA_DIR = join(import.meta.dirname, '../../catalog/data');
const COUNTS: Counts = { app: 40, plugin: 12, ui: 6, state: 1, template: 0, ai: 0 };
const urlsIn = (text: string) => text.match(/https:\/\/\S+?(?=（|\s|$)/g) ?? [];

describe('weighted length', () => {
	it('weighs Latin 1, CJK and other symbols 2, and a link 23', () => {
		expect(weightedLength('abc')).toBe(3);
		expect(weightedLength('中文')).toBe(4);
		expect(weightedLength('…')).toBe(2);
		expect(weightedLength('—')).toBe(1);
		expect(weightedLength('see https://example.com/a/very/long/path/indeed', ['https://example.com/a/very/long/path/indeed'])).toBe(4 + 23);
	});
});

describe('links', () => {
	it('takes the repository from repo, or else from a GitHub link', () => {
		expect(githubUrl({ repo: 'xiyaowong/flagicons', url: 'https://x.dev' })).toBe('https://github.com/xiyaowong/flagicons');
		expect(githubUrl({ url: 'https://github.com/a/b.git' })).toBe('https://github.com/a/b');
		expect(githubUrl({ url: 'https://getbamboo.app/' })).toBeUndefined();
		expect(githubUrl({ docs: 'https://github.com/oneo-me/nsgo/tree/main/base/datatable' })).toBeUndefined();
	});

	it('sends an app to its own page and the rest to their category', () => {
		expect(sitePage('app', { slug: 'bamboo' })).toBe(`${SITE_URL}/apps/bamboo`);
		expect(sitePage('ui', { slug: 'x' })).toBe(`${SITE_URL}/ui`);
		expect(sitePage('state', { slug: 'x' })).toBe(`${SITE_URL}/state`);
		expect(sitePage('plugin', { slug: 'x' })).toBe(`${SITE_URL}/plugins`);
		expect(sitePage('template', { slug: 'x' })).toBe(`${SITE_URL}/templates`);
		expect(sitePage('ai', { slug: 'x' })).toBe(`${SITE_URL}/ai`);
	});

	it('names templates and AI tools in the numbers only once the site lists some', () => {
		expect(statsLine({ app: 40, plugin: 12, ui: 6, state: 1, template: 0, ai: 0 })).toBe('已收录 59 项：作品 40 · 插件 12 · UI 组件 6 · 状态管理 1');
		expect(statsLine({ app: 40, plugin: 12, ui: 6, state: 1, template: 2, ai: 3 })).toBe('已收录 64 项：作品 40 · 插件 12 · UI 组件 6 · 状态管理 1 · 模板 2 · AI 工具 3');
		expect(kindLabel('template', {})).toBe('模板');
		expect(kindLabel('ai', {})).toBe('AI 工具');
	});

	it('names official and community plugins apart', () => {
		expect(kindLabel('plugin', { official: true })).toBe('官方插件');
		expect(kindLabel('plugin', { official: false })).toBe('社区插件');
	});
});

describe('the post', () => {
	const entry: Entry = { slug: 'nodra', name: 'Nodra', author: 'yldm-tech', summary: { en: 'A store.', 'zh-CN': '并发安全的响应式状态库。' }, url: 'https://github.com/yldm-tech/nodra', homepage: 'https://nodra.yldm.ai' };

	it('says what was listed, by whom, where on the site, its repository with its stars and the site’s counts', () => {
		expect(composePost({ kind: 'state', entry, stars: 42, counts: COUNTS })).toBe(['Awesome NSGo 新收录状态管理：Nodra by yldm-tech\nhttps://awesomensgo.dev/state', '并发安全的响应式状态库。', `GitHub：https://github.com/yldm-tech/nodra（42 star）\n${statsLine(COUNTS)}`].join('\n\n'));
		expect(statsLine(COUNTS)).toBe('已收录 59 项：作品 40 · 插件 12 · UI 组件 6 · 状态管理 1');
	});

	it('mentions the owner’s X account when their GitHub profile gives a valid one', () => {
		expect(composePost({ kind: 'state', entry, handle: 'yldm_tech', counts: COUNTS })).toMatch(/^Awesome NSGo 新收录状态管理：Nodra by @yldm_tech\n/);
		expect(composePost({ kind: 'state', entry, handle: 'not a handle', counts: COUNTS })).toMatch(/^Awesome NSGo 新收录状态管理：Nodra by yldm-tech\n/);
	});

	it('falls back to English and leaves out what the entry lacks', () => {
		const text = composePost({ kind: 'plugin', entry: { slug: 'p', name: 'P', official: false, summary: { en: 'Does things.' } }, counts: COUNTS });
		expect(text).toBe(['Awesome NSGo 新收录社区插件：P\nhttps://awesomensgo.dev/plugins', 'Does things.', statsLine(COUNTS)].join('\n\n'));
	});

	it('cuts a long summary short to fit', () => {
		const text = composePost({ kind: 'state', entry: { ...entry, summary: { en: 'x', 'zh-CN': '很长'.repeat(200) } }, stars: 1, counts: COUNTS });
		expect(weightedLength(text, urlsIn(text))).toBeLessThanOrEqual(MAX_WEIGHT);
		expect(text).toContain('很长…');
		expect(text).toContain('\nhttps://awesomensgo.dev/state\n');
	});

	it('fits every entry the site lists', async () => {
		for (const kind of Object.keys(ENTRY_DIRS) as EntryKind[]) {
			const dir = join(DATA_DIR, ENTRY_DIRS[kind]);
			// A kind with no entry yet may have no directory, as git keeps no empty one.
			const files = await readdir(dir).catch((err: NodeJS.ErrnoException) => (err.code === 'ENOENT' ? [] : Promise.reject(err)));
			for (const file of files.filter((f) => f.endsWith('.json'))) {
				const e = JSON.parse(await readFile(join(dir, file), 'utf8')) as Entry;
				const text = composePost({ kind, entry: e, stars: 12345, counts: { app: 999, plugin: 999, ui: 999, state: 999, template: 999, ai: 999 } });
				expect(weightedLength(text, urlsIn(text)), `${kind}/${file}`).toBeLessThanOrEqual(MAX_WEIGHT);
				// X shows a card for the first link, so the site's page comes first, then the repository when there is one, and no link from the entry's own copy.
				const github = githubUrl(e);
				expect(urlsIn(text), `${kind}/${file}`).toEqual([sitePage(kind, e), ...(github ? [github] : [])]);
			}
		}
	});
});
