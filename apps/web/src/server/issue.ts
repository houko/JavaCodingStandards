import { CatalogError, ENTRY_PLACEHOLDERS, SITE_URL, type SubmitCat, codeFence, pastedName, pastedShotRepo, submissionFromIssue, takesShot } from '@awesome-nsgo/catalog';
import type { Octokit } from '@octokit/core';
import { MAX_OPEN, MAX_OPEN_PER_SENDER, SenderBusy, SubmissionsBusy, openSubmission } from './pull';
import { repoLacksShot } from './shots';

// An issue sent through the form's issue link (issueUrl in packages/catalog), turned into the pull request the site's bot opens for the form, which the Complete submission workflow then completes. Run by the Submission issue workflow (apps/web/scripts/issue-submission.ts), which posts the comment this returns on the issue and closes it once the pull request is open.

// What starts the bot's one comment on an issue, which the workflow edits on every later run, from what to fix to the pull request; .github/workflows/issue-submission.yml looks for the same text.
export const COMMENT_MARKER = '<!-- submission-issue -->';

// An issue as GitHub's REST API returns it, as far as it is read here.
export interface Issue {
	number: number;
	state: string;
	body?: string | null;
	created_at: string;
	user: { login: string } | null;
	pull_request?: unknown;
}

export type IssueResult = { result: 'opened' | 'problem'; comment: string } | { result: 'skip'; why: string };

// Why an app, UI components or state management sent without a screenshot link has none to show, as the form's Worker judges it (missingShot in routes/api/submit.ts): no GitHub repository, or none the submission workflow would take a screenshot from; a GitHub failure lets it through (repoLacksShot).
async function missingShot(found: { cat: SubmitCat; entry: Record<string, unknown>; screenshot?: string }, token: string): Promise<string | undefined> {
	if (!takesShot(found.cat) || found.screenshot) return undefined;
	const repo = pastedShotRepo(found.cat, found.entry);
	if (!repo) return 'There is no GitHub repository to take a screenshot from.';
	return (await repoLacksShot(repo, token)) ? "The project's repository has no screenshot the site could use." : undefined;
}

// Checks the issue as the form checks a pasted entry and opens its pull request with gh, the site's GitHub App; token is the same app's token, for looking for a screenshot in the project's repository. skip is for an issue that is not one the form wrote, which gets no comment.
export async function submitIssue(gh: Octokit, token: string, issue: Issue): Promise<IssueResult> {
	if (issue.pull_request) return { result: 'skip', why: 'a pull request' };
	if (issue.state !== 'open') return { result: 'skip', why: 'closed' };
	// A person's login, which the pull request links; an app's account ends in [bot]. A deleted account shows as ghost.
	const author = issue.user?.login ?? 'ghost';
	if (!/^[A-Za-z0-9-]+$/.test(author)) return { result: 'skip', why: 'not opened by a person' };
	const found = submissionFromIssue(issue.body ?? '');
	if (!found) return { result: 'skip', why: 'not an entry sent from the form' };
	// The text that echoes the sender's entry goes in a code block, so it cannot mention anyone or render as Markdown.
	const fix = (text: string) => ({ result: 'problem' as const, comment: `${COMMENT_MARKER}\n${text}` });
	const again = 'Edit the issue to fix it and it is checked again.';
	if ('problem' in found) return fix(`The entry in this issue cannot be submitted as it stands:\n\n${codeFence(found.problem)}\n\n${again} The line naming the entry's file and the \`json\` code block under it, holding the entry, are what the form on ${SITE_URL} writes; the form's preview shows what is still missing.`);
	const noShot = await missingShot(found, token);
	if (noShot) return fix(`This project still needs a screenshot. ${noShot} Add a line under the code block with a link to an image of its window, its phone screen or its components, at least 600 pixels wide (PNG, JPEG or WebP):\n\n${codeFence(`Screenshot: ${ENTRY_PLACEHOLDERS.url}`)}\n\n${again}`);
	try {
		const pr = await openSubmission(gh, found.cat, pastedName(found.entry), found.entry, { screenshot: found.screenshot, issue: { number: issue.number, author, opened: issue.created_at } });
		return { result: 'opened', comment: `${COMMENT_MARKER}\nThe site's bot opened #${pr.number} with this entry. The *Complete submission* workflow completes it there (the icon, the screenshot and the copy in every site language), and a maintainer reviews it before it goes live on ${SITE_URL}. Follow the pull request from here; this issue is closed.` };
	} catch (err) {
		if (err instanceof CatalogError) return fix(`The entry in this issue cannot be submitted:\n\n${codeFence(err.message)}`);
		if (err instanceof SenderBusy) return fix(`${MAX_OPEN_PER_SENDER} entries you sent are waiting for review already, the most the site's bot keeps open for one person, so it has not opened a pull request for this one yet. Edit the issue once one of them is merged or closed and it is checked again.`);
		if (err instanceof SubmissionsBusy) return fix(`${MAX_OPEN} submissions are waiting for review, the most the site's bot keeps open, so it has not opened a pull request for this one yet. Edit the issue once some are merged and it is checked again, or a maintainer runs the *Submission issue* workflow for it.`);
		throw err;
	}
}
