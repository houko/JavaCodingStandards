import { createFileRoute } from '@tanstack/react-router';
import { sitemapXml } from '../lib/sitemap';

export const Route = createFileRoute('/sitemap.xml')({
	server: {
		handlers: {
			GET: () => new Response(sitemapXml(), { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } }),
		},
	},
});
