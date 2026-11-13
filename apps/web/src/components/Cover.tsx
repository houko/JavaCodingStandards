import { GENRE_COLORS, type Game } from '@vibe-arcade/catalog';
import { useEffect, useRef, useState } from 'react';

interface CoverProps {
	game: Game;
	// Empty for a decorative cover, whose game is named right beside it.
	alt: string;
	className?: string;
	// The one cover above the fold loads at once; every other is lazy.
	eager?: boolean;
}

// A game's cover, 960×600. If the file fails to load, a block in the genre's colour carries the game's name instead of a broken image.
function CoverImage({ game, alt, className = '', eager = false }: CoverProps) {
	const ref = useRef<HTMLImageElement>(null);
	const [failed, setFailed] = useState(false);

	// An image that failed before React attached its handler never fires onError again, so its state is read once on mount.
	useEffect(() => {
		const img = ref.current;
		if (img?.complete && img.naturalWidth === 0) setFailed(true);
	}, []);

	if (failed) {
		return (
			<span role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} className={`${className} flex items-center justify-center overflow-hidden p-3 text-center font-display font-bold leading-tight text-bg`} style={{ backgroundImage: `linear-gradient(135deg, ${GENRE_COLORS[game.genre]} 0%, ${GENRE_COLORS[game.genre]} 35%, var(--color-bg) 140%)` }}>
				<span className='line-clamp-3'>{game.name}</span>
			</span>
		);
	}
	return <img ref={ref} src={game.cover} alt={alt} width={960} height={600} loading={eager ? 'eager' : 'lazy'} decoding='async' fetchPriority={eager ? 'high' : undefined} className={`${className} object-cover`} onError={() => setFailed(true)} />;
}

// Keyed by game, so a cover that failed for one game does not hide the next one shown in the same place (the dialog).
export function Cover(props: CoverProps) {
	return <CoverImage key={props.game.slug} {...props} />;
}
