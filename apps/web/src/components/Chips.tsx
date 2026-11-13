import type { ReactNode } from 'react';

// A row of filter chips that scrolls sideways instead of wrapping into a tall block, on every screen: it sits in the bar that stays on screen while the list scrolls. The padding leaves room for a chip's hover lift and focus ring inside the scroller.
export function ChipRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div role='group' aria-label={label} className='avg-chiprow -mx-4 flex gap-2 overflow-x-auto px-4 py-1.5 sm:-mx-6 sm:px-6'>
			{children}
		</div>
	);
}

interface ChipProps {
	label: string;
	count: number;
	active: boolean;
	onPick: () => void;
	// The genre's colour, shown as a square before the label.
	color: string;
}

export function Chip({ label, count, active, onPick, color }: ChipProps) {
	return (
		<button type='button' aria-pressed={active} onClick={onPick} className={`avg-chip inline-flex min-h-11 flex-none cursor-pointer items-center gap-2 rounded-full border px-4 text-[14px] font-medium whitespace-nowrap ${active ? 'border-fg bg-fg text-bg' : 'border-line-2 bg-transparent text-fg'}`}>
			<span aria-hidden='true' className='size-2.5 rounded-[3px]' style={{ backgroundColor: color }} />
			{label}
			<span className='font-mono text-[12px] opacity-75'>{count}</span>
		</button>
	);
}
