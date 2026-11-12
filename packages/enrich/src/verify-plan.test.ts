import { describe, expect, it } from 'vitest';
import { changeKey, changeMarker, dropProvisional, movedRepo, pastPulls, setAfter, verifyBranch } from './verify-plan.ts';

describe('the check of listed entries', () => {
	it('names one branch per entry', () => {
		expect(verifyBranch('apps', 'handbean')).toBe('verify/apps/handbean');
	});

	it('follows a renamed or transferred repository in the fields that name it', () => {
		const app = { slug: 'x', author: 'youfun', repo: 'youfun/Handbean', url: 'https://github.com/youfun/Handbean', summary: {} };
		expect(movedRepo(app, 'youfun/Handbean', 'handbean-org/handbean')).toEqual(['repo', 'url', 'author']);
		expect(app).toMatchObject({ author: 'handbean-org', repo: 'handbean-org/handbean', url: 'https://github.com/handbean-org/handbean' });

		// A rename within the same owner keeps the author; a link to a page in the repository keeps its path; an own website is left alone.
		const lib = { author: 'smallnest', repo: 'smallnest/uix', url: 'https://github.com/smallnest/uix#readme', homepage: 'https://uix.dev' };
		expect(movedRepo(lib, 'smallnest/uix', 'smallnest/uix-go')).toEqual(['repo', 'url']);
		expect(lib).toMatchObject({ author: 'smallnest', url: 'https://github.com/smallnest/uix-go#readme', homepage: 'https://uix.dev' });

		// A repository whose name starts the same is not the one that moved; an author that is a display name is not a login.
		const other = { author: 'ELY Open Source', url: 'https://github.com/ELY-Open-Source/MujicaUI-extra', repo: 'ELY-Open-Source/MujicaUI' };
		expect(movedRepo(other, 'ELY-Open-Source/MujicaUI', 'ely/MujicaUI')).toEqual(['repo']);
		expect(other.url).toBe('https://github.com/ELY-Open-Source/MujicaUI-extra');
		expect(other.author).toBe('ELY Open Source');

		// The dot in a name is matched as a dot.
		const dotted = { url: 'https://github.com/a/b.c' };
		expect(movedRepo({ url: 'https://github.com/a/bxc' }, 'a/b.c', 'a/d')).toEqual([]);
		expect(movedRepo(dotted, 'a/b.c', 'a/d')).toEqual(['url']);
	});

	it('adds a field after the one it follows in the files', () => {
		const lib: Record<string, unknown> = { slug: 'kit', repo: 'a/kit', url: 'https://github.com/a/kit', screenshot: 'kit.webp', added: 't' };
		setAfter(lib, 'homepage', 'https://kit.dev', 'url');
		expect(Object.keys(lib)).toEqual(['slug', 'repo', 'url', 'homepage', 'screenshot', 'added']);
		const bare: Record<string, unknown> = { slug: 'kit' };
		setAfter(bare, 'homepage', 'https://kit.dev', 'url');
		expect(Object.keys(bare)).toEqual(['slug', 'homepage']);
	});

	it('drops a replaced stand-in, and the list with its last one', () => {
		const app: Record<string, unknown> = { provisional: ['icon', 'screenshot'] };
		dropProvisional(app, 'icon');
		expect(app.provisional).toEqual(['screenshot']);
		dropProvisional(app, 'screenshot');
		expect('provisional' in app).toBe(false);
	});

	it('names a set of changes the same in any order', () => {
		expect(changeKey(['b', 'a'])).toBe(changeKey(['a', 'b']));
		expect(changeKey(['a'])).not.toBe(changeKey(['b']));
		expect(changeKey(['a'])).toMatch(/^[0-9a-f]{12}$/);
	});

	it('waits on an open pull request and does not propose a declined change again', () => {
		const key = changeKey(['repo: a/b -> c/d']);
		const pr = (state: string, merged: boolean, body: string) => ({ html_url: `https://x/${state}${merged}`, state, merged_at: merged ? 't' : null, body });
		expect(pastPulls([], key)).toEqual({});
		expect(pastPulls([pr('open', false, 'other')], key)).toEqual({ open: 'https://x/openfalse' });
		expect(pastPulls([pr('closed', false, `x ${changeMarker(key)}`)], key)).toEqual({ declined: 'https://x/closedfalse' });
		// Merged, or closed with another change: proposed afresh.
		expect(pastPulls([pr('closed', true, changeMarker(key))], key)).toEqual({});
		expect(pastPulls([pr('closed', false, changeMarker(changeKey(['other'])))], key)).toEqual({});
	});
});
