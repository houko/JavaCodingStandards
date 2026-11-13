import { useAutoMotion } from '../lib/motion';

// A game's clip playing silently in a loop over its cover, which shows until the clip does and stays for a visitor who gets no motion. Decoration: the cover beside it carries the description.
export function Clip({ src, className = '' }: { src: string; className?: string }) {
	const play = useAutoMotion();
	if (!play) return null;
	// Keyed by its file, so a new game starts a new video rather than swapping the source under one that is playing.
	return <video key={src} src={src} autoPlay muted loop playsInline aria-hidden='true' tabIndex={-1} className={`avg-clip pointer-events-none absolute inset-0 size-full object-cover ${className}`} />;
}
