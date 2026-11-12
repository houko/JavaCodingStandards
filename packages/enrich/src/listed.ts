import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { goModsIn, requiresNsgo } from './find.ts';
import { github, rawFile } from './github.ts';

// What the weekly checks of listed entries (verify.ts and prune.ts) ask of an entry's repository on GitHub, and of the site's own code.

const run = promisify(execFile);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface RepoInfo {
	full_name: string;
	html_url: string;
	archived: boolean;
	disabled: boolean;
	private: boolean;
	homepage: string | null;
	default_branch: string;
}

// The repository as GitHub has it now, after a rename or transfer, which the API follows; undefined when it is gone. A 404 is asked again after a pause, as a repository that is there now and then answers one.
export async function currentRepo(repo: string): Promise<RepoInfo | undefined> {
	const first = await github<RepoInfo>(`/repos/${repo}`);
	if (first) return first;
	await sleep(5000);
	return github<RepoInfo>(`/repos/${repo}`);
}

// Whether a go.mod of the repository's own still requires NSGo; undefined when its tree is too large to tell.
export async function usesNsgo(info: RepoInfo): Promise<boolean | undefined> {
	const tree = await github<{ tree: { path: string; type: string }[]; truncated: boolean }>(`/repos/${info.full_name}/git/trees/${encodeURIComponent(info.default_branch)}?recursive=1`);
	if (!tree) return undefined;
	const paths = tree.tree.filter((t) => t.type === 'blob').map((t) => t.path);
	for (const path of goModsIn(paths).slice(0, 5)) {
		const text = await rawFile(info.full_name, info.default_branch, path);
		if (text !== undefined && requiresNsgo(text)) return true;
	}
	return tree.truncated ? undefined : false;
}

// The source files at ref, outside the catalog's data and tests, that name the entry's slug in quotes, such as the home page's featured apps or the apps whose copy sets the voice of new ones: removing the entry would break them at run time, which the catalog checks do not see.
export async function namedInCode(root: string, ref: string, slug: string): Promise<string[]> {
	const { stdout } = await run('git', ['grep', '-l', '-E', `['"]${slug}['"]`, ref, '--', 'apps/web/src', 'packages/*/src/*', ':(exclude)*.test.ts'], { cwd: root, maxBuffer: 16 * 1024 * 1024 }).catch((err: { code?: number; stdout?: string }) => (err.code === 1 ? { stdout: '' } : Promise.reject(err)));
	return stdout
		.split('\n')
		.filter(Boolean)
		.map((line) => line.slice(line.indexOf(':') + 1));
}
