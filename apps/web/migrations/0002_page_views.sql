-- One aggregated row per page and UTC day. Page views are intentionally kept
-- anonymous: the browser sends only the canonical pathname, never an IP or ID.
CREATE TABLE page_views (
	day TEXT NOT NULL,
	path TEXT NOT NULL,
	views INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (day, path)
) WITHOUT ROWID;

CREATE INDEX page_views_by_day ON page_views (day);
