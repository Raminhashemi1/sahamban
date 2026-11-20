-- Username/password authentication for Sahmino.
-- Additive migration: preserves users, billing orders, entitlements and any existing sessions.
-- Apply only after a verified backup to the intended private D1 database.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sahmino_user_credentials (
  user_id TEXT PRIMARY KEY REFERENCES sahamban_users(id),
  username_normalized TEXT NOT NULL UNIQUE
    CHECK(length(username_normalized) BETWEEN 3 AND 65),
  password_hash TEXT NOT NULL
    CHECK(length(password_hash) BETWEEN 100 AND 180
      AND password_hash GLOB 'pbkdf2-sha256$600000$*'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  disabled_at TEXT
);

CREATE TABLE IF NOT EXISTS sahmino_shared_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES sahamban_users(id),
  token_hash TEXT NOT NULL UNIQUE CHECK(length(token_hash)=64),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  revoked_at TEXT,
  CHECK(expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_sahmino_shared_sessions_user
  ON sahmino_shared_sessions(user_id,expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_sahmino_shared_sessions_expiry
  ON sahmino_shared_sessions(expires_at);

CREATE TABLE IF NOT EXISTS sahmino_auth_login_attempts (
  id TEXT PRIMARY KEY,
  ip_key_hmac TEXT NOT NULL CHECK(length(ip_key_hmac)=64),
  username_key_hmac TEXT NOT NULL CHECK(length(username_key_hmac)=64),
  created_epoch INTEGER NOT NULL CHECK(created_epoch >= 0)
);
CREATE INDEX IF NOT EXISTS idx_sahmino_auth_login_ip
  ON sahmino_auth_login_attempts(ip_key_hmac,created_epoch DESC);
CREATE INDEX IF NOT EXISTS idx_sahmino_auth_login_username
  ON sahmino_auth_login_attempts(username_key_hmac,created_epoch DESC);

-- Credentials are provisioned for existing ACTIVE users by an owner-controlled
-- secure process. No public self-registration or SMS identity verification is exposed.
