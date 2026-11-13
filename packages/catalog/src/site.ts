// The site's own names and links. SITE_URL is the single source of truth for the host: everything that needs an absolute URL (canonical links, the sitemap, Open Graph tags) builds it from here.
export const SITE_NAME = 'Vibe Arcade';
export const SITE_URL = 'https://vibe.wiz.games';
// The repository the site is built from, where submissions arrive.
export const SITE_REPO = 'yldm-tech/awesome-vibe-games';
export const REPO_URL = `https://github.com/${SITE_REPO}`;
// The issue form a visitor fills in to submit a game.
export const SUBMIT_URL = `${REPO_URL}/issues/new?template=submit-game.yml`;
// The curator, whom creators tag on X to get a game listed.
export const CURATOR_HANDLE = 'suzukaze_haduki';
export const CURATOR_URL = `https://x.com/${CURATOR_HANDLE}`;
export const MAKER_NAME = 'Wiz Games';
export const MAKER_URL = 'https://wiz.games';
// The site token of Cloudflare Web Analytics for this host (dashboard: Web Analytics, the site's JS snippet), which is public by design: it only lets a browser report a page view. Empty, no analytics script is loaded. The service sets no cookies and keeps no personal data.
export const ANALYTICS_TOKEN = '';
