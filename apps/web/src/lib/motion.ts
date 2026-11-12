import { type PointerEvent, useEffect, useState, useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(cb: () => void): () => void {
	const mq = window.matchMedia(QUERY);
	mq.addEventListener('change', cb);
	return () => mq.removeEventListener('change', cb);
}

export function prefersReducedMotion(): boolean {
	return typeof window !== 'undefined' && window.matchMedia(QUERY).matches;
}

// Server render assumes motion is allowed; CSS already disables the animations for reduced-motion visitors.
export function useReducedMotion(): boolean {
	return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}

// 3D tilt and glare position on pointer move, used by the category, plugin and article tiles. The bounds are read once when the pointer enters so a style write from the previous frame cannot force a synchronous layout on every move.
const tiltBounds = new WeakMap<HTMLElement, DOMRect>();

export function tiltEnter(e: PointerEvent<HTMLElement>): void {
	if (!prefersReducedMotion()) tiltBounds.set(e.currentTarget, e.currentTarget.getBoundingClientRect());
}

export function tiltMove(e: PointerEvent<HTMLElement>): void {
	if (prefersReducedMotion()) return;
	const el = e.currentTarget;
	const r = tiltBounds.get(el);
	if (!r) return;
	const px = (e.clientX - r.left) / r.width;
	const py = (e.clientY - r.top) / r.height;
	el.style.transform = `perspective(1000px) rotateX(${((0.5 - py) * 7).toFixed(2)}deg) rotateY(${((px - 0.5) * 9).toFixed(2)}deg) translateY(-3px)`;
	el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
	el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
}

export function tiltLeave(e: PointerEvent<HTMLElement>): void {
	tiltBounds.delete(e.currentTarget);
	e.currentTarget.style.transform = '';
}

export const tilt = { onPointerEnter: tiltEnter, onPointerMove: tiltMove, onPointerLeave: tiltLeave };

const ease = (x: number) => 1 - (1 - x) ** 3;

// 0 → 1 over `duration` ms with an ease-out curve. Starts at 1 so the server render shows the final numbers.
export function useCountUp(duration = 1600): number {
	const [p, setP] = useState(1);
	useEffect(() => {
		if (prefersReducedMotion()) return;
		let raf = 0;
		const start = performance.now();
		const step = (now: number) => {
			const x = Math.min(1, (now - start) / duration);
			setP(x);
			if (x < 1) raf = requestAnimationFrame(step);
		};
		setP(0);
		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	}, [duration]);
	return ease(p);
}

export function useScrolledPast(y: number): boolean {
	const [past, setPast] = useState(false);
	useEffect(() => {
		const onScroll = () => setPast(window.scrollY > y);
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, [y]);
	return past;
}

// Fades `.rv` elements in as they scroll into view, including ones added later by filtering or navigation.
export function useReveal(): void {
	useEffect(() => {
		const reveal = (el: Element) => el.setAttribute('data-in', '1');
		const pending = () => document.querySelectorAll('.rv:not([data-in])');
		if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
			const mo = new MutationObserver(() => pending().forEach(reveal));
			pending().forEach(reveal);
			mo.observe(document.body, { childList: true, subtree: true });
			return () => mo.disconnect();
		}
		const io = new IntersectionObserver(
			(entries) => {
				for (const en of entries) {
					if (en.isIntersecting) {
						reveal(en.target);
						io.unobserve(en.target);
					}
				}
			},
			{ threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
		);
		const scan = () => pending().forEach((el) => io.observe(el));
		scan();
		const mo = new MutationObserver(scan);
		mo.observe(document.body, { childList: true, subtree: true });
		return () => {
			mo.disconnect();
			io.disconnect();
		};
	}, []);
}
