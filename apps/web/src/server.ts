// The Worker's entry: TanStack Start's default handler (createStartHandler with the streaming renderer), with two permanent redirects in front of it that the router cannot give, and two security headers on the pages it renders. Static assets (public/ and the client bundle) are served before the Worker runs and never reach this.
import { SITE_URL } from '@vibe-arcade/catalog';
import type { Register } from '@tanstack/react-router';
import { createServerEntry, createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';

const handler = createStartHandler(defaultStreamHandler);
const SITE = new URL(SITE_URL);

// The www twin of the site's host, which serves nothing of its own. Only it moves, so a Preview URL or localhost still serves the site.
const MOVED_HOSTS = new Set([`www.${SITE.hostname}`]);

export default createServerEntry<Register>({
	async fetch(request, opts) {
		const url = new URL(request.url);
		// Every path on that host moves to the same path on the site's host, for good.
		if (MOVED_HOSTS.has(url.hostname)) return Response.redirect(`${SITE.origin}${url.pathname}${url.search}`, 301);
		// A path with a trailing slash goes to the one without it. The router does this too, but with a 307, which tells search engines the move is temporary; 308 is permanent.
		if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
			url.pathname = url.pathname.replace(/\/+$/, '') || '/';
			return Response.redirect(url.toString(), 308);
		}
		const response = await handler(request, opts);
		if (!response.headers.get('content-type')?.includes('text/html')) return response;
		// A handler's response can have immutable headers, so the page is re-wrapped to add its own.
		const page = new Response(response.body, response);
		page.headers.set('X-Content-Type-Options', 'nosniff');
		page.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
		return page;
	},
});
