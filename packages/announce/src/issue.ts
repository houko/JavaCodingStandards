// The issue opened on a newly listed project's own repository once the site lists it: that it was listed and where, the post on X about it, the README badge's Markdown so the project can link back, and where its score will show with what would raise it. Bilingual, English first, as the projects come from everywhere and many of their authors write Chinese.

import { ACTIVITY_WEEKS, SCORE_WEIGHTS, opennessShare, releaseShare } from '../../catalog/src/score.ts';
import { ENTRY_DIRS, type EntryKind, type Entry, SITE_REPO, SITE_URL, githubUrl, sitePage } from './tweet.ts';

// The title every issue has, which is also how a later run finds that it was opened already.
export const ISSUE_TITLE = 'Listed on Awesome NSGo';

// NSGo's own repository, whose owner is NSGo's author, ONEO.
export const NSGO_REPO = 'oneo-me/nsgo';

// Why a repository is not told, or undefined when it is: one of this site's own owner, or one of NSGo's author, whose projects (NSGo's companions, such as nsgo-flow or nsgo-icons-kubai) are listed without telling them, as NSGo's maintainer knows the site.
export function notTold(repo: string, siteOwner?: string): string | undefined {
	const owner = repo.split('/')[0].toLowerCase();
	if (siteOwner && owner === siteOwner.toLowerCase()) return `it belongs to ${repo.split('/')[0]}, the site's own owner`;
	if (owner === NSGO_REPO.split('/')[0]) return `it belongs to ${repo.split('/')[0]}, NSGo's author`;
	return undefined;
}

// The GitHub repository to tell, as owner/name: the entry's repository or GitHub link, or, for a community plugin, the repository its docs or Go import path name. An official plugin is a package of NSGo's own repository, which needs no telling.
export function projectRepo(kind: EntryKind, entry: Entry): string | undefined {
	const own = githubUrl(entry)?.slice('https://github.com/'.length);
	if (own) return own;
	if (kind !== 'plugin' || entry.official === true) return undefined;
	for (const v of [entry.docs, entry.import]) {
		const m = typeof v === 'string' ? /^(?:https:\/\/)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/#?]|$)/.exec(v) : null;
		if (m) return `${m[1]}/${m[2]}`;
	}
	return undefined;
}

// The README badge, linking to the entry's page on the site; the same Markdown as the app page shows (appBadgeMarkdown in apps/web/src/lib/seo.ts).
export function badgeMarkdown(kind: EntryKind, entry: Entry): string {
	return `[![Listed on Awesome NSGo](${SITE_URL}/badge.svg)](${sitePage(kind, entry)})`;
}

const KIND_EN: Record<EntryKind, string> = { app: 'in the showcase', ui: 'among the UI components', state: 'among the state management solutions', template: 'among the templates', ai: 'among the AI tools', plugin: 'among the plugins' };
const KIND_ZH: Record<EntryKind, string> = { app: '作品', ui: 'UI 组件', state: '状态管理', template: '模板', ai: 'AI 工具', plugin: '插件' };

// What the entry's page lacks that the project can give: a screenshot, for the kinds whose card shows one, and an icon, for an app, which shows a letter tile without one.
export function missingImages(kind: EntryKind, entry: Entry): { screenshot: boolean; icon: boolean } {
	return { screenshot: kind !== 'plugin' && entry.screenshot === undefined, icon: kind === 'app' && entry.icon === undefined };
}

// The entry's images that stand in until the project gives its own (the catalog's provisional field, which packages/enrich sets): the owner's GitHub avatar as an app's icon, a card of the repository as a screenshot.
export function standInImages(kind: EntryKind, entry: Entry): { screenshot: boolean; icon: boolean } {
	const list = Array.isArray(entry.provisional) ? (entry.provisional as unknown[]) : [];
	return { screenshot: kind !== 'plugin' && entry.screenshot !== undefined && list.includes('screenshot'), icon: kind === 'app' && entry.icon !== undefined && list.includes('icon') };
}

// ---- the score ----

// Whether the site scores the entry: every one but an official plugin, which is a package of NSGo itself (scoredEntry in packages/enrich/src/signals.ts).
export function isScored(kind: EntryKind, entry: Entry): boolean {
	return kind !== 'plugin' || entry.official !== true;
}

// Where the entry's score shows: the score section of an app's page, or the card on its category's page.
export function scorePage(kind: EntryKind, entry: Entry): string {
	return kind === 'app' ? `${sitePage(kind, entry)}#score` : sitePage(kind, entry);
}

// What the run reads of the entry's repository from GitHub as it writes the issue, the same facts the scores are measured from (packages/enrich/src/signals.ts). A fact GitHub did not answer is left out and gives no tip.
export interface RepoFacts {
	repo: string;
	// The SPDX id GitHub detects, "NOASSERTION" for a license it cannot name, or null for no license.
	license?: string | null;
	// The newest release or tag not after the run, as epoch milliseconds, or null for a repository that has none.
	released?: number | null;
}

const DAY = 86_400_000;

// The start of the rolling release window a score run at time run counts, as epoch milliseconds: ACTIVITY_WEEKS weeks before run's UTC day. A release from then through that day counts.
export function releaseWindowStart(run: number): number {
	const d = new Date(run);
	const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
	return day - ACTIVITY_WEEKS * 7 * DAY;
}

// The time of day (UTC) the Update scores workflow runs, in milliseconds after midnight: its cron is '41 3 * * *' (.github/workflows/score.yml).
const SCORE_RUN_TIME = (3 * 60 + 41) * 60_000;

// A time on the UTC day of the score run that next measures the entry, which is all releaseWindowStart reads of it: today's run when it has not happened yet, otherwise tomorrow's. Every entry is measured again each day.
export function nextScoreRun(now: number, _measured: boolean): number {
	return now - SCORE_RUN_TIME + DAY;
}

// The newest of the times of a repository's releases and tags that is not after now, or null when there is none: a tag's date is its commit's, which anyone can set, so one in the future is not believed (latestRelease in packages/enrich/src/signals.ts).
export function newestRelease(times: readonly (string | null | undefined)[], now: number): number | null {
	const past = times.filter((t): t is string => Boolean(t)).map((t) => Date.parse(t)).filter((t) => t <= now);
	return past.length ? Math.max(...past) : null;
}

// A part's points to one decimal, as the breakdown shows them (scoreOf).
const tenths = (n: number) => Math.round(n * 10) / 10;
const gain = (max: number, from: number, to: number) => tenths(tenths(max * to) - tenths(max * from));

// One way the project can raise its score, with the points it adds. An archived repository is never told (openIssue in main.ts, and GitHub takes no issue on one), so it needs no tip.
export type ScoreTip = { tip: 'license'; unnamed: boolean; points: number } | { tip: 'release'; never: boolean; points: number; max: number };

// The tips that apply to a repository from what GitHub says of it now, worth what the score's formula (packages/catalog/src/score.ts) gives them: a standard open-source license for one with none or one GitHub cannot name, a release for one with no release or tag in the weeks the score run that next measures it counts (nextScoreRun; measured says whether scores.json has a record of the entry). A license GitHub names is not judged here, as whether the OSI approves it takes the SPDX list the score run reads.
export function scoreTips(facts: RepoFacts, now: number, measured = false): ScoreTip[] {
	const tips: ScoreTip[] = [];
	if (facts.license === null || facts.license === 'NOASSERTION') {
		const from = opennessShare({ repo: facts.repo, license: facts.license, osi: false });
		// Any license the OSI approves counts in full; MIT stands for them all.
		const to = opennessShare({ repo: facts.repo, license: 'MIT', osi: true });
		tips.push({ tip: 'license', unnamed: facts.license !== null, points: gain(SCORE_WEIGHTS.openness, from, to) });
	}
	if (facts.released !== undefined && (facts.released === null || facts.released < releaseWindowStart(nextScoreRun(now, measured)))) {
		tips.push({ tip: 'release', never: facts.released === null, points: gain(SCORE_WEIGHTS.release, releaseShare(0), releaseShare(1)), max: SCORE_WEIGHTS.release });
	}
	return tips;
}

function tipEn(t: ScoreTip): string {
	switch (t.tip) {
		case 'license':
			return `${t.unnamed ? 'GitHub cannot name the repository\'s license. A standard open-source license' : 'The repository has no license. An open-source license'}, as a LICENSE file GitHub recognizes such as MIT or Apache-2.0, is worth ${t.points} points.`;
		case 'release':
			return `${t.never ? 'The repository has no release or tag yet.' : `The repository has no release or tag in the last ${ACTIVITY_WEEKS} weeks.`} A release or version tag now is worth ${t.points} points, and regular releases up to ${t.max}.`;
	}
}

function tipZh(t: ScoreTip): string {
	switch (t.tip) {
		case 'license':
			return `${t.unnamed ? 'GitHub 无法识别仓库的许可证，换成标准的开源许可证' : '仓库还没有许可证，加上开源许可证'}（GitHub 能识别的 LICENSE 文件，如 MIT 或 Apache-2.0）：+${t.points} 分。`;
		case 'release':
			return `${t.never ? '仓库还没有 release 或 tag' : `仓库近 ${ACTIVITY_WEEKS} 周没有 release 或 tag`}，现在发布一个版本或打一个版本 tag：+${t.points} 分，定期发布最多可得 ${t.max} 分。`;
	}
}

export interface IssueInput {
	kind: EntryKind;
	entry: Entry;
	// The post on X about the entry, when it was posted.
	postUrl?: string;
	// The ways the project can raise its score (scoreTips), for an entry the site scores.
	tips?: readonly ScoreTip[];
	// Whether packages/catalog/data/scores.json already has a record of the entry, so the site shows its score now: an entry announced before issues were opened (ISSUE_ONLY), or a job run again after the daily score run measured it.
	measured?: boolean;
}

// The issue's title and body. The name is the project's own; no @mention is written, so nobody but the repository's watchers is notified.
export function composeIssue({ kind, entry, postUrl, tips = [], measured = false }: IssueInput): { title: string; body: string } {
	// A zero-width space after any @ in the name, which comes from the project, so it mentions no one.
	const name = (typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : String(entry.slug)).replace(/@(?=[\w-])/g, '@\u200b');
	const page = sitePage(kind, entry);
	const badge = badgeMarkdown(kind, entry);
	const site = `[Awesome NSGo](${SITE_URL})`;
	const slug = String(entry.slug);
	const file = `packages/catalog/data/${ENTRY_DIRS[kind]}/${slug}.json`;
	const missing = missingImages(kind, entry);
	const stand = standInImages(kind, entry);
	const standEn = [...(stand.icon ? ["your GitHub avatar as the app's icon"] : []), ...(stand.screenshot ? ['a card of the repository as its screenshot'] : [])];
	const standZh = [...(stand.icon ? ['图标（你的 GitHub 头像）'] : []), ...(stand.screenshot ? ['截图（仓库的卡片）'] : [])];
	const standFiles = [...(stand.screenshot ? [`\`apps/web/public/shots/${slug}.webp\` (WebP, up to 1200 px wide)`] : []), ...(stand.icon ? [`\`apps/web/public/icons/${slug}.webp\` (a 128 px square WebP)`] : [])];
	const standNames = [...(stand.icon ? ['"icon"'] : []), ...(stand.screenshot ? ['"screenshot"'] : [])];
	const lacks = [...(missing.screenshot ? ['screenshot'] : []), ...(missing.icon ? ['icon'] : [])];
	const lacksZh = [...(missing.screenshot ? ['截图'] : []), ...(missing.icon ? ['图标'] : [])];
	const how = [
		...(missing.screenshot ? [`a screenshot as \`apps/web/public/shots/${slug}.webp\` (WebP, up to 1200 px wide) with \`"screenshot": "${slug}.webp"\``] : []),
		...(missing.icon ? [`an icon as \`apps/web/public/icons/${slug}.webp\` (a 128 px square WebP) with \`"icon": { "file": "${slug}.webp" }\``] : []),
	];
	// An entry without a record has no score yet: the daily Update scores run measures it first.
	const scored = isScored(kind, entry);
	const where = scorePage(kind, entry);
	const body = [
		`${name} is now listed ${KIND_EN[kind]} on ${site}, the community directory of projects built with [NSGo](https://github.com/${NSGO_REPO}): ${page}`,
		...(postUrl ? [`It was announced on X: ${postUrl}`] : []),
		"If you'd like to link back, here is a badge for your README:",
		`\`\`\`markdown\n${badge}\n\`\`\``,
		`${badge}`,
		...(lacks.length
			? [`The page has no ${lacks.join(' and no ')} yet${missing.icon ? ', so the app shows a letter tile' : ''}. It would look much better with ${lacks.length > 1 ? 'both' : 'one'}: reply here with a link to the image, or send a pull request to ${SITE_REPO} that adds ${how.join(', and ')} in \`${file}\`.`]
			: []),
		...(standEn.length
			? [`For now the page shows ${standEn.join(' and ')}, in place of the project's own. It would look much better with yours: reply here with a link to the image, or send a pull request to ${SITE_REPO} that replaces ${standFiles.join(' and ')} and drops ${standNames.join(' and ')} from \`provisional\` in \`${file}\`.`]
			: []),
		...(scored ? [`The site scores each project out of 100 from its stars, recent commits, license, likes on the site and releases. ${name}'s score shows at ${where} ${measured ? 'and is updated daily' : 'from the next daily measurement, and is updated daily'}.`] : []),
		...(scored && tips.length ? [`To raise it:\n${tips.map((t) => `- ${tipEn(t)}`).join('\n')}`] : []),
		`If anything on the page is wrong, such as the description, the screenshot or the icon, reply here or open an issue or pull request at ${SITE_REPO}. If you would rather not be listed, say so and it will be taken down. Feel free to close this issue.`,
		'---',
		`${name} 已被 ${site} 收录到${KIND_ZH[kind]}：${page}`,
		...(postUrl ? [`X 上的收录推文：${postUrl}`] : []),
		...(lacksZh.length ? [`页面上目前还没有${lacksZh.join('和')}${missing.icon ? '（应用暂时显示为字母图块）' : ''}，建议补上：直接在这里回复图片链接，或者给 ${SITE_REPO} 提 PR，按上面英文说明放好图片文件并在 \`${file}\` 里登记。`] : []),
		...(standZh.length ? [`页面上的${standZh.join('和')}暂时是替代图，换成项目自己的会好很多：直接在这里回复图片链接，或者给 ${SITE_REPO} 提 PR，替换上面英文说明里的图片文件，并把 \`${file}\` 里 \`provisional\` 中的对应项删掉。`] : []),
		...(scored ? [`本站按 Star 数、近期提交、许可证、站内点赞和发布情况给每个项目打分（满分 100）${measured ? '，每日更新' : '。下次每日测量后会显示分数，之后每日更新'}：${where}`] : []),
		...(scored && tips.length ? [`提高分数的方法：\n${tips.map((t) => `- ${tipZh(t)}`).join('\n')}`] : []),
		`欢迎在 README 里加上上面的 badge 互相链接。页面上的介绍、截图或图标有误，直接在这里回复，或到 ${SITE_REPO} 提 issue 或 PR；不希望被收录也请告诉我们，会尽快下架。`,
	];
	return { title: ISSUE_TITLE, body: `${body.join('\n\n')}\n` };
}
