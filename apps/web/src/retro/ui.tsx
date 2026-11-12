import type { App } from '@awesome-nsgo/catalog';
import { Link } from '@tanstack/react-router';
import { type ReactNode, useState } from 'react';
import { useT } from '../lib/lang';
import { BITMAPS, type BitmapName, EMBLEMS, type EmblemName, FOLDER, FOLDER_PAL, type FolderColor, PAL } from './bitmaps';

// ---- class names shared by every retro page ----

// A push button; `go` is the default (yellow) button of a dialog, `sm` the compact one used in toolbars and the menu bar. Each variant sets its height, padding and colours once: two Tailwind classes for the same property on one element resolve by stylesheet order, not by their order in the class list, so a variant must not be built by appending an override.
const BTN = 'inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md border no-underline shadow-[0_1px_1px_rgb(16_35_58/.06)] transition-colors aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper disabled:cursor-not-allowed disabled:border-line disabled:bg-face disabled:text-lo disabled:shadow-none';
const PLAIN = 'border-line bg-hi hover:bg-face active:bg-face-lo';
const GO = 'border-[#e0b100] bg-yel font-medium hover:bg-yel-hi active:bg-yel';
export const btn = `${BTN} ${PLAIN} h-[28px] px-3.5`;
export const btnGo = `${BTN} ${GO} h-[28px] px-3.5`;
export const btnSm = `${BTN} ${PLAIN} h-[24px] px-2.5`;
export const btnGoSm = `${BTN} ${GO} h-[24px] px-2.5`;
// The like button (components/Like.tsx): a pill with a heart and the count, pink once liked. `likeBtnLg` matches the 28 px push buttons it sits beside.
const LIKE = 'inline-flex cursor-pointer items-center gap-1 rounded-full border border-line bg-hi tabular-nums shadow-[0_1px_1px_rgb(16_35_58/.06)] transition-colors hover:text-[#e5486b] aria-pressed:border-[#f3a7b8] aria-pressed:bg-[#fff0f3] aria-pressed:text-[#e5486b] disabled:cursor-default';
export const likeBtn = `${LIKE} h-[24px] px-2 text-xs`;
export const likeBtnLg = `${LIKE} h-[28px] px-3`;
// A drop-down with its own chevron, 8 px from the edge, rather than the browser's, which crowds the text.
export const select = 'h-[24px] cursor-pointer appearance-none rounded-md border border-line bg-hi pr-6 pl-2 chevron';
export const seg = '-ml-px first:ml-0 not-first:rounded-l-none not-last:rounded-r-none';
// A text field.
export const field = 'flex h-[24px] items-center gap-1.5 rounded-md border border-line bg-hi px-2';
// An inline link.
export const lnk = 'underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink';
// A label under or beside an icon that highlights with its link.
export const iconLabel = 'rounded-sm px-1 leading-5 group-hover:bg-ink/8';
// The white content area inside a window.
export const well = 'rounded-lg border border-line bg-paper';

// ---- pixel art ----

function rects(rows: readonly string[], pal: Record<string, string>) {
	const out: ReactNode[] = [];
	rows.forEach((row, y) => {
		let x = 0;
		while (x < row.length) {
			const c = row[x];
			let run = 1;
			while (x + run < row.length && row[x + run] === c) run++;
			if (c !== '.') out.push(<rect key={`${x}-${y}`} x={x} y={y} width={run} height={1} fill={pal[c]} />);
			x += run;
		}
	});
	return out;
}

export function Pixels({ rows, scale = 2, pal, className = '' }: { rows: readonly string[]; scale?: number; pal?: Record<string, string>; className?: string }) {
	const w = rows[0].length;
	const h = rows.length;
	return (
		<svg className={`block shrink-0 ${className}`} width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`} shapeRendering='crispEdges' aria-hidden='true'>
			{rects(rows, { ...PAL, ...pal })}
		</svg>
	);
}

export function PixelIcon({ name, scale = 2, className }: { name: BitmapName; scale?: number; className?: string }) {
	return <Pixels rows={BITMAPS[name]} scale={scale} className={className} />;
}

export function Folder({ emblem, color, scale = 3 }: { emblem: EmblemName; color: FolderColor; scale?: number }) {
	const rows = FOLDER.map((r) => r.split(''));
	EMBLEMS[emblem].forEach((er, dy) => {
		[...er].forEach((ch, dx) => {
			if (ch === 'k') rows[8 + dy][5 + dx] = 'k';
		});
	});
	const [tab, front] = FOLDER_PAL[color];
	return <Pixels rows={rows.map((r) => r.join(''))} scale={scale} pal={{ y: tab, f: front }} />;
}

// ---- windows ----

const LIGHT = 'size-3 shrink-0 rounded-full border border-black/10';

// A window: a title bar with the three window lights and a centred title, a light frame, rounded corners and a soft shadow. `idle` greys the lights like a window in the background. The title is a heading of the given level so each window labels its section.
// The red light closes the window: `onClose` for a dialog, `closeTo` for a page's main window (it leaves for that page, as closing the window leaves the section), and otherwise the window just goes away until the page is opened again.
// `fill` keeps the window within one screen on the desktop: the body becomes a flex column, and the page gives one of its children `relative min-h-0 flex-1 overflow-y-auto` to scroll inside the window. The scroller must be `relative`, or absolutely positioned descendants (sr-only text) escape it and stretch the page again.
export function Win({ title, idle = false, level = 2, id, fill = false, className = '', bodyClassName = '', children, onClose, closeTo }: { title: ReactNode; idle?: boolean; level?: 1 | 2 | 3; id?: string; fill?: boolean; className?: string; bodyClassName?: string; children: ReactNode; onClose?: () => void; closeTo?: '/' | '/showcase' }) {
	const t = useT();
	const [closed, setClosed] = useState(false);
	const H = `h${level}` as 'h1' | 'h2' | 'h3';
	if (closed) return null;
	const close = `${LIGHT} cursor-pointer bg-[#ff5f57] p-0 hover:brightness-90`;
	return (
		<section id={id} aria-labelledby={id ? `${id}-t` : undefined} className={`rounded-xl border border-line bg-face px-1 pb-1 shadow-win ${fill ? 'desk:flex desk:max-h-(--win-max) desk:flex-col' : ''} ${className}`}>
			<div className='relative flex h-[28px] items-center gap-2 px-2'>
				<span className='flex gap-1.5'>
					{closeTo ? <Link to={closeTo} aria-label={t.close} title={t.close} className={`${close} block`} /> : <button type='button' onClick={onClose ?? (() => setClosed(true))} aria-label={t.close} title={t.close} className={close} />}
					<span aria-hidden='true' className={`${LIGHT} ${idle ? 'bg-lo/60' : 'bg-[#febc2e]'}`} />
					<span aria-hidden='true' className={`${LIGHT} ${idle ? 'bg-lo/60' : 'bg-[#28c840]'}`} />
				</span>
				<H id={id ? `${id}-t` : undefined} className={`absolute inset-x-20 truncate text-center text-xs leading-[28px] font-semibold ${idle ? 'text-faint' : 'text-muted'}`}>
					{title}
				</H>
			</div>
			<div className={`${fill ? 'desk:flex desk:min-h-0 desk:flex-1 desk:flex-col' : ''} ${bodyClassName}`}>{children}</div>
		</section>
	);
}

// The status line along a window's bottom edge.
export function StatusBar({ children }: { children: ReactNode }) {
	return <div className='flex flex-wrap items-center gap-x-3.5 gap-y-1 px-2 pt-1 pb-px text-xs leading-5 text-muted'>{children}</div>;
}

// ---- small pieces ----

export function KindTag({ kind, label }: { kind: App['kind']; label: string }) {
	return <span className={`inline-block rounded-full px-2 text-xs leading-5 ${kind === 'go' ? 'bg-ink text-paper' : 'bg-yel text-ink'}`}>{label}</span>;
}

// The app's official icon, or a letter tile when it has none.
export function AppIcon({ app, size }: { app: App; size: number }) {
	if (app.icon) return <img src={app.icon} alt='' width={size} height={size} loading='lazy' decoding='async' className='block shrink-0 rounded-[22%] bg-paper object-cover' style={{ width: size, height: size }} />;
	return (
		<span aria-hidden='true' className='grid shrink-0 place-items-center rounded-[22%] bg-yel leading-none font-semibold' style={{ width: size, height: size, fontSize: Math.round(size / 2) }}>
			{app.name.charAt(0).toUpperCase()}
		</span>
	);
}

// A sticky note: pale yellow paper with a soft shadow.
export function Note({ title, className = '', children }: { title: ReactNode; className?: string; children: ReactNode }) {
	return (
		<aside className={`rounded-xl border border-[#ecd98a] bg-note px-4 pt-4 pb-4 shadow-win ${className}`}>
			<span className='sr-only'>{title}</span>
			{children}
		</aside>
	);
}
