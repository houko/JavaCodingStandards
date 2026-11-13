import { type LangCode, MODELS, fill, t } from '@vibe-arcade/catalog';
import { H2, WRAP } from '../lib/ui';
import { Plus } from './Icons';

export function Faq({ lang }: { lang: LangCode }) {
	const tr = t(lang);
	// The models' names as a list in the page's language ("A, B and C").
	const models = new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' }).format(MODELS.map((m) => m.name));
	const faqs = [
		{ q: tr.q1, a: tr.a1 },
		{ q: tr.q2, a: fill(tr.a2, { models }) },
		{ q: tr.q3, a: tr.a3 },
		{ q: tr.q5, a: tr.a5 },
	];
	return (
		<section id='faq' className={`avg-reveal ${WRAP} pb-20 sm:pb-24`} aria-labelledby='faq-h'>
			<h2 id='faq-h' className={`${H2} mb-4`}>
				{tr.faqH}
			</h2>
			<div className='border-t border-line'>
				{faqs.map((f) => (
					<details key={f.q} className='avg-faq border-b border-line'>
						<summary className='flex min-h-11 cursor-pointer items-center justify-between gap-4 py-[22px] font-display text-[19px] leading-[1.3] font-bold sm:text-[22px]'>
							{f.q}
							<Plus className='avg-plus flex-none text-lime' />
						</summary>
						<p className='mb-6 max-w-[760px] text-[16px] text-soft'>{f.a}</p>
					</details>
				))}
			</div>
		</section>
	);
}
