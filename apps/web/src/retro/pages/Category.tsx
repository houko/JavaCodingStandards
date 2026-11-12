import type { SubmitCat } from '@awesome-nsgo/catalog';
import type { CategoryCopy, CategoryItem } from '../../components/CategoryPage';
import { LikeButton } from '../../components/Like';
import { ScoreButton } from '../../components/Score';
import { useAiToolsPage, useTemplatesPage } from '../../lib/category';
import { useT } from '../../lib/lang';
import { useSite } from '../../lib/site';
import { DesktopIcons } from '../DesktopIcons';
import { PixelIcon, StatusBar, Win, btnGo, btnSm, field, likeBtn, well } from '../ui';

export function Templates() {
	const { copy, items } = useTemplatesPage();
	return <CategoryDesk cat='template' path='~/templates' copy={copy} items={items} />;
}

export function AiTools() {
	const { copy, items } = useAiToolsPage();
	return <CategoryDesk cat='ai' path='~/ai' copy={copy} items={items} />;
}

// A category page in the retro look, as the state page lays out its solutions: a header window, the listed entries in a tall window on the right, and a dialog asking for more, or for the first while the category is empty. Below the desktop breakpoint the windows stack in that order.
function CategoryDesk({ cat, path, copy, items }: { cat: SubmitCat; path: string; copy: CategoryCopy; items: readonly CategoryItem[] }) {
	const listed = items.length > 0;
	return (
		<div className='relative mx-auto flex max-w-[1440px] flex-col gap-[26px] px-3.5 pt-3.5 desk:grid desk:h-[calc(var(--win-max)+26px)] desk:grid-cols-12 desk:grid-rows-[auto_auto_1fr] desk:items-start desk:gap-x-7 desk:gap-y-0 desk:pt-[26px] desk:pr-10 desk:pl-[136px]'>
			<DesktopIcons className='hidden desk:absolute desk:top-[26px] desk:left-[18px] desk:grid desk:grid-cols-1 desk:gap-4' />
			<Win level={1} title={copy.name} closeTo='/' className='desk:col-span-6 desk:col-start-1 desk:row-start-1'>
				<div className='flex flex-wrap items-center gap-2.5 px-1.5 pt-[3px] pb-1.5'>
					<span className={`${field} font-mono`} lang='en'>
						{path}
					</span>
					<span className='flex-1' />
					<span className='flex items-center gap-1.5'>
						<span aria-hidden='true' className={`size-2 rounded-full bg-[#28c840] ${listed ? '' : 'animate-blink'}`} />
						{listed ? copy.count : copy.badge}
					</span>
				</div>
				<div className={`${well} px-5 pt-4 pb-[18px]`}>
					<p className='m-0 leading-[22px]'>{copy.lead}</p>
				</div>
				<StatusBar>
					<span>{copy.desc}</span>
				</StatusBar>
			</Win>
			{listed && <Listed copy={copy} items={items} />}
			<Ask cat={cat} copy={copy} listed={listed} />
		</div>
	);
}

// Every listed entry in one window, a section each: preview, name, description, the command with a copy button, and its links.
function Listed({ copy, items }: { copy: CategoryCopy; items: readonly CategoryItem[] }) {
	const t = useT();
	const { copy: copyText, copied } = useSite();
	return (
		<Win title={copy.listed} className='desk:col-span-6 desk:col-start-7 desk:row-span-3 desk:row-start-1 desk:mt-10 desk:-ml-3 desk:flex desk:max-h-[calc(100%-2.5rem)] desk:min-h-0 desk:flex-col' bodyClassName='desk:flex desk:min-h-0 desk:flex-1 desk:flex-col'>
			<div className={`${well} relative divide-y divide-line px-3.5 desk:min-h-0 desk:flex-1 desk:overflow-y-auto`}>
				{items.map((x, k) => (
					<article key={x.key} className='grid gap-x-4 gap-y-3 py-3.5 min-[480px]:grid-cols-[200px_minmax(0,1fr)]'>
						{x.image && (
							<a href={x.homepage ?? x.url} target='_blank' rel='noopener' className='block self-start overflow-hidden rounded-lg border border-line shadow-sm transition-shadow hover:shadow-pop'>
								<img src={x.image} alt={`${x.name} ${t.preview_img}`} width={1200} height={630} loading={k === 0 ? 'eager' : 'lazy'} fetchPriority={k === 0 ? 'high' : undefined} decoding='async' className='block aspect-[1200/630] w-full' />
							</a>
						)}
						<div className={`min-w-0 ${x.image ? '' : 'min-[480px]:col-span-2'}`}>
							<div className='flex flex-wrap items-baseline gap-x-2'>
								<h3 className='m-0 text-sm leading-5 font-semibold'>{x.name}</h3>
								<span className='text-muted'>
									<span lang='en'>by</span> {x.author}
								</span>
							</div>
							<p lang='en' className='m-0 truncate font-mono text-xs leading-5 text-faint'>
								github.com/{x.repo}
							</p>
							<p className='m-0 mt-1 mb-2 line-clamp-3'>{x.desc}</p>
							<div className='flex flex-wrap gap-1.5'>
								<span className='rounded border border-line bg-paper px-1.5 text-xs leading-5 font-semibold'>{x.kind}</span>
								{x.tags.map((tag) => (
									<code key={tag} lang='en' className='rounded border border-line bg-face px-1.5 font-mono text-xs leading-5'>
										{tag}
									</code>
								))}
							</div>
						</div>
						<div className='flex items-center justify-between gap-2 rounded-lg bg-ink py-[3px] pr-[3px] pl-2.5 font-mono text-xs text-paper min-[480px]:col-span-2'>
							<code lang='en' className='min-w-0 wrap-break-word'>
								<span className='text-sky'>❯ </span>
								<span className='text-yel'>{x.cmd}</span>
							</code>
							<button type='button' className={`${btnSm} font-ui text-ink`} onClick={() => copyText(x.cmd, x.copyKey)} aria-label={t.a_copy_cmd}>
								{copied === x.copyKey ? t.copied : t.copy}
							</button>
						</div>
						<div className='flex flex-wrap gap-1.5 min-[480px]:col-span-2'>
							<a className={btnSm} href={x.url} target='_blank' rel='noopener'>
								{t.on_github}
							</a>
							{x.homepage && (
								<a className={btnSm} href={x.homepage} target='_blank' rel='noopener'>
									{t.visit}
								</a>
							)}
							<LikeButton item={x.item} name={x.name} className={likeBtn} size={12} />
							<ScoreButton item={x.item} name={x.name} />
						</div>
					</article>
				))}
			</div>
			<StatusBar>
				<span>{copy.count}</span>
			</StatusBar>
		</Win>
	);
}

// The closing dialog: with entries listed it asks for another one, otherwise it invites the first. Unlike the state page's it is always shown, as the page has no primitives window to make room for.
function Ask({ cat, copy, listed }: { cat: SubmitCat; copy: CategoryCopy; listed: boolean }) {
	const { openSubmit } = useSite();
	const id = `${cat}-ask`;
	return (
		<section aria-labelledby={id} className='mx-1 grid grid-cols-[40px_1fr] gap-x-4 gap-y-2.5 rounded-xl border border-line bg-face p-3.5 shadow-win desk:col-span-5 desk:col-start-2 desk:row-start-2 desk:m-0 desk:mt-6 desk:ml-4 desk:px-[18px] desk:pt-4 desk:pb-3.5'>
			<PixelIcon name='inbox' scale={2} className='mt-1' />
			<div>
				<h2 id={id} className='m-0 mb-1 text-xl leading-7 font-semibold [&:lang(ko)]:break-keep'>
					{listed ? copy.more : copy.emptyH}
				</h2>
				<p className='m-0'>{copy.emptyP}</p>
			</div>
			<div className='col-span-full flex flex-wrap justify-end gap-2.5 pt-1'>
				<button type='button' className={btnGo} onClick={() => openSubmit(cat)}>
					{copy.submit}
				</button>
			</div>
		</section>
	);
}
