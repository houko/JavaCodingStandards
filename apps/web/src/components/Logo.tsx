import { SITE_NAME } from '@vibe-arcade/catalog';

// The mark: a cat-eared arcade cabinet with a prompt on its screen. `footer` draws the cut-outs in the footer's darker background.
export function LogoMark({ size, footer = false }: { size: number; footer?: boolean }) {
	const cut = footer ? 'fill-footer' : 'fill-bg';
	return (
		<svg className='avg-logo-mark flex-none' aria-hidden='true' width={size} height={size} viewBox='0 0 64 64'>
			<path className='fill-lime stroke-lime' d='M14 18 L18 4 L26 12 L38 12 L46 4 L50 18 L50 44 L55 52 L52 56 L50 56 L50 62 L14 62 L14 56 L12 56 L9 52 L14 44 Z' strokeWidth='2' strokeLinejoin='round' />
			<path className={cut} d='M16.7 14.3 L18.6 8 L22.3 11.6 Z' />
			<path className={cut} d='M47.3 14.3 L45.4 8 L41.7 11.6 Z' />
			<rect className={cut} x='19' y='19' width='26' height='21' rx='3.5' />
			<path className='stroke-lime' d='M23.5 25.5 L28.5 29.5 L23.5 33.5' fill='none' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' />
			<path className='avg-caret stroke-lime' d='M31 34.5 H38.5' strokeWidth='3' strokeLinecap='round' />
			<circle className={cut} cx='21' cy='50' r='2.4' />
			<circle className={cut} cx='35' cy='50.5' r='1.9' />
			<circle className={cut} cx='41' cy='50.5' r='1.9' />
		</svg>
	);
}

// The mark and the site's name, as the content of the link home. In the header the name gives way to the controls on the narrowest phones, where it stays for screen readers only.
export function Logo({ footer = false }: { footer?: boolean }) {
	return (
		<>
			<LogoMark size={footer ? 44 : 34} footer={footer} />
			<span className={footer ? 'font-display text-[26px] font-extrabold tracking-[-0.03em]' : 'font-display text-[20px] font-extrabold tracking-[-0.02em] max-[439px]:sr-only'}>{SITE_NAME}</span>
		</>
	);
}
