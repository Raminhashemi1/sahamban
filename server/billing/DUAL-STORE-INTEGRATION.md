# Billing V2 dual-store integration

Updated 2026-11-20. This document reflects the integrated Android host and
current server contract, not the earlier standalone-adapter checkpoint.

## Architecture

`MainActivity` → native OTP login/session → `BillingV2SubscriptionHost` →
`BillingV2CookieSessionProvider` → `BillingV2ApiClient` →
flavor-specific `BillingV2Coordinator` → `BillingV2PurchaseFlow` →
`BillingV2SubscriptionView`.

The client sends only a selected internal plan ID and signed purchase evidence.
It cannot choose the store, account identity, amount, duration, or expiry.
Worker deployment configuration selects `BAZAAR` or `MYKET`.

## Canonical product catalog

| Internal ID | Days | Price (IRR) |
|---|---:|---:|
| `SAHAMBAN_PRO_30D` | 30 | 1,500,000 |
| `SAHAMBAN_PRO_60D` | 60 | 2,850,000 |
| `SAHAMBAN_PRO_90D` | 90 | 4,050,000 |
| `SAHAMBAN_PRO_180D` | 180 | 7,650,000 |
| `SAHAMBAN_PRO_365D` | 365 | 14,600,000 |

The server catalog and D1 constraint are authoritative. Each product is a
consumable one-time in-app product. A user must explicitly buy again to renew.
There is no free tier and no automatic renewal. A repurchase during an active
term stacks after the current expiry; an expired term starts at settlement.

## Order and settlement contract

- The authenticated account is resolved server-side from the native OTP
  session cookie or, for isolated private-pilot tests, the legacy pilot token.
- The server selects the store from `BILLING_STORE`.
- Both Bazaar and Myket order creation require exactly five unique,
  non-placeholder server SKU IDs. The selected plan is bound to the
  corresponding store product ID in `billing_orders` before the app opens the
  marketplace checkout.
- The server persists the approved `amount_irr`. D1 rejects any amount that
  does not match the plan ID.
- Bazaar validates its RSA-signed purchase payload and calls Bazaar's in-app
  product validation endpoint. It verifies the order's stored product ID,
  plan ID, purchase token, package, and server-side order state.
- Myket validates the signed original purchase JSON and binds package,
  product ID, developer payload/order ID, and stored order.
- Both providers settle to the same durable order, access, and event ledger.
- The app consumes a store purchase token only after server settlement.
  Replays are idempotent; a failed consume is reconciled on a later app
  session without revoking an already-granted entitlement.
- The Android client verifies that the returned price matches the approved
  plan price before launching the marketplace flow.

## OTP and Worker deployment

Both `wrangler.bazaar.toml.example` and
`wrangler.myket.toml.example` use the same D1 binding name and database
placeholder, exact PWA origin, OTP feature flag defaulting to false, and
`SAHMINO_SMS_PROVIDER` service binding. The Shahmiz SMS Worker is deployed
separately. Both marketplace Workers need the same OTP migrations and
secrets before enabling login.

The native app stores the Secure/HttpOnly session cookie through Android's
CookieManager and sends it only in native HTTPS requests. No credential is
exposed to WebView JavaScript, local storage, logs, or URLs. The Worker checks
the exact PWA Origin and CSRF marker for state-changing authenticated
requests.

## Database

Fresh database:
1. Apply the base Sahamban user/account schema.
2. Apply OTP identity/session migrations.
3. Apply `server/billing/schema.sql`.

Existing Billing V2 database:
1. Verify backup and migration history.
2. Apply `0002-myket-store-columns.sql` if it has not already been applied.
3. Apply `0003-authoritative-irr-prices.sql` exactly once.

Do not apply these files to an unverified production database.

## Known limitations and release blockers

- The temporary default Android package is `ir.sahamban.pilot`. The final
  package must be supplied by the owner and match both marketplaces.
- Actual Bazaar and Myket product IDs do not exist in the repository as
  confirmed store registrations. The proposed/placeholder values are not
  valid production identifiers.
- Worker URLs, shared production D1, OTP/SMS secrets, Bazaar merchant
  credentials, and store public keys require owner-controlled deployment.
- Myket signed purchase validation does not independently detect a later
  refund/revocation. Add and test authoritative reconciliation from Myket's
  supported provider API/contract before public checkout.
- Physical-device acceptance has not yet established live login, cookie
  persistence, purchase, restore, consume/retry, repurchase, account
  switching, refunds, or network-loss behavior.
- Debug checkout can be opted in only with complete real configuration.
  Release checkout remains hard-disabled.
- No production migration, deployment, live payment, or signed release was
  performed during source integration.

## Operational rule

Before any further code change, inspect the current integration branch and
related PRs to avoid repeating completed work. Keep all feature flags off
until every external gate and physical acceptance test passes.
