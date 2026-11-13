// The Worker's bindings, as wrangler.jsonc defines them: only the static assets, so the module is declared here rather than generating the whole runtime's types.
declare module 'cloudflare:workers' {
	export const env: { ASSETS: { fetch(request: Request): Promise<Response> } };
}

// Cloudflare's streaming HTML rewriter, a global of the Workers runtime; only what src/server.ts uses.
declare class HTMLRewriter {
	on(selector: string, handlers: { element(element: { setAttribute(name: string, value: string): void }): void }): HTMLRewriter;
	transform(response: Response): Response;
}
