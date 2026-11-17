-- Additive provider-neutral Iran SMS OTP identity foundation.
-- Apply only to a private local/test D1 database until account migration is reviewed.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sahmino_phone_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES sahamban_users(id),
  phone_e164 TEXT NOT NULL UNIQUE CHECK(
    length(phone_e164)=13 AND phone_e164 GLOB '+989[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
  ),
  verified_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  CHECK(revoked_at IS NULL OR revoked_at >= verified_at),
  UNIQUE(id,user_id)
);

CREATE INDEX IF NOT EXISTS idx_sahmino_phone_identity_user
  ON sahmino_phone_identities(user_id);

CREATE TABLE IF NOT EXISTS sahmino_sms_otp_challenges (
  id TEXT PRIMARY KEY,
  phone_e164 TEXT NOT NULL CHECK(
    length(phone_e164)=13 AND phone_e164 GLOB '+989[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
  ),
  verifier_hmac TEXT NOT NULL CHECK(length(verifier_hmac)=64),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK(max_attempts=5),
  consumed_at TEXT,
  superseded_at TEXT,
  provider_message_ref TEXT,
  send_state TEXT NOT NULL CHECK(send_state IN ('PENDING','ACCEPTED','FAILED')),
  CHECK(expires_at > created_at),
  CHECK(consumed_at IS NULL OR consumed_at >= created_at),
  CHECK(superseded_at IS NULL OR superseded_at >= created_at)
);

CREATE INDEX IF NOT EXISTS idx_sahmino_sms_otp_phone_created
  ON sahmino_sms_otp_challenges(phone_e164,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sahmino_sms_otp_expiry
  ON sahmino_sms_otp_challenges(expires_at);
