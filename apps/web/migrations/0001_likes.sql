-- One row per like: the entry's like key (see packages/catalog/src/likes.ts) and the visitor, as a salted hash of their IP. The primary key makes a second like from the same visitor a no-op.
CREATE TABLE likes (
	item TEXT NOT NULL,
	voter TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	PRIMARY KEY (item, voter)
) WITHOUT ROWID;

-- What one visitor has liked, for the hearts they see filled.
CREATE INDEX likes_by_voter ON likes (voter);
