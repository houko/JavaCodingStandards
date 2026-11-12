import type { SubmitCat, Surface } from '@awesome-nsgo/catalog';
import { useT } from '../lib/lang';
import { type CopyKey, useSite } from '../lib/site';
import { SetupLine } from './CopyCmd';
import { CtaBox, CtaHead } from './Cta';
import { BarLink, CardHead, CardShot, EntryCard, TagList, cardShotImg, showBy, showDesc, showGrid } from './EntryCard';
import { EmptyLanes } from './marks';

// One card of a category page that lists projects by their repository with a command to copy: a template and how to start from it, an AI tool and how to install it.
export interface CategoryItem {
	key: string;
	name: string;
	author: string;
	repo: string;
	// Where the tool or template is: its repository, or its folder in one.
	url: string;
	homepage?: string;
	desc: string;
	// The command the card offers to copy, and its key for the copied state.
	cmd: string;
	copyKey: CopyKey;
	// Its like key (likeKey).
	item: string;
	image?: string;
	// What kind it is, in the visitor's language (a template's surface, an AI tool's type), shown before its tags.
	kind: string;
	// A template's surface (go, tsx or both): with it the kind is drawn as the language tag the plugins and UI pages draw; an AI tool's type has none and stays a neutral outlined badge.
	surface?: Surface;
	tags: readonly string[];
}

// The words of a category page, in the visitor's language.
export interface CategoryCopy {
	// The category's name as the navigation says it. Neither look shows it at present: the original look's eyebrow is the count or the "wanted" badge.
	kicker: string;
	name: string;
	// One line on what the category holds, as the home page's tile says it.
	desc: string;
	lead: string;
	count: string;
	badge: string;
	listed: string;
	more: string;
	emptyH: string;
	emptyP: string;
	submit: string;
}

// How a card's command line is cut: the head gives way to an ellipsis, the tail always shows. As on a plugin card the tail is what follows the last slash, the project's name and what comes after it; when that runs past what a card holds (a skill of a collection: npx skills add owner/skills --skill nsgo-usage), only the last word.
const TAIL_MAX = 22;
export function cmdTail(cmd: string): number {
	const afterSlash = cmd.lastIndexOf('/') + 1;
	if (cmd.length - afterSlash <= TAIL_MAX) return afterSlash;
	return cmd.lastIndexOf(' ') + 1;
}

// A category page in the original look, as the state page lays out its solutions: a heading under an eyebrow with the count (or, while the category is empty, the "wanted" badge in its warm tone), the listed cards, and an invitation to submit, which takes the place of the list while the category is empty.
export function CategoryPage({ cat, copy, items }: { cat: SubmitCat; copy: CategoryCopy; items: readonly CategoryItem[] }) {
	const t = useT();
	const { openSubmit } = useSite();
	const listed = items.length > 0;
	return (
		<section className='page enter gap-10 max-sm:gap-6'>
			<div className='flex flex-col gap-3'>
				<span className='kicker' data-tone={listed ? undefined : 'dev'}>
					{listed ? copy.count : copy.badge}
				</span>
				<h1 className='page-h1'>{copy.name}</h1>
				{/* As on the state page, the lead paragraph is left out on a phone, where the cards already say what the page holds. */}
				<p className='page-p max-sm:hidden'>{copy.lead}</p>
			</div>

			{listed && (
				<div className='flex flex-col gap-4'>
					<h2 className='m-0 text-[22px] font-bold tracking-[-0.02em]'>{copy.listed}</h2>
					<div className={showGrid}>
						{items.map((x, k) => {
							const cut = cmdTail(x.cmd);
							// The card opens the project's website when it has one; the bar then links its repository.
							const site = x.homepage ?? x.url;
							return (
								<div key={x.key} className={`rv d${k % 6} flex`}>
									<EntryCard
										label={`github.com/${x.repo}`}
										bar={x.homepage && <BarLink href={x.url}>{t.on_github}</BarLink>}
										shot={
											x.image && (
												<CardShot href={site} className='aspect-[1200/630]'>
													<img className={cardShotImg} src={x.image} alt='' width={1200} height={630} loading={k === 0 ? 'eager' : 'lazy'} fetchPriority={k === 0 ? 'high' : undefined} decoding='async' />
												</CardShot>
											)
										}
									>
										<CardHead as='h3' name={x.name} href={site} item={x.item}>
											<span className={showBy} title={x.author}>
												<span lang='en'>by</span> {x.author}
											</span>
										</CardHead>
										<p className={showDesc}>{x.desc}</p>
										<SetupLine head={x.cmd.slice(0, cut)} tail={x.cmd.slice(cut)} copyKey={x.copyKey} />
										<span className='flex flex-wrap items-center gap-1.5'>
											{x.surface ? <span className={`kind-tag kind-${x.surface} self-center`}>{x.kind}</span> : <span className='inline-flex h-6 items-center rounded-full border border-line-2 px-2.5 text-[12px] font-semibold text-fg-2'>{x.kind}</span>}
											<TagList tags={x.tags} />
										</span>
									</EntryCard>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{listed ? (
				<CtaBox>
					<CtaHead as='h3' title={copy.more} text={copy.emptyP} />
					<button type='button' className='btn-c btn-44' onClick={() => openSubmit(cat)}>
						{copy.submit}
					</button>
				</CtaBox>
			) : (
				<div className='rv dots flex flex-col items-center gap-4 rounded-band border border-line bg-soft px-7 py-14 text-center max-sm:px-5 max-sm:py-10'>
					<EmptyLanes />
					<h2 className='m-0 text-[24px] font-bold tracking-[-0.02em]'>{copy.emptyH}</h2>
					<p className='m-0 max-w-[36em] text-[15px] leading-[1.75] text-fg-2'>{copy.emptyP}</p>
					<button type='button' className='btn-c btn-44' onClick={() => openSubmit(cat)}>
						{copy.submit}
					</button>
				</div>
			)}
		</section>
	);
}
