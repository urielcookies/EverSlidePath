CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  role          TEXT NOT NULL CHECK(role IN ('instructor','student')),
  username      TEXT,
  display_name  TEXT NOT NULL,
  password_hash TEXT,     -- NULL for students
  class_code    TEXT,     -- NULL for instructors
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username   ON users(username) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_class_name ON users(class_code, display_name) WHERE class_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

ALTER TABLE annotations ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_annotations_user ON annotations(user_id);
