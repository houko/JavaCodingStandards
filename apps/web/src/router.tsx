import { createRouter, stringifySearchWith } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export function getRouter() {
	return createRouter({
		routeTree,
		defaultPreload: 'intent',
		scrollRestoration: true,
		// Search values are written as plain text. The default serializer JSON-quotes any string that would parse as JSON, so the slug '2048' became ?app=%222048%22 and the server's canonical-URL check redirected the sitemap URL ?app=2048 to that quoted form. Every search param of the site (lang, app) is a string; objects would still be JSON-encoded.
		stringifySearch: stringifySearchWith(JSON.stringify),
	});
}
