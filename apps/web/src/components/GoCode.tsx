import type { ReactNode } from 'react';

// Colours Go source in the state page's code panel, with no dependency: one flat pattern (no nested quantifiers) for strings, comments, keywords, numbers and called names; everything else stays plain text. It only ever runs on the page's own static snippets (STATE_BLOCKS in lib/page-search.ts).
const TOKEN = /("(?:[^"\\\n]|\\.)*"|\/\/[^\n]*|\b(?:func|return|var|const|type|struct|if|else|for|range|package|import|go|defer|map|chan|nil|true|false)\b|\b\d+\b|\b[A-Za-z_]\w*(?=\())/g;

const CONSTANTS = new Set(['nil', 'true', 'false']);

// The colour of one matched token: its first character tells a string, a comment or a number apart; a word is a keyword, a constant or, as the pattern only matches other words before a parenthesis, a called name.
function tokenClass(tok: string): string {
	if (tok.startsWith('"')) return 'text-code-str';
	if (tok.startsWith('//')) return 'text-code-cmt italic';
	if (/^\d/.test(tok) || CONSTANTS.has(tok)) return 'text-code-const';
	if (/^(?:func|return|var|const|type|struct|if|else|for|range|package|import|go|defer|map|chan)$/.test(tok)) return 'text-code-kw';
	return 'text-code-fn';
}

export function GoCode({ code }: { code: string }) {
	const out: ReactNode[] = [];
	let at = 0;
	for (const m of code.matchAll(TOKEN)) {
		const i = m.index;
		if (i > at) out.push(code.slice(at, i));
		out.push(
			<span key={i} className={tokenClass(m[0])}>
				{m[0]}
			</span>,
		);
		at = i + m[0].length;
	}
	if (at < code.length) out.push(code.slice(at));
	return <>{out}</>;
}
