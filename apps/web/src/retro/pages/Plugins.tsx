import { CLI_CMDS, COMMUNITY_PLUGINS, PLUGINS, PLUGINS_DOC, type PluginSurface, fill, likeKey, pick, pluginPath } from '@awesome-nsgo/catalog';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { LikeButton } from '../../components/Like';
import { ScoreButton } from '../../components/Score';
import { useLang, useT } from '../../lib/lang';
import { useSite } from '../../lib/site';
import { DesktopIcons } from '../DesktopIcons';
import { PLUGIN_ICON } from '../plugin-icons';
import { Note, PixelIcon, StatusBar, Win, btn, btnGo, btnSm, seg, field, likeBtn, well } from '../ui';

// The plugins page: a file manager window listing the official plugins and the community's in a details view, a terminal with the nsgo CLI's commands leaning on its right edge, and a sticky note about community plugins.
export function Plugins() {
	return (
		<div className='relative mx-auto flex max-w-[1440px] flex-col gap-[26px] px-3.5 pt-3.5 desk:grid desk:grid-cols-12 desk:items-start desk:gap-x-7 desk:gap-y-0 desk:pt-[26px] desk:pr-10 desk:pl-[136px]'>
			<DesktopIcons className='hidden desk:absolute desk:top-[26px] desk:left-[18px] desk:grid desk:grid-cols-1 desk:gap-4' />
			<Explorer />
			<Cli />
			<Community />
		</div>
	);
}

function Explorer() {
	const t = useT();
	const lang = useLang();
	// ?source= and ?surface= keep the selected plugin list and filter in the address.
	const { source: sourceParam, surface: surfaceParam } = useSearch({ from: '/plugins' });
	const navigate = useNavigate({ from: '/plugins' });
	const source = sourceParam ?? 'all';
	const setSource = (s: 'all' | 'official' | 'community') => void navigate({ search: (prev) => ({ ...prev, source: s === 'all' ? undefined : s }), replace: true, resetScroll: false });
	const surface = surfaceParam ?? 'all';
	const setSurface = (s: 'all' | 'go' | 'tsx') => void navigate({ search: (prev) => ({ ...prev, surface: s === 'all' ? undefined : s }), replace: true, resetScroll: false });
	const surfLabel: Record<PluginSurface, string> = { go: t.surf_go, tsx: t.surf_tsx, both: t.surf_both };
	// Tabs keep the official and community lists together without making one flat stream. A plugin for both kinds of app shows under either filter.
	const list = source === 'official' ? PLUGINS : source === 'community' ? COMMUNITY_PLUGINS : [...PLUGINS, ...COMMUNITY_PLUGINS];
	const shown = list.filter((p) => surface === 'all' || p.surface === surface || p.surface === 'both');
	const chips = [
		{ key: 'all' as const, label: `${t.all} · ${list.length}` },
		{ key: 'go' as const, label: `${t.surf_go} · ${list.filter((p) => p.surface !== 'tsx').length}` },
		{ key: 'tsx' as const, label: `${t.surf_tsx} · ${list.filter((p) => p.surface !== 'go').length}` },
	];
	return (
		<Win level={1} title={t.nav_plugins} fill closeTo='/' className='desk:col-span-8 desk:col-start-1 desk:row-span-2 desk:row-start-1'>
			<div className='flex flex-wrap items-center gap-2.5 px-1.5 pt-[3px] pb-1.5'>
				<div role='tablist' aria-label={t.nav_plugins} className='flex'>
					{(['all', 'official', 'community'] as const).map((key) => (
						<button key={key} type='button' role='tab' aria-selected={source === key} onClick={() => setSource(key)} className={`${btnSm} ${seg} aria-selected:bg-ink aria-selected:text-paper`}>
							{key === 'all' ? t.all : key === 'official' ? t.plug_official : t.plug_community} · {key === 'all' ? PLUGINS.length + COMMUNITY_PLUGINS.length : key === 'official' ? PLUGINS.length : COMMUNITY_PLUGINS.length}
						</button>
					))}
				</div>
				<div role='group' aria-label={t.a_filter} className='flex flex-wrap'>
					{chips.map((c) => (
						<button key={c.key} type='button' aria-pressed={surface === c.key} onClick={() => setSurface(c.key)} className={`${btnSm} ${seg}`}>
							{c.label}
						</button>
					))}
				</div>
				<span className='flex-1' />
				<span className={`${field} font-mono`} lang='en'>
					~/plugins/
				</span>
			</div>
			<p className='m-0 px-1.5 pb-1.5 text-muted'>{t.plug_p}</p>
			<ul className={`${well} relative m-0 list-none p-1.5 desk:min-h-0 desk:flex-1 desk:overflow-y-auto`}>
				{shown.map((p) => (
					<li key={p.slug} className='flex items-center gap-2 border-b border-line pr-2 last:border-b-0'>
						<a href={p.url} target='_blank' rel='noopener' className='group grid min-w-0 flex-1 grid-cols-[32px_1fr_auto] items-start gap-x-3 gap-y-1 rounded-md px-2 py-2.5 no-underline hover:bg-ink/5 desk:grid-cols-[32px_190px_1fr_auto] desk:gap-x-4'>
							{PLUGIN_ICON[p.slug] ? (
								<PixelIcon name={PLUGIN_ICON[p.slug]} className='row-span-2 mt-0.5 desk:row-span-1' />
							) : (
								<span aria-hidden='true' className='row-span-2 mt-0.5 grid size-8 place-items-center rounded-lg bg-yel font-semibold text-ink desk:row-span-1'>
									{p.mark}
								</span>
							)}
							<div className='min-w-0'>
								<h2 className='m-0 text-lg leading-6 font-semibold'>{p.name}</h2>
								<span lang='en' className='block font-mono text-faint'>
									{pluginPath(p)}
								</span>
							</div>
							<div className='col-start-2 col-end-[-1] row-start-2 min-w-0 desk:col-start-3 desk:col-end-4 desk:row-start-1'>
								<p className='m-0'>{pick(p.desc, lang)}</p>
								<span className='mt-1.5 flex flex-wrap gap-1.5'>
									<span className={`inline-block border border-line px-1.5 leading-4 ${p.surface === 'go' ? 'bg-ink text-paper' : p.surface === 'both' ? 'bg-sky/60 text-ink' : 'bg-yel text-ink'}`}>{surfLabel[p.surface]}</span>
									{p.tags.map((tg) => (
										<code key={tg} lang='en' className='rounded border border-line bg-face px-1.5 font-mono text-ink'>
											{tg}
										</code>
									))}
								</span>
							</div>
							<span className='col-start-3 row-start-1 flex flex-col items-end gap-1 text-right desk:col-start-4'>
								<span lang='en' className='rounded-full bg-face-lo px-2 text-[11px] leading-5 font-medium tracking-wide text-muted'>
									{p.official ? 'OFFICIAL' : 'COMMUNITY'}
								</span>
								<span className='whitespace-nowrap underline decoration-ink/30 underline-offset-[3px] group-hover:decoration-ink'>{t.docs_link}</span>
							</span>
						</a>
						<LikeButton item={likeKey.plugin(p)} name={p.name} className={likeBtn} size={12} />
						<ScoreButton item={likeKey.plugin(p)} name={p.name} />
					</li>
				))}
				{/* With nothing under the tab and filter (or nothing listed yet), a line says so rather than an empty well. */}
				{shown.length === 0 && <li className='px-2 py-2.5 text-muted'>{t.plug_none}</li>}
			</ul>
			<StatusBar>
				<span>
					<b className='font-semibold text-ink'>{shown.length}</b> / {fill(t.r_items, { n: list.length })}
				</span>
				<span>{source === 'official' ? fill(t.cat_plug_desc, { n: PLUGINS.length }) : fill(t.comm_h, { n: COMMUNITY_PLUGINS.length })}</span>
			</StatusBar>
		</Win>
	);
}

// The toolchain as a terminal: each nsgo CLI command on its own prompt line with a copy button.
function Cli() {
	const t = useT();
	const { copy, copied } = useSite();
	return (
		<Win title={t.tool_h} idle className='desk:col-span-4 desk:col-start-9 desk:row-start-1 desk:mt-20 desk:-ml-3'>
			<p className='m-0 px-1.5 pt-[3px] pb-1.5'>{t.tool_p}</p>
			<div className='grid gap-2 rounded-lg bg-ink px-3 pt-3 pb-3.5 font-mono text-paper'>
				{CLI_CMDS.map((cmd, i) => {
					const key = i === 0 ? 'cmd0' : 'cmd1';
					return (
						<div key={cmd} className='flex items-center justify-between gap-2'>
							<code lang='en' className='min-w-0 wrap-break-word'>
								<span className='text-sky'>~/code $ </span>
								<span className='text-yel'>{cmd}</span>
							</code>
							<button type='button' className={`${btnSm} text-ink`} onClick={() => copy(cmd, key)} aria-label={t.a_copy_cmd}>
								{copied === key ? t.copied : t.copy}
							</button>
						</div>
					);
				})}
				<p className='m-0'>
					<span className='text-sky'>~/code $ </span>
					<span aria-hidden='true' className='inline-block h-[13px] w-[7px] animate-blink bg-paper align-[-2px]' />
				</p>
			</div>
		</Win>
	);
}

// Community plugins: how many are listed, the guide to writing one, and the submit button.
function Community() {
	const t = useT();
	const { openSubmit } = useSite();
	return (
		<Note title={t.r_note} className='mx-1 desk:col-span-4 desk:col-start-9 desk:row-start-2 desk:m-0 desk:mt-12 desk:ml-8 desk:-mr-2'>
			<h2 className='m-0 mb-2.5 text-xl leading-7 font-semibold [&:lang(ko)]:break-keep'>{fill(t.comm_h, { n: COMMUNITY_PLUGINS.length })}</h2>
			<p className='m-0 mb-3'>{t.comm_p}</p>
			<div className='flex flex-wrap items-center gap-2.5'>
				<a className={btn} href={PLUGINS_DOC} target='_blank' rel='noopener'>
					{t.guide}
				</a>
				<button type='button' className={btnGo} onClick={() => openSubmit('plugin')}>
					{t.sub_plugin}
				</button>
			</div>
		</Note>
	);
}
