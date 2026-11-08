-- 005_identity_moderation_community: users, sessions, audit logs, comments, blocked words.
-- No FKs across services: IDs are opaque TEXT (same rule as 004_library).

CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS moderation;
CREATE SCHEMA IF NOT EXISTS community;

CREATE TABLE identity.users (
  id            TEXT NOT NULL PRIMARY KEY,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('guest', 'user', 'uploader', 'admin')),
  banned        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON identity.users (LOWER(email));

CREATE TABLE identity.sessions (
  token      TEXT NOT NULL PRIMARY KEY,
  user_id    TEXT NOT NULL,
  role       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX ON identity.sessions (user_id);
CREATE INDEX ON identity.sessions (expires_at);

CREATE TABLE moderation.audit_logs (
  id         TEXT NOT NULL PRIMARY KEY,
  admin_id   TEXT NOT NULL,
  action     TEXT NOT NULL,
  target_id  TEXT NOT NULL,
  reason     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON moderation.audit_logs (created_at DESC);

CREATE TABLE community.comments (
  id          TEXT NOT NULL PRIMARY KEY,
  story_id    TEXT NOT NULL,
  chapter_id  TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  parent_id   TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL CHECK (LENGTH(body) <= 2000),
  status      TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'deleted')),
  like_count  INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  reply_count INTEGER NOT NULL DEFAULT 0 CHECK (reply_count >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at   TIMESTAMPTZ
);
CREATE INDEX ON community.comments (chapter_id, created_at);
CREATE INDEX ON community.comments (story_id, created_at);

CREATE TABLE community.blocked_words (
  word TEXT NOT NULL PRIMARY KEY
);
