import { GENRE_KEYS, LAST_UPDATED, type LangCode, formatCount, formatDay, t, topLiked } from '@vibe-arcade/catalog';
import { H2, WRAP } from '../lib/ui';
import { Cover } from './Cover';
import { GameLink } from './GameLink';
import { Heart } from './Icons';

const TOP = topLiked(6);

export function TopLiked({ lang, onOpen }: { lang: LangCode; onOpen: (slug: string) => void }) {
	const tr = t(lang);
	return (
		<section id='top-liked' className={`avg-reveal ${WRAP} pb-[72px] sm:pb-[88px]`} aria-labelledby='top-h'>
			<div className='mb-6 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1'>
				<h2 id='top-h' className={H2}>
					{tr.topH}
				</h2>
				<span className='text-[14px] text-muted'>
					{tr.topNote} · {formatDay(LAST_UPDATED, lang)}
				</span>
			</div>
			<ol className='flex flex-col border-t border-line'>
				{TOP.map((g, i) => (
					<li key={g.slug} className='avg-row flex items-center gap-3 border-b border-line py-3 sm:gap-5'>
						<span className='w-7 flex-none font-mono text-[15px] text-muted sm:w-11'>{String(i + 1).padStart(2, '0')}</span>
						<span className='h-[60px] w-24 flex-none overflow-hidden rounded-md bg-panel max-[419px]:hidden'>
							<Cover game={g} alt='' className='size-full text-[11px]' />
						</span>
						<div className='flex min-w-0 flex-1 flex-col'>
							<GameLink slug={g.slug} onOpen={onOpen} className='inline-flex min-h-11 items-center self-start font-display text-[19px] leading-[1.2] font-bold sm:text-[22px]'>
								{g.name}
							</GameLink>
							<span className='text-[14px] text-muted'>
								@{g.creator} · {tr[GENRE_KEYS[g.genre]]} · {g.model}
							</span>
						</div>
						<span className='inline-flex flex-none items-center gap-1.5 font-mono text-[15px]'>
							<Heart />
							<span className='sr-only'>{tr.likesOnX}: </span>
							{formatCount(g.likes, lang)}
						</span>
					</li>
				))}
			</ol>
		</section>
	);
}
