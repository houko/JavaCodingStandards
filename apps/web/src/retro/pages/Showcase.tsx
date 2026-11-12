import { APPS, APP_PLATFORMS, type AppKind, type AppPlatform, HAS_SCORES, fill, likeKey, pick } from '@awesome-nsgo/catalog';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { AppLink, PlatformTags } from '../../components/bits';
import { LikeButton } from '../../components/Like';
import { ScoreChip } from '../../components/Score';
import { useLang, useT } from '../../lib/lang';
import { useLikes } from '../../lib/likes';
import { DEFAULT_SORT, groupChips, shownSort, sortApps } from '../../lib/showcase';
import { useSite } from '../../lib/site';
import { AppIcon, Note, StatusBar, Win, btnGo, btnSm, iconLabel, likeBtn, lnk, seg, select, well } from '../ui';
import { noShot } from './AppPage';


const N_GO = APPS.filter((a) => a.kind === 'go').length;
const N_TSX = APPS.length - N_GO;

// Authors by number of apps, then name, for the side panel.
const AUTHORS = Object.entries(
	APPS.reduce<Record<string, number>>((acc, a) => {
		acc[a.author] = (acc[a.author] ?? 0) + 1;
		return acc;
	}, {}),
).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

// A row in the side panel: tinted while hovered, filled while selected, like a Finder sidebar.
const place = 'flex w-full cursor-pointer items-center justify-between gap-1.5 rounded-md border-0 bg-transparent px-2 text-left leading-6 hover:bg-ink/5 aria-pressed:bg-ink aria-pressed:text-paper';

export function Showcase() {
	const t = useT();
	const lang = useLang();
	const { openSubmit } = useSite();
	// The whole view is kept in the address (?cat=, ?ui=, ?sort=, ?author=), so a link reproduces it.
	const { cat: group, ui, platform, sort: sortParam, author: authorParam } = useSearch({ from: '/showcase' });
	const kind = ui ?? 'all';
	const navigate = useNavigate({ from: '/showcase' });
	const setFilter = (next: { cat?: typeof group; ui?: AppKind; platform?: AppPlatform; sort?: typeof sortParam; author?: string }) => void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true, resetScroll: false });
	const author = authorParam ?? null;
	const setAuthor = (name: string | null) => setFilter({ author: name ?? undefined });
	const { status: likes, counts } = useLikes();
	const sort = shownSort(sortParam, likes);

	const kinds = [
		{ key: 'all', label: t.all, n: APPS.length },
		{ key: 'go', label: t.kind_go, n: N_GO },
		{ key: 'tsx', label: t.kind_tsx, n: N_TSX },
	] as const;

	const ofPlatform = APPS.filter((a) => !platform || a.platforms.includes(platform));
	const ofKind = ofPlatform.filter((a) => kind === 'all' || a.kind === kind);
	const groups = groupChips(ofKind, group);
	const inGroup = group ? (groups.find((g) => g.key === group)?.apps ?? []) : ofKind;
	const list = sortApps(
		inGroup.filter((a) => author === null || a.author === author),
		sort,
		counts,
	);

	return (
		<div className='relative mx-auto max-w-[1440px] px-3.5 pt-3.5 desk:px-10 desk:pt-[30px] min-[1261px]:grid min-[1261px]:grid-cols-[minmax(0,1fr)_260px] min-[1261px]:items-start min-[1261px]:gap-x-10 min-[1261px]:pr-6'>
			<Win title={t.cat_show_name} level={1} fill closeTo='/'>
				<div className='flex flex-wrap items-center gap-x-3 gap-y-2 px-1.5 pt-[5px] pb-[7px]'>
					<nav aria-label={t.a_crumbs} className='hidden whitespace-nowrap desk:block'>
						<Link to='/' className={lnk}>
							Awesome NSGo
						</Link>{' '}
						<span aria-hidden='true'>▸</span> {t.cat_show_name}
					</nav>
					<div role='group' aria-label={t.a_kind} className='flex'>
						{kinds.map((k) => (
							<button key={k.key} type='button' aria-pressed={kind === k.key} onClick={() => setFilter({ ui: k.key === 'all' ? undefined : k.key })} className={`${btnSm} ${seg}`}>
								{k.label} <span className='tabular-nums opacity-70'>{k.n}</span>
							</button>
						))}
					</div>
					<div role='group' aria-label={t.f_platform} className='flex'><button type='button' aria-pressed={!platform} onClick={() => setFilter({ platform: undefined })} className={`${btnSm} ${seg}`}>{t.all}</button>{APP_PLATFORMS.map((p) => <button key={p} type='button' aria-pressed={platform === p} onClick={() => setFilter({ platform: platform === p ? undefined : p })} className={`${btnSm} ${seg}`}>{t[`platform_${p}`]}</button>)}</div>
					{/* Below the desktop width the side panel is hidden, so the groups are a menu here. */}
					<label className='flex items-center gap-1.5 whitespace-nowrap desk:hidden'>
						{t.a_cats}
						<select value={group ?? ''} onChange={(e) => setFilter({ cat: groups.find((g) => g.key === e.target.value)?.key })} className={select}>
							<option value=''>{`${t.all} · ${ofKind.length}`}</option>
							{groups.map((g) => (
								<option key={g.key} value={g.key}>{`${t[`grp_${g.key}`]} · ${g.apps.length}`}</option>
							))}
						</select>
					</label>
					<span className='flex-1' />
					<label className='flex items-center gap-1.5 whitespace-nowrap'>
						{t.sort}
						<select value={sort} onChange={(e) => setFilter({ sort: e.target.value === DEFAULT_SORT ? undefined : (e.target.value as typeof sortParam) })} className={select}>
							<option value='natural'>{t.sort_natural}</option>
							<option value='newest'>{t.sort_new}</option>
							{likes !== 'off' && <option value='likes'>{t.sort_likes}</option>}
							{HAS_SCORES && <option value='score'>{t.sort_score}</option>}
						</select>
					</label>
				</div>
				<div className='grid gap-1 desk:min-h-0 desk:flex-1 desk:grid-cols-[176px_minmax(0,1fr)] desk:grid-rows-[minmax(0,1fr)]'>
					<aside aria-label={t.a_filter} className={`${well} relative hidden self-stretch px-1.5 py-2.5 desk:block desk:overflow-y-auto`}>
						<p className='mx-1.5 mt-1 mb-0.5 text-faint'>{t.a_cats}</p>
						<ul className='m-0 mb-3 list-none p-0'>
							<li>
								<button type='button' aria-pressed={!group} onClick={() => setFilter({ cat: undefined })} className={place}>
									<span>{t.all}</span>
									<span className='tabular-nums opacity-70'>{ofKind.length}</span>
								</button>
							</li>
							{groups.map((g) => (
								<li key={g.key}>
									<button type='button' aria-pressed={group === g.key} onClick={() => setFilter({ cat: group === g.key ? undefined : g.key })} className={place}>
										<span className='truncate'>{t[`grp_${g.key}`]}</span>
										<span className='tabular-nums opacity-70'>{g.apps.length}</span>
									</button>
								</li>
							))}
						</ul>
						<p className='mx-1.5 mt-1 mb-0.5 text-faint'>{t.f_author}</p>
						<ul className='m-0 mb-3 list-none p-0'>
							<li>
								<button type='button' aria-pressed={author === null} onClick={() => setAuthor(null)} className={place}>
									<span>{t.all}</span>
									<span className='tabular-nums opacity-70'>{APPS.length}</span>
								</button>
							</li>
							{AUTHORS.map(([name, n]) => (
								<li key={name}>
									<button type='button' aria-pressed={author === name} onClick={() => setAuthor(author === name ? null : name)} className={place}>
										<span className='truncate'>{name}</span>
										<span className='tabular-nums opacity-70'>{n}</span>
									</button>
								</li>
							))}
						</ul>
					</aside>
					<div className={`${well} relative grid min-h-[300px] grid-cols-2 content-start gap-x-3 gap-y-4 p-3 desk:min-h-0 desk:overflow-y-auto desk:grid-cols-3 desk:gap-x-[18px] desk:gap-y-[22px] desk:p-[18px] min-[1261px]:grid-cols-4`}>
						{list.map((a) => (
							// The like pill sits over the screenshot's corner, beside the card's link rather than inside it.
							<div key={a.slug} className='relative min-w-0'>
								<AppLink slug={a.slug} dialog className='group grid min-w-0 content-start gap-1 no-underline'>
									<span className='block aspect-[16/10] overflow-hidden rounded-lg border border-line bg-face shadow-sm transition-shadow group-hover:shadow-pop'>
										{a.image ? (
											<img src={a.image} alt='' width={1200} height={750} loading='lazy' decoding='async' className='block size-full bg-paper object-cover object-top-left' />
										) : (
											<span className={`grid size-full place-items-center ${noShot}`}>
												<AppIcon app={a} size={56} />
											</span>
										)}
									</span>
									<span className='mt-1 flex min-w-0 items-center gap-1.5'>
										<AppIcon app={a} size={24} />
										<span className={`truncate ${iconLabel}`}>{a.name}</span>
										<ScoreChip item={likeKey.app(a)} name={a.name} className='ml-auto shrink-0' />
									</span>
									<span className='truncate pl-[30px] leading-[14px] text-muted'>{a.author}</span>
									<PlatformTags app={a} />
									<span className='sr-only'>{pick(a.desc, lang)}</span>
								</AppLink>
								<LikeButton item={likeKey.app(a)} name={a.name} className={`${likeBtn} absolute top-1.5 right-1.5`} size={12} />
							</div>
						))}
						{list.length === 0 &&
										(group || ui || platform || author !== null ? (
								<p className='col-span-full m-0'>
									{t.f_none}{' '}
									<button
										type='button'
										className={`${lnk} cursor-pointer border-0 bg-transparent p-0`}
										onClick={() => setFilter({ cat: undefined, ui: undefined, platform: undefined, author: undefined })}
									>
										{t.f_clear}
									</button>
								</p>
							) : (
								<p className='col-span-full m-0'>
									{t.no_res}{' '}
									<button type='button' className={`${lnk} cursor-pointer border-0 bg-transparent p-0`} onClick={() => openSubmit('showcase')}>
										{t.submit_it}
									</button>
								</p>
							))}
					</div>
				</div>
				<StatusBar>
					<span aria-live='polite'>{fill(t.r_items, { n: list.length })}</span>
					<span>
						{t.kind_go} {N_GO} · {t.kind_tsx} {N_TSX}
					</span>
				</StatusBar>
			</Win>
			{/* Below 1261px the note would sit under the window and push the page past one screen; Submit stays in the menu bar there. */}
			<Note title={t.r_note} className='mx-1 mt-10 desk:hidden min-[1261px]:mx-0 min-[1261px]:mt-32 min-[1261px]:block'>
				<p className='m-0 mb-2.5 text-xl leading-7 font-semibold'>{t.m_title}</p>
				<p className='m-0 mb-2.5'>{t.m_desc_bot}</p>
				<div className='mt-3 flex flex-wrap items-center gap-2.5'>
					<button type='button' className={btnGo} onClick={() => openSubmit('showcase')}>
						{t.sub_send}
					</button>
				</div>
			</Note>
		</div>
	);
}
