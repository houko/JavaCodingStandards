// Where the share images live on the site. The pages link to them (src/lib/seo.ts) and the Vite plugin writes them (plugin.ts), so both read the paths from here. Link previews keep an image by its URL long after the site's own caching has let go of it, so a change to the cards' look moves the games' cards to /og/v2/.
export const SITE_CARD_PATH = '/og-site-1200x630.png';
export const gameCardPath = (slug: string) => `/og/v1/${slug}.png`;
