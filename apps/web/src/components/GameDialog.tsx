import type { Game, LangCode } from '@vibe-arcade/catalog';
import { useEffect, useRef } from 'react';
import { useDialog } from '../lib/dialog';
import { GameDetail, type GameNav } from './GameDetail';

interface GameDialogProps {
	game: Game;
	lang: LangCode;
	onClose: () => void;
	// Shows another game in the same dialog.
	onOpen: (slug: string) => void;
	nav: GameNav;
}

// The game's details over the home page, open while the URL carries ?game=<slug>. useDialog traps Tab inside, locks the page's scroll and returns focus to the opener; Escape and a click on the backdrop close it, as does Back, since opening pushed a history entry. The left and right arrow keys step through the list the game was opened from. On a phone the panel takes nearly the whole screen.
export function GameDialog({ game, lang, onClose, onOpen, nav }: GameDialogProps) {
	const ref = useDialog<HTMLDivElement>();
	const panel = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
			// With a modifier the arrows are the browser's own (Alt+Left is Back).
			else if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
			else if (e.key === 'ArrowLeft') nav.onPrev();
			else if (e.key === 'ArrowRight') nav.onNext();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [onClose, nav]);

	// Another game replaces the content in place, so the panel starts again from its top. A related game's link is gone with the old content and focus with it, so focus goes to the close button, the first control of the new content; the previous and next buttons stay, and keep it.
	useEffect(() => {
		panel.current?.scrollTo(0, 0);
		if (!ref.current?.contains(document.activeElement)) ref.current?.querySelector('button')?.focus();
	}, [game.slug, ref]);

	return (
		<div ref={ref} role='dialog' aria-modal='true' aria-labelledby='game-dialog-h' className='fixed inset-0 z-100 flex items-center justify-center p-2 sm:p-6'>
			{/* The close button inside is the keyboard's and the screen reader's way out; the backdrop is the pointer's. */}
			<div aria-hidden='true' onClick={onClose} className='avg-backdrop absolute inset-0 cursor-pointer bg-[rgb(8_8_10/0.8)] backdrop-blur-[6px]' />
			<div ref={panel} className='avg-dlg relative max-h-[calc(100dvh-16px)] w-full max-w-[920px] overflow-auto overscroll-contain rounded-2xl border border-line bg-panel shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8)] max-sm:h-[calc(100dvh-16px)] sm:max-h-[calc(100dvh-48px)] sm:rounded-[20px]'>
				<GameDetail game={game} lang={lang} heading='h2' headingId='game-dialog-h' onClose={onClose} onOpen={onOpen} nav={nav} />
			</div>
		</div>
	);
}
