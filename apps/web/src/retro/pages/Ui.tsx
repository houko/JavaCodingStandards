import { type AppKind, HAS_SCORES, NATIVE_UI_DOCS, type Surface, UI_KEYS, UI_LIBS, type UiLib, type UiLibKey, fill, likeKey, pick } from '@awesome-nsgo/catalog';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { LikeButton } from '../../components/Like';
import { ScoreButton } from '../../components/Score';
import { useLang, useT } from '../../lib/lang';
import { useLikes } from '../../lib/likes';
import { useSite } from '../../lib/site';
import { UI_DEFAULT_SORT, type UiSort, shownUiSort, sortUiLibs } from '../../lib/ui';
import { DesktopIcons } from '../DesktopIcons';
import { Note, StatusBar, Win, btnGo, btnSm, seg, field, likeBtn, lnk, select, well } from '../ui';

const TAG: Record<UiLibKey, 'tag_theme' | 'tag_retro' | 'tag_icons'> = { theme: 'tag_theme', retro: 'tag_retro', icons: 'tag_icons' };
// The kind of app as the plugins page marks it: Go in ink, TSX in yellow, both in sky.
const SURF_TONE: Record<Surface, string> = { go: 'bg-ink text-paper', tsx: 'bg-yel text-ink', both: 'bg-sky/60 text-ink' };
const SURF: Record<Surface, 'surf_go' | 'surf_tsx' | 'surf_both'> = { go: 'surf_go', tsx: 'surf_tsx', both: 'surf_both' };

// The UI components page: one window with the filter in its toolbar, the introduction in a side panel and the libraries in a list that scrolls inside the window, so the page stays on one screen on the desktop. A sticky note beside it asks for more.
export function Ui() {
	const t = useT();
	// ?tag= and ?surface= keep the filters in the address, as in the original look.
	const { tag, surface, sort: sortParam } = useSearch({ from: '/ui' });
	const { status: likes, counts } = useLikes();
	const sort = shownUiSort(sortParam, likes);
	const navigate = useNavigate({ from: '/ui' });
	const setFilter = (next: { tag?: UiLibKey; surface?: AppKind; sort?: UiSort }) => void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true, resetScroll: false });
	// A library for both kinds of app shows under either. The tags count the libraries of the chosen kind, as in the original look.
	const ofSurface = UI_LIBS.filter((l) => !surface || l.surface === surface || l.surface === 'both');
	const chips = [{ key: undefined, n: ofSurface.length, label: t.all }, ...UI_KEYS.map((k) => ({ key: k, n: ofSurface.filter((l) => l.key === k).length, label: t[TAG[k]] }))].filter((c) => c.key === undefined || c.n > 0 || c.key === tag);
	const surfaces = [
		{ key: undefined, n: UI_LIBS.length, label: t.all },
		{ key: 'go' as const, n: UI_LIBS.filter((l) => l.surface !== 'tsx').length, label: t.surf_go },
		{ key: 'tsx' as const, n: UI_LIBS.filter((l) => l.surface !== 'go').length, label: t.surf_tsx },
	];
	const libs = sortUiLibs(ofSurface.filter((l) => !tag || l.key === tag), sort, counts);
	return (
		<div className='relative mx-auto flex max-w-[1440px] flex-col gap-[26px] px-3.5 pt-3.5 desk:block desk:pt-[26px] desk:pr-10 desk:pl-[136px] min-[1261px]:grid min-[1261px]:grid-cols-[minmax(0,1fr)_260px] min-[1261px]:items-start min-[1261px]:gap-x-10 min-[1261px]:pr-6'>
			<DesktopIcons className='hidden desk:absolute desk:top-[26px] desk:left-[18px] desk:grid desk:grid-cols-1 desk:gap-4' />
			<Win level={1} title={t.cat_ui_name} fill closeTo='/'>
				<div className='flex flex-wrap items-center gap-2.5 px-1.5 pt-[3px] pb-1.5'>
					<div role='group' aria-label={t.a_filter} className='flex flex-wrap'>
						{chips.map((c) => (
							<button key={c.key ?? 'all'} type='button' aria-pressed={tag === c.key} onClick={() => setFilter({ tag: c.key })} className={`${btnSm} ${seg}`}>
								{c.label} · {c.n}
							</button>
						))}
					</div>
					<div role='group' aria-label={t.a_kind} className='flex flex-wrap'>
						{surfaces.map((c) => (
							<button key={c.key ?? 'all'} type='button' aria-pressed={surface === c.key} onClick={() => setFilter({ surface: c.key })} className={`${btnSm} ${seg}`}>
								{c.label} · {c.n}
							</button>
						))}
					</div>
					<span className='flex-1' />
					<label className='flex items-center gap-1.5 whitespace-nowrap'>
						{t.sort}
						<select value={sort} onChange={(e) => setFilter({ sort: e.target.value === UI_DEFAULT_SORT ? undefined : (e.target.value as UiSort) })} className={select}>
							{HAS_SCORES && <option value='score'>{t.sort_score}</option>}
							<option value='newest'>{t.sort_new}</option>
							<option value='natural'>{t.sort_natural}</option>
							{likes !== 'off' && <option value='likes'>{t.sort_likes}</option>}
						</select>
					</label>
					<span className={`${field} font-mono`} lang='en'>
						~/ui
					</span>
				</div>
				<div className='grid gap-1 desk:min-h-0 desk:flex-1 desk:grid-cols-[200px_minmax(0,1fr)] desk:grid-rows-[minmax(0,1fr)]'>
					<div className={`${well} relative px-5 pt-4 pb-[18px] desk:overflow-y-auto desk:px-3.5 desk:pt-3 desk:pb-3.5`}>
						<p className='m-0 mb-3 leading-[22px]'>{t.ui_p}</p>
						<a className={lnk} href={NATIVE_UI_DOCS} target='_blank' rel='noopener'>
							{t.ui_builtin}
						</a>
					</div>
					<div className={`${well} relative grid content-start gap-x-3 gap-y-4 p-3 min-[480px]:grid-cols-2 desk:overflow-y-auto desk:grid-cols-3 desk:gap-x-[18px] desk:gap-y-[22px] desk:p-[18px]`}>
						{libs.map((l, i) => (
							<LibCard key={l.repo} lib={l} first={i === 0} />
						))}
						{libs.length === 0 && (
							<p className='col-span-full m-0'>
								{t.ui_none}{' '}
								<button type='button' className={`${lnk} cursor-pointer border-0 bg-transparent p-0`} onClick={() => setFilter({ tag: undefined, surface: undefined })}>
									{t.f_clear}
								</button>
							</p>
						)}
					</div>
				</div>
				<StatusBar>
					<span>
						<b className='font-semibold text-ink'>{libs.length}</b> / {fill(t.cat_ui_badge, { n: UI_LIBS.length })}
					</span>
					<span>{t.cat_ui_desc}</span>
				</StatusBar>
			</Win>
			<CtaNote />
		</div>
	);
}

// One library as a small card, the size of a showcase card: the screenshot, the name with its tag and the kind of window it serves, the author, a short description and the links.
function LibCard({ lib, first }: { lib: UiLib; first: boolean }) {
	const t = useT();
	const lang = useLang();
	return (
		<article className='grid min-w-0 content-start gap-1.5'>
			{lib.image ? (
				<a href={lib.homepage ?? lib.url} target='_blank' rel='noopener' className='block overflow-hidden rounded-lg border border-line shadow-sm transition-shadow hover:shadow-pop'>
					<img src={lib.image} alt={`${lib.name} ${t.shot}`} width={1200} height={750} loading={first ? 'eager' : 'lazy'} fetchPriority={first ? 'high' : undefined} decoding='async' className='block aspect-[16/10] w-full bg-paper object-cover object-top-left' />
				</a>
			) : (
				<span aria-hidden='true' className='grid aspect-[16/10] place-items-center rounded-lg border border-line bg-face font-semibold'>
					{lib.name}
				</span>
			)}
			<div className='mt-1 flex min-w-0 items-center gap-2'>
				<h2 className='m-0 min-w-0 truncate text-sm leading-5 font-semibold'>{lib.name}</h2>
				<span className='shrink-0 rounded-full bg-yel px-2 text-[11px] leading-[18px]'>{t[TAG[lib.key]]}</span>
				<span className={`shrink-0 border border-line px-1.5 text-[11px] leading-4 ${SURF_TONE[lib.surface]}`}>{t[SURF[lib.surface]]}</span>
			</div>
			<p className='m-0 -mt-1 truncate text-muted'>
				<span lang='en'>by</span> {lib.author}
			</p>
			<p className='m-0 line-clamp-3'>{pick(lib.desc, lang)}</p>
			<div className='flex flex-wrap gap-1.5 pt-0.5'>
				<a className={btnSm} href={lib.url} target='_blank' rel='noopener'>
					{t.on_github}
				</a>
				{lib.homepage && (
					<a className={btnSm} href={lib.homepage} target='_blank' rel='noopener'>
						{t.visit}
					</a>
				)}
				<LikeButton item={likeKey.ui(lib)} name={lib.name} className={likeBtn} size={12} />
				<ScoreButton item={likeKey.ui(lib)} name={lib.name} />
			</div>
		</article>
	);
}

// The call for more libraries, pinned to the desktop beside the window. Below 1261px the note would sit under the window and push the page past one screen; Submit stays in the menu bar there.
function CtaNote() {
	const t = useT();
	const { openSubmit } = useSite();
	return (
		<Note title={t.r_note} className='mx-1 desk:hidden min-[1261px]:mx-0 min-[1261px]:mt-16 min-[1261px]:block'>
			<p className='m-0 mb-3.5 text-xl leading-7 font-semibold [&:lang(ko)]:break-keep'>{t.ui_cta}</p>
			<button type='button' className={btnGo} onClick={() => openSubmit('ui')}>
				{t.sub_ui}
			</button>
		</Note>
	);
}
