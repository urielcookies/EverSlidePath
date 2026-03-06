CREATE TABLE IF NOT EXISTS case_sets (
  id          TEXT PRIMARY KEY,
  created_by  TEXT NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  class_code  TEXT NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_case_sets_class ON case_sets(class_code);

CREATE TABLE IF NOT EXISTS case_set_items (
  case_set_id TEXT NOT NULL REFERENCES case_sets(id) ON DELETE CASCADE,
  case_id     TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (case_set_id, case_id)
);

CREATE TABLE IF NOT EXISTS student_progress (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id      TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  case_set_id  TEXT REFERENCES case_sets(id) ON DELETE SET NULL,
  started_at   INTEGER,
  completed_at INTEGER,
  status       TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','submitted')),
  UNIQUE(user_id, case_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_user     ON student_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_case_set ON student_progress(case_set_id);
