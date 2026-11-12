import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listDir } from './files.ts';

describe('data directories', () => {
	it('lists a directory, and none for one git dropped when it emptied', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'enrich-files-test-'));
		try {
			await writeFile(join(dir, 'a.json'), '{}');
			expect(await listDir(dir)).toEqual(['a.json']);
			expect(await listDir(join(dir, 'gone'))).toEqual([]);
			// A file where a directory should be is still an error.
			await expect(listDir(join(dir, 'a.json'))).rejects.toThrow();
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
