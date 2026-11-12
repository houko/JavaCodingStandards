import { NSGO_REPO, NSGO_SITE, SPONSOR_URL } from '@awesome-nsgo/catalog';
import { Link } from '@tanstack/react-router';
import { Fragment } from 'react';
import { useT } from '../lib/lang';
import { prefersReducedMotion } from '../lib/motion';
import { useSite } from '../lib/site';
import { GitHubMark } from './bits';
import { SITE_NAV } from './Header';
import { CheckIcon, SiteMark } from './marks';

const FOOT_EXT = 'text-fg-2 no-underline hover:text-blue-ink max-md:inline-flex max-md:min-h-10 max-md:items-center';

export function Footer() {
	const t = useT();
	return (
		<footer className='relative z-1 border-t border-line bg-soft'>
			<span aria-hidden='true' className='edge-light' />
			{/* The page's gutter: 24px from sm up, 20px on phones. The brand, the licence line and NSGo's own links on the left; every section on the right, in a grid that stacks under the brand on narrow screens. */}
			<div className='site-shell mx-auto grid grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)] gap-x-12 gap-y-8 px-6 pt-14 pb-10 max-tab:grid-cols-1 max-sm:px-5'>
				<div>
					<Link to='/' className='inline-flex items-center gap-2.5 text-fg no-underline max-md:min-h-10'>
						<SiteMark size={26} />
						<span className='text-[16px] font-bold tracking-[-0.02em]'>
							Awesome <span className='text-blue-ink'>NSGo</span>
						</span>
					</Link>
					{/* The licence line's two sentences (split at its " · ") are each kept whole where they fit, so a narrow column breaks the line between them rather than inside "Apache-2.0" or before a lone 许可; a sentence wider than the column still wraps inside itself. */}
					<p className='m-0 mt-3 max-w-[34em] text-[13.5px] leading-[1.65] text-fg-3'>
						{t.footer_l.split(' · ').map((part, i, all) => (
							<Fragment key={i}>
								<span className='inline-block'>
									{part}
									{i < all.length - 1 && ' ·'}
								</span>
								{i < all.length - 1 && ' '}
							</Fragment>
						))}
					</p>
					<p className='m-0 mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13.5px] font-semibold'>
						<a href={NSGO_SITE} target='_blank' rel='noopener' className={FOOT_EXT}>
							{t.site}
						</a>
						<a href={NSGO_REPO} target='_blank' rel='noopener' className={`${FOOT_EXT} inline-flex items-center gap-1.5`}>
							<GitHubMark size={14} />
							GitHub
						</a>
						<a href={SPONSOR_URL} target='_blank' rel='noopener' className={FOOT_EXT}>
							{t.sponsor}
						</a>
					</p>
				</div>
				<nav aria-label={t.a_site_nav} className='grid grid-cols-3 content-start gap-x-6 gap-y-1 max-sm:grid-cols-2'>
					{SITE_NAV.map((n) => (
						<Link key={n.to} to={n.to} className='inline-flex min-h-10 items-center text-[13.5px] text-fg-2 no-underline hover:text-blue-ink'>
							{t[n.key]}
						</Link>
					))}
					<Link to='/metrics' className='inline-flex min-h-10 items-center text-[13.5px] text-fg-2 no-underline hover:text-blue-ink'>
						{t.metrics_title}
					</Link>
				</nav>
			</div>
		</footer>
	);
}

export function BackToTop({ show }: { show: boolean }) {
	const t = useT();
	if (!show) return null;
	return (
		// btn-g's hover is restated as utilities, which the utilities drawing the button would otherwise override. Kept clear of the notch and the home indicator; with reduced motion the jump is instant.
		<button
			type='button'
			className='btn-g fade fixed right-[calc(20px+env(safe-area-inset-right))] bottom-[calc(20px+env(safe-area-inset-bottom))] z-30 flex size-11 items-center justify-center rounded-full border border-line-2 bg-panel/90 text-fg backdrop-blur-[8px] [box-shadow:var(--sh-2)] hover:border-line-3 hover:bg-soft'
			onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })}
			aria-label={t.to_top}
		>
			<svg aria-hidden='true' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
				<path d='M12 19V5M5 12l7-7 7 7' />
			</svg>
		</button>
	);
}

export function Toast() {
	const { copied } = useSite();
	const t = useT();
	if (!copied) return null;
	return (
		// `translate` (the -translate-x-1/2 utility) rather than `transform`, so the entrance animation, which animates transform, cannot undo the centring. Drawn in the text colour on the page colour, so it inverts with the scheme. Kept above the home indicator.
		<div role='status' className='enter fixed bottom-[calc(28px+env(safe-area-inset-bottom))] left-1/2 z-60 flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-fg px-5 text-[14px] font-semibold whitespace-nowrap text-bg [box-shadow:var(--sh-3)]'>
			<span className='text-bg'>
				<CheckIcon size={18} />
			</span>
			{t.toast}
		</div>
	);
}
