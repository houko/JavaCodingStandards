import { rawUrl } from './source.ts';
// GitHub's REST API and raw files, as the enrich and discover scripts read and write them, with GITHUB_TOKEN when it is set.

const env = process.env;

// A request, tried again twice when the connection drops or GitHub answers 5xx: across the hundreds of requests the discover script makes, one usually does.
async function request(url: string, init: RequestInit): Promise<Response> {
	for (let attempt = 0; ; attempt++) {
		try {
			const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
			if (res.status < 500 || attempt === 2) return res;
		} catch (err) {
			if (attempt === 2) throw err;
		}
		await new Promise((r) => setTimeout(r, 1_000 * 3 ** attempt));
	}
}

// The JSON a request answers, or undefined for a 404. Any other failure throws, naming the request and GitHub's message.
export async function github<T>(path: string, init: { method?: string; body?: unknown; token?: string } = {}): Promise<T | undefined> {
	const token = init.token ?? env.GITHUB_TOKEN;
	const res = await request(`https://api.github.com${path}`, {
		method: init.method ?? 'GET',
		headers: {
			accept: 'application/vnd.github+json',
			'x-github-api-version': '2022-11-28',
			...(token ? { authorization: `Bearer ${token}` } : {}),
			...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
		},
		body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
	});
	if (res.status === 404) return undefined;
	if (!res.ok) throw new Error(`GitHub ${init.method ?? 'GET'} ${path}: ${res.status} ${(await res.text()).slice(0, 300)}`);
	return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export { rawUrl };

export async function rawFile(repo: string, branch: string, path: string): Promise<string | undefined> {
	const res = await request(rawUrl(repo, branch, path), {});
	return res.ok ? res.text() : undefined;
}
