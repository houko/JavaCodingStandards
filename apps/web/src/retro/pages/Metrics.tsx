import { useState } from 'react';
import { useLang, useT } from '../../lib/lang';
import { type MetricsRange, number, pathLabel, shortDay, trackedDays, useMetrics } from '../../lib/metrics';
import { Note, StatusBar, Win, btnSm, seg, well } from '../ui';

const RANGES: MetricsRange[] = [7, 30, 90];

export function Metrics() {
	const t = useT();
	const lang = useLang();
	const [range, setRange] = useState<MetricsRange>(30);
	const { loading, error, reason, data } = useMetrics(range);
	const locale = lang;
	const days = data ? trackedDays(data.daily, data.since) : [];
	const today = days.at(-1)?.views ?? 0;
	const peak = days.length ? days.reduce((best, row) => (row.views > best.views ? row : best), days[0]!) : undefined;
	const max = Math.max(1, ...days.map((row) => row.views));
	return (
		<div className='relative mx-auto flex max-w-[1440px] flex-col gap-[26px] px-3.5 pt-3.5 desk:grid desk:grid-cols-12 desk:items-start desk:gap-x-7 desk:gap-y-0 desk:pt-[26px] desk:pr-10 desk:pl-[136px]'>
			<Win level={1} title={t.metrics_h} fill closeTo='/' className='desk:col-span-8 desk:col-start-1 desk:row-span-2 desk:row-start-1'>
				<div className='flex flex-wrap items-center gap-2.5 px-1.5 pt-[3px] pb-1.5'>
					<span className={`${btnSm} ${seg} bg-ink text-paper`}>{t.metrics_live}</span>
					<div role='tablist' aria-label={t.metrics_range} className='flex'>
						{RANGES.map((days) => <button key={days} type='button' role='tab' aria-selected={range === days} onClick={() => setRange(days)} className={`${btnSm} ${seg} aria-selected:bg-ink aria-selected:text-paper`}>{t[`metrics_${days}d` as 'metrics_7d' | 'metrics_30d' | 'metrics_90d']}</button>)}
					</div>
				</div>
				<p className='m-0 px-1.5 pb-2 text-muted'>{t.metrics_p}</p>
				{loading ? <div className={`${well} m-1.5 p-8 text-center text-muted`}>{t.metrics_loading}</div> : error || !data ? <div className={`${well} m-1.5 p-8 text-center text-muted`}>{reason === 'not_configured' ? t.metrics_not_configured : t.metrics_unavailable}</div> : (
					<div className='flex flex-col gap-3 p-1.5'>
						<div className='grid grid-cols-4 gap-2 max-md:grid-cols-2'>
							{[[t.metrics_views, number(data.total, locale)], [t.metrics_today, number(today, locale)], [t.metrics_peak, peak ? `${number(peak.views, locale)} · ${shortDay(peak.day, locale)}` : '—'], [t.metrics_pages, number(data.pageCount, locale)]].map(([label, value]) => <div key={label} className='border border-line bg-face px-3 py-3'><span className='block text-[11px] text-muted'>{label}</span><b className='mt-1 block text-lg text-ink'>{value}</b></div>)}
						</div>
						<div className='grid grid-cols-[minmax(0,1.45fr)_minmax(220px,0.8fr)] gap-3 max-lg:grid-cols-1'>
							<section className='border border-line bg-face p-3' aria-labelledby='retro-metrics-chart'>
								<div className='mb-2 flex items-center justify-between gap-2'><h2 id='retro-metrics-chart' className='m-0 text-base font-semibold'>{t.metrics_distribution}</h2><span className='font-mono text-[10px] text-muted'>{data.start} → {data.end}</span></div>
								<div className='flex h-[210px] items-end gap-1 border border-line bg-paper px-2 pt-3 pb-6'>
									{days.map((row) => <div key={row.day} title={`${row.day}: ${row.views}`} className='group relative flex h-full flex-1 items-end'><span className='block w-full min-w-[2px] bg-sky transition-[height] group-hover:bg-ink' style={{ height: `${Math.max(row.views ? 3 : 0, (row.views / max) * 100)}%` }} /></div>)}
								</div>
								<div className='mt-1 flex justify-between font-mono text-[10px] text-muted'><span>{days[0]?.day ?? data.start}</span><span>{data.end}</span></div>
							</section>
							<section className='border border-line bg-face p-3' aria-labelledby='retro-metrics-top'><h2 id='retro-metrics-top' className='m-0 mb-3 text-base font-semibold'>{t.metrics_top_pages}</h2><div className='flex flex-col gap-2.5'>{data.topPaths.length === 0 ? <p className='m-0 text-sm text-muted'>{t.metrics_no_data}</p> : data.topPaths.map((row) => <div key={row.path}><div className='mb-1 flex justify-between gap-2 font-mono text-[11px]'><span className='truncate'>{pathLabel(row.path, t)}</span><span className='text-muted'>{number(row.views, locale)}</span></div><div className='h-1.5 bg-line'><div className='h-full bg-yel' style={{ width: `${(row.views / Math.max(1, data.topPaths[0]?.views ?? 1)) * 100}%` }} /></div></div>)}</div></section>
						</div>
					</div>
				)}
				<StatusBar><span>{t.metrics_updated}</span><span>{data ? `${data.start} → ${data.end}` : ''}</span></StatusBar>
			</Win>
			<Note title={t.metrics_title} className='desk:col-span-4 desk:col-start-9 desk:row-start-1 desk:mt-20 desk:-ml-3'>
				<p className='m-0'>{t.metrics_p}</p>
			</Note>
		</div>
	);
}
