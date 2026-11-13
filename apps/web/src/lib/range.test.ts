import { describe, expect, it } from 'vitest';
import { parseRange } from './range';

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
