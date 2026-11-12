import { type App, appBySlug, pick } from '@awesome-nsgo/catalog';
import { Link } from '@tanstack/react-router';
import { neighbours } from '../components/AppDetail';
import { AppLink, appView } from '../components/bits';
import { useDialog } from '../lib/dialog';
import { useLang, useT } from '../lib/lang';
import { useSite } from '../lib/site';
import { AppActions, AppFacts, AppHead, AppShot, MoreBy } from './pages/AppPage';
import { StatusBar, Win, btnSm, lnk, well } from './ui';

// The quick view opened by `?app=`: a floating window over a dimmed, blurred scrim. Escape is handled by RetroApp.
export function RetroAppWindow() {
	const { app: slug } = useSite();
	const app = slug ? appBySlug(slug) : undefined;
	return app ? <QuickView app={app} /> : null;
}

// Stays mounted while prev/next and "more by" switch apps, so focus and the scroll lock are not reset on every switch.
function QuickView({ app }: { app: App }) {
	const { closeApp } = useSite();
	const t = useT();
	const lang = useLang();
	const ref = useDialog<HTMLDivElement>();

	const v = appView(app);
	const kindLabel = t[`kind_${app.kind}`];
	const [prev, next] = neighbours(v);

	return (
		<div className='fixed inset-0 z-[60] overflow-y-auto px-3.5 py-6 desk:py-16'>
			<button type='button' onClick={closeApp} aria-label={t.close_detail} tabIndex={-1} className='fixed inset-0 -z-10 cursor-default border-0 bg-ink/35 p-0 backdrop-blur-[2px]' />
			<div ref={ref} role='dialog' aria-modal='true' aria-labelledby='qv-t' className='mx-auto max-w-[760px]'>
				<Win id='qv' title={app.name} onClose={closeApp}>
					<div className={`${well} grid gap-3.5 p-3.5 desk:grid-cols-[minmax(0,1fr)_260px] desk:grid-rows-[auto_1fr] desk:gap-x-5 desk:p-4`}>
						<AppHead app={app} kindLabel={kindLabel} className='desk:col-start-2 desk:row-start-1' />
						<div className='grid content-start gap-3 desk:col-start-1 desk:row-span-2 desk:row-start-1'>
							<AppShot view={v} />
							<p className='m-0 leading-[22px] [&:lang(ko)]:break-keep'>{pick(app.about, lang)}</p>
							<Link to='/apps/$slug' params={{ slug: app.slug }} className={`${lnk} justify-self-start`}>
								{t.full_page}
							</Link>
						</div>
						<div className='grid content-start gap-3 desk:col-start-2 desk:row-start-2'>
							<AppFacts view={v} />
							<AppActions app={app} />
							<MoreBy app={app} quick />
						</div>
					</div>
					<nav aria-label={t.a_pager} className='flex flex-wrap justify-between gap-2.5 px-1.5 pt-2 pb-1.5'>
						<AppLink slug={prev.slug} className={`${btnSm} max-w-full`}>
							<span className='truncate'>← {prev.name}</span>
						</AppLink>
						<AppLink slug={next.slug} className={`${btnSm} max-w-full`}>
							<span className='truncate'>{next.name} →</span>
						</AppLink>
					</nav>
					<StatusBar>
						<span>
							#{v.num} · {app.author}
						</span>
					</StatusBar>
				</Win>
			</div>
		</div>
	);
}
