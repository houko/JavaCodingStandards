import { CatalogError, DATA_DIR, SITE_REPO, SUBMIT_LABELS, type SubmitCat, alreadyListed, entryFileText, entryPath, slugify, submissionBody, submittedIssue } from '@awesome-nsgo/catalog';
import { stagedShot } from '@awesome-nsgo/enrich/source';
import type { Octokit } from '@octokit/core';

// The pull request the site's bot opens for a submission: from the site's form (routes/api/submit.ts), or from an issue the form wrote (server/issue.ts, run by the Submission issue workflow). It imports nothing of the Workers runtime, so the workflow loads it from Node through Vite's module runner; the caller gives it the app's Octokit.

export const [OWNER, REPO] = SITE_REPO.replace('https://github.com/', '').split('/');
const BASE = 'main';
const BRANCH_PREFIX = 'submit/';
// Whether a pull request is one the site's GitHub App opened: an app's account (type Bot, whatever the app is called) from a branch of this repository, which only those with write access can push. A pull request from a fork may name its branch submit/ and write any body, so it never counts. The Complete submission workflow runs on the same pull requests only, by the same test.
type Pull = { user?: { type?: string } | null; head: { ref: string; repo?: { full_name: string } | null } };
const isBots = (p: Pull) => p.user?.type === 'Bot' && p.head.repo?.full_name === `${OWNER}/${REPO}`;
// Past this many open submissions the bot stops opening more, so a flood cannot bury the repository.
export const MAX_OPEN = 20;
// Past this many open pull requests from one person's issues the bot opens no more for them: an issue takes only a GitHub account, without the form's captcha and per-IP limit, so one account must not be able to fill MAX_OPEN for everyone.
export const MAX_OPEN_PER_SENDER = 2;

// Raised when too many submissions are waiting for review.
export class SubmissionsBusy extends Error {}

// Raised when the author of an issue has MAX_OPEN_PER_SENDER submissions waiting for review already.
export class SenderBusy extends Error {}

// Base64 of bytes, a chunk at a time so a screenshot of a few megabytes does not overflow the call stack.
function toBase64(bytes: Uint8Array): string {
	let bin = '';
	for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(bin);
}

// Whether path exists at ref on the repository; GitHub answers 404 when it does not.
async function fileExists(gh: Octokit, path: string, ref: string): Promise<boolean> {
	try {
		await gh.request('GET /repos/{owner}/{repo}/contents/{path}', { owner: OWNER, repo: REPO, path, ref });
		return true;
	} catch (err) {
		if ((err as { status?: number }).status === 404) return false;
		throw err;
	}
}

// An image a visitor uploaded with the form, checked by checkUpload (server/shots.ts).
export interface Upload {
	bytes: Uint8Array;
	format: 'png' | 'jpeg' | 'webp';
}

// Where a submission came from besides its entry. screenshot is the screenshot link from the form or the issue, which is not part of the entry: the pull request carries it for the submission workflow. upload is an image uploaded with the form instead, which goes on the branch under submissions/ (stagedShot) and shows in the pull request; the workflow turns it into the site's WebP. issue is the issue the entry was sent as: its number, its author's login and when it was opened, which becomes the entry's added time.
export interface SubmissionFrom {
	screenshot?: string;
	upload?: Upload;
	issue?: { number: number; author: string; opened: string };
}

// Opens the pull request with gh, the app's installation, and returns it. Throws a CatalogError when the entry is already listed or would not pass its file's check, SubmissionsBusy when too many are open, and SenderBusy when an issue's author has too many open. For an issue whose pull request the bot has opened already, that pull request is returned and nothing new is opened, so a run that failed after opening it can be repeated.
export async function openSubmission(gh: Octokit, cat: SubmitCat, name: string, entry: Record<string, unknown>, from: SubmissionFrom = {}): Promise<{ url: string; number: number }> {
	const repo = { owner: OWNER, repo: REPO };

	const { data: open } = await gh.request('GET /repos/{owner}/{repo}/pulls', { ...repo, state: 'open', per_page: 100 });
	const submissions = open.filter((p) => p.head.ref.startsWith(BRANCH_PREFIX));
	if (from.issue) {
		const { number, author } = from.issue;
		// Only the bot's own pull requests count, by the first paragraph of their body, which the bot writes.
		const sent = submissions.filter(isBots).map((p) => ({ pr: p, issue: submittedIssue(p.body) }));
		const opened = sent.find((s) => s.issue?.number === number);
		if (opened) return { url: opened.pr.html_url, number: opened.pr.number };
		if (sent.filter((s) => s.issue?.author.toLowerCase() === author.toLowerCase()).length >= MAX_OPEN_PER_SENDER) throw new SenderBusy();
	}
	if (submissions.length >= MAX_OPEN) throw new SubmissionsBusy();

	const label = SUBMIT_LABELS[cat];
	const file = entryPath(cat, entry);
	const path = `${DATA_DIR}/${file}`;
	const { data: ref } = await gh.request('GET /repos/{owner}/{repo}/git/ref/{ref}', { ...repo, ref: `heads/${BASE}` });
	// Every entry is a new file of its own, so it only has to be new: no file of its slug on main, and nothing the site lists already under the field its category keeps unique.
	if (await fileExists(gh, path, ref.object.sha)) throw new CatalogError(`${file}: an entry with this slug is already listed`);
	const listed = alreadyListed(cat, entry);
	if (listed) throw new CatalogError(`${file}: the site already lists it, as ${listed}`);
	const next = entryFileText(cat, entry, from.issue?.opened);

	// '@' is dropped from the title so a name cannot mention anyone.
	const plainName = name.replace(/@/g, '');
	const branch = `${BRANCH_PREFIX}${cat}-${slugify(plainName)}-${crypto.randomUUID().slice(0, 8)}`;
	await gh.request('POST /repos/{owner}/{repo}/git/refs', { ...repo, ref: `refs/heads/${branch}`, sha: ref.object.sha });
	try {
		await gh.request('PUT /repos/{owner}/{repo}/contents/{path}', { ...repo, path, branch, message: `feat(catalog): add ${plainName}`, content: toBase64(new TextEncoder().encode(next)) });
		const slug = file.slice(file.lastIndexOf('/') + 1, -'.json'.length);
		const staged = from.upload ? stagedShot(slug, from.upload.format) : undefined;
		// Shown from the commit that added it, which stays when the workflow removes the file from the branch.
		const shown = from.upload && staged ? (await gh.request('PUT /repos/{owner}/{repo}/contents/{path}', { ...repo, path: staged, branch, message: `chore(catalog): stage the screenshot uploaded for ${plainName}`, content: toBase64(from.upload.bytes) })).data.commit.sha : undefined;
		const body = submissionBody({ cat, name: plainName, entry, screenshot: from.screenshot, staged: staged && shown ? { path: staged, commit: shown } : undefined, issue: from.issue });
		const { data: pr } = await gh.request('POST /repos/{owner}/{repo}/pulls', { ...repo, title: `Add ${plainName} (${label})`, head: branch, base: BASE, body });
		if (from.issue) {
			// Counted again now that this one is open: runs for different issues go side by side (the workflow's concurrency group is per issue), so one account sending several at once all pass the count above. Only the author's oldest MAX_OPEN_PER_SENDER stay; this one is closed, and its branch removed below, when it is not among them.
			const author = from.issue.author.toLowerCase();
			const { data: now } = await gh.request('GET /repos/{owner}/{repo}/pulls', { ...repo, state: 'open', per_page: 100 });
			const theirs = now.filter((p) => p.head.ref.startsWith(BRANCH_PREFIX) && isBots(p) && submittedIssue(p.body)?.author.toLowerCase() === author).map((p) => p.number);
			if (theirs.filter((n) => n < pr.number).length >= MAX_OPEN_PER_SENDER) {
				await gh.request('PATCH /repos/{owner}/{repo}/pulls/{pull_number}', { ...repo, pull_number: pr.number, state: 'closed' });
				throw new SenderBusy();
			}
		}
		return { url: pr.html_url, number: pr.number };
	} catch (err) {
		// Leave no branch behind when the pull request could not be opened, or was closed as one too many for its author; the original error is the one worth reporting.
		await gh.request('DELETE /repos/{owner}/{repo}/git/refs/{ref}', { ...repo, ref: `heads/${branch}` }).catch(() => undefined);
		throw err;
	}
}
