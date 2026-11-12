import { defineConfig } from 'vitest/config';

// The tests cover pure modules (search params, head tags, the sitemap), so they run without the site's Vite plugins: no Worker runtime, no router generation, no share-card build.
export default defineConfig({
	test: { include: ['src/**/*.test.ts'] },
});
