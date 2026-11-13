import type { Creator } from '@vibe-arcade/catalog';

// A creator's face from X, or the first two letters of their handle where none was fetched. Decoration: the handle is written beside it.
export function Avatar({ creator, className }: { creator: Creator; className: string }) {
	if (creator.avatar) return <img src={creator.avatar} alt='' width={96} height={96} loading='lazy' decoding='async' className={`${className} flex-none rounded-full bg-track object-cover`} />;
	return (
		<span aria-hidden='true' className={`${className} flex flex-none items-center justify-center rounded-full bg-track font-mono text-[14px] font-semibold text-lime`}>
			{creator.handle.slice(0, 2).toUpperCase()}
		</span>
	);
}
