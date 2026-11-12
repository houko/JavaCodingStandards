import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';
import { pageViewMetrics } from '../../server/pageViews';

function json(body: unknown, status = 200): Response {
	return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

export const Route = createFileRoute('/api/metrics')({
	server: {
		handlers: {
			GET: async ({ request }) => {
				if (!env.DB) return json({ enabled: false, reason: 'not_configured' });
				const requested = Number(new URL(request.url).searchParams.get('days'));
				try {
					return json({ enabled: true, ...await pageViewMetrics(env.DB, requested) });
				} catch (error) {
					console.error('reading page view metrics failed', error);
					return json({ enabled: false, reason: 'unavailable' }, 503);
				}
			},
		},
	},
});
