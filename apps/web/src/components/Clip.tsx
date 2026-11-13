import { useEffect, useRef, useState } from 'react';
import { useAutoMotion, useNarrowScreen } from '../lib/motion';

interface ClipProps {
	// The clip, and a smaller one for a phone-sized screen (a game's 640x400 card clip, against the 960x540 hero clip).
	src: string;
	small?: string;
	className?: string;
}

// A game's clip playing silently in a loop over its cover, which shows until the clip does and stays for a visitor who gets no motion. Decoration: the cover beside it carries the description.
//
// It costs data only when it is seen: nothing is fetched before the page has settled (useAutoMotion), the file is only asked for once the clip scrolls into view, and it pauses whenever it leaves it.
export function Clip({ src, small, className = '' }: ClipProps) {
	const play = useAutoMotion();
	const narrow = useNarrowScreen();
	const ref = useRef<HTMLVideoElement>(null);
	const [inView, setInView] = useState(false);
	const [seen, setSeen] = useState(false);
	const file = narrow && small ? small : src;

	useEffect(() => {
		const video = ref.current;
		if (!play || !video) return;
		const observer = new IntersectionObserver(([entry]) => {
			setInView(entry.isIntersecting);
			if (entry.isIntersecting) setSeen(true);
		}, { threshold: 0.2 });
		observer.observe(video);
		return () => observer.disconnect();
	}, [play, file]);

	useEffect(() => {
		const video = ref.current;
		if (!video || !seen) return;
		// Leaving before it starts rejects the promise, which is no error.
		if (inView) video.play().catch(() => {});
		else video.pause();
	}, [inView, seen, file]);

	if (!play) return null;
	// Keyed by its file, so a new game starts a new video rather than swapping the source under one that is playing. Until the clip has been in view it has no source at all, so the browser fetches nothing.
	return <video ref={ref} key={file} src={seen ? file : undefined} muted loop playsInline preload='none' aria-hidden='true' tabIndex={-1} className={`avg-clip pointer-events-none absolute inset-0 size-full object-cover ${className}`} />;
}
