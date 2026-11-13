// Rotates the week's picks in packages/catalog/data/meta.json by the rule in src/lib/picks-rotation.ts: the games whose posts gained the most likes since the last rotation. The weekly likes refresh runs it right after refreshing the counts (.github/workflows/likes.yml); run by hand, it changes nothing until a week has passed since the last rotation.
//
//     cd apps/web && node scripts/rotate-picks.ts

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { rotatePicks } from '../src/lib/picks-rotation.ts';

const DATA = join(import.meta.dirname, '../../../packages/catalog/data');
const META_FILE = join(DATA, 'meta.json');

const names = (await readdir(join(DATA, 'games'))).filter((f) => f.endsWith('.json'));
const games = await Promise.all(names.map(async (f) => JSON.parse(await readFile(join(DATA, 'games', f), 'utf8'))));
const meta = JSON.parse(await readFile(META_FILE, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const next = rotatePicks(games, meta, today);
if (next === meta) console.log(`picks kept: ${meta.picks.join(', ')} (last rotated ${meta.picked})`);
else {
	await writeFile(META_FILE, `${JSON.stringify({ ...meta, ...next }, null, '\t')}\n`);
	console.log(next.picks.join(',') === meta.picks.join(',') ? `picks kept, baseline recorded on ${today}` : `picks rotated: ${meta.picks.join(', ')} -> ${next.picks.join(', ')}`);
}
