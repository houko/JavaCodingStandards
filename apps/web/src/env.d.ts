// The Worker's bindings, as wrangler.jsonc and `wrangler secret put` define them. Only what the site reads is declared, rather than generating the whole runtime's types.
declare module 'cloudflare:workers' {
	export const env: {
		// The GitHub App that opens pull requests for visitors without a GitHub account, installed on yldm-tech/awesome-nsgo. The key is the app's private key in PKCS#8 PEM.
		GITHUB_APP_ID?: string;
		GITHUB_APP_PRIVATE_KEY?: string;
		// Cloudflare Turnstile, which keeps scripts from submitting.
		TURNSTILE_SITE_KEY?: string;
		TURNSTILE_SECRET_KEY?: string;
		SUBMIT_LIMIT: { limit(options: { key: string }): Promise<{ success: boolean }> };
		// The form's screenshot check (/api/shot), which reads the repository from GitHub: at most 20 a minute from one visitor.
		SHOT_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> };
		// Likes (/api/likes): the D1 database and the salt that turns an IP into an anonymous voter id. Both are missing in pull request previews, which turns likes off there.
		DB?: import('./server/likes').D1Like;
		// Page views (/api/views, /api/metrics): the same D1 database stores anonymous daily counters.
		VIEW_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> };
		LIKE_SALT?: string;
		LIKE_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> };
		// Chrome's WebMCP origin-trial token for the production origin (developer.chrome.com/origintrials), which turns on document.modelContext for its visitors; it expires with the trial. Unset (as in previews and locally), the pages carry no token.
		WEBMCP_ORIGIN_TRIAL?: string;
	};
}
