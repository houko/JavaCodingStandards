import { type SearchCat, type SearchItem, buildSearchIndex, fill, searchCatalog } from '@awesome-nsgo/catalog';
import { useNavigate } from '@tanstack/react-router';
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useDialog } from '../lib/dialog';
import { useLang, useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { SearchIcon } from './bits';
import { NavIcon } from './marks';

const JUMPS = [
	{ to: '/', key: 'nav_home' },
	{ to: '/ui', key: 'cat_ui_name' },
	{ to: '/state', key: 'cat_state_name' },
	{ to: '/templates', key: 'cat_tpl_name' },
	{ to: '/ai', key: 'cat_ai_name' },
	{ to: '/plugins', key: 'nav_plugins' },
	{ to: '/showcase', key: 'cat_show_name' },
	{ to: '/learn', key: 'learn_h' },
] as const;

export function CommandPalette() {
	const { palette, openPalette, closePalette, openApp, openSubmit } = useSite();

	// ⌘K / Ctrl+K opens search from anywhere.
	useEffect(() => {
		const onKey = (e: globalThis.KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				openPalette();
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [openPalette]);

	if (!palette) return null;
	return <Palette onClose={closePalette} onApp={openApp} onSubmit={() => openSubmit()} />;
}

// Mounted only while open, so the query resets every time it opens.
function Palette({ onClose, onApp, onSubmit }: { onClose: () => void; onApp: (slug: string) => void; onSubmit: () => void }) {
	const t = useT();
	const lang = useLang();
	const navigate = useNavigate();
	const ref = useDialog<HTMLDivElement>();
	const listRef = useRef<HTMLDivElement>(null);
	const [q, setQ] = useState('');
	const [active, setActive] = useState(0);
	const index = useMemo(() => buildSearchIndex(lang), [lang]);
	const results = searchCatalog(index, q);
	const hasQuery = q.trim() !== '';
	const catLabel: Record<SearchCat, string> = { ui: t.cat_ui_name, state: t.cat_state_name, template: t.cat_tpl_name, ai: t.cat_ai_name, plugin: t.nav_plugins, showcase: t.cat_show_name, article: t.article };

	const go = (to: (typeof JUMPS)[number]['to']) => {
		void navigate({ to }).finally(onClose);
	};
	const open = (r: SearchItem) => {
		const tg = r.target;
		if (tg.type === 'url') window.open(tg.url, '_blank', 'noopener');
		else if (tg.type === 'page') go(tg.path);
		else onApp(tg.slug);
	};

	const count = hasQuery ? results.length : JUMPS.length;
	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (count === 0) return;
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			const next = (active + (e.key === 'ArrowDown' ? 1 : -1) + count) % count;
			setActive(next);
			listRef.current?.querySelector(`[data-i="${next}"]`)?.scrollIntoView({ block: 'nearest' });
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (hasQuery) open(results[Math.min(active, count - 1)]);
			else go(JUMPS[Math.min(active, count - 1)].to);
		}
	};

	return (
		// Below md the palette is a full-width sheet at the top of the screen, as tall as the dynamic viewport at most, so the input and the first results stay above the on-screen keyboard.
		<div className='fade fixed inset-0 z-50 flex items-start justify-center bg-scrim px-4 pt-[12vh] pb-4 backdrop-blur-[4px] max-md:p-0 max-md:pt-[env(safe-area-inset-top)]'>
			<div ref={ref} role='dialog' aria-modal='true' aria-label={t.search} onKeyDown={onKeyDown} className='enter flex max-h-[70vh] w-full max-w-[640px] flex-col overflow-hidden rounded-band border border-line-2 bg-raised [box-shadow:var(--sh-3)] max-md:max-h-[calc(100dvh-env(safe-area-inset-top))] max-md:max-w-none max-md:rounded-t-none max-md:border-x-0 max-md:border-t-0'>
				<div className='flex items-center gap-3 border-b border-line pr-3 pl-5 max-md:px-6 max-sm:px-4'>
					<span className='flex text-blue'>
						<SearchIcon size={20} />
					</span>
					<label htmlFor='q' className='sr-only'>
						{t.search_label}
					</label>
					<input
						id='q'
						type='search'
						autoFocus
						value={q}
						onChange={(e) => {
							setQ(e.target.value);
							setActive(0);
						}}
						placeholder={t.search_ph}
						autoComplete='off'
						className='h-14 min-w-0 flex-auto border-0 bg-transparent font-[family-name:inherit] text-[17px] text-fg outline-none placeholder:text-fg-3'
						role='combobox'
						aria-expanded='true'
						aria-controls='palette-list'
						aria-activedescendant={count > 0 ? `pi-${active}` : undefined}
					/>
					<button type='button' onClick={onClose} aria-label={t.close} className='btn-g min-h-8 rounded-full border border-line-2 bg-panel px-3 py-0 text-[12.5px] font-semibold text-fg-2 hover:border-line-3 hover:bg-soft max-md:min-h-10'>
						{t.close}
					</button>
				</div>
				<div id='palette-list' role='listbox' aria-label={t.search} className='overflow-y-auto p-2 max-md:overscroll-contain max-md:px-3 max-md:pb-[calc(8px+env(safe-area-inset-bottom))] max-sm:px-1' ref={listRef}>
					{!hasQuery && (
						<>
							<span className='block px-3 pt-3 pb-1.5 text-[12px] font-semibold text-fg-3'>{t.jump}</span>
							{JUMPS.map((j, i) => (
								<button key={j.to} id={`pi-${i}`} data-i={i} role='option' aria-selected={i === active} type='button' className='row group flex min-h-12 w-full items-center gap-3.5 rounded-box border-0 bg-transparent px-3 py-0 text-left text-[15px] text-fg hover:bg-soft aria-selected:bg-blue-soft aria-selected:text-blue-ink' onClick={() => go(j.to)} onPointerMove={() => setActive(i)}>
									<span className='flex size-8 flex-none items-center justify-center rounded-[9px] bg-soft text-blue group-aria-selected:bg-panel'>
										<NavIcon to={j.to} size={16} />
									</span>
									<span className='flex-auto'>{t[j.key]}</span>
								</button>
							))}
						</>
					)}
					{hasQuery && (
						<>
							<span className='block px-3 pt-3 pb-1.5 text-[12px] font-semibold text-fg-3'>{fill(t.results, { x: String(results.length) })}</span>
							{results.map((r, i) => (
								<button key={`${r.cat}:${r.name}:${i}`} id={`pi-${i}`} data-i={i} role='option' aria-selected={i === active} type='button' className='row group flex w-full items-center gap-3.5 rounded-box border-0 bg-transparent p-3 text-left text-fg hover:bg-soft aria-selected:bg-blue-soft aria-selected:text-blue-ink' onClick={() => open(r)} onPointerDown={(e) => e.preventDefault()} onPointerMove={() => setActive(i)}>
									<span className='inline-flex h-6 min-w-14 flex-none items-center justify-center rounded-full bg-soft px-2 text-[11.5px] font-semibold text-fg-2 group-aria-selected:bg-panel'>{catLabel[r.cat]}</span>
									<span className='flex min-w-0 flex-auto flex-col gap-0.5'>
										<span className='text-[15px] font-semibold max-md:wrap-break-word'>{r.name}</span>
										<span className='truncate text-[13px] text-fg-3 group-aria-selected:text-fg-2'>{r.desc}</span>
									</span>
									<span aria-hidden='true' className='text-fg-3 group-aria-selected:text-blue-ink'>
										{r.target.type === 'url' ? '↗' : '→'}
									</span>
								</button>
							))}
							{results.length === 0 && (
								<div className='flex flex-col items-center gap-3.5 px-4 py-8 text-center'>
									<span className='flex size-12 items-center justify-center rounded-menu bg-blue-soft text-blue'>
										<SearchIcon size={22} />
									</span>
									<p className='m-0 text-[15px] text-fg-2'>{t.no_res}</p>
									<button type='button' className='btn-c btn-44' onClick={onSubmit}>
										{t.submit_it}
									</button>
								</div>
							)}
						</>
					)}
				</div>
				{/* The keyboard hint; phones have no arrow keys, so below md it is left out and the list reaches the bottom of the sheet. */}
				<div className='border-t border-line px-5 py-2.5 text-[12px] text-fg-3 max-md:hidden' aria-hidden='true'>
					{t.kbd_hint}
				</div>
			</div>
		</div>
	);
}
