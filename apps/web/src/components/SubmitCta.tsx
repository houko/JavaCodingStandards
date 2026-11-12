import { CURATOR_HANDLE, CURATOR_URL, type LangCode, SUBMIT_URL, t } from '@vibe-arcade/catalog';
import { NEW_TAB, WRAP } from '../lib/ui';

const BUTTON = 'avg-btn inline-flex min-h-11 items-center justify-center rounded-lg px-[22px] py-3.5 font-semibold max-sm:w-full';

// The lime block asking for submissions: the issue form on GitHub, or a tag on X.
export function SubmitCta({ lang }: { lang: LangCode }) {
	const tr = t(lang);
	return (
		<section id='submit' className={`avg-reveal ${WRAP} pb-20 sm:pb-24`} aria-labelledby='submit-h'>
			<div className='avg-cta flex flex-wrap items-center justify-between gap-8 rounded-2xl bg-lime px-6 py-10 text-bg sm:px-10 sm:py-12'>
				<div className='flex flex-[1_1_420px] flex-col gap-3'>
					<h2 id='submit-h' className='font-display text-[34px] leading-[1.05] font-extrabold tracking-[-0.03em] sm:text-[44px]'>
						{tr.submitH}
					</h2>
					<p className='max-w-[580px] text-[17px]'>{tr.submitP}</p>
				</div>
				<div className='flex flex-wrap gap-3 max-sm:w-full'>
					<a href={SUBMIT_URL} {...NEW_TAB} className={`${BUTTON} avg-shine bg-bg text-fg hover:text-fg`}>
						{tr.submitOnGitHub}
					</a>
					<a href={CURATOR_URL} rel='noopener noreferrer' className={`${BUTTON} border-[1.5px] border-bg text-bg hover:text-bg`}>
						{tr.tag} @{CURATOR_HANDLE}
					</a>
				</div>
			</div>
		</section>
	);
}
