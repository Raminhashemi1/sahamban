-- Username/password authentication for Sahmino.
-- Additive migration. Run after the existing Billing V2 schema and shared-session
-- runtime schema. It deliberately preserves old OTP tables for historical data;
-- no OTP route or SMS provider is used by the new Worker.
PRAGMA foreign_keys = ON;

ALTER TABLE sahamban_users ADD COLUMN username_normalized TEXT;
ALTER TABLE sahamban_users ADD COLUMN password_salt TEXT;
ALTER TABLE sahamban_users ADD COLUMN password_hash TEXT;
ALTER TABLE sahamban_users ADD COLUMN password_iterations INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sahamban_users_username
  ON sahamban_users(username_normalized) WHERE username_normalized IS NOT NULL;

-- Existing phone identities can be used as usernames after canonicalization.
-- Passwords are intentionally NULL and must be provisioned separately; no
-- account is silently given a default or guessable password.
UPDATE sahamban_users
SET username_normalized = (
  SELECT '+989' || substr(p.phone_e164, 5)
  FROM sahmino_phone_identities p
  WHERE p.user_id = sahamban_users.id AND p.revoked_at IS NULL
  ORDER BY p.verified_at DESC LIMIT 1
)
WHERE username_normalized IS NULL
  AND EXISTS (
    SELECT 1 FROM sahmino_phone_identities p
    WHERE p.user_id = sahamban_users.id AND p.revoked_at IS NULL
  );

CREATE TABLE IF NOT EXISTS sahmino_auth_rate_limits (
  bucket_key TEXT PRIMARY KEY CHECK(length(bucket_key)=66),
  window_started_epoch INTEGER NOT NULL CHECK(window_started_epoch>=0),
  attempts INTEGER NOT NULL CHECK(attempts BETWEEN 1 AND 1000),
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sahmino_auth_rate_limits_updated
  ON sahmino_auth_rate_limits(updated_at);

-- Keep the existing session table contract; this CREATE makes the auth
-- migration self-contained for installations that did not run OTP runtime SQL.
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
