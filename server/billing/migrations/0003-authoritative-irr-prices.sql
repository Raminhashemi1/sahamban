-- Apply once after 0002-myket-store-columns.sql to persist the owner-approved IRR price.
-- Existing orders are backfilled from their immutable plan_id; new orders write amount_irr from the server catalog.
ALTER TABLE billing_orders ADD COLUMN amount_irr INTEGER NOT NULL DEFAULT 1500000
 CHECK(amount_irr IN (1500000,2850000,4050000,7650000,14600000));
UPDATE billing_orders SET amount_irr = CASE plan_id
 WHEN 'SAHAMBAN_PRO_30D' THEN 1500000
 WHEN 'SAHAMBAN_PRO_60D' THEN 2850000
 WHEN 'SAHAMBAN_PRO_90D' THEN 4050000
 WHEN 'SAHAMBAN_PRO_180D' THEN 7650000
 WHEN 'SAHAMBAN_PRO_365D' THEN 14600000
 ELSE amount_irr END;
