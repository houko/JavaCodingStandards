-- One aggregated row per country and UTC day. The country comes from Cloudflare's
-- cf-ipcountry request header, so no IP address or visitor identifier is stored.
CREATE TABLE page_view_regions (
	day TEXT NOT NULL,
	country TEXT NOT NULL,
	views INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (day, country)
) WITHOUT ROWID;

CREATE INDEX page_view_regions_by_day ON page_view_regions (day);
