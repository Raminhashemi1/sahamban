-- Apply once to an existing Billing V2 database created before dual-store support.
-- Fresh databases should use server/billing/schema.sql instead of this migration.
ALTER TABLE billing_orders ADD COLUMN store TEXT NOT NULL DEFAULT 'BAZAAR'
 CHECK(store IN ('BAZAAR','MYKET'));
ALTER TABLE billing_orders ADD COLUMN store_product_id TEXT;
ALTER TABLE billing_orders ADD COLUMN store_order_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_orders_store_order_id
 ON billing_orders(store_order_id) WHERE store_order_id IS NOT NULL;
