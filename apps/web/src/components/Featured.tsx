import { FEATURED, GENRE_COLORS, GENRE_KEYS, type LangCode, formatCount, pick, t } from '@vibe-arcade/catalog';
import { BTN_LIME, BTN_LINE, NEW_TAB, WRAP } from '../lib/ui';
import { Cover } from './Cover';
import { GameLink } from './GameLink';
import { ArrowOut } from './Icons';

const ACTION = { play: 'playNow', source: 'sourceLabel', watch: 'watchLabel' } as const;

// The featured game: the one whose file has a featured block, with what its creator reported about building it.
export function Featured({ lang, onOpen }: { lang: LangCode; onOpen: (slug: string) => void }) {
	const tr = t(lang);
	const game = FEATURED;
	const stats = [
		{ label: tr.apiCost, value: game.featured.apiCost },
		{ label: tr.buildTime, value: game.featured.buildTime },
		{ label: tr.outTokens, value: formatCount(game.featured.outputTokens, lang) },
		{ label: tr.likesOnX, value: formatCount(game.likes, lang) },
	];
	return (
		<section className={`avg-reveal ${WRAP} pb-16 sm:pb-20`} aria-labelledby='featured-h'>
			<div className='flex flex-wrap overflow-hidden rounded-2xl border border-line bg-panel'>
				<div className='relative min-h-[240px] flex-[1_1_420px] overflow-hidden bg-ink sm:min-h-[360px]'>
					<Cover game={game} alt={`${game.name} — ${tr.coverAlt}`} eager className='avg-kb absolute inset-0 size-full text-[32px]' />
					<div className='absolute top-4 left-4 flex flex-wrap gap-2 font-mono text-[12px] font-semibold tracking-[0.06em] uppercase'>
						<span className='rounded-md px-2.5 py-1.5 text-bg' style={{ backgroundColor: GENRE_COLORS[game.genre] }}>
							{tr[GENRE_KEYS[game.genre]]}
						</span>
						<span className='rounded-md bg-bg px-2.5 py-1.5 text-fg'>{tr.gotw}</span>
					</div>
				</div>
				<div className='flex min-w-0 flex-[999_1_420px] flex-col gap-5 p-6 sm:p-10'>
					<p className='font-mono text-[13px] tracking-[0.08em] text-lime uppercase'>{tr.featured}</p>
					<h2 id='featured-h' className='font-display text-[38px] leading-none font-extrabold tracking-[-0.03em] sm:text-[48px]'>
						<GameLink slug={game.slug} onOpen={onOpen}>
							{game.name}
						</GameLink>
					</h2>
					<p className='text-[15px] text-muted'>
						{tr.by}{' '}
						<a href={game.creatorUrl} rel='noopener noreferrer' className='underline'>
							@{game.creator}
						</a>{' '}
						· {tr.builtWith} {game.model}
					</p>
					<p className='max-w-[560px] text-[17px] text-soft-2 sm:text-[18px]'>{pick(game.pitch ?? game.summary, lang)}</p>
					<div className='flex flex-col gap-2 border-t border-line pt-5'>
						<dl className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
							{stats.map((s) => (
								<div key={s.label} className='flex flex-col-reverse justify-end gap-0.5'>
									<dt className='text-[13px] text-muted'>{s.label}</dt>
									<dd className='font-display text-[28px] leading-tight font-bold'>{s.value}</dd>
								</div>
							))}
						</dl>
						<p className='text-[12px] text-muted'>{tr.featuredStatsNote}</p>
					</div>
					<div className='flex flex-wrap gap-3 pt-1'>
						<a href={game.link.url} {...NEW_TAB} className={`${BTN_LIME} px-5 py-3`}>
							{tr[ACTION[game.link.type]]}
							<ArrowOut />
						</a>
						<a href={game.postUrl} {...NEW_TAB} className={`${BTN_LINE} px-5 py-3`}>
							{tr.readPost}
						</a>
					</div>
				</div>
			</div>
		</section>
	);
}
