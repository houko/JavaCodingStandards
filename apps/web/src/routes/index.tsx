import { GAMES, filterGames, gameBySlug } from '@vibe-arcade/catalog';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { BackToTop } from '../components/BackToTop';
import { Creators } from '../components/Creators';
import { Faq } from '../components/Faq';
import { Footer } from '../components/Footer';
import { GameDialog } from '../components/GameDialog';
import { GamesSection } from '../components/GamesSection';
import { Hero } from '../components/Hero';
import { HowItWorks } from '../components/HowItWorks';
import { Nav } from '../components/Nav';
import { Picks } from '../components/Picks';
import { SubmitCta } from '../components/SubmitCta';
import { Ticker } from '../components/Ticker';
import { TopLiked } from '../components/TopLiked';
import { useLang, useT } from '../lib/lang';
import { type HomeSearch, filterOf, validateHomeSearch } from '../lib/search';
import { homeHead } from '../lib/seo';

export const Route = createFileRoute('/')({
	validateSearch: validateHomeSearch,
	head: ({ match }) => homeHead(match.search.lang),
	component: Home,
});

function Home() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const router = useRouter();
	const lang = useLang();
	const tr = useT();
	const open = search.game === undefined ? undefined : gameBySlug(search.game);
	const isOpen = open !== undefined;
	const list = useMemo(() => filterGames(filterOf(search), lang), [search, lang]);

	// A filter change replaces the current history entry, so Back leaves the page rather than stepping through every keystroke and chip.
	const setFilter = useCallback((patch: HomeSearch) => void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true, resetScroll: false }), [navigate]);

	// Opening a game pushes ?game=<slug>, so Back closes the dialog; moving on to another game from inside it replaces that entry, so one Back still closes.
	const openGame = useCallback((slug: string) => void navigate({ search: (prev) => ({ ...prev, game: slug }), replace: isOpen, resetScroll: false }), [navigate, isOpen]);

	// Closing goes back to the entry the dialog was opened from. A visit that began on a ?game= URL has no such entry, so the param is dropped in place. Going back only takes effect a moment later, so a second close before then (a double click on the backdrop) is ignored: it would go back twice and leave the page.
	const closing = useRef(false);
	useEffect(() => {
		closing.current = false;
	}, [search.game]);
	const closeGame = useCallback(() => {
		if (closing.current) return;
		closing.current = true;
		if (router.history.canGoBack()) router.history.back();
		else void navigate({ search: (prev) => ({ ...prev, game: undefined }), replace: true, resetScroll: false });
	}, [router, navigate]);

	// Random on purpose, and only ever in a click handler: nothing random runs during render, so the server and client agree.
	const surprise = useCallback(() => {
		const pool = GAMES.filter((g) => g.slug !== search.game);
		openGame(pool[Math.floor(Math.random() * pool.length)].slug);
	}, [search.game, openGame]);

	// The dialog steps through the list as filtered and ordered, or through every game when the open one is not in it (a pick, a surprise, a link), wrapping at either end.
	const around = open && list.includes(open) ? list : GAMES;
	const at = open ? around.indexOf(open) : 0;
	const step = useCallback((by: number) => openGame(around[(at + by + around.length) % around.length].slug), [openGame, around, at]);
	const nav = useMemo(() => ({ position: at + 1, total: around.length, onPrev: () => step(-1), onNext: () => step(1) }), [at, around.length, step]);

	return (
		<>
			<Nav home />
			<main id='main' tabIndex={-1} className='outline-none'>
				<Hero lang={lang} onOpen={openGame} onSurprise={surprise} />
				<Ticker />
				<Picks lang={lang} onOpen={openGame} />
				<GamesSection lang={lang} search={search} list={list} onFilter={setFilter} onOpen={openGame} onSurprise={surprise} />
				<TopLiked lang={lang} onOpen={openGame} />
				<Creators lang={lang} />
				<HowItWorks lang={lang} />
				<Faq lang={lang} />
				<SubmitCta lang={lang} />
			</main>
			<Footer lang={lang} home />
			<BackToTop label={tr.backTop} />
			{open && <GameDialog game={open} lang={lang} onClose={closeGame} onOpen={openGame} nav={nav} />}
		</>
	);
}
