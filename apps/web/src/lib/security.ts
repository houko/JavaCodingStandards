// The security headers of every response the Worker gives (src/server.ts). Static assets are served without the Worker and get the same ones from public/_headers, apart from the content security policy, which only means something on a page.

// What the site's pages load: everything from the site itself, nothing framed, no plugins. A script must be a file of the site or carry the response's nonce, which the Worker writes on every script element of the page it renders; the pages print no markup of anyone else's, so every script in them is the site's own. Styles allow inline ones because components set style attributes (a genre's colour, an animation's delay).
export function contentSecurityPolicy(nonce: string, https: boolean): string {
	return [
		"default-src 'self'",
		`script-src 'self' 'nonce-${nonce}'`,
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data:",
		"media-src 'self'",
		"font-src 'self'",
		"connect-src 'self'",
		"manifest-src 'self'",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
		// Over plain HTTP (local development) this would send every request to an https:// localhost that is not there.
		...(https ? ['upgrade-insecure-requests'] : []),
	].join('; ');
}

// The headers every response carries, page or not. HSTS is only sent over HTTPS, where browsers heed it; it covers this host alone, as the other hosts of the zone are not this site's to commit.
export function securityHeaders(https: boolean): Record<string, string> {
	return {
		'X-Content-Type-Options': 'nosniff',
		'Referrer-Policy': 'strict-origin-when-cross-origin',
		'X-Frame-Options': 'DENY',
		'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
		'Cross-Origin-Opener-Policy': 'same-origin',
		...(https ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}),
	};
}

// A random value for one response's script-src, as base64.
export function makeNonce(): string {
	return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
}
