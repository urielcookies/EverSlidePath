CREATE TABLE IF NOT EXISTS cases (
  id                   TEXT PRIMARY KEY,
  slide_id             TEXT NOT NULL,
  created_by           TEXT NOT NULL REFERENCES users(id),
  title                TEXT NOT NULL,
  clinical_description TEXT NOT NULL DEFAULT '',
  diagnosis            TEXT NOT NULL DEFAULT '',
  difficulty           TEXT NOT NULL DEFAULT 'intermediate' CHECK(difficulty IN ('beginner','intermediate','advanced')),
  is_published         INTEGER NOT NULL DEFAULT 0,
  created_at           INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at           INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_cases_creator   ON cases(created_by);
CREATE INDEX IF NOT EXISTS idx_cases_published ON cases(is_published);

ALTER TABLE annotations ADD COLUMN case_id         TEXT REFERENCES cases(id) ON DELETE CASCADE;
ALTER TABLE annotations ADD COLUMN is_ground_truth INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_annotations_case ON annotations(case_id);
