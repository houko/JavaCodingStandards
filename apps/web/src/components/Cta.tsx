import type { ReactNode } from 'react';

// The call to action under a listing (the UI libraries, the state solutions, the plugins): a soft band with the text on the left and the buttons on the right, wrapping under it when the row is too narrow, and the site's two-lane mark as its watermark: a long filled lane over a short one, aligned on their left ends as in the mark, in the band's top padding at the right, wholly inside the band and clear of the text and the buttons, which start 28px down (20px on phones, where only the long lane shows), so it reads as the lanes rather than a stray outline. `amber` gives it the warm "wanted" tone (the name predates the tone; the retro look does not use this box).
export function CtaBox({ amber = false, children }: { amber?: boolean; children: ReactNode }) {
	return (
		<div className={`rv relative flex flex-wrap items-center justify-between gap-4 rounded-band border p-7 max-sm:p-5 ${amber ? 'border-dev/25 bg-dev-soft' : 'border-line bg-soft'}`}>
			<span aria-hidden='true' className={`pointer-events-none absolute top-2.5 right-8 h-[5px] w-24 -skew-x-[10deg] rounded-[3px] opacity-45 max-sm:top-2 max-sm:right-6 max-sm:w-16 ${amber ? 'bg-dev' : '[background:var(--gradient-brand)]'}`} />
			<span aria-hidden='true' className={`pointer-events-none absolute top-[19px] right-[calc(2rem+2.5rem)] h-[5px] w-14 -skew-x-[10deg] rounded-[3px] opacity-25 max-sm:hidden ${amber ? 'bg-dev' : '[background:var(--gradient-brand)]'}`} />
			{children}
		</div>
	);
}

// The box's text when it is a single line.
export const ctaP = 'm-0 text-[16px] text-fg-2';

// The box's text when it has a heading over it; `as` is the heading's level.
export function CtaHead({ as: H, title, text }: { as: 'h2' | 'h3'; title: ReactNode; text: ReactNode }) {
	return (
		<div className='flex flex-col gap-1.5'>
			<H className='m-0 text-[20px] font-bold tracking-[-0.015em]'>{title}</H>
			<p className='m-0 text-[15px] text-fg-2'>{text}</p>
		</div>
	);
}
