import { LANGS, type Text, isLangCode } from './lang';

// The catalog JSON comes from contributors, so every entry is checked as it loads: a mistake fails the build and the tests with the file, the entry and the field, rather than rendering a broken card. data/schema/ describes the same shape for editors.

export class CatalogError extends Error {}

type Raw = Record<string, unknown>;
const LINE_BREAK = /[\r\n\u2028\u2029]/;
const INVISIBLE_WRAP = /[\u200b\u2060\ufeff]/;

export class Reader {
	// file names where the entry comes from: its data file. path and entry are set by obj() for the reader of a nested object: the dotted path to it and the entry's name, both of which its mistakes are reported with.
	constructor(
		readonly file: string,
		readonly raw: Raw,
		private readonly path = '',
		private readonly entry = typeof raw.name === 'string' ? ` (${raw.name})` : '',
	) {}

	fail(field: string, why: string): never {
		throw new CatalogError(`${this.file}${this.entry}: ${this.path}${field} ${why}`);
	}

	// A reader of the object in field, whose mistakes are reported as field.<its field>.
	obj(field: string): Reader {
		const v = this.raw[field];
		if (!v || typeof v !== 'object' || Array.isArray(v)) this.fail(field, 'must be an object');
		return new Reader(this.file, v as Raw, `${this.path}${field}.`, this.entry);
	}

	optObj(field: string): Reader | undefined {
		return this.raw[field] === undefined ? undefined : this.obj(field);
	}

	str(field: string): string {
		const v = this.raw[field];
		if (typeof v !== 'string' || !v.trim()) this.fail(field, 'must be a non-empty string');
		if (v !== v.trim()) this.fail(field, 'must not start or end with a space');
		if (LINE_BREAK.test(v)) this.fail(field, 'must be a single line');
		if (INVISIBLE_WRAP.test(v)) this.fail(field, 'must not contain invisible wrap controls');
		return v;
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

	// A whole number of at least min, as JSON writes it (not a string of digits).
	int(field: string, min = 0): number {
		const v = this.raw[field];
		if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < min) this.fail(field, `must be a whole number of at least ${min}`);
		return v;
	}

	text(field: string): Text {
		const v = this.raw[field];
		if (!v || typeof v !== 'object' || Array.isArray(v)) this.fail(field, 'must be an object of texts by language, e.g. { "en": "…", "ja": "…" }');
		for (const [lang, s] of Object.entries(v as Raw)) {
			if (!isLangCode(lang)) this.fail(`${field}.${lang}`, `is not a site language (${LANGS.join(', ')})`);
			if (typeof s !== 'string' || !s.trim()) this.fail(`${field}.${lang}`, 'must be a non-empty string');
			if (s !== s.trim()) this.fail(`${field}.${lang}`, 'must not start or end with a space');
			if (LINE_BREAK.test(s)) this.fail(`${field}.${lang}`, 'must be a single line');
			if (INVISIBLE_WRAP.test(s)) this.fail(`${field}.${lang}`, 'must not contain invisible wrap controls');
		}
		for (const lang of LANGS) if (!(lang in v)) this.fail(`${field}.${lang}`, 'is required: the text is written in every site language');
		return v as Text;
	}

	optText(field: string): Text | undefined {
		return this.raw[field] === undefined ? undefined : this.text(field);
	}

	only(fields: readonly string[]): void {
		for (const k of Object.keys(this.raw)) if (!fields.includes(k)) this.fail(k, `is not a known field (${fields.join(', ')})`);
	}
}

// Fails on two entries of a directory with the same value of `field`.
export function unique<T>(dir: string, items: readonly T[], field: string, value: (t: T) => string): void {
	const seen = new Set<string>();
	for (const it of items) {
		const v = value(it);
		if (seen.has(v)) throw new CatalogError(`${dir}/: two entries have ${field} "${v}"`);
		seen.add(v);
	}
}
