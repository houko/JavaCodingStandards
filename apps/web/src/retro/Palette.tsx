import { type SearchCat, type SearchItem, buildSearchIndex, fill, pad2, searchCatalog } from '@awesome-nsgo/catalog';
import { useNavigate } from '@tanstack/react-router';
import { type KeyboardEvent, useMemo, useRef, useState } from 'react';
import { useDialog } from '../lib/dialog';
import { useLang, useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { Pixels, StatusBar, Win, btnGo, btnSm, well } from './ui';

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

// A magnifying glass for the empty result list, in the shared palette (k ink, c pale blue, w paper, o orange).
const MAGNIFIER = ['................', '....kkkkk.......', '...kccccck......', '..kcwwcccck.....', '.kcwccccccck....', '.kcwccccccck....', '.kccccccccck....', '.kccccccccck....', '.kccccccccck....', '..kccccccck.....', '...kccccckkk....', '....kkkkk.kok...', '...........kok..', '............kok.', '.............kk.', '................'] as const;

// A list row: the highlighted one is filled, like a selection in a file list.
const row = 'group w-full cursor-pointer rounded-md border-0 bg-transparent px-2 text-left aria-selected:bg-ink aria-selected:text-paper';

// The ⌘K listener and Escape live in RetroApp; this only renders the Find window while it is open.
export function RetroPalette() {
	const { palette, closePalette, openApp, openSubmit } = useSite();
	if (!palette) return null;
	return <Find onClose={closePalette} onApp={openApp} onSubmit={() => openSubmit()} />;
}

// Mounted only while open, so the query resets every time it opens.
function Find({ onClose, onApp, onSubmit }: { onClose: () => void; onApp: (slug: string) => void; onSubmit: () => void }) {
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
		<div className='fixed inset-0 z-[60] flex items-start justify-center bg-ink/35 backdrop-blur-[2px] px-3 pt-3 pb-4 desk:pt-[12vh]'>
			<div ref={ref} role='dialog' aria-modal='true' aria-label={t.search} onKeyDown={onKeyDown} className='w-full max-w-[600px]'>
				<Win title={t.search} onClose={onClose}>
					<div className='flex items-center gap-2 px-1.5 pt-[3px] pb-1.5'>
						<label htmlFor='q' className='sr-only'>
							{t.search_label}
						</label>
						<div className='flex h-[28px] min-w-0 flex-1 items-center gap-1.5 rounded-md border border-line bg-hi px-2 focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-pur'>
							<span aria-hidden='true' className='text-faint'>
								⌕
							</span>
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
								className='h-full min-w-0 flex-1 border-0 bg-transparent p-0 outline-none placeholder:text-faint focus-visible:shadow-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden'
								role='combobox'
								aria-expanded='true'
								aria-controls='palette-list'
								aria-activedescendant={count > 0 ? `pi-${active}` : undefined}
							/>
						</div>
						<button type='button' onClick={onClose} className={btnSm}>
							{t.close}
						</button>
					</div>
					<div id='palette-list' role='listbox' aria-label={t.search} ref={listRef} className={`${well} max-h-[min(60vh,440px)] overflow-y-auto p-1`}>
						{!hasQuery && (
							<>
								<span className='block border-b border-line px-2 pb-1 text-muted'>{t.jump}</span>
								{JUMPS.map((j, i) => (
									<button key={j.to} id={`pi-${i}`} data-i={i} role='option' aria-selected={i === active} type='button' className={`${row} flex h-7 items-center gap-3`} onClick={() => go(j.to)} onPointerMove={() => setActive(i)}>
										<span className='font-mono text-lo group-aria-selected:text-sky'>{pad2(i + 1)}</span>
										<span className='flex-1'>{t[j.key]}</span>
										<span aria-hidden='true' className='invisible group-aria-selected:visible'>
											→
										</span>
									</button>
								))}
							</>
						)}
						{hasQuery && (
							<>
								<span className='block border-b border-line px-2 pb-1 text-muted'>{fill(t.results, { x: String(results.length) })}</span>
								{results.map((r, i) => (
									<button key={`${r.cat}:${r.name}:${i}`} id={`pi-${i}`} data-i={i} role='option' aria-selected={i === active} type='button' className={`${row} grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 py-1 desk:grid-cols-[8.5rem_minmax(0,1fr)_auto]`} onClick={() => open(r)} onPointerDown={(e) => e.preventDefault()} onPointerMove={() => setActive(i)}>
										<span className='col-start-2 row-start-1 max-w-[8.5rem] justify-self-end truncate rounded-full bg-face-lo px-2 text-xs leading-5 text-ink group-aria-selected:bg-yel desk:col-start-1 desk:justify-self-start'>{catLabel[r.cat]}</span>
										<span className='col-start-1 row-start-1 grid min-w-0 desk:col-start-2'>
											<span className='truncate'>{r.name}</span>
											<span className='truncate text-muted group-aria-selected:text-slate'>{r.desc}</span>
										</span>
										<span aria-hidden='true' className='hidden desk:col-start-3 desk:row-start-1 desk:block'>
											{r.target.type === 'url' ? '↗' : '→'}
										</span>
									</button>
								))}
								{results.length === 0 && (
									<div className='grid justify-items-center gap-3 px-4 pt-5 pb-6 text-center'>
										<Pixels rows={MAGNIFIER} scale={3} />
										<p className='m-0'>{t.no_res}</p>
										<button type='button' className={btnGo} onClick={onSubmit}>
											{t.submit_it}
										</button>
									</div>
								)}
							</>
						)}
					</div>
					<StatusBar>
						<span aria-hidden='true'>{t.kbd_hint}</span>
						<span aria-hidden='true' className='hidden desk:inline'>
							Esc {t.close}
						</span>
					</StatusBar>
				</Win>
			</div>
		</div>
	);
}
