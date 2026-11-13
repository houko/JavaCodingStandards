// The Worker's entry: TanStack Start's default handler (createStartHandler with the streaming renderer), with the redirects the router cannot give in front of it and the security headers on everything it returns (src/lib/security.ts). Static assets (public/ and the client bundle) are served before the Worker runs and never reach this, except the clips under /videos, which wrangler.jsonc routes here so that a part of one can be served (src/lib/range.ts).
import { SITE_URL, movedSlug } from '@vibe-arcade/catalog';
import type { Register } from '@tanstack/react-router';
import { createServerEntry, createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { gameCardPath } from '../og/paths';
import { withRange } from './lib/range';
import { contentSecurityPolicy, makeNonce, securityHeaders } from './lib/security';

const handler = createStartHandler(defaultStreamHandler);
const SITE = new URL(SITE_URL);

// The www twin of the site's host, which serves nothing of its own. Only it moves, so a Preview URL or localhost still serves the site.
const MOVED_HOSTS = new Set([`www.${SITE.hostname}`]);
// The hosts that are only ever served over HTTPS. Local development is plain HTTP and stays so.
const HTTPS_HOSTS = new Set([SITE.hostname, ...MOVED_HOSTS]);
const OLD_GAME = /^\/games\/([a-z0-9-]+)$/;
const OLD_CARD = /^\/og\/v1\/([a-z0-9-]+)\.png$/;

// The response with the security headers, and for a page the content security policy, with its nonce written on every script element. A handler's response can have immutable headers, so it is re-wrapped first.
function secured(response: Response, https: boolean): Response {
	const out = new Response(response.body, response);
	for (const [name, value] of Object.entries(securityHeaders(https))) out.headers.set(name, value);
	if (!out.headers.get('content-type')?.includes('text/html')) return out;
	const nonce = makeNonce();
	out.headers.set('Content-Security-Policy', contentSecurityPolicy(nonce, https));
	return new HTMLRewriter()
		.on('script', {
			element(script) {
				script.setAttribute('nonce', nonce);
			},
		})
		.transform(out);
}

export default createServerEntry<Register>({
	async fetch(request, opts) {
		const url = new URL(request.url);
		// The site's own hosts are HTTPS only; a plain HTTP request moves to the same address over HTTPS, for good.
		if (url.protocol === 'http:' && HTTPS_HOSTS.has(url.hostname)) {
			url.protocol = 'https:';
			return Response.redirect(url.toString(), 301);
		}
		const https = url.protocol === 'https:';
		// Every path on that host moves to the same path on the site's host, for good.
		if (MOVED_HOSTS.has(url.hostname)) return Response.redirect(`${SITE.origin}${url.pathname}${url.search}`, 301);
		// A path with a trailing slash goes to the one without it. The router does this too, but with a 307, which tells search engines the move is temporary; 308 is permanent.
		if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
			url.pathname = url.pathname.replace(/\/+$/, '') || '/';
			return Response.redirect(url.toString(), 308);
		}
		// A game that was renamed keeps its old page address, which moves to the new one for good (data/moved.json).
		const old = url.pathname.match(OLD_GAME)?.[1];
		const now = old === undefined ? undefined : movedSlug(old);
		if (now !== undefined) {
			url.pathname = `/games/${now}`;
			return Response.redirect(url.toString(), 301);
		}
		// A link preview made before the cards moved to /og/v2/ still asks for the old address; it gets the current card.
		const oldCard = url.pathname.match(OLD_CARD)?.[1];
		if (oldCard !== undefined) return Response.redirect(`${url.origin}${gameCardPath(oldCard)}`, 301);
		if (url.pathname.startsWith('/videos/')) {
			const asset = await env.ASSETS.fetch(request);
			// A clip that does not exist gets the site's own 404 page below.
			if (asset.status !== 404) return secured(await withRange(request, asset), https);
		}
		return secured(await handler(request, opts), https);
	},
});
