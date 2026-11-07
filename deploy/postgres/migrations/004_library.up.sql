-- 004_library: reading progress, follows, bookmarks (issue #5, FR-L1..L4).
-- No FKs to catalog: each service owns its data; story/chapter IDs are opaque TEXT.
-- Position unit: manga = page index, novel = percent * 100.

CREATE SCHEMA IF NOT EXISTS library;

CREATE TABLE library.reading_progress (
  user_id      TEXT NOT NULL,
  story_id     TEXT NOT NULL,
  chapter_id   TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('manga', 'novel')),
  position     BIGINT NOT NULL DEFAULT 0 CHECK (position >= 0),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, story_id)
);
CREATE INDEX ON library.reading_progress (user_id, updated_at DESC);

CREATE TABLE library.follows (
  user_id    TEXT NOT NULL,
  story_id   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, story_id)
);

CREATE TABLE library.bookmarks (
  user_id    TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  story_id   TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chapter_id)
);
CREATE INDEX ON library.bookmarks (user_id);
