PRAGMA foreign_keys = ON;

-- Sahamban Pro 1.0 minimal D1 ledger schema.
-- Apply only after creating a private D1 database. Do not store bank passwords,
-- card numbers, CVV, OTPs, gateway secrets, or receipt images here.

CREATE TABLE IF NOT EXISTS sahamban_users (
  id TEXT PRIMARY KEY,
  email_normalized TEXT UNIQUE,
  auth_subject TEXT UNIQUE,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK(status IN ('ACTIVE','SUSPENDED','CLOSED'))
);

CREATE TABLE IF NOT EXISTS subscription_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES sahamban_users(id),
  plan_id TEXT NOT NULL CHECK(plan_id = 'SAHAMBAN_PRO_ANNUAL'),
  amount_rial INTEGER NOT NULL CHECK(amount_rial > 0),
  currency TEXT NOT NULL CHECK(currency = 'IRR'),
  state TEXT NOT NULL CHECK(state IN
    ('PENDING','SETTLED','CANCELLED','EXPIRED','REVIEW_REQUIRED')),
  created_at TEXT NOT NULL,
  settled_at TEXT,
  provider_name TEXT,
  provider_payment_id TEXT,
  UNIQUE(id, user_id, amount_rial, currency),
  UNIQUE(provider_name, provider_payment_id)
);

CREATE TABLE IF NOT EXISTS manual_bank_reconciliations (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES sahamban_users(id),
  amount_rial INTEGER NOT NULL CHECK(amount_rial > 0),
  currency TEXT NOT NULL CHECK(currency = 'IRR'),
  state TEXT NOT NULL CHECK(state IN
    ('AWAITING_BANK_RECONCILIATION','MANUALLY_VERIFIED','REJECTED','REVIEW_REQUIRED')),
  bank_transaction_id TEXT UNIQUE,
  bank_booked_at TEXT,
  verified_by TEXT,
  verified_at TEXT,
  FOREIGN KEY (order_id, user_id, amount_rial, currency)
    REFERENCES subscription_orders(id, user_id, amount_rial, currency),
  CHECK(
    (state = 'MANUALLY_VERIFIED'
      AND bank_transaction_id IS NOT NULL
      AND bank_booked_at IS NOT NULL
      AND verified_by IS NOT NULL
      AND verified_at IS NOT NULL)
    OR state <> 'MANUALLY_VERIFIED'
  )
);

CREATE TABLE IF NOT EXISTS subscription_entitlements (
  user_id TEXT PRIMARY KEY REFERENCES sahamban_users(id),
  paid_until TEXT,
  suspended INTEGER NOT NULL DEFAULT 0 CHECK(suspended IN (0,1)),
  auto_renew_cancelled INTEGER NOT NULL DEFAULT 0 CHECK(auto_renew_cancelled IN (0,1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_event_ledger (
  id TEXT PRIMARY KEY,
  provider_name TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  provider_payment_id TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES subscription_orders(id),
  event_type TEXT NOT NULL CHECK(event_type IN
    ('PAYMENT_SETTLED','REFUND_SETTLED','CHARGEBACK_CONFIRMED','AUTO_RENEW_CANCELLED','MANUAL_BANK_SETTLED')),
  verified_at TEXT NOT NULL,
  UNIQUE(provider_name, provider_event_id),
  UNIQUE(provider_name, provider_payment_id, event_type)
);

CREATE TABLE IF NOT EXISTS subscription_admin_audit (
  id TEXT PRIMARY KEY,
  admin_subject TEXT NOT NULL,
  action TEXT NOT NULL,
  target_order_id TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user_created
  ON subscription_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_state_created
  ON subscription_orders(state, created_at);
CREATE INDEX IF NOT EXISTS idx_reconciliation_state_created
  ON manual_bank_reconciliations(state, bank_booked_at);
CREATE INDEX IF NOT EXISTS idx_payment_ledger_order
  ON payment_event_ledger(order_id);
