import { describe, expect, it } from 'vitest';
import { type MediaBucket, serveMedia } from './media';

const BYTES = Uint8Array.from({ length: 10 }, (_, i) => i);
const ETAG = '"clip"';

// An R2 bucket holding one ten-byte clip, recording what it was asked for.
function bucket() {
	const gets: unknown[] = [];
	const media: MediaBucket = {
		head: async (key) => (key === 'videos/kit.mp4' ? { size: BYTES.length, httpEtag: ETAG } : null),
		get: async (key, options) => {
			gets.push(options);
			if (key !== 'videos/kit.mp4') return null;
			const part = options?.range ? BYTES.slice(options.range.offset, options.range.offset + options.range.length) : BYTES;
			return { body: new Response(part).body as ReadableStream, size: BYTES.length, httpEtag: ETAG };
		},
	};
	return { media, gets };
}
const request = (headers: Record<string, string> = {}, method = 'GET') => new Request('https://site.example/videos/kit.mp4', { method, headers });

describe('serveMedia', () => {
	it('answers a range with 206, just those bytes, and reads only them', async () => {
		const { media, gets } = bucket();
		const res = (await serveMedia(request({ Range: 'bytes=2-5' }), media, 'videos/kit.mp4'))!;
		expect(res.status).toBe(206);
		expect(res.headers.get('Content-Range')).toBe('bytes 2-5/10');
		expect(res.headers.get('Content-Length')).toBe('4');
		expect(res.headers.get('Content-Type')).toBe('video/mp4');
		expect(res.headers.get('ETag')).toBe(ETAG);
		expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([2, 3, 4, 5]);
		expect(gets).toEqual([{ range: { offset: 2, length: 4 } }]);
	});

	it('answers no range with the whole clip, cacheable, ranges accepted', async () => {
		const res = (await serveMedia(request(), bucket().media, 'videos/kit.mp4'))!;
		expect(res.status).toBe(200);
		expect(res.headers.get('Accept-Ranges')).toBe('bytes');
		expect(res.headers.get('Cache-Control')).toContain('max-age=86400');
		expect((await res.arrayBuffer()).byteLength).toBe(10);
	});

	it('answers 304 for a copy the browser has, 416 past the end, and HEAD without reading the clip', async () => {
		expect((await serveMedia(request({ 'If-None-Match': ETAG }), bucket().media, 'videos/kit.mp4'))!.status).toBe(304);
		const past = (await serveMedia(request({ Range: 'bytes=10-' }), bucket().media, 'videos/kit.mp4'))!;
		expect(past.status).toBe(416);
		expect(past.headers.get('Content-Range')).toBe('bytes */10');
		const { media, gets } = bucket();
		const head = (await serveMedia(request({}, 'HEAD'), media, 'videos/kit.mp4'))!;
		expect(head.status).toBe(200);
		expect(head.headers.get('Content-Length')).toBe('10');
		expect(gets).toEqual([]);
	});

	it('leaves a clip that does not exist to the 404 page', async () => {
		expect(await serveMedia(request(), bucket().media, 'videos/nope.mp4')).toBeUndefined();
	});
});
