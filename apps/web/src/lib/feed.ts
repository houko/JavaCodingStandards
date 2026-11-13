import { GAMES, type Game, LAST_UPDATED, SITE_NAME, SITE_URL, t } from '@vibe-arcade/catalog';
import { gamePath, pageUrl } from './seo';

// The Atom feed at /feed.xml: the games in the order they joined the site, newest first, so a feed reader or an aggregator picks up each new one. In English, the site's default language; every entry links to the game's page.

// How many entries the feed carries; readers keep what they have already seen.
export const FEED_SIZE = 50;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// When a game joined: the day the bot listed it, or for the games listed before that was recorded, the time of the creator's post. A game listed the day it was posted takes the post's time, so its entry is never dated before it was published.
export const joined = (game: Game): string => {
	const day = game.added === undefined ? undefined : `${game.added}T00:00:00.000Z`;
	return day !== undefined && day > game.postedAt ? day : game.postedAt;
};

export function feedEntries(): Game[] {
	return [...GAMES].sort((a, b) => (joined(a) < joined(b) ? 1 : joined(a) > joined(b) ? -1 : a.slug < b.slug ? -1 : 1)).slice(0, FEED_SIZE);
}

function entry(game: Game): string {
	const url = pageUrl(gamePath(game.slug), 'en');
	return [
		'\t<entry>',
		`\t\t<id>${esc(url)}</id>`,
		`\t\t<title>${esc(game.name)}</title>`,
		`\t\t<link rel="alternate" type="text/html" href="${esc(url)}"/>`,
		`\t\t<updated>${joined(game)}</updated>`,
		`\t\t<published>${game.postedAt}</published>`,
		`\t\t<author><name>@${esc(game.creator)}</name><uri>${esc(game.creatorUrl)}</uri></author>`,
		`\t\t<category term="${esc(game.genre)}"/>`,
		`\t\t<summary>${esc(`${game.summary.en} Built with ${game.model}.`)}</summary>`,
		`\t\t<link rel="enclosure" type="image/webp" href="${esc(`${SITE_URL}${game.cover}`)}"/>`,
		'\t</entry>',
	].join('\n');
}

export function feedXml(): string {
	const entries = feedEntries();
	const updated = entries.length ? entries.map(joined).reduce((a, b) => (a > b ? a : b)) : `${LAST_UPDATED}T00:00:00.000Z`;
	return `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n\t<id>${SITE_URL}/</id>\n\t<title>${esc(SITE_NAME)}</title>\n\t<subtitle>${esc(t('en').siteDescription)}</subtitle>\n\t<link rel="alternate" type="text/html" href="${SITE_URL}/"/>\n\t<link rel="self" type="application/atom+xml" href="${SITE_URL}/feed.xml"/>\n\t<icon>${SITE_URL}/favicon.svg</icon>\n\t<updated>${updated}</updated>\n${entries.map(entry).join('\n')}\n</feed>\n`;
}
