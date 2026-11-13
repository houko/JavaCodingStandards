import { GENRE_COLORS, GENRE_KEYS, type Game, type LangCode, fill, formatCount, formatDay, isNew, pick, relatedGames, t } from '@vibe-arcade/catalog';
import { type MouseEvent, useEffect, useState } from 'react';
import { gamePath, pagePath } from '../lib/seo';
import { BTN_LIME, BTN_LINE, KICKER, NEW_TAB } from '../lib/ui';
import { Clip } from './Clip';
import { Cover } from './Cover';
import { CreatorLink } from './CreatorLink';
import { GameLink } from './GameLink';
import { ArrowOut, ChevronLeft, ChevronRight, Close, Heart, LinkIcon } from './Icons';
import { Notes } from './Notes';

interface GameDetailProps {
	game: Game;
	lang: LangCode;
	// The game's name is the page's h1 on its own page and an h2 in the dialog, whose id labels the dialog.
	heading: 'h1' | 'h2';
	headingId: string;
	// In the dialog: closes it, and shows a related game in place. On the game's own page both are left out and related games are plain links.
	onClose?: () => void;
	onOpen?: (slug: string) => void;
	// In the dialog: the game's place in the list it was opened from and the way to its neighbours.
	nav?: GameNav;
}

export interface GameNav {
	// From 1.
	position: number;
	total: number;
	onPrev: () => void;
	onNext: () => void;
}

const NAV_BTN = 'avg-navbtn absolute top-1/2 -mt-[22px] flex size-11 cursor-pointer items-center justify-center rounded-full bg-bg/82 text-fg';

const ACTION = { play: 'playLabel', source: 'sourceLabel', watch: 'watchLabel' } as const;

// The share control: a link to the game's own page that copies that page's address on a plain click. Without clipboard access (an insecure origin, a denied permission) the click is left alone and simply goes to the page, whose address can be copied from the bar.
function ShareLink({ game, lang }: { game: Game; lang: LangCode }) {
	const tr = t(lang);
	const [copied, setCopied] = useState(false);
	const href = pagePath(gamePath(game.slug), lang);

	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), 2000);
		return () => clearTimeout(timer);
	}, [copied]);

	const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
		if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !navigator.clipboard) return;
		e.preventDefault();
		// The address is read from the page's own origin, so a preview deployment shares links that work.
		navigator.clipboard.writeText(`${window.location.origin}${href}`).then(
			() => setCopied(true),
			() => window.location.assign(href),
		);
	};

	return (
		<a href={href} onClick={onClick} className={`${BTN_LINE} min-h-12 px-5`}>
			<LinkIcon />
			<span aria-live='polite'>{copied ? tr.linkCopied : tr.shareLink}</span>
		</a>
	);
}

// Everything about one game: its cover and clip, who made it with what, the summary, what the creator reported about building it, the ways out (play, post, share) and three related games. The dialog on the home page and the game's own page render this same body.
export function GameDetail({ game, lang, heading: Heading, headingId, onClose, onOpen, nav }: GameDetailProps) {
	const tr = t(lang);
	const genre = tr[GENRE_KEYS[game.genre]];
	// The heading of the related games sits one level under the game's name.
	const SubHeading = Heading === 'h1' ? 'h2' : 'h3';
	return (
		<>
			<div className='relative aspect-[16/9] overflow-hidden bg-ink'>
				<Cover game={game} alt={`${game.name} — ${tr.coverAlt}`} eager={!onClose} className='avg-kb absolute inset-0 size-full text-[36px]' />
				{(game.heroVideo ?? game.video) && <Clip src={(game.heroVideo ?? game.video) as string} />}
				<span className='absolute top-4 left-4 flex gap-2'>
					<span className='rounded-md px-2.5 py-1.5 font-mono text-[12px] font-semibold tracking-[0.06em] text-bg uppercase' style={{ backgroundColor: GENRE_COLORS[game.genre] }}>
						{genre}
					</span>
					{isNew(game) && <span className='rounded-md bg-lime px-2.5 py-1.5 font-mono text-[12px] font-semibold tracking-[0.06em] text-bg uppercase'>{tr.newBadge}</span>}
				</span>
				{onClose && (
					<button type='button' onClick={onClose} aria-label={tr.close} className='avg-btn absolute top-3 right-3 flex size-11 cursor-pointer items-center justify-center rounded-full bg-bg text-fg'>
						<Close />
					</button>
				)}
				{nav && nav.total > 1 && (
					<>
						<button type='button' onClick={nav.onPrev} aria-label={tr.prev} className={`${NAV_BTN} left-3`}>
							<ChevronLeft />
						</button>
						<button type='button' onClick={nav.onNext} aria-label={tr.next} className={`${NAV_BTN} right-3`}>
							<ChevronRight />
						</button>
						<span className='absolute right-4 bottom-3.5 rounded-full bg-bg px-2.5 py-1 font-mono text-[12px] text-fg'>
							{nav.position} / {nav.total}
						</span>
					</>
				)}
			</div>
			<div className='flex flex-col gap-4 p-5 sm:p-7'>
				<Heading id={headingId} className='font-display text-[30px] leading-[1.05] font-extrabold tracking-[-0.03em] sm:text-[40px]'>
					{game.name}
				</Heading>
				<p className='text-[15px] text-muted'>
					{tr.by}{' '}
					<CreatorLink creator={game.creator} className='underline'>
						@{game.creator}
					</CreatorLink>{' '}
					· {tr.builtWith} {game.model} · {tr.posted} <time dateTime={game.postedAt}>{formatDay(game.postedAt, lang)}</time>
				</p>
				<p className='max-w-[680px] text-[17px] text-soft-2 sm:text-[18px]'>{pick(game.pitch ?? game.summary, lang)}</p>
				{game.down && (
					<p className='max-w-[680px] rounded-[10px] border border-line bg-bg px-3.5 py-3 text-[14px] text-soft'>
						<strong className='mr-2 font-mono text-[12px] font-semibold tracking-[0.06em] text-heart uppercase'>{tr.linkDown}</strong>
						{fill(tr.linkDownNote, { date: formatDay(game.down, lang) })}
					</p>
				)}
				{game.notes && <Notes notes={game.notes} tr={tr} heading={SubHeading} />}
				<div className='flex flex-wrap items-center gap-3'>
					<a href={game.link.url} {...NEW_TAB} className={`${BTN_LIME} min-h-12 px-5`}>
						{tr[ACTION[game.link.type]]}
						<ArrowOut />
					</a>
					{game.link.url !== game.postUrl && (
						<a href={game.postUrl} {...NEW_TAB} className={`${BTN_LINE} min-h-12 px-5`}>
							{tr.readPost}
						</a>
					)}
					<ShareLink game={game} lang={lang} />
					<span className='inline-flex items-center gap-1.5 font-mono text-[15px] sm:ml-auto'>
						<Heart className='text-heart' />
						{formatCount(game.likes, lang)} {tr.likesOnX}
					</span>
				</div>
				<div className='mt-1 flex flex-col gap-3.5 border-t border-line pt-5'>
					<SubHeading className={KICKER}>{fill(tr.moreIn, { g: genre })}</SubHeading>
					<ul className='grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3.5'>
						{relatedGames(game).map((g) => (
							<li key={g.slug} className='flex'>
								<GameLink slug={g.slug} onOpen={onOpen} className='avg-rel flex flex-1 flex-col overflow-hidden rounded-xl border border-line bg-bg text-fg hover:text-fg max-sm:flex-row max-sm:items-center'>
									<span className='block aspect-[16/10] overflow-hidden max-sm:w-28 max-sm:flex-none'>
										<Cover game={g} alt='' className='block size-full text-[14px]' />
									</span>
									<span className='flex min-w-0 flex-col gap-0.5 px-3.5 py-3'>
										<span className='font-display text-[16px] font-bold'>{g.name}</span>
										<span className='text-[13px] text-muted'>
											@{g.creator} · {formatCount(g.likes, lang)}
										</span>
									</span>
								</GameLink>
							</li>
						))}
					</ul>
				</div>
			</div>
		</>
	);
}
