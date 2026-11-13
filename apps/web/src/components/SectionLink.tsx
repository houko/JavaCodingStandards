import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

// A link to one of the home page's sections. On the home page it is a plain in-page anchor, which keeps the filters in the URL; from any other page it goes to the home page and that section.
export function SectionLink({ home, id, className, onClick, children }: { home: boolean; id: string; className?: string; onClick?: () => void; children: ReactNode }) {
	if (home) {
		return (
			<a href={`#${id}`} className={className} onClick={onClick}>
				{children}
			</a>
		);
	}
	return (
		<Link to='/' hash={id} className={className} onClick={onClick}>
			{children}
		</Link>
	);
}
