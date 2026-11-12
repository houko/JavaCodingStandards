import { LANGS, type Text } from './lang';

// The catalog JSON comes from contributors, so every entry is checked as it loads: a mistake fails the build and the tests with the file, the entry and the field, rather than rendering a broken card. data/schema/ describes the same shapes for editors.

export class CatalogError extends Error {}

type Raw = Record<string, unknown>;
const LINE_BREAK = /[\r\n\u2028\u2029]/;
const INVISIBLE_WRAP = /[\u200b\u2060\ufeff]/;

export class Reader {
	// file names where the entry comes from: its data file, or `entry` for one not filed yet.
	constructor(
		readonly file: string,
		readonly raw: Raw,
	) {}

	fail(field: string, why: string): never {
		const name = typeof this.raw.name === 'string' ? ` (${this.raw.name})` : typeof this.raw.title === 'string' ? ` (${this.raw.title})` : '';
		throw new CatalogError(`${this.file}${name}: ${field} ${why}`);
	}

	str(field: string): string {
		const v = this.raw[field];
		if (typeof v !== 'string' || !v.trim()) this.fail(field, 'must be a non-empty string');
		if (LINE_BREAK.test(v)) this.fail(field, 'must be a single line');
		if (INVISIBLE_WRAP.test(v)) this.fail(field, 'must not contain invisible wrap controls');
		return v;
	}

	optStr(field: string): string | undefined {
		return this.raw[field] === undefined ? undefined : this.str(field);
	}

	match(field: string, pattern: RegExp, what: string): string {
		const v = this.str(field);
		if (!pattern.test(v)) this.fail(field, `must be ${what}, got "${v}"`);
		return v;
	}

	url(field: string): string {
		return this.match(field, /^https:\/\/\S+$/, 'an https link');
	}

	optUrl(field: string): string | undefined {
		return this.raw[field] === undefined ? undefined : this.url(field);
	}

	oneOf<T extends string>(field: string, values: readonly T[]): T {
		const v = this.str(field);
		if (!values.includes(v as T)) this.fail(field, `must be one of ${values.join(', ')}, got "${v}"`);
		return v as T;
	}

	bool(field: string): boolean {
		const v = this.raw[field];
		if (typeof v !== 'boolean') this.fail(field, 'must be true or false');
		return v;
	}

	strings(field: string, min = 0): string[] {
		const v = this.raw[field];
		if (!Array.isArray(v) || v.length < min || v.some((x) => typeof x !== 'string' || !x.trim())) this.fail(field, min ? `must be a list of at least ${min} non-empty strings` : 'must be a list of non-empty strings');
		if (v.some((x) => LINE_BREAK.test(x as string))) this.fail(field, 'must be a list of single-line strings');
		if (v.some((x) => INVISIBLE_WRAP.test(x as string))) this.fail(field, 'must not contain invisible wrap controls');
		return v as string[];
	}

	text(field: string): Text {
		const v = this.raw[field];
		if (!v || typeof v !== 'object' || Array.isArray(v)) this.fail(field, 'must be an object of texts by language, e.g. { "en": "…" }');
		const entries = Object.entries(v as Raw);
		for (const [lang, s] of entries) {
			if (!LANGS.some((l) => l.code === lang)) this.fail(`${field}.${lang}`, `is not a site language (${LANGS.map((l) => l.code).join(', ')})`);
			if (typeof s !== 'string' || !s.trim()) this.fail(`${field}.${lang}`, 'must be a non-empty string');
			if (LINE_BREAK.test(s)) this.fail(`${field}.${lang}`, 'must be a single line');
			if (INVISIBLE_WRAP.test(s)) this.fail(`${field}.${lang}`, 'must not contain invisible wrap controls');
		}
		if (!(v as Raw).en) this.fail(`${field}.en`, 'is required: English is the fallback for every other language');
		return v as Text;
	}

	only(fields: readonly string[]): void {
		for (const k of Object.keys(this.raw)) if (!fields.includes(k)) this.fail(k, `is not a known field (${fields.join(', ')})`);
	}
}

// Fails on two entries of a category's directory with the same value of `field`.
export function unique<T>(dir: string, items: readonly T[], field: string, value: (t: T) => string): void {
	const seen = new Set<string>();
	for (const it of items) {
		const v = value(it);
		if (seen.has(v)) throw new CatalogError(`${dir}/: two entries have ${field} "${v}"`);
		seen.add(v);
	}
}
