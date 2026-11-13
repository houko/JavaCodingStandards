import { describe, expect, it } from 'vitest';
import { connectionIsSlow } from './motion';

describe('connectionIsSlow', () => {
	it('holds clips back to save data or on 3G and slower', () => {
		expect(connectionIsSlow({ saveData: true, effectiveType: '4g' })).toBe(true);
		for (const effectiveType of ['slow-2g', '2g', '3g']) expect(connectionIsSlow({ effectiveType }), effectiveType).toBe(true);
	});

	it('lets a fast connection, or a browser that reports none, play them', () => {
		expect(connectionIsSlow({ effectiveType: '4g' })).toBe(false);
		expect(connectionIsSlow({})).toBe(false);
		expect(connectionIsSlow(undefined)).toBe(false);
	});
});
