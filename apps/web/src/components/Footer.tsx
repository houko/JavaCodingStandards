import { CURATOR_HANDLE, CURATOR_URL, GENRES, GENRE_KEYS, type LangCode, MAKER_NAME, MAKER_URL, REPO_URL, SITE_NAME, t } from '@vibe-arcade/catalog';
import { Link } from '@tanstack/react-router';
import { genreSlug } from '../lib/search';
import { KICKER } from '../lib/ui';
import { Logo } from './Logo';
import { SectionLink } from './SectionLink';

const COLUMN_LINK = 'avg-link inline-flex min-h-11 min-w-11 items-center self-start text-[15px]';

export function Footer({ lang, home }: { lang: LangCode; home: boolean }) {
	const tr = t(lang);
	// madeBy is "by {maker}" in the page's language; the maker's name is a link, so the sentence is cut around it.
	const [beforeMaker, afterMaker = ''] = tr.madeBy.split('{maker}');
	// A genre link shows that genre alone, clearing the search text and the model, in the order the visitor had chosen.
	return (
		<footer className='border-t border-line bg-footer'>
			<div className='mx-auto flex max-w-[1280px] flex-col gap-10 px-4 pt-14 pb-8 sm:px-6'>
				<div className='flex flex-wrap justify-between gap-10'>
					<div className='flex max-w-[380px] flex-[1_1_280px] flex-col gap-3.5'>
						<SectionLink home={home} id='top' className='avg-logo flex items-center gap-2.5 self-start text-fg hover:text-fg'>
							<Logo footer />
						</SectionLink>
						<p className='text-[15px] text-muted'>{tr.h1}</p>
						<a href={CURATOR_URL} rel='noopener noreferrer' className='avg-btn inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-line-2 px-4 py-2 text-[14px]'>
							{tr.follow} · @{CURATOR_HANDLE}
						</a>
					</div>
					<nav aria-label={tr.explore} className='flex flex-[0_1_200px] flex-col'>
						<h2 className={`${KICKER} mb-1.5`}>{tr.explore}</h2>
						{GENRES.map((g) => (
							<Link key={g} to='/' search={(prev) => ({ genre: genreSlug(g), sort: 'sort' in prev && prev.sort === 'new' ? 'new' : undefined })} hash='games' className={COLUMN_LINK}>
								{tr[GENRE_KEYS[g]]}
							</Link>
						))}
					</nav>
					<nav aria-label={tr.project} className='flex flex-[0_1_200px] flex-col'>
						<h2 className={`${KICKER} mb-1.5`}>{tr.project}</h2>
						<SectionLink home={home} id='how' className={COLUMN_LINK}>
							{tr.rules}
						</SectionLink>
						<SectionLink home={home} id='faq' className={COLUMN_LINK}>
							{tr.faqH}
						</SectionLink>
						<SectionLink home={home} id='submit' className={COLUMN_LINK}>
							{tr.submitGame}
						</SectionLink>
						<a href={REPO_URL} rel='noopener noreferrer' className={COLUMN_LINK}>
							GitHub
						</a>
						<a href={MAKER_URL} rel='noopener noreferrer' className={COLUMN_LINK}>
							{MAKER_NAME}
						</a>
						<a href={CURATOR_URL} rel='noopener noreferrer' className={COLUMN_LINK}>
							{tr.removal}
						</a>
					</nav>
				</div>
				<div className='flex flex-col gap-2 border-t border-line pt-6 text-[14px] text-muted'>
					<div className='flex flex-wrap justify-between gap-x-6 gap-y-2'>
						<span>
							{SITE_NAME} {beforeMaker}
							<a href={MAKER_URL} rel='noopener noreferrer' className='avg-link'>
								{MAKER_NAME}
							</a>
							{afterMaker} · {tr.curatedBy}{' '}
							<a href={CURATOR_URL} rel='noopener noreferrer' className='avg-link'>
								@{CURATOR_HANDLE}
							</a>
						</span>
						<span>{tr.footer2}</span>
					</div>
					<p>
						{SITE_NAME} — {tr.footer1}
					</p>
				</div>
			</div>
		</footer>
	);
}
