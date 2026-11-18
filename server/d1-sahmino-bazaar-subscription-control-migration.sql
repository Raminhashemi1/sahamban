-- Additive lifecycle/consent record for verified CafeBazaar subscriptions.
-- Apply after d1-sahmino-subscription-v2.sql and d1-bazaar-token-vault-migration.sql.
-- Does not enable checkout, auto-renewal, or cancellation by itself.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sahmino_bazaar_subscription_control (
  order_id TEXT PRIMARY KEY REFERENCES sahmino_prepaid_subscription_orders(id),
  user_id TEXT NOT NULL REFERENCES sahamban_users(id),
  provider_payment_id TEXT NOT NULL,
  renewal_mode TEXT NOT NULL CHECK(renewal_mode IN ('MANUAL','AUTO')),
  consent_version TEXT,
  consent_at TEXT,
  provider_auto_renewing INTEGER NOT NULL CHECK(provider_auto_renewing IN (0,1)),
  lifecycle_state TEXT NOT NULL CHECK(lifecycle_state IN (
    'VERIFIED','CANCELLATION_PENDING','CANCELLED','RENEWAL_ACTIVE','EXPIRED','REVIEW_REQUIRED'
  )),
  provider_paid_until TEXT NOT NULL,
  cancellation_requested_at TEXT,
  cancellation_confirmed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(
    (renewal_mode='MANUAL' AND consent_version IS NULL AND consent_at IS NULL)
    OR
    (renewal_mode='AUTO' AND consent_version IS NOT NULL AND length(consent_version) BETWEEN 1 AND 64
      AND consent_at IS NOT NULL)
  ),
  CHECK(
    (lifecycle_state='CANCELLED' AND cancellation_confirmed_at IS NOT NULL)
    OR
    (lifecycle_state<>'CANCELLED' AND cancellation_confirmed_at IS NULL)
  ),
  CHECK(
    (lifecycle_state='CANCELLATION_PENDING' AND cancellation_requested_at IS NOT NULL)
    OR lifecycle_state<>'CANCELLATION_PENDING'
  ),
  UNIQUE(provider_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_sahmino_bazaar_control_user
  ON sahmino_bazaar_subscription_control(user_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sahmino_bazaar_control_state
  ON sahmino_bazaar_subscription_control(lifecycle_state,updated_at);
