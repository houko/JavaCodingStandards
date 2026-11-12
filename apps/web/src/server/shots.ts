import { type ShotProblem, UPLOAD_MAX_BYTES, isArtwork, repoShotSources, shotProblem, sniffImage } from '@awesome-nsgo/enrich/source';
import { imageSize } from 'image-size';

// Screenshots for the submission form, judged by the rules the submission workflow uses (packages/enrich/src/source.ts): whether a project's repository has one the workflow would take, so the form can ask for one when it does not, and whether an image a visitor uploads can be one. The Worker has no image tools, so an image is judged by the size its first bytes give.

// Enough of an image for its size: PNG and WebP give it in their first bytes, a JPEG after its metadata, which seldom runs past this.
const HEAD_BYTES = 512 * 1024;

// At most max bytes of url's body, asking for no more with a range; undefined when it cannot be had.
async function head(url: string, max: number): Promise<Uint8Array | undefined> {
	const res = await fetch(url, { headers: { range: `bytes=0-${max - 1}` }, redirect: 'follow', signal: AbortSignal.timeout(10_000) }).catch(() => undefined);
	if (!res?.ok || !res.body) return undefined;
	const reader = res.body.getReader();
	const chunks: Uint8Array[] = [];
	let n = 0;
	try {
		while (n < max) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
			n += value.length;
		}
	} catch {
		return undefined;
	} finally {
		reader.cancel().catch(() => undefined);
	}
	const out = new Uint8Array(Math.min(n, max));
	let at = 0;
	for (const c of chunks) {
		const part = c.subarray(0, out.length - at);
		out.set(part, at);
		at += part.length;
		if (at >= out.length) break;
	}
	return out;
}

// An image's width and height from its bytes, or undefined when they do not say (not an image the site takes, or cut before its size).
function sizeOf(bytes: Uint8Array): { width: number; height: number } | undefined {
	if (!sniffImage(bytes)) return undefined;
	try {
		const { width, height } = imageSize(bytes);
		return width && height ? { width, height } : undefined;
	} catch {
		return undefined;
	}
}

export type RepoShot = { found: true; url: string } | { found: false; reason: 'none' | 'no-repo' };

// Whether the repository (owner/name) has an image the submission workflow would take as the entry's screenshot: the first that is not named as artwork and whose size makes it a window, among as many of the README's images and then of its screenshot folders as the workflow tries, in the workflow's order. The repository's social preview, the workflow's last resort, does not count: it is not a screenshot. token reads the repository through the GitHub API.
export async function findRepoShot(repo: string, token: string): Promise<RepoShot> {
	const api = async <T>(path: string): Promise<T | undefined> => {
		const res = await fetch(`https://api.github.com/repos/${repo}${path}`, { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'awesome-nsgo-submit', 'x-github-api-version': '2022-11-28' }, signal: AbortSignal.timeout(10_000) });
		if (res.status === 404) return undefined;
		if (!res.ok) throw new Error(`GitHub /repos/${repo}${path}: ${res.status}`);
		return (await res.json()) as T;
	};
	const info = await api<{ default_branch: string; private: boolean }>('');
	if (!info || info.private) return { found: false, reason: 'no-repo' };
	const branch = info.default_branch;
	const [tree, readme] = await Promise.all([api<{ tree: { path: string; type: string }[] }>(`/git/trees/${encodeURIComponent(branch)}?recursive=1`), api<{ path: string; content: string; encoding: string }>('/readme')]);
	const paths = (tree?.tree ?? []).filter((t) => t.type === 'blob').map((t) => t.path);
	const text = readme?.encoding === 'base64' ? new TextDecoder().decode(Uint8Array.from(atob(readme.content.replace(/\s/g, '')), (c) => c.charCodeAt(0))) : undefined;
	for (const source of repoShotSources({ repo, branch, paths, readme: readme && text !== undefined ? { path: readme.path, text } : undefined })) {
		// The images of a source are fetched together; the first that fits, in the source's order, is the one the workflow would take.
		const urls = source.urls.filter((u) => !isArtwork(u)).slice(0, source.tries);
		const sizes = await Promise.all(urls.map(async (url) => (await head(url, HEAD_BYTES).then((b) => (b ? sizeOf(b) : undefined)))));
		const i = sizes.findIndex((s) => s !== undefined && !shotProblem(s.width, s.height));
		if (i >= 0) return { found: true, url: urls[i] };
	}
	return { found: false, reason: 'none' };
}

// Whether the repository (owner/name) has no screenshot the submission workflow could use, for a submission that gives none (missingShot in routes/api/submit.ts and in server/issue.ts). A GitHub failure, getting the token included, counts as a screenshot found: it does not hold the submission back, as the workflow looks again.
export async function repoLacksShot(repo: string, token: string | Promise<string>): Promise<boolean> {
	try {
		return !(await findRepoShot(repo, await token)).found;
	} catch (err) {
		console.error('looking for a screenshot failed', err);
		return false;
	}
}

const PROBLEM_TEXT: Record<ShotProblem, string> = {
	narrow: 'is under 600 pixels wide',
	square: 'is square, like an icon or a logo',
	tall: 'is far taller than a phone screen, like a whole scrolled page',
	banner: 'is a banner, far wider than a window',
};

// An image a visitor uploaded with the form: its format when it can be the entry's screenshot, or why it cannot, in words for the form.
export function checkUpload(bytes: Uint8Array): { format: 'png' | 'jpeg' | 'webp' } | { problem: string } {
	if (bytes.length > UPLOAD_MAX_BYTES) return { problem: `the screenshot is larger than ${UPLOAD_MAX_BYTES / 1024 / 1024} MB` };
	const format = sniffImage(bytes);
	// Repository GIF demos can supply a still frame to the enrichment workflow, but the form deliberately keeps uploads to static formats.
	if (!format || format === 'gif') return { problem: 'the screenshot must be a PNG, JPEG or WebP image' };
	const size = sizeOf(bytes);
	if (!size) return { problem: 'the screenshot could not be read as an image' };
	const problem = shotProblem(size.width, size.height);
	return problem ? { problem: `the screenshot ${PROBLEM_TEXT[problem]}; it should show the app's window or phone screen, or the components, at least 600 pixels wide` } : { format };
}
