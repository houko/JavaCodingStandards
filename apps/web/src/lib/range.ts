// Byte ranges for the clips, which the Worker serves from R2 (src/lib/media.ts): Safari will not play a video from a server that answers a Range request with the whole file.

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
