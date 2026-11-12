import { describe, expect, it } from 'vitest';
import { ISSUE_TITLE, badgeMarkdown, composeIssue, isScored, missingImages, newestRelease, nextScoreRun, notTold, projectRepo, releaseWindowStart, scorePage, scoreTips, standInImages } from './issue.ts';
import { SITE_REPO, SITE_URL } from './tweet.ts';

describe('the project to tell', () => {
	it("takes an entry's repository, or a community plugin's from its docs or import path", () => {
		expect(projectRepo('app', { repo: 'Binaryify/MyGit', url: 'https://binaryify.com/mygit/' })).toBe('Binaryify/MyGit');
		expect(projectRepo('app', { url: 'https://github.com/a/b' })).toBe('a/b');
		expect(projectRepo('app', { url: 'https://kero.sh' })).toBeUndefined();
		expect(projectRepo('plugin', { official: false, docs: 'https://github.com/caelyreth/untie/tree/main/contrib/nsgo', import: 'github.com/caelyreth/untie/contrib/nsgo' })).toBe('caelyreth/untie');
		expect(projectRepo('plugin', { official: false, docs: 'https://untie.iki.moe', import: 'github.com/caelyreth/untie/contrib/nsgo' })).toBe('caelyreth/untie');
		expect(projectRepo('plugin', { official: true, docs: 'https://oneo-me.github.io/nsgo/docs/lists/', import: 'github.com/oneo-me/nsgo/base/datatable' })).toBeUndefined();
	});
});

describe('missing images', () => {
	it('asks for a screenshot where a card shows one, and for an icon for an app', () => {
		expect(missingImages('app', { slug: 'a' })).toEqual({ screenshot: true, icon: true });
		expect(missingImages('app', { slug: 'a', screenshot: 'a.webp', icon: { file: 'a.webp' } })).toEqual({ screenshot: false, icon: false });
		expect(missingImages('ui', { slug: 'u' })).toEqual({ screenshot: true, icon: false });
		expect(missingImages('plugin', { slug: 'p' })).toEqual({ screenshot: false, icon: false });
	});

	it("asks for the project's own images where the page shows stand-ins", () => {
		const entry = { slug: 'hb', name: 'Handbean', screenshot: 'hb.webp', icon: { file: 'hb.webp' }, provisional: ['icon', 'screenshot'] };
		expect(standInImages('app', entry)).toEqual({ screenshot: true, icon: true });
		expect(standInImages('app', { ...entry, provisional: ['screenshot'] })).toEqual({ screenshot: true, icon: false });
		expect(standInImages('app', { slug: 'x', provisional: ['screenshot'] })).toEqual({ screenshot: false, icon: false });
		expect(standInImages('plugin', { slug: 'p', screenshot: 'p.webp', provisional: ['screenshot'] })).toEqual({ screenshot: false, icon: false });
		const body = composeIssue({ kind: 'app', entry }).body;
		expect(body).toContain("For now the page shows your GitHub avatar as the app's icon and a card of the repository as its screenshot, in place of the project's own.");
		expect(body).toContain('drops "icon" and "screenshot" from `provisional` in `packages/catalog/data/apps/hb.json`');
		expect(body).toContain('页面上的图标（你的 GitHub 头像）和截图（仓库的卡片）暂时是替代图');
		expect(body).not.toContain('The page has no');
		const own = composeIssue({ kind: 'app', entry: { ...entry, provisional: undefined } }).body;
		expect(own).not.toContain('For now the page shows');
		expect(own).not.toContain('替代图');
	});

	it("tells neither the site's own owner nor NSGo's author", () => {
		expect(notTold('yldm-tech/nodra', 'yldm-tech')).toBe("it belongs to yldm-tech, the site's own owner");
		expect(notTold('oneo-me/nsgo-flow', 'yldm-tech')).toBe("it belongs to oneo-me, NSGo's author");
		expect(notTold('Oneo-Me/nsgo-icons-kubai')).toBe("it belongs to Oneo-Me, NSGo's author");
		expect(notTold('Jungley8/exodrive', 'yldm-tech')).toBeUndefined();
		expect(notTold('oneo-mex/app', 'yldm-tech')).toBeUndefined();
		// MyGo's author is no one special here.
		expect(notTold('egoist/kero', 'yldm-tech')).toBeUndefined();
	});

	it('suggests adding what the page lacks, and nothing when it lacks nothing', () => {
		const lacking = composeIssue({ kind: 'app', entry: { slug: 'kumo', name: 'Kumo', icon: { file: 'kumo.webp' } } }).body;
		expect(lacking).toContain('The page has no screenshot yet.');
		expect(lacking).toContain('`apps/web/public/shots/kumo.webp`');
		expect(lacking).toContain('`packages/catalog/data/apps/kumo.json`');
		expect(lacking).not.toContain('letter tile');
		expect(lacking).toContain('页面上目前还没有截图');
		const both = composeIssue({ kind: 'app', entry: { slug: 't', name: 'T' } }).body;
		expect(both).toContain('The page has no screenshot and no icon yet, so the app shows a letter tile.');
		expect(both).toContain('还没有截图和图标');
		const full = composeIssue({ kind: 'app', entry: { slug: 'm', name: 'M', screenshot: 'm.webp', icon: { file: 'm.webp' } } }).body;
		expect(full).not.toContain('The page has no');
		expect(full).not.toContain('还没有');
	});
});

describe('the issue', () => {
	it("links the entry's page, the post on X and the badge, in a code block and as it shows", () => {
		const { title, body } = composeIssue({ kind: 'app', entry: { slug: 'mygit', name: 'MyGit' }, postUrl: 'https://x.com/i/status/1' });
		const badge = `[![Listed on Awesome NSGo](${SITE_URL}/badge.svg)](${SITE_URL}/apps/mygit)`;
		expect(title).toBe(ISSUE_TITLE);
		expect(badgeMarkdown('app', { slug: 'mygit' })).toBe(badge);
		expect(body).toContain(`${SITE_URL}/apps/mygit`);
		expect(body).toContain('https://x.com/i/status/1');
		expect(body).toContain(`\`\`\`markdown\n${badge}\n\`\`\``);
		expect(body.split(badge).length - 1).toBe(2);
		expect(body).toContain('已被 [Awesome NSGo]');
		expect(title).toBe('Listed on Awesome NSGo');
		expect(body).toContain('built with [NSGo](https://github.com/oneo-me/nsgo)');
		expect(SITE_URL).toBe('https://awesomensgo.dev');
		// The site's repository, wherever the issue sends the project to fix its entry.
		expect(body).toContain(`open an issue or pull request at ${SITE_REPO}.`);
		expect(body).toContain(`到 ${SITE_REPO} 提 issue 或 PR`);
		expect(body).not.toMatch(/mygo/i);
	});

	it("links a library's category page, and leaves the post out when there is none", () => {
		const { body } = composeIssue({ kind: 'ui', entry: { slug: 'uix', name: 'uix' } });
		expect(body).toContain(`(${SITE_URL}/ui)`);
		expect(body).not.toContain('x.com');
		expect(body).not.toContain('推文');
	});

	it('mentions no one through the name', () => {
		const { body } = composeIssue({ kind: 'app', entry: { slug: 'a', name: 'Hi @someone' } });
		expect(body).not.toMatch(/@someone/);
		expect(body).toContain('@\u200bsomeone');
	});
});

describe('the score', () => {
	// A Thursday: the score counts releases from 12 weeks before the UTC day, 2026-08-13, through the run.
	const now = Date.parse('2026-11-05T12:00:00Z');

	it('counts releases from 12 weeks before the UTC day', () => {
		const start = Date.parse('2026-08-13T00:00:00Z');
		expect(releaseWindowStart(now)).toBe(start);
		expect(releaseWindowStart(Date.parse('2026-11-02T00:00:00Z'))).toBe(Date.parse('2026-08-10T00:00:00Z'));
		expect(releaseWindowStart(Date.parse('2026-11-08T23:59:59Z'))).toBe(Date.parse('2026-08-16T00:00:00Z'));
		expect(releaseWindowStart(Date.parse('2026-11-09T00:00:00Z'))).toBe(Date.parse('2026-08-17T00:00:00Z'));
	});

	it('takes the window of the score run that next measures the entry, daily', () => {
		const at = (iso: string, measured = false) => releaseWindowStart(nextScoreRun(Date.parse(iso), measured));
		// Announced on Sunday evening, measured on Monday, whose window starts a week later than Sunday's.
		expect(at('2026-11-08T20:00:00Z')).toBe(Date.parse('2026-08-17T00:00:00Z'));
		// Monday before that day's run, which measures it.
		expect(at('2026-11-09T02:00:00Z')).toBe(Date.parse('2026-08-17T00:00:00Z'));
		// Sunday before Sunday's run, which measures it in the week of Monday 2026-11-02.
		expect(at('2026-11-08T03:00:00Z')).toBe(Date.parse('2026-08-16T00:00:00Z'));
		// An entry already measured keeps its record until the first run of the next week.
		expect(at('2026-11-05T12:00:00Z', true)).toBe(Date.parse('2026-08-14T00:00:00Z'));
		expect(at('2026-11-09T02:00:00Z', true)).toBe(Date.parse('2026-08-17T00:00:00Z'));
		expect(at('2026-11-09T04:00:00Z', true)).toBe(Date.parse('2026-08-18T00:00:00Z'));
	});

	it('suggests a release by the window of the run that next measures the entry', () => {
		// The only release is on 2026-08-12: in Sunday's window, not in Monday's.
		const released = Date.parse('2026-08-12T00:00:00Z');
		expect(scoreTips({ repo: 'a/b', released }, Date.parse('2026-11-08T20:00:00Z')).map((t) => t.tip)).toEqual(['release']);
		expect(scoreTips({ repo: 'a/b', released }, Date.parse('2026-11-08T03:00:00Z')).map((t) => t.tip)).toEqual(['release']);
		expect(scoreTips({ repo: 'a/b', released }, Date.parse('2026-11-05T12:00:00Z')).map((t) => t.tip)).toEqual(['release']);
		expect(scoreTips({ repo: 'a/b', released }, Date.parse('2026-11-05T12:00:00Z'), true).map((t) => t.tip)).toEqual(['release']);
	});

	it('takes the newest release or tag, and leaves out one dated after the run', () => {
		expect(newestRelease([null, '2026-09-01T00:00:00Z', undefined, '2026-10-01T08:00:00Z', '2099-01-01T00:00:00Z'], now)).toBe(Date.parse('2026-10-01T08:00:00Z'));
		expect(newestRelease(['2099-01-01T00:00:00Z', null], now)).toBeNull();
		expect(newestRelease([], now)).toBeNull();
	});

	it('suggests a standard open-source license for a repository with none or one GitHub cannot name', () => {
		expect(scoreTips({ repo: 'a/b', license: null }, now)).toEqual([{ tip: 'license', unnamed: false, points: 14 }]);
		expect(scoreTips({ repo: 'a/b', license: 'NOASSERTION' }, now)).toEqual([{ tip: 'license', unnamed: true, points: 8 }]);
		expect(scoreTips({ repo: 'a/b', license: 'MIT' }, now)).toEqual([]);
		expect(scoreTips({ repo: 'a/b', license: 'CC-BY-NC-4.0' }, now)).toEqual([]);
		expect(scoreTips({ repo: 'a/b' }, now)).toEqual([]);
	});

	it('suggests a release for a repository with none in the counted weeks, and none when GitHub did not say', () => {
		expect(scoreTips({ repo: 'a/b', released: null }, now)).toEqual([{ tip: 'release', never: true, points: 2.7, max: 10 }]);
		expect(scoreTips({ repo: 'a/b', released: Date.parse('2026-08-09T23:59:59Z') }, now)).toEqual([{ tip: 'release', never: false, points: 2.7, max: 10 }]);
		expect(scoreTips({ repo: 'a/b', released: Date.parse('2026-08-10T00:00:00Z') }, now).map((t) => t.tip)).toEqual(['release']);
		expect(scoreTips({ repo: 'a/b', released: undefined }, now)).toEqual([]);
	});

	it('gives every tip that applies, in order', () => {
		expect(scoreTips({ repo: 'a/b', license: null, released: null }, now).map((t) => t.tip)).toEqual(['license', 'release']);
	});

	it("links where the score shows: an app's score section, a library's category page and a community plugin's page", () => {
		expect(scorePage('app', { slug: 'kumo' })).toBe(`${SITE_URL}/apps/kumo#score`);
		expect(scorePage('ui', { slug: 'uix' })).toBe(`${SITE_URL}/ui`);
		expect(scorePage('state', { slug: 's' })).toBe(`${SITE_URL}/state`);
		expect(isScored('app', { slug: 'a' })).toBe(true);
		expect(isScored('plugin', { slug: 'p', official: true })).toBe(false);
		expect(isScored('plugin', { slug: 'p', official: false })).toBe(true);
	});

	it('says where the score will show and how to raise it, in English and Chinese', () => {
		const tips = scoreTips({ repo: 'a/kumo', license: null, released: null }, now);
		const { body } = composeIssue({ kind: 'app', entry: { slug: 'kumo', name: 'Kumo' }, tips });
		expect(body).toContain(`Kumo's score shows at ${SITE_URL}/apps/kumo#score from the next daily measurement, and is updated daily.`);
		expect(body).toContain('To raise it:\n- The repository has no license. An open-source license, as a LICENSE file GitHub recognizes such as MIT or Apache-2.0, is worth 14 points.\n');
		expect(body).toContain('- The repository has no release or tag yet. A release or version tag now is worth 2.7 points, and regular releases up to 10.');
		expect(body).toContain(`下次每日测量后会显示分数，之后每日更新：${SITE_URL}/apps/kumo#score\n`);
		expect(body).toContain('提高分数的方法：\n- 仓库还没有许可证，加上开源许可证（GitHub 能识别的 LICENSE 文件，如 MIT 或 Apache-2.0）：+14 分。');
		expect(body).toContain('- 仓库还没有 release 或 tag，现在发布一个版本或打一个版本 tag：+2.7 分，定期发布最多可得 10 分。');
		expect(body.indexOf('To raise it:')).toBeLessThan(body.indexOf('---'));
		expect(body.indexOf('提高分数的方法')).toBeGreaterThan(body.indexOf('---'));
		const late = composeIssue({ kind: 'ui', entry: { slug: 'uix', name: 'uix' }, tips: scoreTips({ repo: 'a/uix', license: 'NOASSERTION', released: Date.parse('2026-01-01T00:00:00Z') }, now) }).body;
		expect(late).toContain(`uix's score shows at ${SITE_URL}/ui from`);
		expect(late).toContain('- GitHub cannot name the repository\'s license. A standard open-source license, as a LICENSE file GitHub recognizes such as MIT or Apache-2.0, is worth 8 points.');
		expect(late).toContain('- The repository has no release or tag in the last 12 weeks.');
		expect(late).toContain('- GitHub 无法识别仓库的许可证，换成标准的开源许可证');
		expect(late).toContain('- 仓库近 12 周没有 release 或 tag');
	});

	it('says the score shows now, without the next daily measurement, for an entry scores.json has a record of', () => {
		const later = composeIssue({ kind: 'app', entry: { slug: 'kumo', name: 'Kumo' }, tips: [] }).body;
		expect(later).toContain(`Kumo's score shows at ${SITE_URL}/apps/kumo#score from the next daily measurement, and is updated daily.`);
		expect(later).toContain(`本站按 Star 数、近期提交、许可证、站内点赞和发布情况给每个项目打分（满分 100）。下次每日测量后会显示分数，之后每日更新：${SITE_URL}/apps/kumo#score\n`);
		const now = composeIssue({ kind: 'app', entry: { slug: 'kumo', name: 'Kumo' }, tips: [], measured: true }).body;
		expect(now).toContain(`Kumo's score shows at ${SITE_URL}/apps/kumo#score and is updated daily.`);
		expect(now).toContain(`本站按 Star 数、近期提交、许可证、站内点赞和发布情况给每个项目打分（满分 100），每日更新：${SITE_URL}/apps/kumo#score\n`);
		expect(now).not.toContain('next daily measurement');
		expect(now).not.toContain('下次每日测量');
	});

	it('gives no tips when none apply, and scores a community plugin', () => {
		const none = composeIssue({ kind: 'app', entry: { slug: 'm', name: 'M' }, tips: [] }).body;
		expect(none).toContain('is updated daily');
		expect(none).not.toContain('To raise it');
		expect(none).not.toContain('提高分数');
		const plugin = composeIssue({ kind: 'plugin', entry: { slug: 'untie', name: 'untie', official: false }, tips: scoreTips({ repo: 'a/b', license: null }, now) }).body;
		expect(plugin).toContain(`untie's score shows at ${SITE_URL}/plugins from the next daily measurement, and is updated daily.`);
		expect(plugin).toContain('To raise it:');
		expect(plugin).toContain('分数');
	});
});
