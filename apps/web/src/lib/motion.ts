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

// Whether things may move unasked: never on the server or in the first client render (so the two agree, and a clip is only fetched by a browser that will play it), nor for a visitor who asked for less motion or to save data, nor while paused.
export function useAutoMotion(): boolean {
	const [allowed, setAllowed] = useState(false);
	const isPaused = useMotionPaused();
	useEffect(() => {
		const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
		setAllowed(!prefersReducedMotion() && !saveData);
	}, []);
	return allowed && !isPaused;
}
