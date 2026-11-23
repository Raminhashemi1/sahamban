-- Add one-time password recovery codes. Keep this as a separate additive
-- migration; 0004 may already have been applied to existing D1 databases.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS sahmino_recovery_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES sahamban_users(id),
  code_hash TEXT NOT NULL UNIQUE CHECK(length(code_hash)=64 AND code_hash NOT GLOB '*[^a-f0-9]*'),
  created_at TEXT NOT NULL,
  used_at TEXT,
  reset_id TEXT UNIQUE,
  CHECK((used_at IS NULL AND reset_id IS NULL) OR
        (used_at IS NOT NULL AND reset_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_sahmino_recovery_codes_user
  ON sahmino_recovery_codes(user_id,used_at);
