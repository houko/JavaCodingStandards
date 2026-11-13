import { GAMES, MODELS, type Translations } from '@vibe-arcade/catalog';
import { useEffect, useRef, useState } from 'react';
import { Q_MAX, modelSlug } from '../lib/search';
import { ChevronDown, Close, Reset, Search } from './Icons';

interface ToolbarProps {
	tr: Translations;
	// The search text, model and order in the URL.
	q: string;
	model: string | undefined;
	sortNew: boolean;
	// Whether any filter is set, which shows the reset button.
	filtered: boolean;
	onQuery: (q: string) => void;
	onModel: (model: string | undefined) => void;
	onSort: (sortNew: boolean) => void;
	onReset: () => void;
}

const TOGGLE = 'avg-tog min-h-11 flex-1 cursor-pointer px-3.5 text-[14px] whitespace-nowrap';
const ALL = '';

// Search, model, order and reset, in one row that wraps on a narrow screen.
export function Toolbar({ tr, q, model, sortNew, filtered, onQuery, onModel, onSort, onReset }: ToolbarProps) {
	// The field keeps its own text and reports each change, rather than being driven by the URL: a value that round-trips through navigation on every keystroke breaks IME composition (Chinese, Japanese, Korean input). The URL only writes back when it changes by another hand: Back, a footer genre link, the reset button.
	const [text, setText] = useState(q);
	const reported = useRef(q);
	const field = useRef<HTMLInputElement>(null);
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
		<div className='flex flex-wrap items-center gap-2.5'>
			<div className='relative min-w-0 flex-[1_1_240px] sm:max-w-[380px]'>
				<label htmlFor='game-search' className='sr-only'>
					{tr.search}
				</label>
				<Search className='pointer-events-none absolute top-[13px] left-[13px] text-muted' />
				<input ref={field} id='game-search' type='search' value={text} onChange={(e) => onInput(e.target.value)} placeholder={tr.searchPh} maxLength={Q_MAX} autoComplete='off' enterKeyHint='search' className='avg-field avg-search min-h-11 w-full rounded-lg border border-line-2 bg-panel py-2.5 pr-11 pl-10 text-[15px] text-fg placeholder:text-muted' />
				{text !== '' && (
					<button
						type='button'
						aria-label={tr.clear}
						onClick={() => {
							onInput('');
							field.current?.focus();
						}}
						className='absolute top-0 right-0 flex size-11 cursor-pointer items-center justify-center rounded-lg text-muted hover:text-fg'
					>
						<Close size={16} />
					</button>
				)}
			</div>
			<label htmlFor='game-model' className='sr-only'>
				{tr.model}
			</label>
			<div className='relative flex max-w-full min-w-0 items-center max-[419px]:w-full sm:max-w-60'>
				<select id='game-model' value={model ?? ALL} onChange={(e) => onModel(e.target.value || undefined)} className='avg-field avg-select min-h-11 w-full cursor-pointer rounded-lg border border-line-2 bg-panel py-0 pr-9 pl-3 text-[14px] text-fg'>
					<option value={ALL}>
						{tr.allModels} ({GAMES.length})
					</option>
					{MODELS.map((m) => (
						<option key={m.name} value={modelSlug(m.name)}>
							{m.name} ({m.count})
						</option>
					))}
				</select>
				<ChevronDown className='pointer-events-none absolute right-3 text-muted' />
			</div>
			<div role='group' aria-label={tr.sortLabel} className='flex overflow-hidden rounded-lg border border-line-2 max-[419px]:w-full'>
				<button type='button' aria-pressed={!sortNew} onClick={() => onSort(false)} className={`${TOGGLE} ${sortNew ? 'bg-transparent text-fg' : 'bg-fg text-bg'}`}>
					{tr.mostLiked}
				</button>
				<button type='button' aria-pressed={sortNew} onClick={() => onSort(true)} className={`${TOGGLE} ${sortNew ? 'bg-fg text-bg' : 'bg-transparent text-fg'}`}>
					{tr.newest}
				</button>
			</div>
			{filtered && (
				<button type='button' onClick={onReset} className='avg-btn inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-[14px] font-semibold text-lime'>
					<Reset />
					{tr.reset}
				</button>
			)}
		</div>
	);
}
