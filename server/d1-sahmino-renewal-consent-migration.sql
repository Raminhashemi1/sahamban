-- Persist the user's explicit renewal choice on the server-owned order.
-- Apply after d1-sahmino-subscription-v2.sql. Existing orders remain MANUAL.
ALTER TABLE sahmino_prepaid_subscription_orders
  ADD COLUMN renewal_mode TEXT NOT NULL DEFAULT 'MANUAL'
  CHECK(renewal_mode IN ('MANUAL','AUTO'));
ALTER TABLE sahmino_prepaid_subscription_orders
  ADD COLUMN renewal_consent_version TEXT;
ALTER TABLE sahmino_prepaid_subscription_orders
  ADD COLUMN renewal_consent_at TEXT;

CREATE TRIGGER IF NOT EXISTS trg_sahmino_order_renewal_consent_insert
BEFORE INSERT ON sahmino_prepaid_subscription_orders
WHEN NOT (
 (NEW.renewal_mode='MANUAL' AND NEW.renewal_consent_version IS NULL AND NEW.renewal_consent_at IS NULL)
 OR
 (NEW.renewal_mode='AUTO'
  AND NEW.renewal_consent_version IS NOT NULL
  AND length(NEW.renewal_consent_version) BETWEEN 1 AND 64
  AND NEW.renewal_consent_at IS NOT NULL)
)
BEGIN
 SELECT RAISE(ABORT,'INVALID_RENEWAL_CONSENT');
END;

CREATE TRIGGER IF NOT EXISTS trg_sahmino_order_renewal_consent_update
BEFORE UPDATE OF renewal_mode,renewal_consent_version,renewal_consent_at
ON sahmino_prepaid_subscription_orders
WHEN NOT (
 (NEW.renewal_mode='MANUAL' AND NEW.renewal_consent_version IS NULL AND NEW.renewal_consent_at IS NULL)
 OR
 (NEW.renewal_mode='AUTO'
  AND NEW.renewal_consent_version IS NOT NULL
  AND length(NEW.renewal_consent_version) BETWEEN 1 AND 64
  AND NEW.renewal_consent_at IS NOT NULL)
)
BEGIN
 SELECT RAISE(ABORT,'INVALID_RENEWAL_CONSENT');
END;
