// Builds each game's share card (card.ts) into the client output, from the catalog of the same build, so a game gets its card on the deploy that adds it, and the site's own card, the share image of every other page. `vite dev` renders them on request instead. The paths are in paths.ts, shared with the pages that link to them.
import { join } from 'node:path';
import { GAMES } from '@vibe-arcade/catalog';
import type { Plugin } from 'vite';
import { type Paths, renderCard, renderSiteCard } from './card';
import { SITE_CARD_PATH, gameCardPath } from './paths';

// How many share cards a build renders at a time. satori lays a card out synchronously, and with every card at once the event loop stays busy for seconds at a stretch.
const RENDER_AT_ONCE = 4;

export function ogCards(): Plugin {
	let paths: Paths = { publicDir: '', fontDir: '' };
	return {
		name: 'vibe-arcade:og-cards',
		configResolved(config) {
			paths = { publicDir: config.publicDir, fontDir: join(config.root, 'og/fonts') };
		},
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				const path = req.url?.split('?')[0] ?? '';
				const game = GAMES.find((g) => gameCardPath(g.slug) === path);
				if (!game && path !== SITE_CARD_PATH) return next();
				(game ? renderCard(game, paths) : renderSiteCard(paths)).then((png) => {
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
					while (next < GAMES.length) {
						const game = GAMES[next++];
						this.emitFile({ type: 'asset', fileName: gameCardPath(game.slug).slice(1), source: await renderCard(game, paths) });
					}
				}),
			);
			this.emitFile({ type: 'asset', fileName: SITE_CARD_PATH.slice(1), source: await renderSiteCard(paths) });
		},
	};
}
