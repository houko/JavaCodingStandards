// Builds each app's share card (card.ts) into the client output at appCardPath (/og/v3/<slug>.png), from the catalog of the same build, so an app the submission bot adds gets its card on the deploy that adds it, the site's own card as /og-site-v2-1200x630.png (the default share image, src/lib/seo.ts) and the README badge (badge.ts) as /badge.svg. `vite dev` renders them on request instead.
import { join } from 'node:path';
import { APPS, appBySlug } from '@awesome-nsgo/catalog';
import type { Plugin } from 'vite';
import { appCardPath } from '../src/lib/seo';
import { renderBadge } from './badge';
import { renderCard, renderSiteCard } from './card';

// The site card's file, also its URL path. Its name changes with the card's look (og-image-1200x630.png, og-site-1200x630.png, now og-site-v2-1200x630.png) so the year-long cache in public/_headers does not keep an old image.
const SITE_CARD = 'og-site-v2-1200x630.png';

// How many share cards a build renders at a time. satori lays a card out synchronously, and with every card at once the event loop stayed busy for seconds at a stretch, so a request to the ai-logo CDN or Google Fonts made meanwhile took 8 seconds instead of 0.1 and on CI ran out of time to connect, failing the build as "fetch failed, three times".
const RENDER_AT_ONCE = 4;

export function ogCards(): Plugin {
	let paths = { publicDir: '', fontDir: '' };
	return {
		name: 'awesome-nsgo:og-cards',
		configResolved(config) {
			paths = { publicDir: config.publicDir, fontDir: join(config.root, 'og/fonts') };
		},
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (req.url?.split('?')[0] === '/badge.svg') {
					renderBadge(paths).then((svg) => {
						res.setHeader('Content-Type', 'image/svg+xml');
						res.setHeader('Cache-Control', 'no-store');
						res.end(svg);
					}, next);
					return;
				}
				if (req.url?.split('?')[0] === `/${SITE_CARD}`) {
					renderSiteCard(paths).then((png) => {
						res.setHeader('Content-Type', 'image/png');
						res.setHeader('Cache-Control', 'no-store');
						res.end(png);
					}, next);
					return;
				}
				const slug = req.url?.match(/^\/og\/v3\/([a-z0-9-]+)\.png(?:\?|$)/)?.[1];
				const app = slug ? appBySlug(slug) : undefined;
				if (!app) return next();
				renderCard(app, paths).then((png) => {
					res.setHeader('Content-Type', 'image/png');
					res.setHeader('Cache-Control', 'no-store');
					res.end(png);
				}, next);
			});
		},
		async generateBundle() {
			// The client environment's output is what Workers serves as static assets.
			if (this.environment.name !== 'client') return;
			let next = 0;
			await Promise.all(
				Array.from({ length: RENDER_AT_ONCE }, async () => {
					while (next < APPS.length) {
						const app = APPS[next++];
						this.emitFile({ type: 'asset', fileName: appCardPath(app.slug).slice(1), source: await renderCard(app, paths) });
					}
				}),
			);
			this.emitFile({ type: 'asset', fileName: SITE_CARD, source: await renderSiteCard(paths) });
			this.emitFile({ type: 'asset', fileName: 'badge.svg', source: await renderBadge(paths) });
		},
	};
}
