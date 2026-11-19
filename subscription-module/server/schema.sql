-- Independent Billing V2 schema for Sahmino.
-- Follows the entity names and lifecycle described in the supplied technical dossier,
-- with a provider-neutral store discriminator for Bazaar/Myket.
-- Review and validate before applying to any live D1 database.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS billing_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  store TEXT NOT NULL CHECK (store IN ('BAZAAR', 'MYKET')),
  plan_id TEXT NOT NULL CHECK (plan_id IN (
    'SAHAMBAN_PRO_30D',
    'SAHAMBAN_PRO_60D',
    'SAHAMBAN_PRO_90D',
    'SAHAMBAN_PRO_180D',
    'SAHAMBAN_PRO_365D'
  )),
  status TEXT NOT NULL CHECK (status IN ('CREATED', 'PAID', 'CANCELLED', 'REVERSED')),
  amount_irr INTEGER NOT NULL CHECK (amount_irr > 0),
  store_product_id TEXT NOT NULL,
  store_order_id TEXT,
  purchase_token_hash TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT,
  CHECK (
    (status = 'CREATED' AND paid_at IS NULL) OR
    (status IN ('PAID', 'REVERSED') AND paid_at IS NOT NULL) OR
    status = 'CANCELLED'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_orders_store_order
  ON billing_orders(store, store_order_id)
  WHERE store_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_orders_store_token
  ON billing_orders(store, purchase_token_hash)
  WHERE purchase_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_orders_user_created
  ON billing_orders(user_id, created_at);

CREATE TABLE IF NOT EXISTS billing_access (
  user_id TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  auto_renewing INTEGER NOT NULL DEFAULT 0 CHECK (auto_renewing IN (0, 1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS billing_events (
  event_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES billing_orders(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'ORDER_CREATED', 'PURCHASE_VERIFIED', 'PURCHASE_REVERSED', 'PURCHASE_CANCELLED'
  )),
  created_at TEXT NOT NULL,
  payload_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_billing_events_order_created
  ON billing_events(order_id, created_at);

-- A verified purchase may settle an order only once.
CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_events_order_verified
  ON billing_events(order_id)
  WHERE event_type = 'PURCHASE_VERIFIED';
