PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS store_skus (
  store TEXT NOT NULL CHECK (store IN ('BAZAAR', 'MYKET')),
  plan_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  PRIMARY KEY (store, plan_id),
  UNIQUE (store, sku)
);

CREATE TABLE IF NOT EXISTS subscription_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  store TEXT NOT NULL CHECK (store IN ('BAZAAR', 'MYKET')),
  plan_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  amount_irr INTEGER NOT NULL CHECK (amount_irr > 0),
  status TEXT NOT NULL CHECK (status IN ('CREATED', 'VERIFIED', 'SETTLED', 'REJECTED')),
  created_at TEXT NOT NULL,
  settled_at TEXT,
  store_order_id TEXT,
  purchase_token_hash TEXT,
  UNIQUE (store, store_order_id),
  UNIQUE (store, purchase_token_hash)
);

CREATE TABLE IF NOT EXISTS subscription_entitlements (
  user_id TEXT PRIMARY KEY,
  starts_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscription_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES subscription_orders(id),
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  details_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_subscription_orders_user
  ON subscription_orders(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_subscription_entitlements_expiry
  ON subscription_entitlements(expires_at);
