import { GAMES, gameBySlug } from '@vibe-arcade/catalog';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useCallback, useEffect, useRef } from 'react';
import { BackToTop } from '../components/BackToTop';
import { Faq } from '../components/Faq';
import { Featured } from '../components/Featured';
import { Footer } from '../components/Footer';
import { GameDialog } from '../components/GameDialog';
import { GamesSection } from '../components/GamesSection';
import { Hero } from '../components/Hero';
import { HowItWorks } from '../components/HowItWorks';
import { Nav } from '../components/Nav';
import { SubmitCta } from '../components/SubmitCta';
import { Ticker } from '../components/Ticker';
import { TopLiked } from '../components/TopLiked';
import { useLang, useT } from '../lib/lang';
import { type HomeSearch, validateHomeSearch } from '../lib/search';
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

	return (
		<>
			<Nav home />
			<main id='main' tabIndex={-1} className='outline-none'>
				<Hero lang={lang} onSurprise={surprise} />
				<Ticker />
				<Featured lang={lang} onOpen={openGame} />
				<TopLiked lang={lang} onOpen={openGame} />
				<GamesSection lang={lang} search={search} onFilter={setFilter} onOpen={openGame} onSurprise={surprise} />
				<HowItWorks lang={lang} />
				<Faq lang={lang} />
				<SubmitCta lang={lang} />
			</main>
			<Footer lang={lang} home />
			<BackToTop label={tr.backTop} />
			{open && <GameDialog game={open} lang={lang} onClose={closeGame} onOpen={openGame} />}
		</>
	);
}
