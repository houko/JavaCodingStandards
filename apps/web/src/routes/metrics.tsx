import { DEFAULT_LANG, type Translations, fill, t } from '@awesome-nsgo/catalog';
import { Link, createFileRoute } from '@tanstack/react-router';
import { type PointerEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { SITE_NAV } from '../components/Header';
import { MetricsGlobe } from '../components/MetricsGlobe';
import { useLang, useT } from '../lib/lang';
import { type MetricsPayload, type MetricsRange, compact, number, pathLabel, percent, shortDay, trackedDays, useMetrics } from '../lib/metrics';
import { SITE_NAME } from '../lib/seo';

export const Route = createFileRoute('/metrics')({
	head: ({ match }) => {
		const copy = t(match.search.lang ?? DEFAULT_LANG);
		return { meta: [{ title: `${copy.metrics_title} · ${SITE_NAME}` }, { name: 'description', content: copy.metrics_p }, { name: 'robots', content: 'noindex,nofollow' }] };
	},
	component: MetricsPage,
});

const RANGES: MetricsRange[] = [7, 30, 90];

function MetricCard({ label, value, hint, accent = false }: { label: string; value: string; hint?: string; accent?: boolean }) {
	return (
		<div className={`flex min-w-0 flex-col rounded-card border p-5 [box-shadow:var(--sh-1)] max-sm:p-4 ${accent ? 'border-blue/25 bg-blue-soft' : 'border-line-2 bg-panel'}`}>
			<p className={`m-0 text-[13px] font-semibold ${accent ? 'text-fg-2' : 'text-fg-3'}`}>{label}</p>
			<p className={`m-0 mt-3 text-[32px] leading-none font-bold tracking-[-0.03em] tabular-nums max-sm:text-[28px] ${accent ? 'text-blue-ink' : 'text-fg'}`}>{value}</p>
			{hint && <p className={`m-0 mt-2.5 truncate text-[12px] ${accent ? 'text-fg-2' : 'text-fg-3'}`} title={hint}>{hint}</p>}
		</div>
	);
}

function Panel({ id, title, aside, children }: { id: string; title: string; aside?: ReactNode; children: ReactNode }) {
	const t = useT();
	return (
		<section className='rounded-card border border-line-2 bg-panel p-5 [box-shadow:var(--sh-1)] max-sm:p-4' aria-labelledby={id}>
			<div className='mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1'>
				<div><h2 id={id} className='m-0 text-[19px] font-bold'>{title}</h2><p className='m-0 mt-1 text-[12px] text-fg-3'>{t.metrics_updated}</p></div>
				{aside}
			</div>
			{children}
		</section>
	);
}

// Round the axis maximum up to 1, 2 or 5 times a power of ten so the tick labels are readable numbers.
function niceMax(value: number): number {
	if (value <= 0) return 1;
	const power = 10 ** Math.floor(Math.log10(value));
	const step = [1, 2, 5, 10].find((m) => m * power >= value) ?? 10;
	return step * power;
}

function ViewChart({ days, locale, label }: { days: { day: string; views: number }[]; locale: string; label: string }) {
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	// Drawn at the container's real pixel width, so axis text stays 12 px on a phone instead of shrinking with a fixed viewBox.
	const frame = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(1080);
	useEffect(() => {
		const node = frame.current;
		if (!node || typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(([entry]) => { if (entry) setWidth(Math.max(260, Math.round(entry.contentRect.width))); });
		observer.observe(node);
		return () => observer.disconnect();
	}, []);
	const height = Math.round(Math.max(220, Math.min(300, width * 0.3)));
	const left = 52;
	const right = 20;
	const top = 22;
	const bottom = 36;
	const max = niceMax(Math.max(...days.map((d) => d.views), 0));
	const plotWidth = width - left - right;
	const plotHeight = height - top - bottom;
	const x = (i: number) => left + (days.length <= 1 ? plotWidth / 2 : (i / (days.length - 1)) * plotWidth);
	const y = (value: number) => top + plotHeight - (value / max) * plotHeight;
	const points = days.map((d, i) => ({ x: x(i), y: y(d.views) }));
	const line = points.map((p) => `${p.x},${p.y}`).join(' ');
	const area = points.length > 1 ? `${points[0]!.x},${top + plotHeight} ${line} ${points.at(-1)!.x},${top + plotHeight}` : '';
	const labelEvery = Math.max(1, Math.ceil(days.length / Math.max(2, Math.floor(width / 110))));
	const dense = days.length > 45;
	const active = activeIndex === null ? undefined : days[activeIndex];
	const activePoint = activeIndex === null ? undefined : points[activeIndex];
	const setActiveFromPointer = (event: PointerEvent<SVGSVGElement>) => {
		if (days.length === 0) return;
		const bounds = event.currentTarget.getBoundingClientRect();
		const viewX = ((event.clientX - bounds.left) / bounds.width) * width;
		const normalized = (viewX - left) / plotWidth;
		setActiveIndex(days.length <= 1 ? 0 : Math.round(Math.max(0, Math.min(1, normalized)) * (days.length - 1)));
	};
	return (
		<div className='relative overflow-hidden rounded-menu border border-line bg-soft p-3'>
			<div ref={frame} className='absolute inset-x-3 top-0 h-0' aria-hidden='true' />
			{active && activePoint && <div className='pointer-events-none absolute top-3 z-10 -translate-x-1/2 rounded-box border border-line-2 bg-raised px-3 py-2 text-center text-[12px] whitespace-nowrap [box-shadow:var(--sh-2)]' style={{ left: `clamp(56px, ${(activePoint.x / width) * 100}%, calc(100% - 56px))` }}>
				<div className='text-fg-3'>{shortDay(active.day, locale)}</div>
				<div className='mt-0.5 text-[15px] font-bold text-blue-ink tabular-nums'>{number(active.views, locale)}</div>
			</div>}
			<svg viewBox={`0 0 ${width} ${height}`} role='img' aria-label={label} className='block h-auto w-full touch-pan-y' onPointerMove={setActiveFromPointer} onPointerDown={setActiveFromPointer} onPointerLeave={() => setActiveIndex(null)}>
				<defs>
					<linearGradient id='metrics-area' x1='0' y1='0' x2='0' y2='1'>
						<stop offset='0%' style={{ stopColor: 'var(--color-blue)' }} stopOpacity='0.22' />
						<stop offset='100%' style={{ stopColor: 'var(--color-blue)' }} stopOpacity='0' />
					</linearGradient>
				</defs>
				<rect width={width} height={height} fill='transparent' pointerEvents='all' />
				{[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
					const value = max * fraction;
					const lineY = y(value);
					return (
						<g key={fraction}>
							<line x1={left} x2={left + plotWidth} y1={lineY} y2={lineY} stroke='currentColor' strokeOpacity={fraction === 0 ? 0.22 : 0.1} strokeDasharray={fraction === 0 ? undefined : '3 7'} />
							<text x={left - 10} y={lineY + 4} textAnchor='end' fill='currentColor' fillOpacity='0.7' fontSize='12' fontFamily='ui-monospace, SFMono-Regular, Menlo, monospace'>{compact(value, locale)}</text>
						</g>
					);
				})}
				{days.map((d, i) => (i % labelEvery === 0 || i === days.length - 1) && (i === days.length - 1 || days.length - 1 - i >= labelEvery / 2) ? <text key={d.day} x={x(i)} y={height - 10} textAnchor={days.length === 1 ? 'middle' : i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle'} fill='currentColor' fillOpacity='0.7' fontSize='12' fontFamily='ui-monospace, SFMono-Regular, Menlo, monospace'>{shortDay(d.day, locale)}</text> : null)}
				{activePoint && <line x1={activePoint.x} x2={activePoint.x} y1={top} y2={top + plotHeight} className='stroke-blue' strokeOpacity='0.35' strokeDasharray='2 4' />}
				{area && <polygon points={area} fill='url(#metrics-area)' className='motion-safe:animate-[metrics-area-in_0.8s_ease-out_both] motion-reduce:animate-none' />}
				{points.length > 1 && <polyline points={line} pathLength='1' fill='none' strokeWidth='3.5' strokeLinecap='round' strokeLinejoin='round' className='stroke-blue motion-safe:animate-[metrics-line-draw_1.1s_cubic-bezier(0.2,0.7,0.2,1)_both] motion-reduce:animate-none' />}
				{points.map((p, i) => <circle key={days[i]?.day} cx={p.x} cy={p.y} r={activeIndex === i ? (dense ? 4.5 : 6) : dense ? 2 : 4} strokeWidth='2' className={`stroke-blue ${activeIndex === i ? 'fill-blue' : 'fill-panel'} [transform-box:fill-box] motion-safe:animate-[metrics-point-pop_0.35s_ease-out_both] motion-reduce:animate-none`} style={{ animationDelay: `${Math.min(i * 22, 420)}ms` }} />)}
			</svg>
		</div>
	);
}

function PageLink({ path, className, children }: { path: string; className: string; children: ReactNode }) {
	if (path.startsWith('/apps/')) return <Link to='/apps/$slug' params={{ slug: path.slice('/apps/'.length) }} className={className}>{children}</Link>;
	const nav = path === '/' ? { to: '/' as const } : SITE_NAV.find((n) => n.to === path);
	if (nav) return <Link to={nav.to} className={className}>{children}</Link>;
	return <span className={className}>{children}</span>;
}

function TopPages({ rows, total, locale, t }: { rows: MetricsPayload['topPaths']; total: number; locale: string; t: Translations }) {
	if (rows.length === 0) return <p className='m-0 text-[14px] text-fg-3'>{t.metrics_no_data}</p>;
	const max = Math.max(1, rows[0]?.views ?? 1);
	return (
		<ol className='m-0 grid list-none grid-cols-2 gap-x-8 gap-y-1 p-0 max-lg:grid-cols-1'>
			{rows.map((row, i) => (
				<li key={row.path}>
					<PageLink path={row.path} className='group -mx-2 flex flex-col gap-1.5 rounded-box px-2 py-2 text-inherit no-underline transition-colors hover:bg-soft'>
						<span className='flex items-center gap-3 text-[13px]'>
							<span className='w-5 shrink-0 font-mono text-[11px] text-fg-3'>{i + 1}</span>
							<span className='min-w-0 flex-1 truncate text-fg-2 group-hover:text-blue-ink' title={row.path}>{pathLabel(row.path, t)}</span>
							<span className='font-mono text-[12px] text-fg-3 tabular-nums'>{number(row.views, locale)}</span>
							<span className='w-12 text-right font-mono text-[11px] text-blue-ink tabular-nums'>{percent(row.views, total, locale)}</span>
						</span>
						<span className='ml-8 h-1.5 overflow-hidden rounded-full bg-line-2'><span className={`block h-full rounded-full transition-[width] duration-500 ${i === 0 ? 'bg-blue' : 'bg-blue/40'}`} style={{ width: `${(row.views / max) * 100}%` }} /></span>
					</PageLink>
				</li>
			))}
		</ol>
	);
}

function MetricsPage() {
	const t = useT();
	const locale = useLang();
	const [range, setRange] = useState<MetricsRange>(30);
	const { loading, refreshing, error, reason, data, updatedAt } = useMetrics(range);
	const days = useMemo(() => (data ? trackedDays(data.daily, data.since) : []), [data]);
	const peak = useMemo(() => (days.length ? days.reduce((best, row) => (row.views > best.views ? row : best), days[0]!) : undefined), [days]);
	const today = days.at(-1);
	const yesterday = days.length > 1 ? days.at(-2) : undefined;
	const partialRange = Boolean(data?.since && data.since > data.start);
	const range0 = days[0]?.day ?? data?.start ?? '';
	const updated = updatedAt ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(updatedAt) : undefined;
	const rangeTag = data && <span className='font-mono text-[12px] text-blue-ink'>{range0} → {data.end}</span>;
	return (
		<section className='page enter gap-7 max-sm:gap-5'>
			<header className='flex flex-wrap items-end justify-between gap-5'>
				<div className='flex flex-col gap-3.5'>
					<span className='kicker'>{t.metrics_title}</span>
					<h1 className='page-h1'>{t.metrics_h}</h1>
					<p className='page-p max-w-[680px]'>{t.metrics_p}</p>
				</div>
				<div className='flex items-center gap-2 rounded-full border border-ok/30 bg-ok-soft px-3.5 py-2 text-[13px] font-semibold text-ok' aria-live='polite'>
					<span className={`size-2 rounded-full bg-ok ${refreshing ? 'motion-safe:animate-pulse' : ''}`} aria-hidden='true' />
					{t.metrics_live}
					{updated && <span className='font-medium text-ok tabular-nums'>· {fill(t.metrics_updated_at, { x: updated })}</span>}
				</div>
			</header>
			<div className='flex flex-wrap items-center justify-between gap-3 rounded-card border border-line-2 bg-panel p-2'>
				<div className='flex flex-wrap items-center gap-x-3 gap-y-1 px-2'>
					<span className='text-[13px] font-semibold text-fg-3'>{t.metrics_range}</span>
					{partialRange && data?.since && <span className='rounded-full border border-dev/30 bg-dev-soft px-2.5 py-0.5 text-[12px] font-medium text-dev'>{fill(t.metrics_since, { x: shortDay(data.since, locale) })}</span>}
				</div>
				<div role='tablist' aria-label={t.metrics_range} className='flex gap-1 rounded-full bg-soft p-1'>
					{RANGES.map((n) => <button key={n} type='button' role='tab' aria-selected={range === n} onClick={() => setRange(n)} className='seg-tab min-h-8 rounded-full border-0 bg-transparent px-3.5 text-[13px] font-semibold text-fg-2 transition-[background,color,box-shadow] hover:text-fg aria-selected:bg-panel aria-selected:text-fg aria-selected:[box-shadow:var(--sh-1),0_0_0_1px_var(--color-line-2)] max-md:min-h-10'>{t[`metrics_${n}d` as 'metrics_7d' | 'metrics_30d' | 'metrics_90d']}</button>)}
				</div>
			</div>
			{loading ? <div className='rounded-card border border-line-2 bg-panel p-10 text-center text-fg-3'>{t.metrics_loading}</div> : error || !data ? <div className='rounded-card border border-dashed border-line-3 bg-panel p-10 text-center text-fg-2'>{reason === 'not_configured' ? t.metrics_not_configured : t.metrics_unavailable}</div> : (
				<div className={`flex flex-col gap-7 transition-opacity max-sm:gap-5 ${refreshing && data.days !== range ? 'opacity-60' : ''}`}>
					<div className='grid grid-cols-4 gap-3 max-md:grid-cols-2'>
						<MetricCard label={t.metrics_views} value={number(data.total, locale)} hint={days.length ? fill(t.metrics_avg, { n: number(Math.round(data.total / days.length), locale) }) : undefined} accent />
						<MetricCard label={t.metrics_today} value={number(today?.views ?? 0, locale)} hint={yesterday ? fill(t.metrics_yesterday, { n: number(yesterday.views, locale) }) : today ? `${shortDay(today.day, locale)} · UTC` : undefined} />
						<MetricCard label={t.metrics_peak} value={peak ? number(peak.views, locale) : '—'} hint={peak ? shortDay(peak.day, locale) : undefined} />
						<MetricCard label={t.metrics_pages} value={number(data.pageCount, locale)} hint={data.topPaths[0] ? fill(t.metrics_top_page, { x: pathLabel(data.topPaths[0].path, t) }) : undefined} />
					</div>
					<Panel id='metrics-regions' title={t.metrics_regions} aside={rangeTag}>
						<MetricsGlobe regions={data.regions} regionTotal={data.regionTotal} locale={locale} labels={{ title: t.metrics_regions, live: t.metrics_globe_live, edge: (n) => fill(t.metrics_globe_edge, { n }), center: t.metrics_globe_center, hint: t.metrics_globe_hint, unknown: t.metrics_region_unknown, share: t.metrics_share }} />
					</Panel>
					<Panel id='metrics-distribution' title={t.metrics_distribution} aside={rangeTag}>
						<ViewChart days={days} locale={locale} label={t.metrics_distribution} />
					</Panel>
					<Panel id='metrics-top-pages' title={t.metrics_top_pages}>
						<TopPages rows={data.topPaths} total={data.total} locale={locale} t={t} />
					</Panel>
				</div>
			)}
		</section>
	);
}
