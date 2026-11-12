import { type ReactNode, useEffect, useRef } from 'react';

// The filter bar over a listing (the showcase, the UI libraries and the plugins): a row of chips and the selects beside them. From md up it is a panel that sticks under the header while the list scrolls. Below md it is neither a panel nor sticky, as a sticky bar of wrapped chips covered the cards on a phone: the chips become one row that scrolls sideways, out to the screen's edges, and the selects share the row under it. A screen under 560px tall (a phone held sideways, which is md wide) keeps the panel but does not stick it, as header and panel would leave a strip of the list.
export function FilterBar({ children }: { children: ReactNode }) {
	return <div className='sticky top-[72px] z-5 flex [@media(max-height:560px)]:static flex-wrap items-center justify-start gap-3 rounded-card border border-line-2 bg-panel/86 p-2.5 backdrop-blur-[16px] [box-shadow:var(--sh-1)] max-md:static max-md:flex-col max-md:flex-nowrap max-md:items-stretch max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:[box-shadow:none] max-md:backdrop-blur-none'>{children}</div>;
}

// The chips' row. Below md it runs past the page's gutter (16px below sm, 24px up to md) to the screen's edges, with the gutter as its padding and scroll padding, so the first chip lines up with the page and the row scrolls under the edge; the scroll bar is hidden, and a few pixels above and below keep a focused chip's outline from being clipped.
export function FilterChips({ label, children }: { label: string; children: ReactNode }) {
	const row = useRef<HTMLDivElement>(null);
	const shown = useRef<Element | null>(null);
	// A page opened on a group late in the row (a shared ?cat= link) would show no pressed chip on a phone, so the row scrolls to the pressed chip whenever it changes and is out of view. Only the row scrolls: scrollIntoView would scroll the page as well.
	useEffect(() => {
		const el = row.current;
		const chip = el?.querySelector('[aria-pressed="true"]');
		if (!el || !chip || chip === shown.current) return;
		shown.current = chip;
		const pad = Number.parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
		const box = el.getBoundingClientRect();
		const c = chip.getBoundingClientRect();
		if (c.left < box.left + pad || c.right > box.right - pad) el.scrollLeft += c.left - box.left - pad;
	});
	return (
		<div
			ref={row}
			className='flex flex-wrap gap-2 max-md:-my-1 max-md:flex-nowrap max-md:overflow-x-auto max-md:py-1 max-md:[scrollbar-width:none] max-sm:-mx-5 max-sm:scroll-px-5 max-sm:px-5 sm:max-md:-mx-6 sm:max-md:scroll-px-6 sm:max-md:px-6 max-md:[&::-webkit-scrollbar]:hidden'
			role='group'
			aria-label={label}
		>
			{children}
		</div>
	);
}

// A chip draws its own fill and border, so below md, where the bar draws no panel, it stays legible over the page's dot field; a pressed chip turns to the blue tint. A chip given a count is a compact one, for a long list that should stay on one row from md up: its name is a short one, with the full name as its tooltip and accessible name, and the count follows in small muted figures from 1280px up, and below md, where the row scrolls.
export function FilterChip({ pressed, onClick, count, title, children }: { pressed: boolean; onClick: () => void; count?: number; title?: string; children: ReactNode }) {
	const compact = count !== undefined;
	return (
		<button
			type='button'
			className={`group min-h-9 shrink-0 rounded-full border border-line-2 bg-panel py-0 text-[14px] font-medium whitespace-nowrap text-fg-2 transition-[border-color,background,color] duration-150 ease-[ease] hover:border-line-3 hover:text-fg aria-pressed:border-blue aria-pressed:bg-blue-soft aria-pressed:font-semibold aria-pressed:text-blue-ink max-md:min-h-10 ${compact ? 'px-[18px] md:px-3 md:text-[13px] md:max-split:px-2.5' : 'px-[18px]'}`}
			onClick={onClick}
			aria-pressed={pressed}
			title={title}
			aria-label={compact && title ? `${title} · ${count}` : undefined}
		>
			{children}
			{compact && <span className='ml-1.5 text-[12px] text-fg-3 tabular-nums group-aria-pressed:text-blue-ink md:max-xl:hidden'>{count}</span>}
		</button>
	);
}

// The selects of a bar. Every listing keeps them together (`grouped`) in the same normal flow as the chips, so when the bar wraps the next row starts at the same left edge instead of being pushed to the right. Below md they share one row, each taking half of it, a lone one too.
export function FilterSelects({ grouped = false, children }: { grouped?: boolean; children: ReactNode }) {
	return <div className={grouped ? 'flex flex-wrap items-center gap-x-4 gap-y-3 max-md:flex-nowrap max-md:gap-3' : 'flex gap-3 md:contents'}>{children}</div>;
}

// A labelled select. Below md its text is 16px, the smallest size at which iOS does not zoom the page when the select is tapped, and the label goes above it, so the select has its half of the row to itself in every language.
export function FilterSelect({ id, label, value, onChange, children }: { id: string; label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
	return (
		<div className='flex items-center gap-2.5 max-md:min-w-0 max-md:max-w-[calc(50%-6px)] max-md:flex-1 max-md:flex-col max-md:items-stretch max-md:gap-1.5'>
			<label htmlFor={id} className='text-[13.5px] font-medium text-fg-2'>
				{label}
			</label>
			{/* sort-select sets the inherited font and draws the chevron (styles/primitives.css). */}
			<select id={id} value={value} onChange={(e) => onChange(e.target.value)} className='sort-select h-10 cursor-pointer appearance-none rounded-box border border-field bg-panel py-0 pr-[34px] pl-3 text-[14px] text-fg hover:border-fg-3 max-md:h-11 max-md:min-w-0 max-md:text-[16px]'>
				{children}
			</select>
		</div>
	);
}
