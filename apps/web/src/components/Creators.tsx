import { CREATORS, type Creator, type LangCode, type Translations, fill, formatCount, t } from '@vibe-arcade/catalog';
import { H2, WRAP } from '../lib/ui';
import { Avatar } from './Avatar';
import { CreatorLink } from './CreatorLink';

// The creators shown: the ones whose games have the most likes.
const SHOWN = CREATORS.slice(0, 15);

// "3 games", or the language's own form for one.
export const gamesCount = (creator: Creator, tr: Translations): string => (creator.games === 1 ? tr.oneGame : fill(tr.nGames, { n: creator.games }));

// Each creator links to the list of their games.
export function Creators({ lang }: { lang: LangCode }) {
	const tr = t(lang);
	return (
		<section id='creators' className={`avg-reveal ${WRAP} pb-20 sm:pb-24`} aria-labelledby='creators-h'>
			<h2 id='creators-h' className={`${H2} mb-6`}>
				{tr.creatorsH}
			</h2>
			<ul className='grid grid-cols-[repeat(auto-fill,minmax(min(220px,100%),1fr))] gap-3.5'>
				{SHOWN.map((c) => (
					<li key={c.key} className='flex'>
						<CreatorLink creator={c.key} className='avg-rel flex min-h-11 min-w-0 flex-1 items-center gap-3.5 rounded-[14px] border border-line bg-panel p-3.5 text-fg hover:text-fg'>
							<Avatar creator={c} className='size-12' />
							<span className='flex min-w-0 flex-col'>
								<span className='truncate text-[15px] font-semibold'>@{c.handle}</span>
								<span className='text-[13px] whitespace-nowrap text-muted'>
									{gamesCount(c, tr)} · {formatCount(c.likes, lang)}{' '}
									<span aria-hidden='true' className='text-heart'>
										♥
									</span>
									<span className='sr-only'>{tr.likesOnX}</span>
								</span>
							</span>
						</CreatorLink>
					</li>
				))}
			</ul>
		</section>
	);
}
