// Byte ranges for the clips. Cloudflare's static assets answer a Range request with the whole file, and Safari will not play a video from a server that does, so the Worker serves /videos itself and cuts the range out (src/server.ts).

export interface ByteRange {
	// Both inclusive.
	start: number;
	end: number;
}

// The range a Range header asks for of a file of `size` bytes: undefined for no header or one this does not serve in parts (another unit, several ranges, a malformed value), which gets the whole file as the standard allows, and 'unsatisfiable' for a range that starts past the end.
export function parseRange(header: string | null, size: number): ByteRange | 'unsatisfiable' | undefined {
	const match = header?.match(/^bytes=(\d*)-(\d*)$/);
	if (!match || (match[1] === '' && match[2] === '')) return undefined;
	// "-500" is the last 500 bytes.
	if (match[1] === '') {
		const length = Number(match[2]);
		return length === 0 ? 'unsatisfiable' : { start: Math.max(0, size - length), end: size - 1 };
	}
	const start = Number(match[1]);
	const end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
	if (start >= size) return 'unsatisfiable';
	return end < start ? undefined : { start, end };
}

// The asset's response narrowed to what the request's Range header asks for.
export async function withRange(request: Request, asset: Response): Promise<Response> {
	const headers = new Headers(asset.headers);
	headers.set('Accept-Ranges', 'bytes');
	if (asset.status !== 200 || request.method !== 'GET') return new Response(asset.body, { status: asset.status, headers });
	const body = await asset.arrayBuffer();
	const range = parseRange(request.headers.get('Range'), body.byteLength);
	if (range === undefined) return new Response(body, { status: 200, headers });
	if (range === 'unsatisfiable') {
		headers.set('Content-Range', `bytes */${body.byteLength}`);
		headers.delete('Content-Length');
		return new Response(null, { status: 416, headers });
	}
	headers.set('Content-Range', `bytes ${range.start}-${range.end}/${body.byteLength}`);
	headers.set('Content-Length', String(range.end - range.start + 1));
	return new Response(body.slice(range.start, range.end + 1), { status: 206, headers });
}
