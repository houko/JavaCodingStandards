import { LANGS, LANG_LABELS, type LangCode, MAKER_NAME, MAKER_URL, fill } from '@vibe-arcade/catalog';
import { useEffect, useRef, useState } from 'react';
import { useLang, useSetLang, useT } from '../lib/lang';
import { BTN_LIME } from '../lib/ui';
import { Globe, Menu } from './Icons';
import { Logo } from './Logo';
import { SectionLink } from './SectionLink';

const SECTION_LINK = 'avg-link flex min-h-11 items-center text-[15px] lg:inline-flex';

// The sticky header, always one row. From 1024px it holds everything; below that the section links fold behind a menu button and the maker's pill goes, below 768px the submit button takes its short label, and below 640px the language select shrinks to a globe. Below 360px the gaps and the button's padding tighten, which is what keeps the longest short label (Russian) on the row at 320px.
export function Nav({ home }: { home: boolean }) {
	const tr = useT();
	const lang = useLang();
	const setLang = useSetLang();
	const [open, setOpen] = useState(false);
	const close = () => setOpen(false);
	// The links come before the menu button in the page, so the next Tab after opening them would pass them by: focus is put on the first one.
	const links = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (open) links.current?.querySelector('a')?.focus();
	}, [open]);

	return (
		<header className='sticky top-0 z-50 border-b border-line bg-bg/78 backdrop-blur-[14px]'>
			<nav aria-label={tr.mainNav} className='mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 min-[360px]:gap-x-3 sm:gap-x-4 sm:px-6 md:py-[18px]'>
				<div className='flex min-w-0 items-center gap-3'>
					<SectionLink home={home} id='top' className='avg-logo flex min-h-11 items-center gap-2.5 text-fg hover:text-fg max-[439px]:min-w-11 max-[439px]:justify-center'>
						<Logo />
					</SectionLink>
					<a href={MAKER_URL} rel='noopener noreferrer' className='avg-link rounded-full border border-line px-2 py-1 font-mono text-[12px] whitespace-nowrap text-muted max-lg:hidden'>
						{fill(tr.madeBy, { maker: MAKER_NAME })}
					</a>
				</div>

				<div id='nav-links' ref={links} className={`${open ? 'flex' : 'hidden'} order-last basis-full flex-col border-t border-line pt-1 lg:order-none lg:ml-auto lg:flex lg:basis-auto lg:flex-row lg:items-center lg:gap-5 lg:border-0 lg:pt-0`}>
					<SectionLink home={home} id='games' className={SECTION_LINK} onClick={close}>
						{tr.games}
					</SectionLink>
					<SectionLink home={home} id='creators' className={SECTION_LINK} onClick={close}>
						{tr.creatorsH}
					</SectionLink>
					<SectionLink home={home} id='top-liked' className={SECTION_LINK} onClick={close}>
						{tr.mostLiked}
					</SectionLink>
					<SectionLink home={home} id='submit' className={SECTION_LINK} onClick={close}>
						{tr.submit}
					</SectionLink>
				</div>

				<div className='ml-auto flex items-center gap-2 md:gap-3 lg:ml-0'>
					<div className='avg-lang relative flex items-center gap-2 max-sm:size-11 max-sm:justify-center max-sm:rounded-lg max-sm:bg-panel max-sm:shadow-[inset_0_0_0_1px_var(--color-line-2)]'>
						<label htmlFor='lang-select' className='inline-flex items-center text-muted'>
							<Globe />
							<span className='sr-only'>{tr.language}</span>
						</label>
						<select id='lang-select' value={lang} onChange={(e) => setLang(e.target.value as LangCode)} className='avg-field min-h-11 cursor-pointer rounded-lg border border-line-2 bg-panel px-3 text-[14px] text-fg max-sm:absolute max-sm:inset-0 max-sm:size-full max-sm:opacity-0'>
							{LANGS.map((code) => (
								<option key={code} value={code} lang={code}>
									{LANG_LABELS[code]}
								</option>
							))}
						</select>
					</div>
					<SectionLink home={home} id='submit' className={`${BTN_LIME} px-3 py-2.5 whitespace-nowrap min-[360px]:px-4`} onClick={close}>
						<span className='md:hidden'>{tr.submit}</span>
						<span className='max-md:hidden'>{tr.submitGame}</span>
					</SectionLink>
					<button type='button' aria-expanded={open} aria-controls='nav-links' aria-label={tr.menu} onClick={() => setOpen(!open)} className='avg-btn inline-flex size-11 cursor-pointer items-center justify-center rounded-lg border border-line-2 text-fg lg:hidden'>
						<Menu />
					</button>
				</div>
			</nav>
		</header>
	);
}
