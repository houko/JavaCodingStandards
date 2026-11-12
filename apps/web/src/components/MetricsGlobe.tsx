import { type PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { COUNTRY_CENTERS, type GlobeView, LAND, type LonLat, clampLat, graticule, linePath, normalizeLon, project, shapePath } from '../lib/globe';
import { number, percent } from '../lib/metrics';
import { useReducedMotion } from '../lib/motion';

interface RegionView { country: string; views: number }

export interface MetricsGlobeLabels {
	title: string;
	live: string;
	edge: (count: number) => string;
	center: string;
	hint: string;
	unknown: string;
	share: string;
}

const WIDTH = 460;
const HEIGHT = 430;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;
const RADIUS = 178;
const MAX_PLOTTED = 28;
const SPIN_DEG_PER_MS = 0.006;
const GRATICULE = graticule();
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
// The globe's colours come from the --globe-* variables that .globe defines (styles/primitives.css), light or dark by the system setting, so the SVG reads them through style rather than fixed fill and stroke attributes.
const INK = 'var(--globe-ink)';
const HI = 'var(--globe-hi)';
const LABEL = 'var(--globe-label)';

export function regionName(country: string, locale: string, unknown: string): string {
	if (country === 'XX') return unknown;
	if (country === 'T1') return 'Tor';
	try { return new Intl.DisplayNames([locale], { type: 'region' }).of(country) ?? country; } catch { return country; }
}

function shortestLonDelta(from: number, to: number): number {
	return normalizeLon(to - from);
}

export function MetricsGlobe({ regions, regionTotal, locale, labels }: { regions: RegionView[]; regionTotal: number; locale: string; labels: MetricsGlobeLabels }) {
	const reduced = useReducedMotion();
	const listed = useMemo(() => regions.filter((region) => region.views > 0), [regions]);
	const total = Math.max(regionTotal, listed.reduce((sum, region) => sum + region.views, 0));
	const plotted = useMemo(() => listed.filter((region) => COUNTRY_CENTERS[region.country]).slice(0, MAX_PLOTTED), [listed]);
	const peak = Math.max(1, ...plotted.map((region) => region.views));
	const [center, setCenter] = useState<LonLat>(() => [COUNTRY_CENTERS[plotted[0]?.country ?? '']?.[0] ?? 0, 20]);
	const [hovered, setHovered] = useState<string | null>(null);
	const [selected, setSelected] = useState<string | null>(listed[0]?.country ?? null);
	const [spinning, setSpinning] = useState(true);
	const centerRef = useRef(center);
	const flight = useRef<{ from: LonLat; dLon: number; dLat: number; start: number } | null>(null);
	const drag = useRef<{ x: number; y: number; center: LonLat; moved: boolean } | null>(null);
	// Whether the gesture that just ended turned the globe, so its trailing click does not also pick a region.
	const dragged = useRef(false);
	const onScreen = useRef(true);
	const frameRef = useRef<HTMLDivElement>(null);

	const apply = (next: LonLat) => {
		centerRef.current = next;
		setCenter(next);
	};

	useEffect(() => {
		if (selected && listed.some((region) => region.country === selected)) return;
		setSelected(listed[0]?.country ?? null);
	}, [listed, selected]);

	useEffect(() => {
		const node = frameRef.current;
		if (!node || typeof IntersectionObserver === 'undefined') return;
		const observer = new IntersectionObserver(([entry]) => { onScreen.current = entry?.isIntersecting ?? true; });
		observer.observe(node);
		return () => observer.disconnect();
	}, []);

	// One animation loop drives both the idle spin and the fly-to after a region is picked.
	useEffect(() => {
		if (reduced) return;
		let frame = 0;
		let last = performance.now();
		const tick = (now: number) => {
			const dt = Math.min(64, now - last);
			last = now;
			const f = flight.current;
			if (f) {
				const progress = Math.min(1, (now - f.start) / 900);
				const eased = 1 - (1 - progress) ** 3;
				apply([normalizeLon(f.from[0] + f.dLon * eased), f.from[1] + f.dLat * eased]);
				if (progress >= 1) flight.current = null;
			} else if (spinning && onScreen.current && !drag.current) {
				apply([normalizeLon(centerRef.current[0] + dt * SPIN_DEG_PER_MS), centerRef.current[1]]);
			}
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [reduced, spinning]);

	const focus = (country: string) => {
		setSelected(country);
		setSpinning(false);
		const target = COUNTRY_CENTERS[country];
		if (!target) return;
		const to: LonLat = [target[0], clampLat(target[1] * 0.75)];
		if (reduced) {
			apply(to);
			return;
		}
		const from = centerRef.current;
		flight.current = { from, dLon: shortestLonDelta(from[0], to[0]), dLat: to[1] - from[1], start: performance.now() };
	};

	const view: GlobeView = { cx: CX, cy: CY, r: RADIUS, center };
	const land = LAND.map((shape) => shapePath(shape, view)).filter((d): d is string => Boolean(d));
	const grid = GRATICULE.map((line) => linePath(line, view)).filter(Boolean);
	const nodes = plotted
		.map((region, rank) => ({ region, rank, p: project(COUNTRY_CENTERS[region.country]!, view) }))
		.filter((node) => node.p.visible)
		.sort((a, b) => a.p.depth - b.p.depth);
	const focusCountry = hovered ?? selected;
	const focused = listed.find((region) => region.country === focusCountry) ?? listed[0];
	const hoveredNode = hovered ? nodes.find((node) => node.region.country === hovered) : undefined;

	const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
		flight.current = null;
		drag.current = { x: event.clientX, y: event.clientY, center: centerRef.current, moved: false };
		dragged.current = false;
	};
	const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
		const d = drag.current;
		if (!d) return;
		const dx = event.clientX - d.x;
		const dy = event.clientY - d.y;
		if (!d.moved && Math.hypot(dx, dy) < 3) return;
		if (!d.moved) {
			// Capture only once it is a drag: capturing on pointerdown would retarget the click away from the region node under the pointer.
			d.moved = true;
			event.currentTarget.setPointerCapture(event.pointerId);
			setSpinning(false);
			setHovered(null);
		}
		// Scale by the rendered size so a drag across the globe turns it about half a revolution on any screen.
		const scale = 180 / Math.max(1, event.currentTarget.getBoundingClientRect().width);
		apply([normalizeLon(d.center[0] - dx * scale), clampLat(d.center[1] + dy * scale)]);
	};
	const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
		dragged.current = drag.current?.moved ?? false;
		drag.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
	};

	return (
		<div ref={frameRef} className='globe relative overflow-hidden rounded-menu border border-line-2 bg-(--globe-bg)'>
			<div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_36%_40%,var(--glow),transparent_45%)]' />
			<div className='relative grid grid-cols-[minmax(0,1.45fr)_minmax(250px,0.6fr)] max-lg:grid-cols-1'>
				<div className='relative flex flex-col border-r border-line-2 max-lg:border-r-0 max-lg:border-b lg:min-h-[460px]'>
					<div className='pointer-events-none relative z-10 flex items-start justify-between gap-3 p-4 lg:absolute lg:inset-x-0 lg:top-0'>
						<div className='flex items-center gap-2 rounded-full border border-ok/30 bg-ok-soft px-3 py-1.5 text-[11.5px] font-semibold text-ok'><span className='size-1.5 rounded-full bg-ok motion-safe:animate-[metrics-globe-pulse_1.6s_ease-in-out_infinite] [transform-box:fill-box]' aria-hidden='true' />{labels.live}</div>
						<div className='text-right text-[12px] text-fg-3'><div className='text-[18px] font-bold text-blue-ink tabular-nums'>{number(total, locale)}</div><div>{labels.edge(listed.length)}</div></div>
					</div>
					<svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role='img' aria-label={labels.title} className='block h-auto w-full flex-1 cursor-grab touch-none select-none active:cursor-grabbing lg:h-full' onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onPointerLeave={() => { if (!drag.current) setHovered(null); }}>
						<defs>
							<radialGradient id='metrics-globe-fill' cx='38%' cy='32%'><stop offset='0%' style={{ stopColor: 'var(--globe-0)' }} /><stop offset='64%' style={{ stopColor: 'var(--globe-1)' }} /><stop offset='100%' style={{ stopColor: 'var(--globe-2)' }} /></radialGradient>
							<radialGradient id='metrics-globe-rim' cx='50%' cy='50%' r='50%'><stop offset='86%' style={{ stopColor: INK }} stopOpacity='0' /><stop offset='100%' style={{ stopColor: INK }} stopOpacity='0.28' /></radialGradient>
						</defs>
						<circle cx={CX} cy={CY} r={RADIUS + 12} fill='none' style={{ stroke: INK }} strokeOpacity='0.1' strokeWidth='1' />
						<circle cx={CX} cy={CY} r={RADIUS} fill='url(#metrics-globe-fill)' />
						<path d={grid.join('')} fill='none' style={{ stroke: INK }} strokeOpacity='0.13' strokeWidth='0.8' />
						<path d={land.join('')} style={{ fill: INK, stroke: INK }} fillOpacity='0.13' strokeOpacity='0.32' strokeWidth='0.8' strokeLinejoin='round' />
						<circle cx={CX} cy={CY} r={RADIUS} fill='url(#metrics-globe-rim)' style={{ stroke: INK }} strokeOpacity='0.55' strokeWidth='1.5' pointerEvents='none' />
						<g fill='none' style={{ stroke: INK }} strokeDasharray='3 15' strokeLinecap='round'>
							{nodes.map(({ region, rank, p }) => {
								const isFocused = focused?.country === region.country;
								const lift = 30 + (rank % 4) * 14;
								return <path key={`${region.country}-arc`} d={`M ${p.x} ${p.y} Q ${(p.x + CX) / 2} ${Math.min(p.y, CY) - lift} ${CX} ${CY}`} strokeWidth={isFocused ? 2.4 : 1.3} className='motion-safe:animate-[metrics-flow_2.8s_linear_infinite]' style={{ animationDelay: `${rank * -0.22}s`, opacity: (isFocused ? 1 : 0.2 + (region.views / peak) * 0.6) * (0.35 + 0.65 * p.depth) }} />;
							})}
						</g>
						<circle cx={CX} cy={CY} r='16' style={{ fill: INK }} fillOpacity='0.1' className='motion-safe:animate-[metrics-globe-pulse_2s_ease-in-out_infinite] [transform-box:fill-box]' />
						<circle cx={CX} cy={CY} r='4.5' style={{ fill: INK, stroke: 'var(--globe-0)' }} strokeWidth='1' />
						<text x={CX} y={CY + 28} textAnchor='middle' style={{ fill: LABEL }} fontSize='9' fontFamily={MONO} letterSpacing='1.5' pointerEvents='none'>{labels.center}</text>
						{nodes.map(({ region, rank, p }) => {
							const strong = region.views / peak;
							const isFocused = focused?.country === region.country;
							const fade = 0.35 + 0.65 * p.depth;
							return (
								<g key={region.country} className='cursor-pointer' style={{ opacity: isFocused ? 1 : fade }} onPointerEnter={() => { if (!drag.current) setHovered(region.country); }} onPointerLeave={() => setHovered(null)} onClick={() => { if (!dragged.current) focus(region.country); }}>
									<circle cx={p.x} cy={p.y} r={14} fill='transparent' />
									<circle cx={p.x} cy={p.y} r={isFocused ? 13 : 6 + strong * 6} fillOpacity={isFocused ? 0.22 : 0.1} className='motion-safe:animate-[metrics-globe-pulse_2.2s_ease-in-out_infinite] [transform-box:fill-box]' style={{ fill: INK, animationDelay: `${rank * -0.16}s` }} />
									<circle cx={p.x} cy={p.y} r={isFocused ? 4.5 : 2 + strong * 2.5} style={{ fill: isFocused ? HI : INK, stroke: 'var(--globe-0)' }} strokeWidth={isFocused ? 1.5 : 0.8} />
									{(isFocused || rank < 10) && <text x={p.x + 8} y={p.y - 7} style={{ fill: isFocused ? HI : LABEL }} fontSize={isFocused ? 11 : 9} fontWeight={isFocused ? 700 : 400} fontFamily={MONO} pointerEvents='none'>{region.country}</text>}
								</g>
							);
						})}
						{hoveredNode && (() => {
							const { region, p } = hoveredNode;
							const w = 132;
							const x = Math.min(WIDTH - w - 6, Math.max(6, p.x + 12));
							const y = p.y > CY ? p.y - 60 : p.y + 12;
							return (
								<g pointerEvents='none'>
									<rect x={x} y={y} width={w} height={48} rx={8} style={{ fill: 'var(--globe-tip)', stroke: 'var(--globe-tip-line)' }} fillOpacity='0.96' />
									<text x={x + 10} y={y + 17} style={{ fill: LABEL }} fontSize='10' fontFamily={MONO}>{regionName(region.country, locale, labels.unknown)}</text>
									<text x={x + 10} y={y + 37} style={{ fill: HI }} fontSize='15' fontWeight='700' fontFamily={MONO}>{number(region.views, locale)}</text>
									<text x={x + w - 10} y={y + 37} textAnchor='end' style={{ fill: LABEL }} fontSize='10' fontFamily={MONO}>{percent(region.views, total, locale)}</text>
								</g>
							);
						})()}
					</svg>
					<div className='pointer-events-none relative z-10 flex justify-center px-4 pb-4 lg:absolute lg:inset-x-0 lg:bottom-0'><span className='rounded-full border border-line-2 bg-panel/80 px-3 py-1 text-center text-[11.5px] text-fg-3'>{labels.hint}</span></div>
				</div>
				{/* On wide screens the panel takes the globe's height and its list scrolls, rather than the list's length stretching the globe. */}
				<aside className='relative min-h-0'><div className='flex flex-col gap-3 p-4 lg:absolute lg:inset-0'>
					{focused ? (
						<div className='rounded-box border border-blue/25 bg-blue-soft p-4'>
							<div className='text-[13px] font-semibold text-fg-2'>{regionName(focused.country, locale, labels.unknown)}</div>
							<div className='mt-2 flex items-end justify-between gap-3'><strong className='text-[32px] leading-none font-bold tracking-[-0.03em] text-fg tabular-nums'>{number(focused.views, locale)}</strong><span className='font-mono text-[12px] text-blue-ink'>{percent(focused.views, total, locale)}</span></div>
							<div className='mt-3 h-1.5 overflow-hidden rounded-full bg-line-2'><div className='h-full rounded-full bg-blue transition-[width] duration-500' style={{ width: `${total ? (focused.views / total) * 100 : 0}%` }} /></div>
						</div>
					) : <div className='rounded-box border border-line-2 bg-panel p-4 text-sm text-fg-3'>—</div>}
					<div className='flex items-center justify-between border-b border-line-2 pb-2 text-[12px] font-semibold text-fg-3'><span>{labels.title}</span><span>{labels.share}</span></div>
					<ol className='m-0 flex min-h-0 flex-1 list-none flex-col gap-0.5 overflow-y-auto p-0 pr-1 [scrollbar-width:thin] max-lg:max-h-[320px]'>
						{listed.map((region, index) => {
							const isFocused = focused?.country === region.country;
							return (
								<li key={region.country}>
									<button type='button' aria-pressed={selected === region.country} onClick={() => focus(region.country)} onMouseEnter={() => setHovered(region.country)} onMouseLeave={() => setHovered(null)} className={`relative flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-fg-2 transition-[background,border-color] hover:border-line-2 hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${isFocused ? 'border-blue/35 bg-blue-soft hover:border-blue/35 hover:bg-blue-soft' : 'border-transparent bg-transparent'}`}>
										<span className={`relative w-5 shrink-0 font-mono text-[10px] ${isFocused ? 'text-fg-2' : 'text-fg-3'}`}>{index + 1}</span>
										<span className='relative min-w-0 flex-1 truncate text-[12px]'>{regionName(region.country, locale, labels.unknown)}</span>
										<span className={`relative font-mono text-[11px] tabular-nums ${isFocused ? 'text-fg-2' : 'text-fg-3'}`}>{number(region.views, locale)}</span>
										<span className='relative w-12 text-right font-mono text-[11px] text-blue-ink tabular-nums'>{percent(region.views, total, locale)}</span>
									</button>
								</li>
							);
						})}
					</ol>
				</div></aside>
			</div>
		</div>
	);
}
