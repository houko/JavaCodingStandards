import { useEffect } from 'react';

// The backdrop behind the top of each page: drifting colour fields, a dot field and lanes streaking across (styles/backdrop.css). Absolute, not fixed, so it costs nothing while scrolling.
//
// It also owns the page's one pointermove listener for the pointer light on cards and tiles (.spot in styles/primitives.css): the card under a mouse gets the pointer's position as --mx and --my. Touch and pen are left out, as they have no hover to show it.
export function Background() {
	useEffect(() => {
		const onMove = (e: PointerEvent) => {
			if (e.pointerType !== 'mouse' || !(e.target instanceof Element)) return;
			const el = e.target.closest<HTMLElement>('.spot');
			if (!el) return;
			const r = el.getBoundingClientRect();
			el.style.setProperty('--mx', `${e.clientX - r.left}px`);
			el.style.setProperty('--my', `${e.clientY - r.top}px`);
		};
		document.addEventListener('pointermove', onMove, { passive: true });
		return () => document.removeEventListener('pointermove', onMove);
	}, []);
	return (
		<div aria-hidden='true' className='pointer-events-none absolute inset-x-0 top-0 -z-1 h-[760px] overflow-hidden max-sm:h-[520px]'>
			<div className='backdrop-aurora'>
				<div className='aurora a1' />
				<div className='aurora a2' />
				<div className='aurora a3' />
			</div>
			<div className='backdrop-dots' />
			<span className='streak s1' />
			<span className='streak s2' />
			<span className='streak s3' />
			<span className='streak s4' />
		</div>
	);
}
