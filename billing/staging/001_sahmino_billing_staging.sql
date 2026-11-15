-- SAHMINO STAGING-ONLY POSTGRESQL SCHEMA DRAFT
-- NOT EXECUTED. NOT FOR PRODUCTION MIGRATIONS. NO CHECKOUT OR REAL ENTITLEMENTS.
-- Standalone schema deliberately does not depend on unknown app_users tables.
-- Authentication must bind account_id to the server session before any future use.
BEGIN;
CREATE SCHEMA IF NOT EXISTS sahmino_billing_staging;
CREATE TABLE IF NOT EXISTS sahmino_billing_staging.account_lock (
 account_id uuid PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS sahmino_billing_staging.purchase (
 id uuid PRIMARY KEY,
 channel text NOT NULL CHECK (channel IN ('CAFEBAZAAR','MYKET','GOOGLE_PLAY','WEB_DIRECT')),
 provider_purchase_id text NOT NULL CHECK (length(provider_purchase_id) BETWEEN 1 AND 256),
 account_id uuid NOT NULL REFERENCES sahmino_billing_staging.account_lock(account_id),
 plan_days integer NOT NULL CHECK (plan_days IN (30,60,90,180,365)),
 state text NOT NULL CHECK (state IN ('VERIFIED','REFUNDED','REVOKED')),
 verified_at timestamptz NOT NULL,
 effective_at timestamptz NOT NULL,
 invalidated_at timestamptz,
 evidence_reference text NOT NULL CHECK (length(evidence_reference) BETWEEN 1 AND 256),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (channel,provider_purchase_id),
 CHECK ((state='VERIFIED' AND invalidated_at IS NULL) OR
        (state IN ('REFUNDED','REVOKED') AND invalidated_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS staging_purchase_by_account
 ON sahmino_billing_staging.purchase(account_id,effective_at,id);
CREATE TABLE IF NOT EXISTS sahmino_billing_staging.entitlement_snapshot (
 account_id uuid PRIMARY KEY REFERENCES sahmino_billing_staging.account_lock(account_id),
 expiry_at timestamptz,
 revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sahmino_billing_staging.audit_event (
 id uuid PRIMARY KEY,
 purchase_id uuid NOT NULL REFERENCES sahmino_billing_staging.purchase(id),
 event_type text NOT NULL CHECK(event_type IN ('VERIFIED','REFUNDED','REVOKED')),
 evidence_reference text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(purchase_id,event_type)
);
CREATE TABLE IF NOT EXISTS sahmino_billing_staging.outbox (
 id uuid PRIMARY KEY,
 purchase_id uuid NOT NULL REFERENCES sahmino_billing_staging.purchase(id),
 action text NOT NULL CHECK(action IN ('ACKNOWLEDGE','CONSUME','RECONCILE')),
 state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','IN_PROGRESS','DONE','FAILED')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (purchase_id,action)
);
COMMIT;

-- No stored procedure grants access. No provider credentials or receipt tokens.
-- Future handler MUST: verify provider evidence outside transaction, bind authenticated
-- principal to account_id, lock account_lock with SELECT FOR UPDATE, check UNIQUE
-- purchase key including account/plan, append audit + outbox and recompute expiry
-- in the SAME transaction. Refund policy and late provider events require review.
