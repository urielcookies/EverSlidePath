-- Add shape-based annotation columns
ALTER TABLE annotations ADD COLUMN shape TEXT NOT NULL DEFAULT 'circle';
ALTER TABLE annotations ADD COLUMN radius REAL NOT NULL DEFAULT 20;
ALTER TABLE annotations ADD COLUMN color TEXT NOT NULL DEFAULT '#f87171';
ALTER TABLE annotations ADD COLUMN points_json TEXT;
