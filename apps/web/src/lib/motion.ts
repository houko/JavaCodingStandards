import { useEffect, useState } from 'react';

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
