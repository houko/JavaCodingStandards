import { createFileRoute } from '@tanstack/react-router';
import { feedXml } from '../lib/feed';

export const Route = createFileRoute('/feed.xml')({
	server: {
		handlers: {
			GET: () => new Response(feedXml(), { headers: { 'content-type': 'application/atom+xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } }),
		},
	},
});
