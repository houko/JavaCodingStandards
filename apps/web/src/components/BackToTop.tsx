import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '../lib/motion';
import { ArrowUp } from './Icons';

// Past this much scrolling the button is fully shown, as the scroll-driven animation's range in styles/arcade.css.
const SHOW_AFTER = 700;

// The round button back to the top. Where the browser has scroll-driven animations, CSS alone fades it in with the scroll position; where it has not, or the visitor asked for less motion (which turns every animation off), a scroll listener sets data-show instead.
export function BackToTop({ label }: { label: string }) {
	const [show, setShow] = useState(false);

	useEffect(() => {
		if (CSS.supports('animation-timeline: scroll()') && !prefersReducedMotion()) return;
		const onScroll = () => setShow(window.scrollY > SHOW_AFTER);
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	return (
		<a href='#top' aria-label={label} data-show={show} className='avg-btn avg-totop fixed right-4 bottom-4 z-40 flex size-[52px] items-center justify-center rounded-full bg-lime text-bg shadow-[0_12px_30px_-10px_rgb(0_0_0/0.6)] hover:text-bg sm:right-5 sm:bottom-5'>
			<ArrowUp />
		</a>
	);
}
