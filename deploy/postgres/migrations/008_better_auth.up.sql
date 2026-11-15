-- 008_better_auth: better-auth v1 tables (user/session/account/verification).
-- Source of truth: getAuthTables() from installed better-auth (incl. custom
-- user.role). Tables live in public (better-auth default); ids are app-generated
-- TEXT PKs. All identifiers quoted: better-auth addresses camelCase columns
-- ("createdAt") and unquoted DDL would fold them to lowercase. Safe to re-run
-- (IF NOT EXISTS); pgmigrate runs it under advisory lock.
CREATE TABLE IF NOT EXISTS "user" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "name"          TEXT NOT NULL,
  "email"         TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  "image"         TEXT,
  "role"          TEXT NOT NULL DEFAULT 'reader',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "session" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "expiresAt"     TIMESTAMPTZ NOT NULL,
  "token"         TEXT NOT NULL UNIQUE,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "ipAddress"     TEXT,
  "userAgent"     TEXT,
  "userId"        TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");

CREATE TABLE IF NOT EXISTS "account" (
  "id"                    TEXT NOT NULL PRIMARY KEY,
  "accountId"             TEXT NOT NULL,
  "providerId"            TEXT NOT NULL,
  "userId"                TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken"           TEXT,
  "refreshToken"          TEXT,
  "idToken"               TEXT,
  "accessTokenExpiresAt"  TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  "scope"                 TEXT,
  "password"              TEXT,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");

CREATE TABLE IF NOT EXISTS "verification" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "identifier"    TEXT NOT NULL,
  "value"         TEXT NOT NULL,
  "expiresAt"     TIMESTAMPTZ NOT NULL,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);
