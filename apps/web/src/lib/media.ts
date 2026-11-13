import { parseRange } from './range';

// The clips live in an R2 bucket (wrangler.jsonc, binding MEDIA) rather than in the repository: scripts/fetch-media.ts uploads them, and the Worker serves /videos/<path> from the object of the same key. Serving them here also gives byte ranges, which Safari needs to play a video.

export interface MediaBucket {
	head(key: string): Promise<{ size: number; httpEtag: string } | null>;
	get(key: string, options?: { range?: { offset: number; length: number } }): Promise<{ body: ReadableStream; size: number; httpEtag: string } | null>;
}

const HEADERS = {
	'Content-Type': 'video/mp4',
	'Accept-Ranges': 'bytes',
	// The same as the other files that keep their name when their content changes (public/_headers).
	'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
};

// The clip at the request's path: the whole file, the range asked for, 304 for a copy the browser already has, or undefined when there is no such clip (the site's 404 page answers then).
export async function serveMedia(request: Request, bucket: MediaBucket, key: string): Promise<Response | undefined> {
	const head = await bucket.head(key);
	if (!head) return undefined;
	const headers = new Headers({ ...HEADERS, ETag: head.httpEtag });
	if (request.headers.get('If-None-Match') === head.httpEtag) return new Response(null, { status: 304, headers });
	const range = parseRange(request.headers.get('Range'), head.size);
	if (range === 'unsatisfiable') {
		headers.set('Content-Range', `bytes */${head.size}`);
		return new Response(null, { status: 416, headers });
	}
	const length = range ? range.end - range.start + 1 : head.size;
	headers.set('Content-Length', String(length));
	if (range) headers.set('Content-Range', `bytes ${range.start}-${range.end}/${head.size}`);
	const status = range ? 206 : 200;
	if (request.method === 'HEAD') return new Response(null, { status, headers });
	const object = await bucket.get(key, range ? { range: { offset: range.start, length } } : undefined);
	if (!object) return undefined;
	return new Response(object.body, { status, headers });
}
