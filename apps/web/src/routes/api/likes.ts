import { LIKE_KEYS } from '@awesome-nsgo/catalog';
import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { cachedLikeCounts, likedBy, setLike, voterId } from '../../server/likes';

// GET: every entry's like count and the entries this visitor has liked. POST {item, liked}: likes or unlikes one entry, answering its new count. Likes are off (GET says so, POST answers 503) where the database or the salt is missing, as in pull request previews.

function json(body: unknown, status = 200): Response {
	return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

async function voter(request: Request): Promise<string | undefined> {
	if (!env.DB || !env.LIKE_SALT) return undefined;
	return voterId(env.LIKE_SALT, request.headers.get('cf-connecting-ip') ?? 'unknown');
}

export const Route = createFileRoute('/api/likes')({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const who = await voter(request);
				if (!who || !env.DB) return json({ enabled: false });
				const [counts, mine] = await Promise.all([cachedLikeCounts(env.DB, request), likedBy(env.DB, who)]);
				return json({ enabled: true, counts, mine });
			},
			POST: async ({ request }) => {
				const who = await voter(request);
				if (!who || !env.DB) return json({ error: 'disabled' }, 503);
				if (env.LIKE_LIMIT && !(await env.LIKE_LIMIT.limit({ key: who })).success) return json({ error: 'limited' }, 429);
				let body: unknown;
				try {
					const text = await request.text();
					if (text.length > 1024) return json({ error: 'invalid' }, 400);
					body = JSON.parse(text);
				} catch {
					return json({ error: 'invalid' }, 400);
				}
				const { item, liked } = (body ?? {}) as { item?: unknown; liked?: unknown };
				if (typeof item !== 'string' || !LIKE_KEYS.has(item) || typeof liked !== 'boolean') return json({ error: 'invalid' }, 400);
				const count = await setLike(env.DB, item, who, liked, Date.now());
				return json({ item, liked, count });
			},
		},
	},
});
