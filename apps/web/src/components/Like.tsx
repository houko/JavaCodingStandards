import { fill } from '@awesome-nsgo/catalog';
import { useT } from '../lib/lang';
import { toggleLike, useLikes } from '../lib/likes';

export function HeartIcon({ filled, size = 16 }: { filled: boolean; size?: number }) {
	return (
		<svg aria-hidden='true' width={size} height={size} viewBox='0 0 24 24' fill={filled ? 'currentColor' : 'none'} stroke='currentColor' strokeWidth='2' strokeLinejoin='round'>
			<path d='M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z' />
		</svg>
	);
}

// A heart and the entry's like count; pressing it likes or unlikes. It sits beside a card's link rather than inside it, so it stops the click from reaching anything around it. `className` is the look's own styling: the original look passes like-btn classes, the retro look its utilities.
export function LikeButton({ item, name, className, size }: { item: string; name: string; className: string; size?: number }) {
	const t = useT();
	const { status, counts, mine } = useLikes();
	if (status === 'off') return null;
	const liked = mine.has(item);
	const n = counts[item] ?? 0;
	return (
		<button
			type='button'
			className={className}
			aria-pressed={liked}
			aria-label={fill(t.like_a, { x: name })}
			title={fill(t.like_a, { x: name })}
			disabled={status === 'loading'}
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void toggleLike(item);
			}}
		>
			<HeartIcon filled={liked} size={size} />
			<span className='like-n'>{status === 'loading' ? '' : n}</span>
		</button>
	);
}
