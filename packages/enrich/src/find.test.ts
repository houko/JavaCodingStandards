import { describe, expect, it } from 'vitest';
import { AWESOME_LISTS, NEW_REPO_DAYS, type Verdict, branchFor, configNear, entryFor, goModsIn, groupHits, isDue, isSamplePath, isYoung, listedAs, listedFrom, moduleOf, normalizeLink, quiet, remember, reposInImportedBy, reposInMarkdown, reposOfEntry, requiresNsgo, tooNewToJudge, uniqueSlug, withoutFailed } from './find.ts';

describe('what the site lists', () => {
	it('takes every repository an entry points at, in lower case', () => {
		expect(reposOfEntry({ repo: 'ELY-Open-Source/MujicaUI', url: 'https://github.com/ELY-Open-Source/MujicaUI' })).toEqual(['ely-open-source/mujicaui']);
		expect(reposOfEntry({ url: 'https://getbamboo.app/', repo: 'OldPanda/bamboo' })).toEqual(['oldpanda/bamboo']);
		expect(reposOfEntry({ docs: 'https://oneo-me.github.io/nsgo/docs/lists/', import: 'github.com/oneo-me/nsgo/base/datatable' })).toEqual(['oneo-me/nsgo']);
		expect(reposOfEntry({ url: 'https://github.com/you/app.git' })).toEqual(['you/app']);
		expect(reposOfEntry({ url: 'https://example.com' })).toEqual([]);
	});
});

describe('what the site lists without a repository', () => {
	const listed = listedFrom([
		{ slug: 'kero', author: 'oneo-me', url: 'https://kero.sh' },
		{ slug: 'meiro', author: 'elianiva', url: 'https://meiro.elianiva.com' },
		{ slug: 'nodra', author: 'yldm-tech', repo: 'yldm-tech/nodra', url: 'https://github.com/yldm-tech/nodra', homepage: 'https://nodra.yldm.ai' },
	]);

	it('writes links the same way whoever wrote them', () => {
		expect(normalizeLink('https://www.Kero.sh/')).toBe('kero.sh');
		expect(normalizeLink('meiro.elianiva.com')).toBe('meiro.elianiva.com');
		expect(normalizeLink('https://reef.echovic.com/?ref=gh#top')).toBe('reef.echovic.com');
		expect(normalizeLink('https://example.com/docs/')).toBe('example.com/docs');
		expect(normalizeLink('')).toBeUndefined();
		expect(normalizeLink('not a link')).toBeUndefined();
	});

	it('knows a repository by its repo field, its homepage, or its owner and name', () => {
		expect(listedAs(listed, 'Yldm-Tech/Nodra')).toBe('its repository');
		expect(listedAs(listed, 'kero-dev/kero-app', 'https://kero.sh/')).toBe('its homepage, kero.sh');
		expect(listedAs(listed, 'elianiva/meiro', null)).toBe('an entry of elianiva named meiro');
		expect(listedAs(listed, 'someone/kero', 'https://kero.example')).toBeUndefined();
		expect(listedAs(listed, 'oneo-me/kero-cli', null)).toBeUndefined();
	});

	it('does not take GitHub itself for a homepage', () => {
		expect(listed.links.has('github.com/yldm-tech/nodra')).toBe(false);
		expect(listed.links.has('nodra.yldm.ai')).toBe(true);
	});
});

describe('code search hits', () => {
	it('passes over examples, tests, benchmarks and vendored code', () => {
		expect(isSamplePath('example/go-native-gui/go.mod')).toBe(true);
		expect(isSamplePath('examples/nsgo-stream/go.mod')).toBe(true);
		expect(isSamplePath('bench/go/go.mod')).toBe(true);
		expect(isSamplePath('go.mod')).toBe(false);
		expect(isSamplePath('apps/desktop/go.mod')).toBe(false);
		expect(isSamplePath('contrib/nsgo/go.mod')).toBe(false);
	});

	it('groups go.mod files by repository, without forks, listed repositories or samples only', () => {
		const grouped = groupHits(
			[
				{ repo: 'caelyreth/untie', path: 'examples/nsgo-simple/go.mod', fork: false },
				{ repo: 'caelyreth/untie', path: 'contrib/nsgo/go.mod', fork: false },
				{ repo: 'Code-Hex/vz', path: 'example/go-native-gui/go.mod', fork: false },
				{ repo: 'oneo-me/Lorca', path: 'desktop/go.mod', fork: false },
				{ repo: 'someone/nsgo', path: 'go.mod', fork: true },
				{ repo: 'AstraFoundry/Arion', path: 'apps/desktop/go.mod', fork: false },
				{ repo: 'AstraFoundry/Arion', path: 'go.mod', fork: false },
			],
			new Set(['oneo-me/lorca']),
		);
		expect([...grouped]).toEqual([
			['caelyreth/untie', ['contrib/nsgo/go.mod']],
			['AstraFoundry/Arion', ['go.mod', 'apps/desktop/go.mod']],
		]);
	});

	it('finds the go.mod files of a repository found another way', () => {
		expect(goModsIn(['README.md', 'shell/go.mod', 'go.mod', 'shell/main.go'])).toEqual(['go.mod', 'shell/go.mod']);
		expect(goModsIn(['go.mod', 'third_party/nsgo/go.mod', 'examples/demo/go.mod'])).toEqual(['go.mod']);
		expect(goModsIn(['web/package.json'])).toEqual([]);
	});

	it('reads the repositories pkg.go.dev lists as importers', () => {
		const html = '<a href="/github.com/oneo-me/nsgo/ui">x</a><a href="/github.com/yldm-tech/nodra">nodra</a><a href="/github.com/yldm-tech/nodra/persist">p</a><a href="/github.com/Licoy/sshyard/internal/app?tab=doc">s</a><a href="/golang.org/x/sys">sys</a>';
		expect(reposInImportedBy(html)).toEqual(['yldm-tech/nodra', 'Licoy/sshyard']);
		expect(reposInImportedBy('')).toEqual([]);
	});

	it('reads the repositories a list links to', () => {
		const md = [
			'# Awesome NSGo',
			'[![stars](https://img.shields.io/github/stars/someone/awesome-nsgo)](https://github.com/someone/awesome-nsgo)',
			'- [Snip](https://github.com/0froq/snip) - snippets. [releases](https://github.com/0froq/snip/releases)',
			'- [Gloss](https://github.com/CarlOpenLab/Gloss#readme), built on [NSGo](https://github.com/oneo-me/nsgo).',
			'- clone https://github.com/DiiKhanh/burrow.git or see github.com/gomeen/Zakki.',
			'- [Sponsor](https://github.com/sponsors/oneo-me) · [topic](https://github.com/topics/nsgo) · [org](https://github.com/orgs/yldm-tech/repositories)',
			'- [same, other case](https://github.com/0FROQ/Snip)',
		].join('\n');
		expect(reposInMarkdown(md, ['someone/awesome-nsgo'])).toEqual(['0froq/snip', 'CarlOpenLab/Gloss', 'DiiKhanh/burrow', 'gomeen/Zakki']);
		expect(reposInMarkdown('')).toEqual([]);
	});

	it('takes only a go.mod that requires NSGo itself', () => {
		// Jungley8/exodrive's go.mod: NSGo has no release, so a pseudo-version.
		expect(requiresNsgo('module github.com/Jungley8/exodrive\n\ngo 1.26.0\n\nrequire (\n\tgithub.com/oneo-me/nsgo v0.0.0-20261109084144-c226d88b232d\n)\n\ntool github.com/oneo-me/nsgo/cmd/nsgo\n')).toBe(true);
		expect(requiresNsgo('module x\n\nrequire github.com/oneo-me/nsgo v0.1.0\n')).toBe(true);
		expect(requiresNsgo('module x\n\nrequire github.com/oneo-me/nsgo-flow v0.0.0-20261109142343-48361112bf0e\n')).toBe(false);
		expect(requiresNsgo('module x\n\n// like github.com/oneo-me/nsgo v1, but smaller\n')).toBe(false);
		// A tool directive alone names the CLI, not a requirement.
		expect(requiresNsgo('module x\n\ntool github.com/oneo-me/nsgo/cmd/nsgo\n')).toBe(false);
		expect(moduleOf('module github.com/yldm-tech/nodra\n\ngo 1.27\n')).toBe('github.com/yldm-tech/nodra');
		expect(moduleOf('go 1.27\n')).toBeUndefined();
	});

	it('finds the nsgo.yaml beside the go.mod, else below it, else at the root', () => {
		expect(configNear('app/go.mod', ['app/go.mod', 'app/nsgo.yaml', 'nsgo.yaml'])).toBe('app/nsgo.yaml');
		expect(configNear('desktop/go.mod', ['desktop/go.mod', 'nsgo.yaml'])).toBe('nsgo.yaml');
		expect(configNear('go.mod', ['go.mod', 'nsgo.yaml', 'package.json'])).toBe('nsgo.yaml');
		// nsgo.yaml sits beside the main package, which may be deeper than go.mod; the shallowest one counts, and an example's does not.
		expect(configNear('go.mod', ['go.mod', 'cmd/app/nsgo.yaml', 'cmd/app/tools/nsgo.yaml', 'examples/demo/nsgo.yaml'])).toBe('cmd/app/nsgo.yaml');
		expect(configNear('lab/go.mod', ['lab/go.mod', 'lab/cmd/lab/nsgo.yaml', 'other/nsgo.yaml'])).toBe('lab/cmd/lab/nsgo.yaml');
		expect(configNear('go.mod', ['go.mod', 'examples/hello/nsgo.yaml'])).toBeUndefined();
		// The only name NSGo's CLI reads.
		expect(configNear('go.mod', ['go.mod', 'nsgo.yml', 'mynsgo.yaml'])).toBeUndefined();
		expect(configNear('go.mod', ['go.mod', 'main.go'])).toBeUndefined();
	});

	it('has no other list of NSGo projects to read yet', () => {
		expect(AWESOME_LISTS).toEqual([]);
	});
});

describe('proposals', () => {
	it('gives each repository a branch of its own', () => {
		expect(branchFor('Saramanda9988/LunaBox')).toBe('discover/saramanda9988/lunabox');
		expect(branchFor('a_b/c d')).toBe('discover/a_b/c-d');
	});

	it('picks a slug no entry has', () => {
		expect(uniqueSlug('LunaBox', 'Saramanda9988/LunaBox', new Set())).toBe('lunabox');
		expect(uniqueSlug('留白', 'echoVic/liubai', new Set())).toBe('liubai');
		expect(uniqueSlug('酷狗音乐 · NSGo', 'someone/nsgo-kgou', new Set())).toBe('nsgo-kgou');
		expect(uniqueSlug('Gist管理器', 'Oranjekop/GistManager', new Set())).toBe('gistmanager');
		expect(uniqueSlug('Pulse', 'someone/pulse', new Set(['pulse']))).toBe('pulse-someone');
		expect(uniqueSlug('Pulse', 'someone/pulse', new Set(['pulse', 'pulse-someone']))).toBe('pulse-someone-2');
	});

	const verdict = (v: Partial<Verdict>): Verdict => ({ verdict: 'app', reason: '', name: 'LunaBox', summary: 'A box.', kind: 'go', tag: '', surface: '', type: '', tags: [], ...v });
	const info = { repo: 'Saramanda9988/LunaBox', htmlUrl: 'https://github.com/Saramanda9988/LunaBox', homepage: '', module: 'github.com/Saramanda9988/LunaBox/apps/desktop' };

	it('writes an app entry, linking its homepage only when it is https', () => {
		expect(entryFor(verdict({ summary: ' A  box.\n' }), info, 'lunabox')).toEqual({
			kind: 'app',
			entry: { slug: 'lunabox', name: 'LunaBox', author: 'Saramanda9988', kind: 'go', url: 'https://github.com/Saramanda9988/LunaBox', repo: 'Saramanda9988/LunaBox', summary: { en: 'A box.' }, description: { en: 'A box.' } },
		});
		expect(entryFor(verdict({ kind: 'TSX' }), { ...info, homepage: 'https://lunabox.app' }, 'lunabox')).toMatchObject({ entry: { kind: 'tsx', url: 'https://lunabox.app' } });
		expect(entryFor(verdict({}), { ...info, homepage: 'http://lunabox.app' }, 'lunabox')).toMatchObject({ entry: { url: info.htmlUrl } });
		expect(entryFor(verdict({ kind: 'desktop' }), info, 'lunabox')).toEqual({ error: 'the model gave no app kind (desktop)' });
		expect(entryFor(verdict({ kind: 'native' }), info, 'lunabox')).toEqual({ error: 'the model gave no app kind (native)' });
	});

	it('writes library and plugin entries with the fields their schemas require', () => {
		expect(entryFor(verdict({ verdict: 'ui', tag: 'theme', surface: 'Go' }), info, 'x')).toMatchObject({ kind: 'ui', entry: { tag: 'theme', surface: 'go', repo: info.repo, url: info.htmlUrl } });
		expect(entryFor(verdict({ verdict: 'ui', tag: 'icons', surface: 'web' }), info, 'x')).toEqual({ error: 'the model gave no UI surface (web)' });
		expect(entryFor(verdict({ verdict: 'ui', tag: 'dark', surface: 'go' }), info, 'x')).toEqual({ error: 'the model gave no UI tag (dark)' });
		expect(entryFor(verdict({ verdict: 'ui', tag: 'icons' }), info, 'x')).toEqual({ error: 'the model gave no UI surface (empty)' });
		expect(entryFor(verdict({ verdict: 'state', tags: ['Store', 'store', 'Reactive State'] }), { ...info, module: 'github.com/yldm-tech/nodra' }, 'x')).toMatchObject({
			kind: 'state',
			entry: { install: 'go get github.com/yldm-tech/nodra@latest', tags: ['store', 'reactive-state'] },
		});
		expect(entryFor(verdict({ verdict: 'state' }), { ...info, module: undefined }, 'x')).toMatchObject({ entry: { install: 'go get github.com/Saramanda9988/LunaBox@latest', tags: ['state'] } });
		expect(entryFor(verdict({ verdict: 'plugin', name: 'Untie Stream', surface: 'both', tags: ['stream'] }), info, 'x')).toMatchObject({
			kind: 'plugin',
			entry: { mark: 'Un', official: false, surface: 'both', import: info.module, tags: ['stream'], docs: info.htmlUrl },
		});
		expect(entryFor(verdict({ verdict: 'template', surface: 'tsx', tags: ['Tailwind'] }), info, 'x')).toMatchObject({
			kind: 'template',
			entry: { surface: 'tsx', use: 'gh repo create my-app --template Saramanda9988/LunaBox --clone', tags: ['tailwind'], repo: info.repo, url: info.htmlUrl },
		});
		expect(entryFor(verdict({ verdict: 'template', surface: '' }), info, 'x')).toEqual({ error: 'the model gave no template surface (empty)' });
		expect(entryFor(verdict({ verdict: 'template', surface: 'go' }), info, 'x')).toMatchObject({ entry: { tags: ['template'] } });
		expect(entryFor(verdict({ verdict: 'ai', type: 'MCP', tags: ['testing'] }), info, 'x')).toMatchObject({ kind: 'ai', entry: { type: 'mcp', install: `go get ${info.module}@latest`, tags: ['testing'] } });
		expect(entryFor(verdict({ verdict: 'ai', type: 'skill' }), info, 'x')).toMatchObject({ kind: 'ai', entry: { type: 'skill', install: 'npx skills add Saramanda9988/LunaBox', tags: ['ai'] } });
		expect(entryFor(verdict({ verdict: 'ai', type: 'plugin' }), info, 'x')).toEqual({ error: 'the model gave no AI tool type (plugin)' });
		expect(entryFor(verdict({ verdict: 'Skip' }), info, 'x')).toEqual({ error: "the model's verdict is Skip" });
		expect(entryFor(verdict({ name: ' ' }), info, 'x')).toEqual({ error: 'the model gave no name or summary' });
	});

	it('looks at a skipped repository again after 90 days, and a failed one after 14', () => {
		const now = new Date('2026-11-05T00:00:00Z');
		const skipped = remember('skip', 'a template', now);
		expect(skipped).toEqual({ verdict: 'skip', reason: 'a template', at: '2026-11-05T00:00:00.000Z', until: '2027-02-03T00:00:00.000Z' });
		expect(isDue(skipped, new Date('2027-02-02T23:59:59Z'))).toBe(false);
		expect(isDue(skipped, new Date('2027-02-03T00:00:00Z'))).toBe(true);
		expect(remember('failed', '', now).until).toBe('2026-11-19T00:00:00.000Z');
		expect(isDue(undefined, now)).toBe(true);
	});

	it('forgets the failed repositories when asked to try them again, and keeps the skipped ones', () => {
		const now = new Date('2026-11-05T00:00:00Z');
		const seen = { 'a/skip': remember('skip', 'a template', now), 'b/failed': remember('failed', 'the catalog checks failed', now) };
		expect(withoutFailed(seen)).toEqual({ 'a/skip': seen['a/skip'] });
	});

	it('puts off a repository made this week with commits on one day and no release, and judges it a week later whatever it shows', () => {
		const now = new Date('2026-11-05T12:00:00Z');
		const today = '2026-11-05T08:00:00Z';
		expect(isYoung(today, now)).toBe(true);
		expect(isYoung('2026-10-29T12:00:00Z', now)).toBe(false);
		expect(tooNewToJudge({ createdAt: today, released: false, commitDays: 1 }, now)).toBe(true);
		expect(tooNewToJudge({ createdAt: today, released: false, commitDays: 0 }, now)).toBe(true);
		// Worked on two days, or released: judged now, stars or not.
		expect(tooNewToJudge({ createdAt: today, released: false, commitDays: 2 }, now)).toBe(false);
		expect(tooNewToJudge({ createdAt: today, released: true, commitDays: 1 }, now)).toBe(false);
		// A finished project imported in one commit is judged once it is a week old.
		expect(tooNewToJudge({ createdAt: '2026-10-29T11:59:59Z', released: false, commitDays: 1 }, now)).toBe(false);
		const deferred = remember('defer', 'too new', now);
		expect(Date.parse(deferred.until) - now.getTime()).toBe(NEW_REPO_DAYS * 86_400_000);
		expect(isDue(deferred, new Date(Date.parse(deferred.until)))).toBe(true);
	});

	it('keeps text from a repository from mentioning anyone', () => {
		expect(quiet('ping @someone and @acme/maintainers, mail a@b.c')).toBe('ping @\u200bsomeone and @\u200bacme/maintainers, mail a@\u200bb.c');
	});
});
