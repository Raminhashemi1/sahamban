# Sahmino billing: proposed durable server boundary (design only)

**Status: DESIGN / NO DEPLOYMENT / NO LIVE BILLING / NO REAL ENTITLEMENTS.**
This document belongs to draft PR #184, not production. It does not validate credentials or receipts, create a server, migrate any database, or alter the app or five-day plan.

## Invariants
- Exactly five product durations in days: `30, 60, 90, 180, 365`. Four mutually independent payment channels: `CAFEBAZAAR`, `MYKET`, `GOOGLE_PLAY`, `WEB_DIRECT`.
- Authenticate every user server-side. Never accept `account_id`, approval, cost, expiry or purchase state from a mobile client as proof. Map the provider's authenticated evidence to a verified user and a server-side plan catalog.
- Default provider adapters and checkout to DISABLED. A mock response is never interchangeable with a production verification result.
- A unique `(channel, provider_purchase_id)` can belong to **one** account and plan. Retry with identical parameters is idempotent; mismatch is a conflict.
- Database transactions and row locks serialize updates **per account**, including simultaneous transactions from different channels. Provider API calls happen outside the DB lock.
- Store UTC instants. Days are 24-hour blocks as currently defined; calendar months are intentionally not substituted.
- A financial subscription **never** overrides independent market-data / signal safety gates.

## PostgreSQL proposal (not applied)
```sql
-- DDL for review; assumes existing app_users(id uuid primary key).
CREATE TABLE billing_accounts (
 account_id uuid PRIMARY KEY REFERENCES app_users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE billing_plan_catalog (
 plan_days integer PRIMARY KEY CHECK (plan_days IN (30,60,90,180,365)),
 enabled boolean NOT NULL DEFAULT false
);
INSERT INTO billing_plan_catalog(plan_days) VALUES (30),(60),(90),(180),(365);
CREATE TABLE billing_provider_purchases (
 id uuid PRIMARY KEY,
 channel text NOT NULL CHECK (channel IN ('CAFEBAZAAR','MYKET','GOOGLE_PLAY','WEB_DIRECT')),
 provider_purchase_id text NOT NULL,
 account_id uuid NOT NULL REFERENCES billing_accounts(account_id),
 plan_days integer NOT NULL REFERENCES billing_plan_catalog(plan_days),
 status text NOT NULL CHECK (status IN ('VERIFIED','REFUNDED','REVOKED')),
 verified_at timestamptz NOT NULL,
 effective_at timestamptz NOT NULL,
 invalidated_at timestamptz,
 receipt_digest text, -- HMAC/keyed digest for correlation; never raw receipt/token
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (channel, provider_purchase_id),
 CHECK ((status='VERIFIED' AND invalidated_at IS NULL)
     OR (status IN ('REFUNDED','REVOKED') AND invalidated_at IS NOT NULL))
);
CREATE INDEX billing_provider_purchases_by_account
 ON billing_provider_purchases(account_id,effective_at,id);
CREATE TABLE billing_entitlement_snapshots (
 account_id uuid PRIMARY KEY REFERENCES billing_accounts(account_id),
 expires_at timestamptz,
 revision bigint NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE billing_audit_events (
 id uuid PRIMARY KEY,
 purchase_id uuid NOT NULL REFERENCES billing_provider_purchases(id),
 event_type text NOT NULL CHECK (event_type IN ('VERIFIED','REFUNDED','REVOKED')),
 occurred_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now(),
 evidence_ref text NOT NULL, -- opaque reference to restricted provider-verification log
 UNIQUE(purchase_id,event_type)
);
CREATE TABLE billing_outbox (
 id uuid PRIMARY KEY,
 purchase_id uuid NOT NULL REFERENCES billing_provider_purchases(id),
 event_type text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 delivered_at timestamptz,
 UNIQUE(purchase_id,event_type)
);
```

This is a **draft schema**, not a validated production migration. Migration/backfill, retention, access controls, key rotation and failover need separate review.

## Verify-and-grant state machine
1. Authenticate the app user, validate an enabled server-side plan and channel; apply rate limits. Never treat client-supplied `fixtureResult` as proof.
2. Verify purchase **server-to-server** with that provider's official API and validate app/package, purchase status, product ID, purchaser binding where available, currency/amount where relevant, and replay protection. Evidence may be delayed or inconclusive: **PENDING means no grant**.
3. In one SQL transaction: `INSERT ... ON CONFLICT DO NOTHING` the billing account if necessary; `SELECT ... FOR UPDATE` its row; check exact `(channel, provider_purchase_id)`; reject account/plan mismatch, return existing outcome for identical retry; insert verified purchase, immutable audit event and outbox entry.
4. Recompute entitlement snapshot from eligible verified purchases in deterministic order (effective_at, purchase id). For each valid purchase: `expiry=max(effective_at, expiry_so_far) + plan_days * interval '1 day'`. Exclude revoked/refunded records according to approved refund policy. Bump revision. Commit all or none.
5. After commit, asynchronously acknowledge/consume the purchase as required by that provider. A failed acknowledgement must be retried via the outbox, not cause duplicate grants. Record reconciliation and refund webhook evidence separately.

## Refund / revoke and reconciliation
- Verify refunds/revocations from authenticated provider APIs or verified provider notifications, **never** client claims. Process with the same account lock, atomic status transition, audit and snapshot recomputation.
- The synthetic prototype removes refunded purchases from the credit sequence and recalculates expiry. **This is a provisional accounting rule**, not an approved customer-facing refund policy. Resolve partial usage, retroactive revocation, active sessions, chargebacks and user notifications before implementation.
- Duplicate refund notices are idempotent. Invalid refund before purchase becomes a pending-reconciliation record, not a synthetic negative balance.
- Scheduled reconciliation checks provider state vs local ledger, recovers lost notifications and raises mismatches for manual review. Availability failure must not silently grant access.

## Production-blocking acceptance tests
- Two concurrent identical purchase requests (same channel/id): exactly one ledger entry and one expiry increment.
- Two different-channel purchases arriving simultaneously for one account: no lost updates.
- Cross-account or cross-plan replay: reject; same ID in two channels: independent.
- Verification timeout, invalid signature, pending/canceled receipt, wrong package, forged client callback: no grant.
- Refund and repeated webhook, offline restore, out-of-order webhook, duplicate outbox dispatch: no duplicate credit.
- Transaction rollback after purchase insert: no orphan purchase and no entitlement.
- Existing subscription renewal, expired subscriptions, all five durations, leap-year UTC, account isolation.
- Negative tests must confirm `realEntitlement=false` for **all** synthetic fixtures and that subscription state cannot bypass financial-data safety gates.

## Channel-specific release gates
| Channel | Verification | Follow-up | Gate |
|---|---|---|---|
| CafeBazaar | official provider confirmation for consumable SKU | consume only after durable grant | account, sandbox, SDK/API policies |
| Myket | official provider verification of supported SKU type | acknowledge/consume/renew per SKU type | actual console durations, sandbox |
| Google Play | Play Developer API + Billing product semantics | acknowledgement/top-up/renewal per product | eligible merchant, supported country, policy and test setup |
| Web direct | PSP signed/server-side callback plus PSP status query | refunds/chargebacks/settlement reconciliation | legal PSP account, backend/domain |

**Next authorized implementation:** create a dedicated authenticated staging service with provider adapters disabled and a real PostgreSQL test database; execute transactional concurrency tests and security review before attempting any store sandbox. Never merge this draft into app release as a payment feature.
