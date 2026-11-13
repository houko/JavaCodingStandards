import { GAMES, SITE_URL } from '@vibe-arcade/catalog';
import { describe, expect, it } from 'vitest';
import { FEED_SIZE, feedEntries, feedXml, joined } from './feed';

describe('the Atom feed', () => {
	it('lists the games newest first, at most FEED_SIZE', () => {
		const entries = feedEntries();
		expect(entries.length).toBe(Math.min(GAMES.length, FEED_SIZE));
		for (let i = 1; i < entries.length; i++) expect(joined(entries[i - 1]) >= joined(entries[i]), entries[i].slug).toBe(true);
	});

	it('puts a game the bot added ahead of older posts, dated the day it joined', () => {
		const added = GAMES.filter((g) => g.added);
		if (added.length === 0) return;
		const newest = added.reduce((a, b) => (joined(a) > joined(b) ? a : b));
		expect(joined(newest) >= newest.postedAt).toBe(true);
		expect(joined(newest).slice(0, 10) >= (newest.added as string)).toBe(true);
		expect(feedEntries().indexOf(newest)).toBeLessThan(feedEntries().length);
	});

	it('is one feed document with an entry per game, linking to its page', () => {
		const xml = feedXml();
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">')).toBe(true);
		expect(xml.match(/<entry>/g)).toHaveLength(feedEntries().length);
		expect(xml).toContain(`<link rel="self" type="application/atom+xml" href="${SITE_URL}/feed.xml"/>`);
		for (const g of feedEntries()) expect(xml).toContain(`<id>${SITE_URL}/games/${g.slug}</id>`);
	});

	it('escapes what XML would read as markup', () => {
		expect(feedXml()).not.toMatch(/&(?!amp;|lt;|gt;|quot;|#)/);
	});
});
