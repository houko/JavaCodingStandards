import { readFile, writeFile } from 'node:fs/promises';
import { listDir } from './files.ts';
import { join } from 'node:path';
import { downloadImage, writeCard, writeIcon, writeShotCollage, writeTextCard } from './image.ts';
import { type RepoFacts, type ShotSource, firstShot, iconSource, ownIcon, repoFacts } from './repo.ts';
import { ENTRY_DIRS, type Entry, type EntryKind, markProvisional, repoOfEntry, repoShotSources } from './source.ts';
import { dropProvisional, setAfter } from './verify-plan.ts';

// Backfills images for entries already in the catalog. New submissions are completed by main.ts, while the weekly verifier replaces stand-ins one entry per pull request; this command is for a focused batch in one working branch.
//
// By default it handles entries with a missing screenshot or, for apps, icon. INCLUDE_PROVISIONAL=true also revisits GitHub-card screenshots and owner-avatar icons. MAX limits the number of entries inspected (20 by default), AFTER resumes after a <dir>/<slug> cursor, and ONLY accepts space-separated <dir>/<slug> values. It writes a Markdown report to REPORT_FILE when set.

const ROOT = join(import.meta.dirname, '../../..');
const DATA = join(ROOT, 'packages/catalog/data');
const PUBLIC = join(ROOT, 'apps/web/public');
const IMAGE_KINDS = ['app', 'ui', 'state', 'template', 'ai'] as const satisfies readonly EntryKind[];

const env = process.env;
const INCLUDE_PROVISIONAL = env.INCLUDE_PROVISIONAL === 'true';
const MAX = /^\d+$/.test(env.MAX ?? '') ? Number(env.MAX) : 20;
const AFTER = env.AFTER ?? '';
const ONLY = new Set((env.ONLY ?? '').split(/\s+/).filter(Boolean));
const report: string[] = [];
const say = (line: string): void => {
	report.push(line);
	console.log(line);
};

interface Listed {
	kind: (typeof IMAGE_KINDS)[number];
	dir: string;
	slug: string;
	file: string;
	entry: Entry;
	repo: string;
}

const provisionalOf = (entry: Entry) => (Array.isArray(entry.provisional) ? (entry.provisional as string[]) : []);
const wantsIcon = (kind: EntryKind, entry: Entry) => kind === 'app' && (entry.icon === undefined || (INCLUDE_PROVISIONAL && provisionalOf(entry).includes('icon')));
const wantsScreenshot = (entry: Entry) => entry.screenshot === undefined || (INCLUDE_PROVISIONAL && provisionalOf(entry).includes('screenshot'));
const entryText = (entry: Entry) => {
	const { added, ...rest } = entry;
	return `${JSON.stringify(added === undefined ? rest : { ...rest, added }, null, '\t')}\n`;
};

async function listed(): Promise<Listed[]> {
	const out: Listed[] = [];
	for (const kind of IMAGE_KINDS) {
		const dir = ENTRY_DIRS[kind];
		for (const name of (await listDir(join(DATA, dir))).filter((n) => n.endsWith('.json')).sort()) {
			const file = join(DATA, dir, name);
			const entry = JSON.parse(await readFile(file, 'utf8')) as Entry;
			if (!wantsIcon(kind, entry) && !wantsScreenshot(entry)) continue;
			const repo = repoOfEntry(entry);
			if (!repo) continue;
			const slug = String(entry.slug);
			const key = `${dir}/${slug}`;
			if ((ONLY.size && !ONLY.has(key)) || (!ONLY.size && AFTER && key.localeCompare(AFTER) <= 0)) continue;
			out.push({ kind, dir, slug, file, entry, repo });
		}
	}
	// Keep the cursor and the traversal on the same stable key. Sorting by how many fields are missing made a cursor from one batch incomparable with candidates in the next batch after the processed entry changed or disappeared.
	return out.sort((a, b) => `${a.dir}/${a.slug}`.localeCompare(`${b.dir}/${b.slug}`)).slice(0, MAX);
}

async function backfillIcon(l: Listed, facts: RepoFacts, lines: string[]): Promise<boolean> {
	if (!wantsIcon(l.kind, l.entry)) return false;
	const missing = l.entry.icon === undefined;
	const own = await ownIcon(l.slug, facts);
	if ('path' in own) {
		setAfter(l.entry, 'icon', { file: `${l.slug}.webp` }, 'screenshot');
		dropProvisional(l.entry, 'icon');
		lines.push(`- Icon: ${own.url} (${own.path})${missing ? '' : ', replacing the owner-avatar stand-in'}.`);
		return true;
	}
	if (!missing) {
		lines.push(`- Icon: kept the stand-in; ${own.why}.`);
		return false;
	}
	const avatarUrl = `https://github.com/${facts.repo.split('/')[0]}.png?size=512`;
	const avatar = await downloadImage(avatarUrl);
	if (!avatar || !(await writeIcon(avatar, join(PUBLIC, 'icons', `${l.slug}.webp`), 1))) {
		lines.push(`- Icon: still missing; ${own.why}, and the owner's avatar could not be used.`);
		return false;
	}
	setAfter(l.entry, 'icon', { file: `${l.slug}.webp` }, 'screenshot');
	markProvisional(l.entry, 'icon');
	lines.push(`- Icon: ${avatarUrl}, the owner's avatar as a stand-in; ${own.why}.`);
	return true;
}

async function backfillScreenshot(l: Listed, facts: RepoFacts, lines: string[]): Promise<boolean> {
	if (!wantsScreenshot(l.entry)) return false;
	const missing = l.entry.screenshot === undefined;
	const icon = iconSource(facts);
	const iconUrl = 'url' in icon ? icon.url : undefined;
	const tried: string[] = [];
	const skipped: string[] = [];
	const sources: ShotSource[] = [
		...repoShotSources(facts).map((source) => ({ ...source, picked: false })),
		...(facts.preview?.custom ? [{ from: "the repository's custom social preview", urls: [facts.preview.url], tries: 1, picked: true }] : []),
	];
	const out = join(PUBLIC, 'shots', `${l.slug}.webp`);
	let hit = await firstShot(sources, out, iconUrl, tried, skipped);
	if (hit) {
		setAfter(l.entry, 'screenshot', `${l.slug}.webp`, 'description' in l.entry ? 'description' : 'summary');
		dropProvisional(l.entry, 'screenshot');
		lines.push(`- Screenshot: ${hit.url} from ${hit.from}${missing ? '' : ', replacing the GitHub-card stand-in'}.`);
		if (skipped.length) lines.push(`  Passed over: ${skipped.join('; ')}.`);
		return true;
	}
	const panelUrls = skipped.flatMap((item) => {
		const match = /^(https?:\/\/.*?) \((?:far taller than a phone screen|under 600 px wide)\)$/.exec(item);
		return match ? [match[1]] : [];
	});
	const panels = (await Promise.all(panelUrls.slice(0, 3).map(downloadImage))).filter((img) => img !== undefined);
	if (panels.length && (await writeShotCollage(panels, out))) {
		setAfter(l.entry, 'screenshot', `${l.slug}.webp`, 'description' in l.entry ? 'description' : 'summary');
		dropProvisional(l.entry, 'screenshot');
		lines.push(`- Screenshot: composed ${panels.length} project UI panel${panels.length === 1 ? '' : 's'} into a landscape contact sheet${missing ? '' : ', replacing the GitHub-card stand-in'}.`);
		return true;
	}
	if (!missing) {
		lines.push(`- Screenshot: kept the stand-in; no project screenshot was found${skipped.length ? ` (${skipped.join('; ')})` : ''}.`);
		return false;
	}
	if (facts.preview && !facts.preview.custom) hit = await firstShot([{ from: "GitHub's repository card", urls: [facts.preview.url], tries: 1, picked: true }], out, iconUrl, tried, skipped);
	if (hit) {
		setAfter(l.entry, 'screenshot', `${l.slug}.webp`, 'description' in l.entry ? 'description' : 'summary');
		markProvisional(l.entry, 'screenshot');
		lines.push(`- Screenshot: ${hit.url}, GitHub's repository card as a stand-in.`);
		return true;
	}
	const owner = facts.repo.split('/')[0];
	const avatar = await downloadImage(`https://github.com/${owner}.png?size=512`);
	if (!avatar) {
		lines.push(`- Screenshot: still missing; no project image, repository card or owner avatar could be used.`);
		return false;
	}
	await writeCard(avatar, facts.repo, out);
	setAfter(l.entry, 'screenshot', `${l.slug}.webp`, 'description' in l.entry ? 'description' : 'summary');
	markProvisional(l.entry, 'screenshot');
	lines.push(`- Screenshot: generated a repository card from ${owner}'s avatar as a stand-in.`);
	return true;
}

async function backfillWithoutRepository(l: Listed, lines: string[]): Promise<boolean> {
	let changed = false;
	const owner = l.repo.split('/')[0];
	const avatarUrl = `https://github.com/${owner}.png?size=512`;
	const avatar = await downloadImage(avatarUrl);
	if (!avatar) {
		if (l.entry.screenshot === undefined) {
			await writeTextCard(l.repo, join(PUBLIC, 'shots', `${l.slug}.webp`));
			setAfter(l.entry, 'screenshot', `${l.slug}.webp`, 'description' in l.entry ? 'description' : 'summary');
			markProvisional(l.entry, 'screenshot');
			lines.push('- Screenshot: generated a text project card as a stand-in because neither the repository nor owner avatar is available.');
			return true;
		}
		lines.push('- Repository and owner avatar could not be read.');
		return false;
	}
	if (l.kind === 'app' && l.entry.icon === undefined && (await writeIcon(avatar, join(PUBLIC, 'icons', `${l.slug}.webp`), 1))) {
		setAfter(l.entry, 'icon', { file: `${l.slug}.webp` }, 'screenshot');
		markProvisional(l.entry, 'icon');
		lines.push(`- Icon: ${avatarUrl}, the owner's avatar as a stand-in.`);
		changed = true;
	}
	if (l.entry.screenshot === undefined) {
		await writeCard(avatar, l.repo, join(PUBLIC, 'shots', `${l.slug}.webp`));
		setAfter(l.entry, 'screenshot', `${l.slug}.webp`, 'description' in l.entry ? 'description' : 'summary');
		markProvisional(l.entry, 'screenshot');
		lines.push(`- Screenshot: generated a project card from ${owner}'s avatar as a stand-in because the repository is unavailable.`);
		changed = true;
	}
	return changed;
}

async function main(): Promise<void> {
	const entries = await listed();
	say(`# Backfill catalog images${INCLUDE_PROVISIONAL ? ' (including stand-ins)' : ''}\n`);
	let changed = 0;
	for (const l of entries) {
		const lines: string[] = [];
		say(`## ${l.dir}/${l.slug} (${l.repo})`);
		try {
			const facts = await repoFacts(l.repo, (line) => lines.push(line));
			if (!facts) {
				lines.push('- Repository could not be read.');
				if (await backfillWithoutRepository(l, lines)) {
					await writeFile(l.file, entryText(l.entry));
					changed++;
				}
			} else {
				const iconDid = await backfillIcon(l, facts, lines);
				const shotDid = await backfillScreenshot(l, facts, lines);
				if (iconDid || shotDid) {
					await writeFile(l.file, entryText(l.entry));
					changed++;
				}
			}
		} catch (err) {
			lines.push(`- Failed: ${err instanceof Error ? err.message : String(err)}`);
		}
		for (const line of lines) say(line);
		say('');
	}
	say(`Inspected ${entries.length} entries and changed ${changed}.`);
	if (entries.length === MAX && entries.length) say(`Resume after \`${entries.at(-1)?.dir}/${entries.at(-1)?.slug}\` to inspect the next batch.`);
	if (env.REPORT_FILE) await writeFile(env.REPORT_FILE, `${report.join('\n')}\n`);
}

await main();
