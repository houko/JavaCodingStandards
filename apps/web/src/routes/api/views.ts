import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { cleanCountry, cleanPagePath, recordPageView } from '../../server/pageViews';

function json(body: unknown, status = 200): Response {
	return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

export const Route = createFileRoute('/api/views')({
	server: {
		handlers: {
			POST: async ({ request }) => {
				if (!env.DB) return new Response(null, { status: 204 });
				const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
				if (env.VIEW_LIMIT && !(await env.VIEW_LIMIT.limit({ key: ip })).success) return json({ error: 'limited' }, 429);
				const length = Number(request.headers.get('content-length') ?? 0);
				if (length > 512) return json({ error: 'invalid' }, 400);
				let body: unknown;
				try {
					const text = await request.text();
					if (text.length > 512) return json({ error: 'invalid' }, 400);
					body = JSON.parse(text);
				} catch {
					return json({ error: 'invalid' }, 400);
				}
				const path = cleanPagePath((body as { path?: unknown } | null)?.path);
				if (!path || path.startsWith('/api/')) return json({ error: 'invalid' }, 400);
				try {
					await recordPageView(env.DB, path, cleanCountry(request.headers.get('cf-ipcountry')));
					return new Response(null, { status: 204 });
				} catch (error) {
					console.error('recording page view failed', error);
					return json({ error: 'unavailable' }, 503);
				}
			},
		},
	},
});
