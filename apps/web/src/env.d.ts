// The Worker's bindings, as wrangler.jsonc defines them: the site has none, so the module is declared with an empty env rather than generating the whole runtime's types.
declare module 'cloudflare:workers' {
	export const env: Record<string, never>;
}
