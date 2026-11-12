import { ARTICLES, DOCS, DOCS_BASE, RESOURCES, fill, hostOf, pad2, pick } from '@awesome-nsgo/catalog';
import { useLang, useT } from '../../lib/lang';
import { useSite } from '../../lib/site';
import type { BitmapName } from '../bitmaps';
import { DesktopIcons } from '../DesktopIcons';
import { PixelIcon, StatusBar, Win, btnGo, iconLabel, well } from '../ui';

// A shortcut icon for each official resource.
const RES_ICON: Record<(typeof RESOURCES)[number]['key'], BitmapName> = {
	res_site: 'globe',
	res_docs: 'page',
	res_ui: 'cursor',
	res_demo: 'eye',
	res_examples: 'hammer',
	res_nsh: 'glass',
};

// The learn page: a reader window with the community articles set like documents and a folder of shortcuts to the official resources under it, and the official guides as a numbered list in a full-height window beside them.
// On the desktop the guides window fills the screen height and scrolls its list inside, so the page stays one screen.
export function Learn() {
	return (
		<div className='relative mx-auto flex max-w-[1440px] flex-col gap-[26px] px-3.5 pt-3.5 desk:grid desk:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] desk:items-start desk:gap-x-7 desk:pt-[26px] desk:pr-10 desk:pl-[136px]'>
			<DesktopIcons className='hidden desk:absolute desk:top-[26px] desk:left-[18px] desk:grid desk:grid-cols-1 desk:gap-4' />
			<div className='flex min-w-0 flex-col gap-[26px] desk:gap-7'>
				<Reader />
				<Resources />
			</div>
			<Guides />
		</div>
	);
}

function Reader() {
	const t = useT();
	const { openSubmit } = useSite();
	return (
		<Win level={1} title={t.learn_h} closeTo='/'>
			<div className={`${well} relative`}>
				{ARTICLES.map((ar) => (
					<article key={ar.url} className='border-b border-line px-5 pt-5 pb-5 last:border-b-0 desk:px-10 desk:pt-7 desk:pb-7'>
						<p className='m-0 mb-3'>
							<span className='inline-block rounded-full bg-yel px-2 text-xs leading-5'>{fill(t.article_k, { x: ar.site })}</span>
						</p>
						<h2 lang='en' className='m-0 mb-5 text-xl leading-7 font-semibold tracking-tight desk:text-[28px] desk:leading-[36px]'>
							{ar.title}
						</h2>
						<a className={btnGo} href={ar.url} target='_blank' rel='noopener'>
							{t.read_full}
						</a>
					</article>
				))}
				{/* With no article listed, the reader asks for the first rather than showing an empty page. */}
				{ARTICLES.length === 0 && (
					<article className='px-5 pt-5 pb-5 desk:px-10 desk:pt-7 desk:pb-7'>
						<h2 className='m-0 mb-2 text-xl leading-7 font-semibold tracking-tight'>{t.art_none}</h2>
						<p className='m-0 mb-4 text-muted'>{t.art_none_p}</p>
						<button type='button' className={btnGo} onClick={() => openSubmit('article')}>
							{t.submit_it}
						</button>
					</article>
				)}
			</div>
			<StatusBar>
				<span>{fill(t.r_items, { n: ARTICLES.length })}</span>
				<span>{t.article}</span>
			</StatusBar>
		</Win>
	);
}

// The official resources as a folder window of shortcut icons, each with its host underneath; one row of six on the desktop.
function Resources() {
	const t = useT();
	return (
		<Win title={t.res_h} idle>
			<ul className={`${well} m-0 grid list-none grid-cols-2 gap-x-2 gap-y-3 p-3 min-[480px]:grid-cols-3 desk:grid-cols-6 desk:gap-x-1 desk:px-2`}>
				{RESOURCES.map((r) => (
					<li key={r.key} className='min-w-0'>
						<a href={r.url} target='_blank' rel='noopener' className='group grid justify-items-center gap-1 px-1 py-2 text-center no-underline'>
							<PixelIcon name={RES_ICON[r.key]} scale={2} />
							<span className={iconLabel}>{t[r.key]}</span>
							<span lang='en' className='max-w-full truncate font-mono text-faint'>
								{hostOf(r.url)}
							</span>
						</a>
					</li>
				))}
			</ul>
			<StatusBar>
				<span>{fill(t.r_items, { n: RESOURCES.length })}</span>
			</StatusBar>
		</Win>
	);
}

// The official guides in their docs order: number, page icon and English title, with the localized summary on a second line. The list is the window's scroller on the desktop.
function Guides() {
	const t = useT();
	const lang = useLang();
	return (
		<Win title={t.guides_h} idle fill>
			<ol className={`${well} relative m-0 list-none p-1.5 desk:min-h-0 desk:flex-1 desk:overflow-y-auto`}>
				{DOCS.map((d, i) => (
					<li key={d.url} className='border-b border-line last:border-b-0'>
						<a href={d.url} target='_blank' rel='noopener' className='group grid grid-cols-[22px_16px_1fr_auto] items-baseline gap-x-2.5 rounded-md px-2 py-1.5 no-underline hover:bg-ink/5'>
							<span className='font-mono text-lo'>{pad2(i + 1)}</span>
							<PixelIcon name='page' scale={1} className='self-center' />
							<span lang='en' className='min-w-0'>
								{d.title}
							</span>
							<span className='col-start-3 row-start-2 text-faint'>{pick(d.desc, lang)}</span>
							<span aria-hidden='true' className='col-start-4 row-start-1 text-muted'>
								↗
							</span>
						</a>
					</li>
				))}
				{DOCS.length === 0 && (
					<li className='px-2 py-1.5 text-muted'>
						{t.guides_none}{' '}
						<a href={DOCS_BASE} target='_blank' rel='noopener'>
							{t.res_docs} ↗
						</a>
					</li>
				)}
			</ol>
			<StatusBar>
				<span>{fill(t.r_items, { n: DOCS.length })}</span>
				<span lang='en' className='font-mono'>
					{DOCS_BASE.replace(/^https:\/\//, '')}
				</span>
			</StatusBar>
		</Win>
	);
}
