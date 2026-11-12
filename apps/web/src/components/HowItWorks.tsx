import { GAMES, GENRES, GENRE_COLORS, GENRE_COUNTS, GENRE_KEYS, type LangCode, MODELS, t } from '@vibe-arcade/catalog';
import { H2, KICKER, WRAP } from '../lib/ui';

const percent = (part: number, whole: number) => `${Math.round((part / whole) * 100)}%`;

// Genres by how many games they have, the largest first; its bar is the full width and the others are measured against it.
const GENRE_STATS = GENRES.map((genre) => ({ genre, count: GENRE_COUNTS[genre] })).sort((a, b) => b.count - a.count);
const GENRE_MAX = GENRE_STATS[0].count;

const BAR_TRACK = 'h-2.5 overflow-hidden rounded-full bg-track';
const PANEL = 'flex flex-[1_1_360px] flex-col rounded-2xl border border-line bg-panel p-6 sm:p-7';

// The three criteria for a listing, and the catalogue counted by model and by genre.
export function HowItWorks({ lang }: { lang: LangCode }) {
	const tr = t(lang);
	const criteria = [
		{ n: '01', title: tr.c1t, body: tr.c1d },
		{ n: '02', title: tr.c2t, body: tr.c2d },
		{ n: '03', title: tr.c3t, body: tr.c3d },
	];
	return (
		<section id='how' className={`avg-reveal ${WRAP} pb-20 sm:pb-24`} aria-labelledby='how-h'>
			<h2 id='how-h' className={`${H2} mb-6`}>
				{tr.howH}
			</h2>
			<ol className='grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-5'>
				{criteria.map((c) => (
					<li key={c.n} className='avg-crit flex flex-col gap-2.5 rounded-2xl border border-line bg-panel p-6 sm:p-7'>
						<span className='font-mono text-[14px] text-lime'>{c.n}</span>
						<h3 className='font-display text-[22px] leading-[1.2] font-bold sm:text-[24px]'>{c.title}</h3>
						<p className='text-[15px] text-soft'>{c.body}</p>
					</li>
				))}
			</ol>
			<div className='mt-5 flex flex-wrap gap-5'>
				<div className={`${PANEL} gap-4`}>
					<h3 className={KICKER}>{tr.byModel}</h3>
					{MODELS.map((m) => (
						<div key={m.name} className='flex flex-col gap-1.5'>
							<div className='flex justify-between gap-3 text-[15px]'>
								<span>{m.name}</span>
								<span className='font-mono'>{m.count}</span>
							</div>
							<div className={BAR_TRACK}>
								<div className='avg-bar h-full rounded-full bg-lime' style={{ width: percent(m.count, GAMES.length) }} />
							</div>
						</div>
					))}
				</div>
				<div className={`${PANEL} gap-3`}>
					<h3 className={`${KICKER} mb-1`}>{tr.byGenre}</h3>
					{GENRE_STATS.map((s) => (
						<div key={s.genre} className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[14px] sm:grid-cols-[140px_minmax(0,1fr)_32px]'>
							<span>{tr[GENRE_KEYS[s.genre]]}</span>
							<div className={`${BAR_TRACK} max-sm:order-last max-sm:col-span-2`}>
								<div className='avg-bar h-full rounded-full' style={{ width: percent(s.count, GENRE_MAX), backgroundColor: GENRE_COLORS[s.genre] }} />
							</div>
							<span className='text-right font-mono'>{s.count}</span>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
