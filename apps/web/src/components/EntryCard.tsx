import { type App, likeKey, pick } from '@awesome-nsgo/catalog';
import type { ReactNode } from 'react';
import { useLang, useT } from '../lib/lang';
import { AppLink, GitHubMark, KindTag, MonoTile, PlatformTags, appView } from './bits';
import { LikeButton } from './Like';
import { ScoreBar, ScoreButton } from './Score';

// The parts of an entry's card in the original look, drawn the same on the showcase, the UI libraries, the state solutions and the plugins: a rounded surface with the entry's body and a footer row of meta.

// The grid of cards on the showcase, UI library and state pages.
export const showGrid = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-4';

// A card's head: the tile (when the card has one), then the name and the line under it.
// Keep the icon aligned with the name when the metadata wraps on narrow cards.
// Centering against a multi-line metadata block makes the icon float halfway down the card head.
export const showId = 'flex items-start gap-3';
export const showIdText = 'flex min-w-0 flex-col gap-[3px]';
export const showName = 'm-0 truncate text-[17px] font-[650] tracking-[-0.015em]';
// The name in a card's head, beside its score and like buttons: up to two lines, using normal word and hyphen opportunities before breaking an unusually long token as a last resort.
export const cardName = 'm-0 line-clamp-2 text-[17px] leading-[1.25] font-[650] tracking-[-0.015em] wrap-break-word';
export const showBy = 'truncate text-[13px] text-fg-3';
// text-pretty because a card's description is often a span, which the base rule's text-wrap: pretty on paragraphs does not reach; without it a Chinese or Japanese description ended on a line of one to three characters.
export const showDesc = 'flex-auto text-[14.5px] leading-[1.6] text-pretty text-fg-2';

// A UI library's, a state solution's or a plugin's card: the project's screenshot on top when it has one (`shot`), the body, 16px in from the card's edges below sm instead of 20px, and a footer row naming where the entry lives (`label`, a GitHub path gets the GitHub mark) that may end in a link (`bar`).
export function EntryCard({ label, bar, shot, children }: { label: string; bar?: ReactNode; shot?: ReactNode; children: ReactNode }) {
	return (
		<article className='win card spot'>
			{shot}
			<div className='flex flex-auto flex-col gap-3 p-5 max-sm:gap-2.5 max-sm:p-4'>{children}</div>
			<div className='flex min-h-11 items-center gap-3 border-t border-line px-5 max-sm:px-4'>
				{/* The mark is kept from shrinking and the path truncates in its own box: an ellipsis needs a block, not the flex row's anonymous text, and a long path otherwise squeezed the mark to nothing. */}
				<span className='flex min-w-0 flex-auto items-center gap-1.5 font-mono text-[12px] text-fg-3' lang='en'>
					{label.startsWith('github.com/') && (
						<span className='flex flex-none'>
							<GitHubMark size={13} />
						</span>
					)}
					<span className='min-w-0 truncate'>{label.replace(/^github\.com\//, '')}</span>
				</span>
				{bar}
			</div>
		</article>
	);
}

// The link at the end of a card's footer row (the docs, the repository), marked as leading off the site with ↗ unless its words already end in one.
export function BarLink({ href, children }: { href: string; children: ReactNode }) {
	const marked = typeof children === 'string' && children.trimEnd().endsWith('↗');
	return (
		<a className='flex-none text-[13px] font-semibold text-blue-ink no-underline hover:underline' href={href} target='_blank' rel='noopener'>
			{children}
			{!marked && ' ↗'}
		</a>
	);
}

// The project's screenshot above a card's body, linking where the card's name does; `className` gives its aspect ratio. Hidden from assistive technology and the tab order, as the name's link is the same link.
export function CardShot({ href, className, children }: { href: string; className: string; children: ReactNode }) {
	return (
		<a className={`flex items-center justify-center overflow-hidden border-b border-line bg-soft ${className}`} href={href} target='_blank' rel='noopener' tabIndex={-1} aria-hidden='true'>
			{children}
		</a>
	);
}

// The screenshot inside CardShot, filling the box from its top.
export const cardShotImg = 'block size-full object-cover object-top';

// A card's head with the entry's name as a link (`as` is its heading level), the line under the name (`children`), and the score and like buttons. The buttons sit at the top of the head, level with the name, rather than centred on a head of two or three lines, where they would line up with nothing; with neither a score nor likes to show the box is not drawn, so the card lays out as before.
export function CardHead({ as: H, name, href, item, tile, children }: { as: 'h2' | 'h3'; name: string; href: string; item: string; tile?: ReactNode; children?: ReactNode }) {
	return (
		<div className={showId}>
			{tile}
			<div className={showIdText}>
				<H className={cardName}>
					<a className='text-inherit no-underline hover:text-blue-ink' href={href} target='_blank' rel='noopener'>
						{name}
					</a>
				</H>
				{children}
			</div>
			<span className='like-end flex flex-none items-center gap-2 self-start empty:hidden'>
				<ScoreButton item={item} name={name} />
				<LikeButton item={item} name={name} className='like-btn' />
			</span>
		</div>
	);
}

// An entry's tags, in English as the catalog writes them.
export function TagList({ tags }: { tags: readonly string[] }) {
	return (
		<span className='flex flex-wrap items-center gap-1.5'>
			{tags.map((tg) => (
				<span key={tg} className='inline-flex h-6 items-center rounded-full bg-soft px-2.5 text-[12px] font-medium text-fg-2' lang='en'>
					{tg}
				</span>
			))}
		</span>
	);
}

// An app's card on the showcase and the home page's featured row: its screenshot in an inset well, or, without one, a shorter well (16:6) holding its tile on a dot field, then the body's tile (left out when the well already shows it), name, author and kind, a description of up to three lines (two below sm), its platforms, and its score as the footer row (`score`). The whole card links to the app's page, which keeps the look it had rather than the link colour and underline; hovering it lifts the card. The like button (`like`) floats over the screenshot's top right, beside the link rather than inside it, and rises with the card. `as` is the name's heading level; `k` is the card's place in its grid, which staggers its reveal and loads the first few screenshots at once.
export function AppCard({ app, k, as: H = 'h2', like = true, score = true }: { app: App; k: number; as?: 'h2' | 'h3'; like?: boolean; score?: boolean }) {
	const t = useT();
	const lang = useLang();
	const v = appView(app);
	return (
		<div className={`rv d${k % 6} group relative flex`}>
			<AppLink slug={app.slug} dialog className='card spot text-fg no-underline transition-[transform,border-color,box-shadow] duration-150 group-hover:-translate-y-0.5 group-hover:border-line-3 group-hover:[box-shadow:var(--sh-2)] motion-reduce:group-hover:translate-y-0'>
				{/* The screenshot is decorative (the name is the link's text). */}
				<span className={`card-screen ${app.image ? '' : 'aspect-[16/6]'}`}>
					{app.image ? (
						<img src={app.image} alt='' width={1200} height={750} loading={k < 4 ? 'eager' : 'lazy'} decoding='async' />
					) : (
						<span className='dots flex size-full items-center justify-center bg-soft'>
							<MonoTile view={v} size={56} />
						</span>
					)}
				</span>
				<span className='flex flex-auto flex-col gap-3 p-5 max-sm:gap-2.5 max-sm:p-4'>
					<span className={showId}>
						{app.image && <MonoTile view={v} size={44} />}
						<span className={showIdText}>
							<H className={showName}>{app.name}</H>
							{/* Below sm the kind tag goes under the author when the two do not fit on one line, so a long author is not cut to "by…"; a short author keeps the tag on its line. */}
							<span className='flex min-w-0 items-center gap-2 max-sm:flex-wrap max-sm:gap-y-1 [&_.kind-tag]:flex-none [&_.kind-tag]:self-auto'>
								<span className={showBy} title={app.author}>
									<span lang='en'>by</span> {app.author}
								</span>
								<KindTag app={app} label={t[`kind_${app.kind}`]} />
							</span>
						</span>
					</span>
					<span className={`${showDesc} line-clamp-3 max-sm:line-clamp-2`}>{pick(app.desc, lang)}</span>
					<span className='mt-auto'>
						<PlatformTags app={app} />
					</span>
				</span>
				{score && <ScoreBar item={likeKey.app(app)} name={app.name} />}
			</AppLink>
			{like && <LikeButton item={likeKey.app(app)} name={app.name} className='like-btn like-float absolute top-4 right-4 group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0' />}
		</div>
	);
}
