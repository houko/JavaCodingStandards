import type { ReactNode } from 'react';

// The design's line icons, drawn in the current colour and hidden from assistive tech: each sits beside the text that names its control.
function Icon({ size, stroke = 2, className, children }: { size: number; stroke?: number; className?: string; children: ReactNode }) {
	return (
		<svg aria-hidden='true' className={className} width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={stroke} strokeLinecap='round' strokeLinejoin='round'>
			{children}
		</svg>
	);
}

interface IconProps {
	size?: number;
	className?: string;
}

// The up-and-right arrow of a link that leaves the site.
export function ArrowOut({ size = 16, className = 'avg-arrow' }: IconProps) {
	return (
		<Icon size={size} stroke={2.2} className={className}>
			<path d='M7 17L17 7' />
			<path d='M8 7h9v9' />
		</Icon>
	);
}

export function ArrowDown({ size = 16, className = 'avg-arrow avg-arrow-d' }: IconProps) {
	return (
		<Icon size={size} stroke={2.2} className={className}>
			<path d='M12 5v14' />
			<path d='M6 13l6 6 6-6' />
		</Icon>
	);
}

export function ArrowUp({ size = 20, className }: IconProps) {
	return (
		<Icon size={size} stroke={2.4} className={className}>
			<path d='M12 19V5' />
			<path d='M6 11l6-6 6 6' />
		</Icon>
	);
}

export function ArrowLeft({ size = 16, className }: IconProps) {
	return (
		<Icon size={size} stroke={2.2} className={className}>
			<path d='M19 12H5' />
			<path d='M11 6l-6 6 6 6' />
		</Icon>
	);
}

export function Heart({ size = 16, className = 'avg-heart text-heart' }: IconProps) {
	return (
		<Icon size={size} className={className}>
			<path d='M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z' />
		</Icon>
	);
}

export function Dice({ size = 18, className }: IconProps) {
	return (
		<Icon size={size} stroke={1.8} className={className}>
			<rect x='3.5' y='3.5' width='17' height='17' rx='4' />
			<circle cx='8.5' cy='8.5' r='1' fill='currentColor' />
			<circle cx='15.5' cy='15.5' r='1' fill='currentColor' />
			<circle cx='12' cy='12' r='1' fill='currentColor' />
		</Icon>
	);
}

export function Globe({ size = 18, className }: IconProps) {
	return (
		<Icon size={size} stroke={1.8} className={className}>
			<circle cx='12' cy='12' r='9' />
			<path d='M3 12h18' />
			<path d='M12 3a14 14 0 0 1 0 18' />
			<path d='M12 3a14 14 0 0 0 0 18' />
		</Icon>
	);
}

export function Close({ size = 18, className }: IconProps) {
	return (
		<Icon size={size} stroke={2.2} className={className}>
			<path d='M6 6l12 12' />
			<path d='M18 6L6 18' />
		</Icon>
	);
}

export function Plus({ size = 22, className }: IconProps) {
	return (
		<Icon size={size} className={className}>
			<path d='M12 5v14' />
			<path d='M5 12h14' />
		</Icon>
	);
}

export function Menu({ size = 20, className }: IconProps) {
	return (
		<Icon size={size} className={className}>
			<path d='M4 7h16' />
			<path d='M4 12h16' />
			<path d='M4 17h16' />
		</Icon>
	);
}

export function Pause({ size = 18, className }: IconProps) {
	return (
		<Icon size={size} stroke={2.4} className={className}>
			<path d='M9 5v14' />
			<path d='M15 5v14' />
		</Icon>
	);
}

export function Play({ size = 18, className }: IconProps) {
	return (
		<Icon size={size} className={className}>
			<path d='M8 5l11 7-11 7z' />
		</Icon>
	);
}

export function LinkIcon({ size = 16, className }: IconProps) {
	return (
		<Icon size={size} className={className}>
			<path d='M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2' />
			<path d='M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2' />
		</Icon>
	);
}
