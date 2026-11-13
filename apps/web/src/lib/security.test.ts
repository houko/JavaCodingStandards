import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, makeNonce, securityHeaders } from './security';

describe('the content security policy', () => {
	it('allows the site and the nonce for scripts, and frames nothing', () => {
		const csp = contentSecurityPolicy('abc', true);
		expect(csp).toContain("script-src 'self' 'nonce-abc'");
		expect(csp).toContain("frame-ancestors 'none'");
		expect(csp).toContain("object-src 'none'");
		expect(csp).not.toContain("'unsafe-inline' 'nonce");
		expect(csp).not.toMatch(/script-src[^;]*unsafe/);
	});

	it('upgrades insecure requests only over HTTPS', () => {
		expect(contentSecurityPolicy('abc', true)).toContain('upgrade-insecure-requests');
		expect(contentSecurityPolicy('abc', false)).not.toContain('upgrade-insecure-requests');
	});
});

describe('the security headers', () => {
	it('send HSTS only over HTTPS', () => {
		expect(securityHeaders(true)['Strict-Transport-Security']).toBe('max-age=31536000');
		expect(securityHeaders(false)['Strict-Transport-Security']).toBeUndefined();
		expect(securityHeaders(false)['X-Frame-Options']).toBe('DENY');
	});
});

describe('makeNonce', () => {
	it('is base64 of 16 random bytes, new every time', () => {
		const a = makeNonce();
		expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
		expect(makeNonce()).not.toBe(a);
	});
});
