import type { Translations } from '@vibe-arcade/catalog';
import { useEffect, useRef, useState } from 'react';
import { Q_MAX } from '../lib/search';
import { BTN_LINE } from '../lib/ui';
import { Dice } from './Icons';

interface ToolbarProps {
	tr: Translations;
	// The search text and order in the URL.
	q: string;
	sortNew: boolean;
	onQuery: (q: string) => void;
	onSort: (sortNew: boolean) => void;
	onSurprise: () => void;
}

const TOGGLE = 'avg-tog min-h-11 flex-1 cursor-pointer px-3.5 text-[14px] whitespace-nowrap';

// Surprise, search and sort. On a phone the three stack at full width.
export function Toolbar({ tr, q, sortNew, onQuery, onSort, onSurprise }: ToolbarProps) {
	// The field keeps its own text and reports each change, rather than being driven by the URL: a value that round-trips through navigation on every keystroke breaks IME composition (Chinese, Japanese, Korean input). The URL only writes back when it changes by another hand: Back, a footer genre link, Clear filters.
	const [text, setText] = useState(q);
	const reported = useRef(q);
	useEffect(() => {
		if (q !== reported.current) {
			reported.current = q;
			setText(q);
		}
	}, [q]);

	const onInput = (value: string) => {
		setText(value);
		reported.current = value.trim() ? value : '';
		onQuery(reported.current);
	};

	return (
		<div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center'>
			<button type='button' onClick={onSurprise} className={`${BTN_LINE} px-3.5 text-[14px]`}>
				<Dice size={16} />
				{tr.surprise}
			</button>
			<div className='flex items-center gap-3'>
				<label htmlFor='game-search' className='flex-none text-[14px] text-muted'>
					{tr.search}
				</label>
				<input id='game-search' type='search' value={text} onChange={(e) => onInput(e.target.value)} placeholder={tr.searchPh} maxLength={Q_MAX} autoComplete='off' enterKeyHint='search' className='avg-field min-h-11 w-full min-w-0 rounded-lg border border-line-2 bg-panel px-3.5 py-2.5 text-[15px] text-fg placeholder:text-muted sm:w-60' />
			</div>
			<div role='group' aria-label={tr.sortLabel} className='flex overflow-hidden rounded-lg border border-line-2'>
				<button type='button' aria-pressed={!sortNew} onClick={() => onSort(false)} className={`${TOGGLE} ${sortNew ? 'bg-transparent text-fg' : 'bg-fg text-bg'}`}>
					{tr.mostLiked}
				</button>
				<button type='button' aria-pressed={sortNew} onClick={() => onSort(true)} className={`${TOGGLE} ${sortNew ? 'bg-fg text-bg' : 'bg-transparent text-fg'}`}>
					{tr.newest}
				</button>
			</div>
		</div>
	);
}
