import { createRouter, parseSearchWith, stringifySearchWith } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export function getRouter() {
	return createRouter({
		routeTree,
		defaultPreload: 'intent',
		scrollRestoration: true,
		// Every search param of the site (lang, q, sort, model, genre, game) is plain text, so values are neither JSON-parsed nor JSON-quoted. The default pair treats any value that parses as JSON as JSON: a search for "[1]" would come back as an array, and a slug like '2048' would be written as ?game=%222048%22, which the server's canonical-URL check would then redirect ?game=2048 to. The query decoder still turns bare numbers and true/false into those types; lib/search.ts reads them back as text.
		parseSearch: parseSearchWith((value) => value),
		stringifySearch: stringifySearchWith(JSON.stringify),
	});
}
