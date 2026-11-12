import { readFileSync } from 'node:fs';
import { SITE_URL } from '@vibe-arcade/catalog';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

// SITE_URL is the one place the host is decided. These two files cannot import it, so they repeat it as text and this test fails when they fall behind.
describe('files that repeat the site host', () => {
	it('robots.txt points at the sitemap on SITE_URL', () => {
		expect(read('../../public/robots.txt')).toContain(`Sitemap: ${SITE_URL}/sitemap.xml\n`);
	});

	it('the root package.json homepage is SITE_URL', () => {
		expect(JSON.parse(read('../../../../package.json')).homepage).toBe(SITE_URL);
	});
});
