-- Migration: provider-independent prepaid Pro plans (v1).
-- Apply to a PRIVATE D1 database only after backup. This is additive and leaves
-- the legacy annual pilot tables untouched. No card/bank credentials or PII.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS prepaid_subscription_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES sahamban_users(id),
  plan_id TEXT NOT NULL CHECK(plan_id IN (
    'SAHAMBAN_PRO_3M','SAHAMBAN_PRO_6M','SAHAMBAN_PRO_9M','SAHAMBAN_PRO_12M'
  )),
  amount_rial INTEGER NOT NULL CHECK(amount_rial IN (4500000,8550000,12150000,15300000)),
  currency TEXT NOT NULL CHECK(currency='IRR'),
  state TEXT NOT NULL CHECK(state IN ('PENDING','SETTLED','CANCELLED','EXPIRED','REVIEW_REQUIRED')),
  created_at TEXT NOT NULL,
  settled_at TEXT,
  provider_name TEXT,
  provider_payment_id TEXT,
  CHECK(
    (state='SETTLED' AND settled_at IS NOT NULL AND provider_name IS NOT NULL AND provider_payment_id IS NOT NULL)
    OR state<>'SETTLED'
  ),
  UNIQUE(provider_name,provider_payment_id),
  UNIQUE(id,user_id,plan_id,amount_rial,currency)
);

CREATE TABLE IF NOT EXISTS prepaid_subscription_entitlements (
  user_id TEXT PRIMARY KEY REFERENCES sahamban_users(id),
  paid_until TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prepaid_payment_events (
  provider_name TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  provider_payment_id TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES prepaid_subscription_orders(id),
  event_type TEXT NOT NULL CHECK(event_type IN ('PAYMENT_SETTLED','REFUND_SETTLED','CHARGEBACK_CONFIRMED')),
  verified_at TEXT NOT NULL,
  PRIMARY KEY(provider_name,provider_event_id),
  UNIQUE(provider_name,provider_payment_id,event_type)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prepaid_one_pending_order_per_user
  ON prepaid_subscription_orders(user_id) WHERE state='PENDING';
CREATE INDEX IF NOT EXISTS idx_prepaid_orders_user_created
  ON prepaid_subscription_orders(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prepaid_orders_state_created
  ON prepaid_subscription_orders(state,created_at);
CREATE INDEX IF NOT EXISTS idx_prepaid_events_order
  ON prepaid_payment_events(order_id);
