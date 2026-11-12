// Vite's import.meta.glob, as catalog.ts uses it to load data/apps/. The site's build and the tests both run on Vite; this package does not depend on Vite's types, so the one form used is declared here.
interface ImportMeta {
	glob<T>(pattern: string, options: { eager: true; import: 'default' }): Record<string, T>;
}
