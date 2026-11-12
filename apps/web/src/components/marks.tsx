import { useId } from 'react';

// Glyphs the original look shares across pages: the site mark, a check, one icon per category and the empty-state art. Every one is decorative (aria-hidden) and draws in currentColor or the site's blue, so it follows the colour scheme.

// The site's own mark: two lanes and a spark on a blue tile. It is never NSGo's ≡O and never three bars.
export function SiteMark({ size = 28 }: { size?: number }) {
	const gid = useId();
	return (
		<svg viewBox='0 0 32 32' width={size} height={size} aria-hidden='true' className='block flex-none'>
			<defs>
				<linearGradient id={gid} x1='0' y1='0' x2='1' y2='1'>
					<stop offset='0' stopColor='#4da3ff' />
					<stop offset='1' stopColor='#0062cc' />
				</linearGradient>
			</defs>
			<rect width='32' height='32' rx='9' fill={`url(#${gid})`} />
			<g transform='translate(1.6 0) skewX(-10)' fill='#fff'>
				<rect x='9.5' y='9' width='15' height='5.5' rx='2.75' />
				<rect x='10.5' y='17.5' width='9' height='5.5' rx='2.75' />
			</g>
			<path d='M24.5 16.5l1.1 2.6 2.6 1.1-2.6 1.1-1.1 2.6-1.1-2.6-2.6-1.1 2.6-1.1z' fill='#fff' />
		</svg>
	);
}

// A check in a circle, for the "copied" toast and other confirmations.
export function CheckIcon({ size = 18 }: { size?: number }) {
	return (
		<svg viewBox='0 0 24 24' width={size} height={size} fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
			<circle cx='12' cy='12' r='9' />
			<path d='M8 12.5l2.7 2.7L16 10' />
		</svg>
	);
}

// One line glyph per section of the site, keyed by its route; a route without its own glyph gets the showcase grid.
function navGlyph(to: string) {
	switch (to) {
		case '/':
			return <path d='M3.5 11 12 4l8.5 7M6 9.5V20h12V9.5' />;
		case '/plugins':
			return <path d='M9 3v4M15 3v4M7 7h10v4a5 5 0 0 1-10 0zM12 16v5' />;
		case '/ui':
			return (
				<>
					<rect x='3' y='4' width='18' height='16' rx='3' />
					<path d='M9 4v16M9 10h12' />
				</>
			);
		case '/state':
			return (
				<>
					<circle cx='6' cy='6' r='2.5' />
					<circle cx='18' cy='6' r='2.5' />
					<circle cx='12' cy='18' r='2.5' />
					<path d='M8.5 6h7M7.2 8.2l3.6 7.6M16.8 8.2l-3.6 7.6' />
				</>
			);
		case '/templates':
			return (
				<>
					<rect x='8' y='3' width='12' height='15' rx='2' />
					<path d='M5 7v11a3 3 0 0 0 3 3h8' />
				</>
			);
		case '/ai':
			return <path d='M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z' />;
		case '/learn':
			return <path d='M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z' />;
		case '/metrics':
			return <path d='M4 20V10M10 20V4M16 20v-7M22 20H2' />;
		default:
			return (
				<>
					<rect x='3' y='3' width='7' height='7' rx='2' />
					<rect x='14' y='3' width='7' height='7' rx='2' />
					<rect x='3' y='14' width='7' height='7' rx='2' />
					<rect x='14' y='14' width='7' height='7' rx='2' />
				</>
			);
	}
}

export function NavIcon({ to, size = 20 }: { to: string; size?: number }) {
	return (
		<svg viewBox='0 0 24 24' width={size} height={size} fill='none' stroke='currentColor' strokeWidth='1.75' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' className='block flex-none'>
			{navGlyph(to)}
		</svg>
	);
}

// The empty-state art: two filled lanes and a dashed third, the slot waiting for an entry.
export function EmptyLanes() {
	const gid = useId();
	return (
		<svg viewBox='0 0 96 56' width='96' height='56' aria-hidden='true'>
			<defs>
				<linearGradient id={gid} x1='0' y1='0' x2='1' y2='0'>
					<stop offset='0' style={{ stopColor: 'var(--color-blue)' }} stopOpacity='0.55' />
					<stop offset='1' style={{ stopColor: 'var(--color-blue)' }} />
				</linearGradient>
			</defs>
			<g transform='translate(10 0) skewX(-10)'>
				<rect x='4' y='6' width='56' height='12' rx='6' fill={`url(#${gid})`} />
				<rect x='4' y='24' width='36' height='12' rx='6' fill={`url(#${gid})`} />
				<rect x='4' y='42' width='44' height='12' rx='6' fill='none' className='stroke-blue' strokeWidth='1.5' strokeDasharray='4 4' />
			</g>
		</svg>
	);
}
