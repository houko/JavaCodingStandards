import { topLiked } from '@vibe-arcade/catalog';

// The 18 most liked names, twice over so the strip loops without a seam, every other one outlined.
const NAMES = topLiked(18).map((g) => g.name);

// Decoration only: the same names are links in the lists below.
export function Ticker() {
	return (
		<div className='avg-ticker-wrap mb-16 overflow-hidden border-b border-line bg-band py-[18px] sm:mb-20' aria-hidden='true'>
			<div className='avg-ticker'>
				{[...NAMES, ...NAMES].map((name, i) => (
					<span key={i} className='inline-flex items-center gap-6 pr-6 whitespace-nowrap'>
						<span className={`font-display text-[22px] font-extrabold tracking-[-0.02em] text-fg sm:text-[26px] ${(i % NAMES.length) % 2 ? 'avg-outline' : ''}`}>{name}</span>
						<span className='font-mono text-[16px] text-lime'>{'//'}</span>
					</span>
				))}
			</div>
		</div>
	);
}
