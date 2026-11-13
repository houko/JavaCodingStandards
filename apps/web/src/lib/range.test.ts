import { describe, expect, it } from 'vitest';
import { parseRange, withRange } from './range';

describe('parseRange', () => {
	it('reads a closed, an open and a suffix range', () => {
		expect(parseRange('bytes=0-99', 1000)).toEqual({ start: 0, end: 99 });
		expect(parseRange('bytes=100-', 1000)).toEqual({ start: 100, end: 999 });
		expect(parseRange('bytes=-200', 1000)).toEqual({ start: 800, end: 999 });
		expect(parseRange('bytes=0-1', 1000)).toEqual({ start: 0, end: 1 });
	});

	it('cuts a range at the end of the file', () => {
		expect(parseRange('bytes=900-5000', 1000)).toEqual({ start: 900, end: 999 });
		expect(parseRange('bytes=-5000', 1000)).toEqual({ start: 0, end: 999 });
	});

	it('gives the whole file for no header or one it does not serve in parts', () => {
		for (const header of [null, '', 'bytes=', 'bytes=-', 'items=0-5', 'bytes=0-5,10-15', 'bytes=a-b', 'bytes=10-5']) expect(parseRange(header, 1000), String(header)).toBeUndefined();
	});

	it('refuses a range that starts past the end, or of no bytes', () => {
		expect(parseRange('bytes=1000-', 1000)).toBe('unsatisfiable');
		expect(parseRange('bytes=5000-6000', 1000)).toBe('unsatisfiable');
		expect(parseRange('bytes=-0', 1000)).toBe('unsatisfiable');
	});
});

describe('withRange', () => {
	const bytes = Uint8Array.from({ length: 10 }, (_, i) => i);
	const asset = () => new Response(bytes, { headers: { 'Content-Type': 'video/mp4', ETag: '"clip"' } });
	const get = (range?: string) => new Request('https://site.example/videos/kit.mp4', { headers: range ? { Range: range } : {} });

	it('answers a range with 206 and just those bytes', async () => {
		const res = await withRange(get('bytes=2-5'), asset());
		expect(res.status).toBe(206);
		expect(res.headers.get('Content-Range')).toBe('bytes 2-5/10');
		expect(res.headers.get('Content-Length')).toBe('4');
		expect(res.headers.get('Content-Type')).toBe('video/mp4');
		expect(res.headers.get('ETag')).toBe('"clip"');
		expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([2, 3, 4, 5]);
	});

	it('answers no range with the whole file and says ranges are accepted', async () => {
		const res = await withRange(get(), asset());
		expect(res.status).toBe(200);
		expect(res.headers.get('Accept-Ranges')).toBe('bytes');
		expect((await res.arrayBuffer()).byteLength).toBe(10);
	});

	it('answers a range past the end with 416 and the size', async () => {
		const res = await withRange(get('bytes=10-'), asset());
		expect(res.status).toBe(416);
		expect(res.headers.get('Content-Range')).toBe('bytes */10');
	});

	it('passes on what is not a found file', async () => {
		const res = await withRange(get('bytes=0-1'), new Response('nope', { status: 404 }));
		expect(res.status).toBe(404);
	});
});
