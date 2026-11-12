// The Worker's entry: TanStack Start's default handler (createStartHandler with the streaming renderer), with two permanent redirects in front of it that the router cannot give. Static assets (public/ and the client bundle) are served before the Worker runs and never reach this.
import { SITE_URL } from '@awesome-nsgo/catalog';
import type { Register } from '@tanstack/react-router';
import { createServerEntry, createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';

const handler = createStartHandler(defaultStreamHandler);
const SITE = new URL(SITE_URL);

// The other custom domain of this Worker (wrangler.jsonc), www, which serves nothing of its own. Only it moves, so a Preview URL or localhost still serves the site.
const MOVED_HOSTS = new Set([`www.${SITE.hostname}`]);

export default createServerEntry<Register>({
	fetch(request, opts) {
		const url = new URL(request.url);
		// Every path on those domains moves to the same path on the site's domain, for good.
		if (MOVED_HOSTS.has(url.hostname)) return Response.redirect(`${SITE.origin}${url.pathname}${url.search}`, 301);
		// A path with a trailing slash goes to the one without it. The router does this too, but with a 307, which tells search engines the move is temporary; 308 is permanent and keeps the method, so a POST to /api/submit/ stays a POST.
		if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
			url.pathname = url.pathname.replace(/\/+$/, '') || '/';
			return Response.redirect(url.toString(), 308);
		}
		return handler(request, opts);
	},
});
