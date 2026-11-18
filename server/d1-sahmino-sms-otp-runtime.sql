-- D1 persistence for the provider-neutral SMS OTP domain and shared sessions.
-- Additive only. Apply to an isolated/private D1 database after d1-schema.sql.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sahmino_sms_otp_send_events (
  id TEXT PRIMARY KEY,
  phone_e164 TEXT NOT NULL CHECK(length(phone_e164)=13 AND phone_e164 GLOB '+989[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
  ip_key_hmac TEXT NOT NULL CHECK(length(ip_key_hmac)=64),
  created_at TEXT NOT NULL,
  created_epoch INTEGER NOT NULL CHECK(created_epoch >= 0)
);
CREATE INDEX IF NOT EXISTS idx_sahmino_otp_send_phone_epoch
  ON sahmino_sms_otp_send_events(phone_e164,created_epoch DESC);
CREATE INDEX IF NOT EXISTS idx_sahmino_otp_send_ip_epoch
  ON sahmino_sms_otp_send_events(ip_key_hmac,created_epoch DESC);

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

-- No OTP plaintext, raw IP address, provider credentials, or session bearer token
-- are persisted. Only HMAC pseudonyms and SHA-256 token digests are stored.
