// Run by .github/workflows/issue-submission.yml: checks an issue sent through the site's form and has the site's bot open its pull request, with the code the site's form uses (src/server/issue.ts and pull.ts). The catalog loads its data with Vite's import.meta.glob, which Node cannot run, so that code is loaded through Vite's module runner, as the site's build loads its config (--configLoader runner). Everything comes through the one runnerImport, so CatalogError is the same class in the catalog and in issue.ts.
//
// The runner is closed by the time runnerImport returns, so nothing on the path issue.ts runs may load a module later: no dynamic import(), and only eager import.meta.glob (as the catalog's are).
//
// Environment: GITHUB_TOKEN (the site's GitHub App's token, which opens the pull request so the Complete submission workflow runs on it), ISSUE_FILE (the issue as GitHub's REST API returns it), COMMENT_FILE (where the comment for the issue is written) and GITHUB_OUTPUT (gets result=opened, problem or skip).
//
//     node apps/web/scripts/issue-submission.ts

import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Octokit } from '@octokit/core';
import { runnerImport } from 'vite';

const env = process.env;
const { module } = await runnerImport<typeof import('../src/server/issue.ts')>(join(import.meta.dirname, '../src/server/issue.ts'));
const issue = JSON.parse(await readFile(env.ISSUE_FILE as string, 'utf8'));
const out = await module.submitIssue(new Octokit({ auth: env.GITHUB_TOKEN }), env.GITHUB_TOKEN ?? '', issue);
// Only fixed text goes to the log: the comment can echo the issue, and Actions reads ::commands:: in a step's output.
if (out.result === 'skip') console.log(`Left alone: ${out.why}`);
else await writeFile(env.COMMENT_FILE as string, out.comment);
console.log(`result=${out.result}`);
await appendFile(env.GITHUB_OUTPUT as string, `result=${out.result}\n`);
