// Class lists several components share, so a button or a section heading is spelled once.

// The page's column: 1280px at most, with narrower gutters on a phone.
export const WRAP = 'mx-auto w-full max-w-[1280px] px-4 sm:px-6';

export const H2 = 'font-display text-[30px] font-extrabold leading-[1.15] tracking-[-0.02em] sm:text-[36px]';

// The small uppercase mono label over a block.
export const KICKER = 'font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-muted';

// Buttons come without padding: each use adds its own.
const BTN = 'avg-btn inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg';
export const BTN_LIME = `${BTN} avg-shine bg-lime font-semibold text-bg hover:text-bg`;
export const BTN_LINE = `${BTN} border border-line-2`;

// The attributes of a link that leaves the site in a new tab: a game, its source or its post.
export const NEW_TAB = { target: '_blank', rel: 'noopener noreferrer' } as const;
