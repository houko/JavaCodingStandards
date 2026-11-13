// Prints, as a markdown table, the packages whose version changed between two `pnpm list -r --depth 0 --json` files, for the dependency update's pull request (.github/workflows/deps.yml).
//
//     node .github/scripts/deps-diff.mjs before.json after.json
import { readFileSync } from 'node:fs';

const flat = (file) =>
	Object.fromEntries(
		JSON.parse(readFileSync(file, 'utf8')).flatMap((pkg) => Object.entries({ ...pkg.dependencies, ...pkg.devDependencies }).map(([name, info]) => [`${name} (${pkg.name})`, info.version])),
	);
const before = flat(process.argv[2]);
const after = flat(process.argv[3]);
const rows = Object.keys(after)
	.filter((key) => before[key] !== after[key])
	.sort()
	.map((key) => `| ${key} | ${before[key] ?? 'new'} | ${after[key]} |`);
console.log(rows.length ? ['| Package | From | To |', '| --- | --- | --- |', ...rows].join('\n') : 'Only indirect dependencies changed.');
