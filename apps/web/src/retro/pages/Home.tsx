import { APPS, INSTALL_CMDS, INSTALL_TABS, type InstallTab, type LangCode, NSGO_SITE, PLUGINS, UI_LIBS, fill, langDef } from '@awesome-nsgo/catalog';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useLang, useT } from '../../lib/lang';
import { useSite } from '../../lib/site';
import { DesktopIcons } from '../DesktopIcons';
import { StatusBar, Win, btn, btnGo, btnSm, seg, well } from '../ui';

// Headline size per language, so each script stays readable while the README window wraps it naturally: a CJK character is a full em, bold Latin a little over half.
const H1_SIZE: Record<LangCode, string> = {
	'zh-CN': 'text-[40px] leading-[48px] desk:text-[64px] desk:leading-[72px]',
	'zh-TW': 'text-[40px] leading-[48px] desk:text-[64px] desk:leading-[72px]',
	ja: 'text-[26px] leading-[34px] desk:text-[44px] desk:leading-[52px]',
	ko: 'text-[32px] leading-[40px] desk:text-[52px] desk:leading-[60px]',
	en: 'text-[26px] leading-[32px] desk:text-[44px] desk:leading-[52px]',
};

// One screen: the folder icons on the left, the README and the terminal stacked beside them. The sections live on their own pages, one click away through the folders. Below the desktop breakpoint the windows stack and the page scrolls.
export function Home() {
	return (
		<div className='relative mx-auto flex max-w-[1440px] flex-col gap-[22px] px-3.5 pt-3.5 pb-6 desk:h-full desk:p-0'>
			<DesktopIcons className='order-2 grid grid-cols-3 justify-items-center gap-x-0 gap-y-3.5 py-1.5 desk:absolute desk:top-[26px] desk:left-[18px] desk:z-[2] desk:grid-cols-1 desk:gap-4 desk:p-0' />
			<div className='contents desk:absolute desk:top-[26px] desk:left-[136px] desk:flex desk:w-[640px] desk:flex-col desk:gap-[22px]'>
				<Welcome />
				<Terminal />
			</div>
		</div>
	);
}

function Welcome() {
	const t = useT();
	const lang = useLang();
	return (
		<Win title='README.md' level={2} className='order-1'>
			<div className={`${well} relative px-5 pt-[22px] pb-[18px] desk:px-9 desk:pt-6 desk:pb-6`}>
				<h1 className={`my-3 font-bold tracking-tight desk:mt-1 desk:mb-4 ${H1_SIZE[lang]}`}>
					{t.r_h1.split(/(\bGo\b)/).map((part, i) =>
						part === 'Go' ? (
							<mark key={i} className='mx-[0.06em] rounded-[0.18em] bg-ink px-[0.14em] text-yel'>
								Go
							</mark>
						) : (
							part
						),
					)}
				</h1>
				<p className='m-0'>
					{t.hero_p}
					{langDef(lang).words && ' '}
					{t.hero_p2}
				</p>
				<div className='mt-5 flex flex-wrap items-center gap-2.5'>
					<Link to='/showcase' className={btnGo}>
						{t.explore} →
					</Link>
					<a className={btn} href={NSGO_SITE} target='_blank' rel='noopener'>
						{t.site}
					</a>
					<span className='text-muted'>{fill(t.live_badge, { n: APPS.length })}</span>
				</div>
			</div>
			<StatusBar>
				<span>
					<b className='font-semibold'>{APPS.length}</b> {t.st_apps}
				</span>
				<span>
					<b className='font-semibold'>{PLUGINS.length}</b> {t.st_plugins}
				</span>
				<span>
					<b className='font-semibold'>{UI_LIBS.length}</b> {t.st_libs}
				</span>
				<span>
					<b className='font-semibold'>Apache-2.0</b> {t.st_license}
				</span>
			</StatusBar>
		</Win>
	);
}

function Terminal() {
	const t = useT();
	const { copy, copied } = useSite();
	// ?install= keeps the tab in the address, as in the original look.
	const { install } = useSearch({ from: '/' });
	const navigate = useNavigate({ from: '/' });
	const tab: InstallTab = install ?? 'go';
	const setTab = (k: InstallTab) => void navigate({ search: (prev) => ({ ...prev, install: k === 'go' ? undefined : k }), replace: true, resetScroll: false });
	const cmd = INSTALL_CMDS[tab];
	return (
		<Win title={`${t.r_terminal} — my-app`} idle className='order-3'>
			<div className='flex flex-wrap items-center gap-2.5 px-1.5 pt-[3px] pb-1.5'>
				<div role='group' aria-label={t.a_install} className='flex'>
					{INSTALL_TABS.map((it) => (
						<button key={it.key} type='button' aria-pressed={tab === it.key} onClick={() => setTab(it.key)} className={`${btnSm} ${seg}`}>
							{it.label}
						</button>
					))}
				</div>
				<span className='flex-1' />
				<button type='button' className={btnSm} onClick={() => copy(cmd, 'cmd')} aria-label={t.a_copy_install}>
					{copied === 'cmd' ? t.copied : t.copy}
				</button>
			</div>
			<div className='rounded-lg bg-ink px-4 pt-3.5 pb-4 font-mono text-xs leading-5 text-paper'>
				<p className='m-0 overflow-hidden wrap-break-word'>
					<span className='text-sky'>~/code $ </span>
					<span className='text-yel'>{cmd}</span>
					<span aria-hidden='true' className='ml-0.5 inline-block h-[13px] w-[7px] animate-blink bg-paper align-[-2px]' />
				</p>
				<p className='m-0 mt-1 text-slate'># {t.tool_p}</p>
			</div>
		</Win>
	);
}
