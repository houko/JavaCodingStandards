import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { findRepoShot } from '../../server/shots';
import { botConfig, installationToken } from '../../server/submit';

// GET ?repo=owner/name: whether the repository has a screenshot the submission workflow would take ({ found: true, url }), or not ({ found: false, reason: 'none' | 'no-repo' }), so the form asks for one only when it has none. Error codes: invalid, limited, disabled (no bot, as in pull request previews), github.

function json(body: unknown, status = 200): Response {
	return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

const REPO = /^[\w.-]{1,100}\/[\w.-]{1,100}$/;

export const Route = createFileRoute('/api/shot')({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const cfg = botConfig();
				if (!cfg) return json({ error: 'disabled' }, 503);
				const repo = new URL(request.url).searchParams.get('repo') ?? '';
				if (!REPO.test(repo)) return json({ error: 'invalid' }, 400);
				const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
				if (env.SHOT_LIMIT && !(await env.SHOT_LIMIT.limit({ key: ip })).success) return json({ error: 'limited' }, 429);
				try {
					return json(await findRepoShot(repo, await installationToken(cfg)));
				} catch (err) {
					console.error('looking for a screenshot failed', err);
					return json({ error: 'github' }, 502);
				}
			},
		},
	},
});
