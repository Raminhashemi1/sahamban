PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS billing_orders(
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES sahamban_users(id),
 plan_id TEXT NOT NULL CHECK(plan_id IN ('SAHAMBAN_PRO_30D','SAHAMBAN_PRO_60D','SAHAMBAN_PRO_90D','SAHAMBAN_PRO_180D','SAHAMBAN_PRO_365D')),
 amount_rial INTEGER NOT NULL CHECK(
 (plan_id='SAHAMBAN_PRO_30D' AND amount_rial=1500000) OR
 (plan_id='SAHAMBAN_PRO_60D' AND amount_rial=2850000) OR
 (plan_id='SAHAMBAN_PRO_90D' AND amount_rial=4050000) OR
 (plan_id='SAHAMBAN_PRO_180D' AND amount_rial=7650000) OR
 (plan_id='SAHAMBAN_PRO_365D' AND amount_rial=14600000)),
 currency TEXT NOT NULL CHECK(currency='IRR'),
 status TEXT NOT NULL CHECK(status IN ('CREATED','PAID','CANCELLED','REVERSED')),
 created_at TEXT NOT NULL,paid_at TEXT,bazaar_product_id TEXT,bazaar_order_id TEXT,purchase_token_hash TEXT,
 UNIQUE(bazaar_order_id),UNIQUE(purchase_token_hash)
);
CREATE TABLE IF NOT EXISTS billing_access(
 user_id TEXT PRIMARY KEY REFERENCES sahamban_users(id),expires_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS billing_events(
 event_id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES billing_orders(id),
 event_type TEXT NOT NULL CHECK(event_type IN ('PURCHASE_VERIFIED','PURCHASE_REVERSED')),created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_billing_orders_user ON billing_orders(user_id,created_at DESC);
