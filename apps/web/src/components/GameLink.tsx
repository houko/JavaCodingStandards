import { Link } from '@tanstack/react-router';
import type { MouseEvent, ReactNode } from 'react';

// A real link to a game's own page, so the game is crawlable and opens in a new tab on a middle or modified click. Where the page can show the game in place (the home page's dialog), a plain click calls onOpen instead of leaving.
export function GameLink({ slug, onOpen, className, children }: { slug: string; onOpen?: (slug: string) => void; className?: string; children: ReactNode }) {
	const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
		if (!onOpen || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		onOpen(slug);
	};
	return (
		<Link to='/games/$slug' params={{ slug }} preload={false} className={className} onClick={onClick}>
			{children}
		</Link>
	);
}
