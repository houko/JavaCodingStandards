import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { github, rawFile, rawUrl as rawRepoUrl } from './github.ts';
import { downloadImage, fetchImage, writeIcon, writeShot } from './image.ts';
import { iconOf, isArtwork, pickNsgoConfig, repoIcons } from './source.ts';

// What the completing script (main.ts) and the check of listed entries (verify.ts) read from a project's repository, and the images they take from it, by the same rules: the app's own icon, and the first image of a list of sources that is a screenshot.

const ROOT = join(import.meta.dirname, '../../..');
const PUBLIC = 'apps/web/public';

export interface RepoFacts {
	repo: string;
	branch: string;
	paths: string[];
	readme?: { path: string; text: string };
	// The app's nsgo.yaml, with the fields read from it (parseNsgoConfig).
	nsgo?: { path: string; text: string; config: unknown };
	// The homepage in the repository's settings.
	homepage?: string | null;
	// The repository's social preview: the image its owner set, or else the card GitHub draws of its name, description and owner.
	preview?: { url: string; custom: boolean };
}

// nsgo.yaml's fields, as NSGo's CLI reads them (cmd/nsgo/project.go decodes it as YAML): an object, or null for an empty file. Throws when the text is not YAML.
export function parseNsgoConfig(text: string): unknown {
	return parseYaml(text) ?? null;
}

// note: where a problem worth reporting goes, such as an nsgo.yaml that is not valid YAML.
export async function repoFacts(repo: string, note: (line: string) => void): Promise<RepoFacts | undefined> {
	const info = await github<{ default_branch: string; private: boolean; homepage: string | null }>(`/repos/${repo}`);
	if (!info) return undefined;
	const branch = info.default_branch;
	const tree = await github<{ tree: { path: string; type: string }[]; truncated: boolean }>(`/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
	const paths = (tree?.tree ?? []).filter((t) => t.type === 'blob').map((t) => t.path);
	const facts: RepoFacts = { repo, branch, paths, homepage: info.homepage };
	const readme = await github<{ path: string; content: string; encoding: string }>(`/repos/${repo}/readme`);
	if (readme?.encoding === 'base64') facts.readme = { path: readme.path, text: Buffer.from(readme.content, 'base64').toString('utf8') };
	const og = await github<{ data?: { repository: { openGraphImageUrl: string; usesCustomOpenGraphImage: boolean } | null } }>('/graphql', { method: 'POST', body: { query: 'query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { openGraphImageUrl usesCustomOpenGraphImage } }', variables: { owner: repo.split('/')[0], name: repo.split('/')[1] } } }).catch(() => undefined);
	const preview = og?.data?.repository;
	if (preview?.openGraphImageUrl) facts.preview = { url: preview.openGraphImageUrl, custom: preview.usesCustomOpenGraphImage };
	const nsgoPath = pickNsgoConfig(paths);
	if (nsgoPath) {
		const text = await rawFile(repo, branch, nsgoPath);
		if (text !== undefined) {
			try {
				facts.nsgo = { path: nsgoPath, text, config: parseNsgoConfig(text) };
			} catch {
				note(`- \`${nsgoPath}\` is not valid YAML, so its name, icon and build targets could not be read.`);
			}
		}
	}
	return facts;
}

// The file names of the repository's latest release, prereleases included, as the platforms it ships for (a .dmg, a windows-amd64 archive, a .deb); empty when it has no release. Read only when an app's platforms are picked, so the check of listed entries (verify.ts) does not pay a request per entry for it.
export async function latestReleaseAssets(repo: string): Promise<string[]> {
	const releases = await github<{ tag_name: string; assets: { name: string }[] }[]>(`/repos/${repo}/releases?per_page=1`);
	return releases?.[0]?.assets.map((a) => a.name) ?? [];
}

export const rawUrl = (facts: RepoFacts, path: string) => rawRepoUrl(facts.repo, facts.branch, path);

// Where the app's own icon is: where NSGo takes it from, or, without an nsgo.yaml to place it (as in a repository whose app has none), an icon file where projects usually keep one (guessed); why there is none otherwise.
export function iconSource(facts: RepoFacts): { path: string; url: string; guessed: boolean } | { why: string } {
	const configured = facts.nsgo ? iconOf(facts.nsgo.path, facts.nsgo.config, facts.paths) : undefined;
	if (configured && !('macOnly' in configured)) return { path: configured.path, url: rawUrl(facts, configured.path), guessed: false };
	const found = repoIcons(facts.paths)[0];
	if (found) return { path: found, url: rawUrl(facts, found), guessed: true };
	if (!facts.nsgo) return { why: 'the repository has neither an nsgo.yaml nor an icon file where projects usually keep one' };
	if (!configured) return { why: `\`${facts.nsgo.path}\` names no icon.png and there is no assets/Icon.png beside it` };
	return { why: `the app's only icon is \`${configured.macOnly}\`, for Apple's targets only (an Icon Composer .icon or an .icns), which cannot be converted here` };
}

// The app's own icon (iconSource), written as the app's icon file. Returns the file it came from when there was one, so the screenshot search can pass over the same image, and why there is none otherwise.
export async function ownIcon(slug: string, facts: RepoFacts): Promise<{ path: string; url: string; guessed: boolean } | { why: string; url?: string }> {
	const src = iconSource(facts);
	if ('why' in src) return src;
	const url = src.url;
	const img = await downloadImage(url);
	if (!img) return { why: `\`${src.path}\` could not be downloaded as a supported raster image under 10 MB` };
	if (!(await writeIcon(img, join(ROOT, PUBLIC, 'icons', `${slug}.webp`)))) return { why: `\`${src.path}\` is smaller than 128 px`, url };
	return src;
}

// Where a screenshot may come from: its links in order, how many of them to try, and whether someone picked it (a visitor's link, the repository's social preview), so it is taken as it is, while the repository's own images may be artwork.
export interface ShotSource {
	from: string;
	urls: string[];
	tries: number;
	picked: boolean;
}

// Writes the first image of the sources that is a screenshot as out, and says which it was. Each source gets its own number of tries, so a README full of badges does not use up the next source's turn. tried and skipped are the caller's, for its report: the links looked at, and why each image passed over was not taken.
export async function firstShot(sources: readonly ShotSource[], out: string, iconUrl: string | undefined, tried: string[], skipped: string[]): Promise<{ url: string; from: string } | undefined> {
	for (const source of sources) {
		let n = 0;
		for (const url of source.urls) {
			if (tried.includes(url)) continue;
			tried.push(url);
			if (url === iconUrl) {
				skipped.push(`${url} (the app icon)`);
				continue;
			}
			if (!source.picked && isArtwork(url)) {
				skipped.push(`${url} (named as artwork, not a screenshot)`);
				continue;
			}
			const img = await fetchImage(url);
			const result = typeof img === 'string' ? img : await writeShot(img, out);
			if (result === 'ok') return { url, from: source.from };
			skipped.push(`${url} (${result === 'square' ? 'square, likely a logo' : result === 'narrow' ? 'under 600 px wide' : result === 'tall' ? 'far taller than a phone screen' : result === 'banner' ? 'a banner, far wider than a window' : result})`);
			if (++n >= source.tries) break;
		}
	}
	return undefined;
}
