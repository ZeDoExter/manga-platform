-- 009_reads: chapter-open events for real trending stats.
-- One row per (reader, story, chapter, day): same chapter reopened the same
-- day counts once. reader_id is the account id when logged in, else
-- 'anon:<client-id>'. No FKs to catalog (opaque TEXT, per service convention).

CREATE TABLE library.read_events (
  reader_id  TEXT NOT NULL,
  story_id   TEXT NOT NULL,
  chapter    INT NOT NULL CHECK (chapter > 0),
  day        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (reader_id, story_id, chapter, day)
);
CREATE INDEX ON library.read_events (story_id, day);
CREATE INDEX ON library.read_events (day);
