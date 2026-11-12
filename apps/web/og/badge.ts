// The README badge app authors can add to their project (/badge.svg): the site's mark and name on a pale blue field, and "listed" on the button gradient. Drawn with satori, which turns the text into paths, so the badge looks the same wherever it is shown, whatever fonts the reader has.
import { createElement } from 'react';
import satori from 'satori';
import { type Paths, latinFonts, siteMark } from './card';

export const BADGE_HEIGHT = 28;

export async function renderBadge(paths: Paths): Promise<string> {
	const [mark, fonts] = await Promise.all([siteMark(paths.publicDir, 18), latinFonts(paths.fontDir)]);
	const h = createElement;
	// The 1 px border sits inside the 28 px height, so each half is 26 px tall.
	const badge = h(
		'div',
		{ style: { display: 'flex', height: BADGE_HEIGHT, borderRadius: 6, overflow: 'hidden', border: '1px solid #cfe0f7', fontFamily: 'Inter' } },
		h(
			'div',
			{ style: { display: 'flex', alignItems: 'center', height: '100%', padding: '0 9px 0 5px', background: '#eaf3ff', color: '#0c0d10', fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em' } },
			h('img', { src: mark, width: 18, height: 18, style: { borderRadius: 5, marginRight: 6 } }),
			'Awesome ',
			h('span', { style: { color: '#0062cc', marginLeft: 4 } }, 'NSGo'),
		),
		h('div', { style: { display: 'flex', alignItems: 'center', height: '100%', padding: '0 10px', background: 'linear-gradient(135deg, #1a73e8, #0058c4)', color: '#ffffff', fontSize: 12, fontWeight: 800 } }, 'listed'),
	);
	return satori(badge, { height: BADGE_HEIGHT, fonts });
}
