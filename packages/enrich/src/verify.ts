import { execFile } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { listDir } from './files.ts';
import { NSGO_MODULE, quiet } from './find.ts';
import { github } from './github.ts';
import { currentRepo, namedInCode, usesNsgo } from './listed.ts';
import { type ShotSource, firstShot, iconSource, ownIcon, repoFacts } from './repo.ts';
import { ENTRY_DIRS, type Entry, homepageOf, repoOfEntry, repoShotSources } from './source.ts';
import { type BranchPull, VERIFY_PREFIX, changeKey, changeMarker, dropProvisional, movedRepo, pastPulls, setAfter, verifyBranch } from './verify-plan.ts';

// Run by .github/workflows/verify.yml once a week. It looks up the GitHub repository of every entry that names one (apps, UI libraries, state management and community plugins) and opens a pull request for each entry whose repository says it has changed, with only what the repository states, never a judgment: an entry whose repository is gone (deleted, made private or disabled by GitHub) is removed with its images; one GitHub moved (renamed or transferred) gets its new owner/name in the fields that named the old; a UI library or state management library without a homepage gets the one its repository's settings now give; and an image that stands in for the project's own (the entry's provisional list) is replaced once the project has its own, by the rules main.ts takes images by. What needs a maintainer's judgment is only reported: an archived repository, and one in which no go.mod requires NSGo any more; prune.ts proposes taking those off, in a pull request a maintainer merges.
//
// Each entry has one pull request at a time, on its own branch (verify/<dir>/<slug>), so each fix is merged or closed on its own. An entry with an open one is left alone until it is merged or closed; a change a maintainer closed is not proposed again, while a different one is. Like discover.ts, it works in the repository's working tree, checked out at main and clean, with origin/main fetched, and leaves the tree detached at origin/main.
//
// Environment: BASE_REF (the commit the changes are made on, default origin/main), GITHUB_TOKEN (the site's GitHub App, which pushes the branches and opens the pull requests, so CI runs on them), REPORT_FILE (a Markdown summary of the run), MAX_PRS (pull requests to open in a run, default 10), MAX_OPEN (no new pull request while this many of its own are open, default 20), DRY_RUN=true to make each change and run the catalog checks on it without pushing or opening anything, and ONLY (space-separated <dir>/<slug> of the entries to check, such as apps/exodrive; all when empty).

const run = promisify(execFile);
const ROOT = join(import.meta.dirname, '../../..');
const DATA_DIR = 'packages/catalog/data';
const PUBLIC = 'apps/web/public';
const BASE = 'main';

const env = process.env;
const SITE = env.GITHUB_REPOSITORY || 'yldm-tech/awesome-nsgo';
const count = (v: string | undefined, fallback: number) => (v && /^\d+$/.test(v) ? Number(v) : fallback);
const MAX_PRS = count(env.MAX_PRS, 10);
const MAX_OPEN = count(env.MAX_OPEN, 20);
const DRY_RUN = env.DRY_RUN === 'true';
// The commit each change is made on, the run's main; another for a trial run on a commit of one's own.
const BASE_REF = env.BASE_REF || `origin/${BASE}`;
const ONLY = new Set((env.ONLY ?? '').split(/\s+/).filter(Boolean));

const report: string[] = [];
const say = (line: string): void => {
	report.push(line);
	console.log(line);
};

const git = (...args: string[]) => run('git', args, { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 });
const tail = (text: string, n: number) => (text.length > n ? `…${text.slice(-n)}` : text);
const codeBlock = (text: string) => `\`\`\`\`\n${text.replace(/````/g, '```')}\n\`\`\`\``;

// Where main as it is now is fetched to, apart from origin/main, which keeps the commit the run began on.
const LATEST = 'refs/verify/latest';

interface Listed {
	dir: string;
	slug: string;
	// The entry's file, relative to the repository's root.
	file: string;
	entry: Entry;
	repo: string;
}

// What the check found that a pull request changes.
interface Fix {
	// Why the entry is removed: its repository is gone.
	remove?: string;
	// GitHub moved the repository from one owner/name to another.
	moved?: { from: string; to: string };
	// The homepage the repository's settings now give, for an entry without one.
	homepage?: string;
	// The stand-in images to replace with the project's own, when it has them now.
	images: ('icon' | 'screenshot')[];
}

// The entries that name a GitHub repository, in each directory's file order. The official plugins are packages of NSGo's own repository, which this site does not check.
async function listedEntries(): Promise<Listed[]> {
	const out: Listed[] = [];
	for (const dir of Object.values(ENTRY_DIRS)) {
		for (const name of (await listDir(join(ROOT, DATA_DIR, dir))).filter((n) => n.endsWith('.json')).sort()) {
			const file = `${DATA_DIR}/${dir}/${name}`;
			const entry = JSON.parse(await readFile(join(ROOT, file), 'utf8')) as Entry;
			const repo = repoOfEntry(entry);
			const slug = String(entry.slug);
			if (!repo || entry.official === true || repo.toLowerCase() === NSGO_MODULE.replace('github.com/', '')) continue;
			if (ONLY.size && !ONLY.has(`${dir}/${slug}`)) continue;
			out.push({ dir, slug, file, entry, repo });
		}
	}
	return out;
}

// What the entry's repository says has changed, and what only a maintainer can judge (notes).
async function check(l: Listed): Promise<{ fix?: Fix; notes: string[] }> {
	const notes: string[] = [];
	const info = await currentRepo(l.repo);
	if (!info) return { fix: { remove: 'its repository is gone: GitHub answers 404 for it, as for a deleted repository or one made private', images: [] }, notes };
	if (info.disabled) return { fix: { remove: 'GitHub has disabled its repository', images: [] }, notes };
	if (info.private) return { fix: { remove: 'its repository is private now', images: [] }, notes };
	const fix: Fix = { images: [] };
	if (info.full_name.toLowerCase() !== l.repo.toLowerCase()) fix.moved = { from: l.repo, to: info.full_name };
	if (info.archived) notes.push('its repository is archived');
	if ((await usesNsgo(info)) === false) notes.push(`no go.mod in its repository requires ${NSGO_MODULE} any more`);
	if ((l.dir === ENTRY_DIRS.ui || l.dir === ENTRY_DIRS.state || l.dir === ENTRY_DIRS.template || l.dir === ENTRY_DIRS.ai) && l.entry.homepage === undefined) {
		const home = homepageOf(info.homepage, info.full_name);
		if (home) fix.homepage = home;
	}
	// Only an image in the file the completing script writes, which is the one it would replace.
	const provisional = Array.isArray(l.entry.provisional) ? (l.entry.provisional as string[]) : [];
	if (provisional.includes('icon') && (l.entry.icon as { file?: string } | undefined)?.file === `${l.slug}.webp`) fix.images.push('icon');
	if (provisional.includes('screenshot') && l.entry.screenshot === `${l.slug}.webp`) fix.images.push('screenshot');
	return { fix: fix.moved || fix.homepage || fix.images.length ? fix : undefined, notes };
}

// The entry's file, written back as the files are written by hand.
const entryText = (entry: Entry) => `${JSON.stringify(entry, null, '\t')}\n`;

// Makes the change on the entry's branch, checked out from BASE_REF: the stable descriptions of what changed (for the pull request's marker), and the lines that tell a maintainer what was done and from where. No changes when the repository did not give what the change needs, such as an own image; the lines then say why.
async function apply(l: Listed, fix: Fix): Promise<{ changes: string[]; lines: string[] }> {
	const changes: string[] = [];
	const lines: string[] = [];
	const entry = JSON.parse(await readFile(join(ROOT, l.file), 'utf8')) as Entry;
	if (fix.remove) {
		await rm(join(ROOT, l.file));
		const images = [...(typeof (entry.icon as { file?: unknown } | undefined)?.file === 'string' ? [`icons/${(entry.icon as { file: string }).file}`] : []), ...(typeof entry.screenshot === 'string' ? [`shots/${entry.screenshot}`] : [])];
		for (const img of images) await rm(join(ROOT, PUBLIC, img), { force: true });
		changes.push(`remove: ${fix.remove}`);
		lines.push(`- Removed \`${l.file}\`${images.length ? ` and its images (${images.map((i) => `\`${PUBLIC}/${i}\``).join(', ')})` : ''}, as ${fix.remove}.`);
		return { changes, lines };
	}
	if (fix.moved) {
		const fields = movedRepo(entry, fix.moved.from, fix.moved.to);
		changes.push(`repo: ${fix.moved.from} -> ${fix.moved.to}`);
		lines.push(`- Repository: GitHub moved ${fix.moved.from} to [${fix.moved.to}](https://github.com/${fix.moved.to}), so ${fields.map((f) => `\`${f}\``).join(', ')} now name${fields.length === 1 ? 's' : ''} the new one.`);
	}
	const repo = fix.moved?.to ?? l.repo;
	if (fix.homepage) {
		setAfter(entry, 'homepage', fix.homepage, 'url');
		changes.push(`homepage: ${fix.homepage}`);
		lines.push(`- Homepage: ${fix.homepage}, which the repository's settings give now.`);
	}
	if (fix.images.length) {
		const facts = await repoFacts(repo, (line) => lines.push(line));
		if (!facts) lines.push(`- Images: the repository ${repo} could not be read, so the stand-ins stay.`);
		else {
			const icon = iconSource(facts);
			let iconUrl = 'url' in icon ? icon.url : undefined;
			if (fix.images.includes('icon')) {
				const own = await ownIcon(l.slug, facts);
				iconUrl = own.url;
				if ('path' in own) {
					dropProvisional(entry, 'icon');
					changes.push(`icon: ${own.url}`);
					lines.push(`- Icon: the app's own, \`${own.path}\`, in place of the owner's GitHub avatar${own.guessed ? ' (the likeliest icon file, as the repository has no nsgo.yaml that places one)' : ''}. Check that it looks right.`);
				} else lines.push(`- Icon: still the stand-in, as ${own.why}.`);
			}
			if (fix.images.includes('screenshot')) {
				// The project's own images only: its README and screenshot folders, and a social preview its owner set. GitHub's own card, or the card drawn of the owner's avatar, is what stands in already.
				const sources: ShotSource[] = [...repoShotSources(facts).map((s) => ({ ...s, picked: false })), ...(facts.preview?.custom ? [{ from: "the repository's social preview, which its owner set", urls: [facts.preview.url], tries: 1, picked: true }] : [])];
				const skipped: string[] = [];
				const hit = await firstShot(sources, join(ROOT, PUBLIC, 'shots', `${l.slug}.webp`), iconUrl, [], skipped);
				if (hit) {
					dropProvisional(entry, 'screenshot');
					changes.push(`screenshot: ${hit.url}`);
					lines.push(`- Screenshot: ${hit.url} from ${hit.from}, in place of the stand-in. Check that it shows the ${l.dir === ENTRY_DIRS.app ? 'app' : l.dir === ENTRY_DIRS.template ? 'template' : l.dir === ENTRY_DIRS.ai ? 'tool' : 'library'}.${skipped.length ? ` It passed over ${skipped.join(', ')}.` : ''}`);
				} else lines.push(`- Screenshot: still the stand-in, as ${skipped.length ? `none of the project's images is a screenshot: ${skipped.join(', ')}` : 'the project has no image in its README, its screenshot folders or a social preview of its own'}.`);
			}
		}
	}
	if (changes.length) await writeFile(join(ROOT, l.file), entryText(entry));
	return { changes, lines };
}

// Pushing the branch or opening the pull request failed: a fault on GitHub's side or in this workflow.
class PublishError extends Error {}

// Makes the change on the entry's branch, runs the catalog's checks, and, unless this is a dry run, pushes the branch and opens the pull request. Returns its link (or what it would change, in a dry run), or why nothing was proposed; throws with what went wrong, leaving no branch behind. The working tree is back on origin/main either way.
async function propose(l: Listed, fix: Fix, prs: readonly BranchPull[]): Promise<{ opened: string } | { declined: string } | { nothing: string[] }> {
	const branch = verifyBranch(l.dir, l.slug);
	const name = String(l.entry.name ?? l.slug).replace(/@/g, '');
	let pushed = false;
	await git('switch', '-q', '-C', branch, BASE_REF);
	try {
		const done = await apply(l, fix);
		if (!done.changes.length) return { nothing: done.lines };
		const key = changeKey(done.changes);
		const past = pastPulls(prs, key);
		if (past.declined) return { declined: past.declined };
		try {
			await run('pnpm', ['--filter', '@awesome-nsgo/catalog', 'test'], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
		} catch (err) {
			const out = (err as { stdout?: string }).stdout ?? String(err);
			throw new Error(`the catalog checks failed on the change:\n${codeBlock(tail(out, 1500))}`);
		}
		if (DRY_RUN) {
			const { stdout } = await git('status', '--short', '--', DATA_DIR, PUBLIC);
			return { opened: `would open a pull request:\n${done.lines.map((x) => `  ${x}`).join('\n')}\n${codeBlock(stdout.trim())}` };
		}
		const title = fix.remove ? `Remove ${name}: ${fix.remove.split(':')[0]}` : `Update ${name} from its repository`;
		await git('add', '-A', '--', DATA_DIR, PUBLIC);
		await git('commit', '-q', '-m', fix.remove ? `chore(catalog): remove ${name}` : `fix(catalog): update ${name} from its repository`, '-m', `Found by the verify workflow in ${l.repo}:\n\n${done.lines.join('\n')}`);
		// As in discover.ts: the change's one commit is moved onto main as it is now, so a workflow file merged during the run does not make GitHub refuse the push.
		try {
			await git('fetch', '-q', 'origin', `+refs/heads/${BASE}:${LATEST}`);
			await git('rebase', '-q', LATEST);
			await git('push', '-q', '--force', 'origin', `HEAD:refs/heads/${branch}`);
		} catch (err) {
			throw new PublishError(`pushing the branch failed: ${err instanceof Error ? err.message : String(err)}`);
		}
		pushed = true;
		const body = [
			`The weekly *Verify listed projects* workflow looked up [${l.repo}](https://github.com/${l.repo}) for \`${l.file}\` and found:`,
			quiet(done.lines.join('\n')),
			'The catalog checks passed on this change before it was pushed, and CI runs them again. Merge it to apply it. Close it to keep the entry as it is: the same change is not proposed again, while a different one may be.',
			changeMarker(key),
		].join('\n\n');
		const pr = await github<{ html_url: string }>(`/repos/${SITE}/pulls`, { method: 'POST', body: { title, head: branch, base: BASE, body } }).catch((err: unknown) => {
			throw new PublishError(`opening the pull request failed: ${err instanceof Error ? err.message : String(err)}`);
		});
		if (!pr) throw new PublishError('GitHub did not open the pull request');
		return { opened: pr.html_url };
	} catch (err) {
		if (pushed) await github(`/repos/${SITE}/git/refs/heads/${branch}`, { method: 'DELETE' }).catch(() => undefined);
		throw err;
	} finally {
		await git('rebase', '--abort').catch(() => undefined);
		await git('reset', '-q', '--hard', BASE_REF);
		await git('clean', '-qfd', '--', DATA_DIR, PUBLIC);
		await git('switch', '-q', '--detach', BASE_REF);
		await git('branch', '-q', '-D', branch);
	}
}

async function main(): Promise<void> {
	const { stdout: dirty } = await git('status', '--porcelain', '--', DATA_DIR, PUBLIC);
	if (dirty.trim()) throw new Error(`the working tree has changes under ${DATA_DIR} or ${PUBLIC}; run this on a clean checkout`);
	say(`## Verify listed projects${DRY_RUN ? ' (dry run)' : ''}\n`);
	const open = (await github<{ head: { ref: string } }[]>(`/repos/${SITE}/pulls?state=open&per_page=100`)) ?? [];
	const openOwn = open.filter((p) => p.head.ref.startsWith(VERIFY_PREFIX)).length;
	const room = DRY_RUN ? MAX_PRS : Math.max(0, Math.min(MAX_PRS, MAX_OPEN - openOwn));

	const entries = await listedEntries();
	const lines = { proposed: [] as string[], waiting: [] as string[], look: [] as string[], failed: [] as string[] };
	const due: { l: Listed; fix: Fix }[] = [];
	for (const l of entries) {
		const link = `\`${l.file}\` ([${l.repo}](https://github.com/${l.repo}))`;
		try {
			const { fix, notes } = await check(l);
			if (notes.length) lines.look.push(`- ${link}: ${notes.join('; ')}`);
			if (fix) due.push({ l, fix });
		} catch (err) {
			lines.failed.push(`- ${link}: ${quiet(err instanceof Error ? err.message : String(err))}`);
		}
	}
	// A gone repository first, then a moved one: what most misleads a visitor.
	const rank = (f: Fix) => (f.remove ? 0 : f.moved ? 1 : 2);
	due.sort((a, b) => rank(a.fix) - rank(b.fix));

	let opened = 0;
	let unlooked = 0;
	for (const { l, fix } of due) {
		const link = `\`${l.file}\` ([${l.repo}](https://github.com/${l.repo}))`;
		if (opened >= room) {
			unlooked++;
			continue;
		}
		try {
			const owner = SITE.split('/')[0];
			const prs = (await github<BranchPull[]>(`/repos/${SITE}/pulls?state=all&per_page=100&head=${encodeURIComponent(`${owner}:${verifyBranch(l.dir, l.slug)}`)}`)) ?? [];
			if (fix.remove) {
				const uses = await namedInCode(ROOT, BASE_REF, l.slug);
				if (uses.length) {
					lines.look.push(`- ${link}: ${fix.remove}, but ${uses.map((f) => `\`${f}\``).join(', ')} name${uses.length === 1 ? 's' : ''} its slug, so it is not removed here; take it out there first`);
					continue;
				}
			}
			const waiting = prs.find((p) => p.state === 'open')?.html_url;
			if (waiting) {
				lines.waiting.push(`- ${link}: its pull request ${waiting} is still open`);
				continue;
			}
			const result = await propose(l, fix, prs);
			if ('opened' in result) {
				lines.proposed.push(`- ${link}: ${result.opened}`);
				opened++;
			} else if ('declined' in result) lines.waiting.push(`- ${link}: the same change was closed in ${result.declined}`);
			else lines.waiting.push(`- ${link}: nothing to change yet\n${result.nothing.map((x) => `  ${x}`).join('\n')}`);
		} catch (err) {
			lines.failed.push(`- ${link}: ${quiet(err instanceof Error ? err.message : String(err))}`);
		}
	}

	say(`Checked the repositories of ${entries.length} entries.${!DRY_RUN && openOwn ? ` ${openOwn} of this workflow's pull requests were open before this run (it keeps at most ${MAX_OPEN}).` : ''}\n`);
	say(`### ${DRY_RUN ? 'Would open' : 'Opened'} (${lines.proposed.length})\n\n${lines.proposed.join('\n') || 'None.'}\n`);
	if (unlooked) say(`${unlooked} more entries have a change and wait for the next run (at most ${room} pull requests this run).\n`);
	say(`### Not proposed (${lines.waiting.length})\n\n${lines.waiting.join('\n') || 'None.'}\n`);
	say(`### For a maintainer to look at (${lines.look.length})\n\nNo pull request is opened for these, as whether the entry stays is a judgment.\n\n${lines.look.join('\n') || 'None.'}\n`);
	say(`### Failed (${lines.failed.length})\n\n${lines.failed.join('\n') || 'None.'}`);
}

try {
	await main();
} finally {
	if (env.REPORT_FILE) await writeFile(env.REPORT_FILE, `${report.join('\n')}\n`);
}
