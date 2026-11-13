import type { ReactNode } from 'react';

// A labelled row of filter chips. On a phone the row scrolls sideways instead of wrapping into a tall block; the padding leaves room for a chip's hover lift and focus ring inside the scroller.
export function ChipRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div role='group' aria-label={label} className='flex items-center gap-2 max-sm:-mx-4 max-sm:overflow-x-auto max-sm:px-4 max-sm:py-1.5 sm:flex-wrap'>
			<span className='min-w-14 flex-none text-[14px] text-muted'>{label}</span>
			{children}
		</div>
	);
}

interface ChipProps {
	label: string;
	count: number;
	active: boolean;
	onPick: () => void;
	// Model chips are lime boxes when pressed, genre chips light pills.
	tone: 'lime' | 'fg';
	// The genre's colour, shown as a square before the label.
	color?: string;
}

const PRESSED = { lime: 'border-lime bg-lime text-bg', fg: 'border-fg bg-fg text-bg' };

export function Chip({ label, count, active, onPick, tone, color }: ChipProps) {
	return (
		<button type='button' aria-pressed={active} onClick={onPick} className={`avg-chip inline-flex min-h-11 flex-none cursor-pointer items-center gap-2 border px-4 text-[14px] font-medium whitespace-nowrap ${tone === 'lime' ? 'rounded-lg' : 'rounded-full'} ${active ? PRESSED[tone] : 'border-line-2 bg-transparent text-fg'}`}>
			{color !== undefined && <span aria-hidden='true' className='size-2.5 rounded-[3px]' style={{ backgroundColor: color }} />}
			{label}
			<span className='font-mono text-[12px] opacity-75'>{count}</span>
		</button>
	);
}
