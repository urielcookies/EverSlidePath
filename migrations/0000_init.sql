-- PathShare clinical database schema
-- Apply with: wrangler d1 migrations apply pathshare-db

CREATE TABLE IF NOT EXISTS slides (
  id           TEXT    PRIMARY KEY,
  name         TEXT    NOT NULL,
  metadata_json TEXT   NOT NULL,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS annotations (
  id                   TEXT    PRIMARY KEY,
  slide_id             TEXT    NOT NULL,
  type                 TEXT    NOT NULL DEFAULT 'point',
  label                TEXT    NOT NULL,
  x                    REAL    NOT NULL,
  y                    REAL    NOT NULL,
  confidence           REAL,
  session_metadata_json TEXT,               -- JSON: { threshold, inferenceMs } for AI runs
  created_at           INTEGER NOT NULL,
  FOREIGN KEY (slide_id) REFERENCES slides(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_annotations_slide ON annotations(slide_id);
CREATE INDEX IF NOT EXISTS idx_annotations_label ON annotations(slide_id, label);
