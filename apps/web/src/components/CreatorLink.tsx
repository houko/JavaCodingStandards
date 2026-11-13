import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

// A link that shows one creator's games: the home page's list filtered to them, every other filter and any open game cleared.
export function CreatorLink({ creator, className, children }: { creator: string; className?: string; children: ReactNode }) {
	return (
		<Link to='/' search={{ creator: creator.toLowerCase() }} hash='games' className={className}>
			{children}
		</Link>
	);
}
