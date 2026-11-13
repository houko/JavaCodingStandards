import { useEffect, useState, useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
	return typeof window !== 'undefined' && window.matchMedia(QUERY).matches;
}

const ease = (x: number) => 1 - (1 - x) ** 3;

// 0 → 1 over `duration` ms with an ease-out curve. Starts at 1, so the server render and the first client render both show the final numbers; the count only runs after mount, and not at all for visitors who asked for less motion.
export function useCountUp(duration = 1400): number {
	const [p, setP] = useState(1);
	useEffect(() => {
		if (prefersReducedMotion()) return;
		let raf = 0;
		let start: number | null = null;
		const step = (now: number) => {
			start ??= now;
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

// ---- the visitor's pause ----

// The hero's pause button stops everything that moves by itself: the hero screen's rotation, the clips that play unasked, the ticker and the grid. The flag lives outside React so every such part reads the same one, and on the root element, where the stylesheet reads it for the CSS animations.
let paused = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function setMotionPaused(next: boolean): void {
	paused = next;
	document.documentElement.toggleAttribute('data-motion-paused', next);
	for (const listener of listeners) listener();
}

export function useMotionPaused(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => paused,
		() => false,
	);
}

// ---- when clips may play ----

interface Connection {
	saveData?: boolean;
	effectiveType?: string;
}

// Connections on which a clip would cost more than it shows: the visitor asked to save data, or the browser measures the network as 3G or slower. Browsers that do not report the connection (Safari, Firefox) are not held back.
const SLOW = new Set(['slow-2g', '2g', '3g']);
export function connectionIsSlow(connection: Connection | undefined): boolean {
	return connection?.saveData === true || (connection?.effectiveType !== undefined && SLOW.has(connection.effectiveType));
}

// Resolves once the page has loaded (the covers above the fold included) and the browser has a moment to spare, so no clip competes with what the visitor sees first. Shared by every clip on the page.
let settled: Promise<void> | undefined;
function pageSettled(): Promise<void> {
	settled ??= new Promise((resolve) => {
		// Safari has no requestIdleCallback; a short delay after load stands in for it.
		const idle = () => (typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(() => resolve(), { timeout: 2000 }) : setTimeout(resolve, 800));
		if (document.readyState === 'complete') idle();
		else window.addEventListener('load', idle, { once: true });
	});
	return settled;
}

// Whether things may move unasked: never on the server or in the first client render (so the two agree, and a clip is only fetched by a browser that will play it), not before the page has settled, nor for a visitor who asked for less motion, on a slow or metered connection, nor while paused.
export function useAutoMotion(): boolean {
	const [allowed, setAllowed] = useState(false);
	const isPaused = useMotionPaused();
	useEffect(() => {
		if (prefersReducedMotion() || connectionIsSlow((navigator as Navigator & { connection?: Connection }).connection)) return;
		let live = true;
		void pageSettled().then(() => live && setAllowed(true));
		return () => {
			live = false;
		};
	}, []);
	return allowed && !isPaused;
}

// Whether the screen is phone-sized, where a clip is shown at under 400px wide and the smaller file is plenty. False on the server and in the first render.
const NARROW = '(max-width: 767px)';
export function useNarrowScreen(): boolean {
	const [narrow, setNarrow] = useState(false);
	useEffect(() => {
		const query = window.matchMedia(NARROW);
		setNarrow(query.matches);
		const onChange = () => setNarrow(query.matches);
		query.addEventListener('change', onChange);
		return () => query.removeEventListener('change', onChange);
	}, []);
	return narrow;
}
