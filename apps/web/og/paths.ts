// Where the share images live on the site. The pages link to them (src/lib/seo.ts) and the Vite plugin writes them (plugin.ts), so both read the paths from here. Link previews keep an image by its URL long after the site's own caching has let go of it, so a change to what the cards show moves the games' cards to the next version (v2: names in Chinese, Japanese and Korean were drawn as boxes in v1).
// v2: the headline of the redesigned home page and no game count.
export const SITE_CARD_PATH = '/og-site-v2-1200x630.png';
export const OLD_SITE_CARD_PATHS = ['/og-site-1200x630.png'];
export const gameCardPath = (slug: string) => `/og/v2/${slug}.png`;
