import { readdir } from 'node:fs/promises';

// The names in a directory of the catalog's data or the site's public files, or none when the directory does not exist: git keeps no empty directory, so a kind whose last entry was removed has none until its next entry is added.
export async function listDir(dir: string): Promise<string[]> {
	try {
		return await readdir(dir);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
		throw err;
	}
}
