-- Additive v2 catalogue for the five approved Sahmino day-based plans.
-- Keep v1 four-plan tables intact as historical records; all new orders use v2.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sahmino_prepaid_subscription_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES sahamban_users(id),
  plan_id TEXT NOT NULL CHECK(plan_id IN (
    'SAHMINO_PRO_30D','SAHMINO_PRO_60D','SAHMINO_PRO_90D',
    'SAHMINO_PRO_180D','SAHMINO_PRO_365D'
  )),
  amount_rial INTEGER NOT NULL CHECK(
    (plan_id='SAHMINO_PRO_30D' AND amount_rial=1500000) OR
    (plan_id='SAHMINO_PRO_60D' AND amount_rial=2850000) OR
    (plan_id='SAHMINO_PRO_90D' AND amount_rial=4050000) OR
    (plan_id='SAHMINO_PRO_180D' AND amount_rial=7650000) OR
    (plan_id='SAHMINO_PRO_365D' AND amount_rial=14600000)
  ),
  currency TEXT NOT NULL CHECK(currency='IRR'),
  state TEXT NOT NULL CHECK(state IN ('PENDING','SETTLED','CANCELLED','EXPIRED','REVIEW_REQUIRED')),
  created_at TEXT NOT NULL,
  settled_at TEXT,
  provider_name TEXT,
  provider_payment_id TEXT,
  CHECK((state='SETTLED' AND settled_at IS NOT NULL AND provider_name IS NOT NULL AND provider_payment_id IS NOT NULL) OR state<>'SETTLED'),
  UNIQUE(provider_name,provider_payment_id),
  UNIQUE(id,user_id,plan_id,amount_rial,currency)
);

CREATE TABLE IF NOT EXISTS sahmino_prepaid_payment_events (
  provider_name TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  provider_payment_id TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES sahmino_prepaid_subscription_orders(id),
  event_type TEXT NOT NULL CHECK(event_type IN ('PAYMENT_SETTLED','REFUND_SETTLED','CHARGEBACK_CONFIRMED')),
  verified_at TEXT NOT NULL,
  PRIMARY KEY(provider_name,provider_event_id),
  UNIQUE(provider_name,provider_payment_id,event_type)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sahmino_one_pending_order_per_user
  ON sahmino_prepaid_subscription_orders(user_id) WHERE state='PENDING';
CREATE INDEX IF NOT EXISTS idx_sahmino_orders_user_created
  ON sahmino_prepaid_subscription_orders(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sahmino_orders_state_created
  ON sahmino_prepaid_subscription_orders(state,created_at);
CREATE INDEX IF NOT EXISTS idx_sahmino_events_order
  ON sahmino_prepaid_payment_events(order_id);
