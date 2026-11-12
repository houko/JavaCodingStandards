import { gameBySlug } from '@vibe-arcade/catalog';
import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { Footer } from '../../components/Footer';
import { GameDetail } from '../../components/GameDetail';
import { ArrowLeft } from '../../components/Icons';
import { Nav } from '../../components/Nav';
import { useLang, useT } from '../../lib/lang';
import { gameHead } from '../../lib/seo';

// A game's own page: the same body as the home page's dialog, server-rendered at a URL of its own for search engines and for sharing.
export const Route = createFileRoute('/games/$slug')({
	loader: ({ params }) => {
		if (!gameBySlug(params.slug)) throw notFound();
		return { slug: params.slug };
	},
	head: ({ params, match }) => {
		const game = gameBySlug(params.slug);
		return game ? gameHead(game, match.search.lang) : {};
	},
	component: GamePage,
});

function GamePage() {
	const { slug } = Route.useLoaderData();
	const lang = useLang();
	const tr = useT();
	const game = gameBySlug(slug);
	if (!game) return null;
	return (
		<>
			<Nav home={false} />
			<main id='main' tabIndex={-1} className='mx-auto flex w-full max-w-[968px] flex-col gap-5 px-4 pt-8 pb-20 outline-none sm:px-6 sm:pt-10 sm:pb-24'>
				<Link to='/' hash='games' className='avg-link inline-flex min-h-11 items-center gap-2 self-start text-[15px]'>
					<ArrowLeft />
					{tr.backHome}
				</Link>
				<article className='overflow-hidden rounded-2xl border border-line bg-panel sm:rounded-[20px]'>
					<GameDetail game={game} lang={lang} heading='h1' headingId='game-h' />
				</article>
			</main>
			<Footer lang={lang} home={false} />
		</>
	);
}
