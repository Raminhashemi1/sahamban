PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS billing_orders(
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES sahamban_users(id),
 plan_id TEXT NOT NULL CHECK(plan_id IN ('SAHAMBAN_PRO_30D','SAHAMBAN_PRO_60D','SAHAMBAN_PRO_90D','SAHAMBAN_PRO_180D','SAHAMBAN_PRO_365D')),
 status TEXT NOT NULL CHECK(status IN ('CREATED','PAID','CANCELLED','REVERSED')),
 store TEXT NOT NULL DEFAULT 'BAZAAR' CHECK(store IN ('BAZAAR','MYKET')),
 store_product_id TEXT,store_order_id TEXT,
 created_at TEXT NOT NULL,paid_at TEXT,bazaar_product_id TEXT,bazaar_order_id TEXT,purchase_token_hash TEXT,
 UNIQUE(bazaar_order_id),UNIQUE(store_order_id),UNIQUE(purchase_token_hash),
 CHECK((store='BAZAAR' AND (store_product_id IS NULL OR length(store_product_id)>0)) OR
       (store='MYKET' AND store_product_id IS NOT NULL AND length(store_product_id)>0))
);
CREATE TABLE IF NOT EXISTS billing_access(
 user_id TEXT PRIMARY KEY REFERENCES sahamban_users(id),expires_at TEXT NOT NULL,auto_renewing INTEGER NOT NULL CHECK(auto_renewing IN (0,1)),updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS billing_events(
 event_id TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES billing_orders(id),
 event_type TEXT NOT NULL CHECK(event_type IN ('PURCHASE_VERIFIED','PURCHASE_REVERSED')),created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_billing_orders_user ON billing_orders(user_id,created_at DESC);
