-- 001_init: catalog + commerce schema (issue #1).
-- Single database, separate schemas per service. Money stays ACID.
-- Conventions: TEXT PKs with prefix CHECK, TIMESTAMPTZ, BIGINT coins, FK indexes.

CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS commerce;

-- ============ CATALOG ============

CREATE TABLE catalog.stories (
  id            TEXT NOT NULL PRIMARY KEY CHECK (id LIKE 'story\_%'),
  owner_id      TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('manga', 'novel')),
  title         TEXT NOT NULL CHECK (LENGTH(title) > 0),
  cover_key     TEXT NOT NULL DEFAULT '',
  synopsis      TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'published'
                CHECK (status IN ('draft', 'published', 'hidden', 'taken_down')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON catalog.stories (owner_id);

CREATE TABLE catalog.story_tags (
  story_id  TEXT NOT NULL REFERENCES catalog.stories(id) ON DELETE CASCADE,
  tag       TEXT NOT NULL,
  PRIMARY KEY (story_id, tag)
);
-- No extra FK index: (story_id, tag) PK covers story_id lookups.

CREATE TABLE catalog.creator_splits (
  story_id    TEXT NOT NULL REFERENCES catalog.stories(id) ON DELETE CASCADE,
  creator_id  TEXT NOT NULL,
  percentage  INTEGER NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  PRIMARY KEY (story_id, creator_id)
);

CREATE TABLE catalog.chapters (
  id            TEXT NOT NULL PRIMARY KEY CHECK (id LIKE 'chap\_%'),
  story_id      TEXT NOT NULL REFERENCES catalog.stories(id) ON DELETE CASCADE,
  order_index   INTEGER NOT NULL DEFAULT 0,
  title         TEXT NOT NULL CHECK (LENGTH(title) > 0),
  price_coins   BIGINT NOT NULL DEFAULT 0 CHECK (price_coins >= 0),
  page_keys     TEXT[] NOT NULL DEFAULT '{}',
  novel_text    TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'published'
                CHECK (status IN ('draft', 'published', 'hidden', 'taken_down')),
  auto_unlock_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON catalog.chapters (story_id, order_index);

-- ============ COMMERCE ============

-- Append-only ledger: the single source of truth for balances.
-- Positive = credit, negative = debit. Never UPDATE/DELETE rows.
CREATE TABLE commerce.ledger_entries (
  id              TEXT NOT NULL PRIMARY KEY CHECK (id LIKE 'ledge\_%'),
  user_id         TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN (
                    'topup', 'purchase_debit', 'platform_fee', 'creator_earning',
                    'refund_credit', 'takedown_clawback')),
  coin_type       TEXT NOT NULL CHECK (coin_type IN ('purchased', 'bonus')),
  amount          BIGINT NOT NULL,
  reference_id    TEXT NOT NULL DEFAULT '',
  idempotency_key TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX ON commerce.ledger_entries (user_id, created_at DESC);
CREATE INDEX ON commerce.ledger_entries (reference_id);

CREATE TABLE commerce.purchases (
  id                      TEXT NOT NULL PRIMARY KEY CHECK (id LIKE 'purch\_%'),
  user_id                 TEXT NOT NULL,
  story_id                TEXT NOT NULL,
  chapter_id              TEXT NOT NULL,
  total_coins             BIGINT NOT NULL CHECK (total_coins >= 0),
  purchased_coins_debited BIGINT NOT NULL DEFAULT 0,
  bonus_coins_debited     BIGINT NOT NULL DEFAULT 0,
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reversed')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  reversed_at             TIMESTAMPTZ,
  UNIQUE (user_id, chapter_id)
);
CREATE INDEX ON commerce.purchases (user_id);

CREATE TABLE commerce.creator_earnings (
  id           TEXT NOT NULL PRIMARY KEY CHECK (id LIKE 'earn\_%'),
  purchase_id  TEXT NOT NULL REFERENCES commerce.purchases(id) ON DELETE RESTRICT,
  creator_id   TEXT NOT NULL,
  story_id     TEXT NOT NULL,
  chapter_id   TEXT NOT NULL,
  coins_earned BIGINT NOT NULL CHECK (coins_earned > 0),
  clawed_back  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (purchase_id, creator_id)
);
CREATE INDEX ON commerce.creator_earnings (creator_id, clawed_back);

CREATE TABLE commerce.entitlements (
  id          TEXT NOT NULL PRIMARY KEY CHECK (id LIKE 'ent\_%'),
  user_id     TEXT NOT NULL,
  story_id    TEXT NOT NULL,
  chapter_id  TEXT NOT NULL,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ,
  UNIQUE (user_id, chapter_id)
);
CREATE INDEX ON commerce.entitlements (user_id) WHERE revoked_at IS NULL;
