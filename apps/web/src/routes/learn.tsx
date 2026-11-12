import { ARTICLES, DOCS, DOCS_BASE, RESOURCES, fill, hostOf, pick } from '@awesome-nsgo/catalog';
import { createFileRoute } from '@tanstack/react-router';
import { CtaBox, CtaHead } from '../components/Cta';
import { useLang, useT } from '../lib/lang';
import { pageHead } from '../lib/seo';
import { useSite } from '../lib/site';

export const Route = createFileRoute('/learn')({
	head: ({ match }) => pageHead({ lang: match.search.lang, path: '/learn', title: 'title_learn', desc: 'desc_learn', name: 'learn_h' }),
	component: LearnPage,
});

const SEC_H2 = 'm-0 text-[22px] font-bold tracking-[-0.02em]';

function LearnPage() {
	const t = useT();
	const lang = useLang();
	const { openSubmit } = useSite();
	return (
		<section className='page enter gap-10 max-sm:gap-6'>
			{/* The heading names the page, so it stands without an eyebrow. */}
			<div className='flex flex-col gap-3.5'>
				<h1 className='page-h1'>{t.learn_h}</h1>
			</div>
			{/* Each article is a soft band with a dot field fading in from its right edge. The reveal is on a wrapper, as on the tile its settled transform would override the tile's hover lift; the band's own border utility outranks .tile:hover, so its hover restates the border and the shadow. */}
			{ARTICLES.map((ar) => (
				<div key={ar.url} className='rv flex flex-col'>
					<a className='tile relative flex flex-col gap-4 overflow-hidden rounded-band border border-line-2 bg-soft p-9 text-fg no-underline hover:border-line-3 hover:[box-shadow:var(--sh-2)] max-sm:p-6' href={ar.url} target='_blank' rel='noopener'>
						<span aria-hidden='true' className='dots pointer-events-none absolute inset-y-0 right-0 w-[38%] [mask-image:linear-gradient(to_left,#000,transparent)] max-sm:hidden' />
						<span className='kicker relative'>{fill(t.article_k, { x: ar.site })}</span>
						<span lang='en' className='relative text-[length:clamp(26px,3.6vw,40px)] leading-[1.12] font-bold tracking-[-0.03em] wrap-break-word'>
							{ar.title}
						</span>
						<span className='relative text-[15px] font-semibold text-blue-ink'>{t.read_full}</span>
					</a>
				</div>
			))}
			{/* With no article listed, the place asks for the first rather than leaving the heading over nothing. */}
			{ARTICLES.length === 0 && (
				<CtaBox>
					<CtaHead as='h2' title={t.art_none} text={t.art_none_p} />
					<button type='button' className='btn-c btn-44' onClick={() => openSubmit('article')}>
						{t.submit_it}
					</button>
				</CtaBox>
			)}
			<div className='flex flex-col gap-4'>
				<h2 className={SEC_H2}>{t.res_h}</h2>
				<div className='grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-3'>
					{RESOURCES.map((r) => (
						<a key={r.key} className='flex flex-col gap-1 rounded-frame border border-line-2 bg-panel px-[18px] py-4 text-fg no-underline [box-shadow:var(--sh-1)] transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-line-3 motion-reduce:hover:translate-y-0' href={r.url} target='_blank' rel='noopener'>
							<span className='text-[15.5px] font-[650]'>{t[r.key]}</span>
							<span className='truncate font-mono text-[12px] text-fg-3'>
								{hostOf(r.url)} <span aria-hidden='true'>↗</span>
							</span>
						</a>
					))}
				</div>
			</div>
			<div className='flex flex-col gap-4'>
				<h2 className={SEC_H2}>{t.guides_h}</h2>
				{DOCS.length === 0 && (
					<p className='m-0 text-[15px] text-fg-2'>
						{t.guides_none}{' '}
						<a href={DOCS_BASE} target='_blank' rel='noopener'>
							{t.res_docs} ↗
						</a>
					</p>
				)}
				<div className='grid grid-cols-[repeat(auto-fit,minmax(min(100%,480px),1fr))] gap-x-8 border-t border-line'>
					{DOCS.map((d, i) => (
						<a key={d.url} className={`row rv d${i % 6} flex items-baseline gap-4 rounded-box border-b border-line px-3 py-4 text-fg no-underline`} href={d.url} target='_blank' rel='noopener'>
							<span aria-hidden='true' className='sk-bullet -translate-y-0.5' />
							<span className='flex min-w-0 flex-auto flex-col gap-1 wrap-break-word'>
								<span lang='en' className='text-[16px] font-semibold'>
									{d.title}
								</span>
								<span className='text-[13.5px] text-fg-3'>{pick(d.desc, lang)}</span>
							</span>
							<span aria-hidden='true' className='text-fg-3'>
								↗
							</span>
						</a>
					))}
				</div>
			</div>
		</section>
	);
}
