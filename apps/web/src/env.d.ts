// The Worker's bindings, as wrangler.jsonc defines them: only the static assets, so the module is declared here rather than generating the whole runtime's types.
declare module 'cloudflare:workers' {
	export const env: { ASSETS: { fetch(request: Request): Promise<Response> } };
}
