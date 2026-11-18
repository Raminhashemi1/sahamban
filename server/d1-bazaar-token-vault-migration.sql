-- Add encrypted CafeBazaar purchase-token envelope fields.
-- Apply after d1-sahmino-subscription-v2.sql. Existing rows remain NULL.
ALTER TABLE sahmino_prepaid_subscription_orders
  ADD COLUMN provider_token_version TEXT;
ALTER TABLE sahmino_prepaid_subscription_orders
  ADD COLUMN provider_token_nonce TEXT;
ALTER TABLE sahmino_prepaid_subscription_orders
  ADD COLUMN provider_token_ciphertext TEXT;
