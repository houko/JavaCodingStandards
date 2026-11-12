import { Link } from '@tanstack/react-router';
import { useT } from '../../lib/lang';
import { Pixels, btnGo } from '../ui';

// A caution sign for the alert, in the shared palette (k ink, y yellow).
const CAUTION = ['.......kk.......', '......kyyk......', '......kyyk......', '.....kyyyyk.....', '.....kykkyk.....', '....kyykkyyk....', '....kyykkyyk....', '...kyyykkyyyk...', '...kyyykkyyyk...', '..kyyyykkyyyyk..', '..kyyyyyyyyyyk..', '.kyyyyykkyyyyyk.', '.kyyyyykkyyyyyk.', 'kyyyyyyyyyyyyyyk', 'kkkkkkkkkkkkkkkk', '................'] as const;

// The 404 page: a lone alert box on the desktop.
export function NotFound() {
	const t = useT();
	return (
		<div className='mx-auto flex max-w-[1440px] justify-center px-3.5 pt-12 desk:pt-[16vh]'>
			<section aria-labelledby='nf-h' className='mx-1 grid w-full max-w-[536px] grid-cols-[48px_1fr] gap-x-4 gap-y-2.5 rounded-xl border border-line bg-face p-3.5 shadow-win desk:grid-cols-[64px_1fr] desk:px-[18px] desk:pt-4 desk:pb-3.5'>
				<Pixels rows={CAUTION} scale={4} className='size-12 desk:size-16' />
				<div className='min-w-0'>
					<p className='m-0 font-mono text-muted'>~/404</p>
					<h1 id='nf-h' className='m-0 mb-1 text-xl leading-7 font-semibold tracking-tight desk:text-[28px] desk:leading-[36px]'>
						{t.nf_h}
					</h1>
					<p className='m-0'>{t.nf_p}</p>
				</div>
				<div className='col-span-full flex flex-wrap justify-end gap-2.5 pt-1'>
					<Link to='/' className={btnGo}>
						{t.a_home}
					</Link>
				</div>
			</section>
		</div>
	);
}
