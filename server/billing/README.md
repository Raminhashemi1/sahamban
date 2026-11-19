# Billing V2 — Cafe Bazaar manual time-pass purchases

This directory implements five manually renewed, time-limited access plans. They are displayed to customers as subscriptions/plans, but are **not configured as Bazaar auto-renewing subscription products**.

- Five Bazaar **consumable in-app product** SKUs: 30/60/90/180/365 days.
- Each user explicitly initiates and pays for every new term. No automatic debit or automatic renewal is used.
- After server-side verification and durable entitlement settlement, Android consumes the purchase token with Poolakey `consumeProduct`. This releases the SKU so it can be purchased again later.
- If consumption fails after settlement, access remains granted and the pending purchase is retried/reconciled on the next app session. Never consume before server settlement.
- The server verifies via Bazaar's in-app product validation API (`/validate/{package}/inapp/{product}/purchases/{token}/`), not the subscription-validation API.
- Access duration is granted by the server using the selected internal plan's fixed day count. If the user buys before the current access expires, the new days are added after the current expiry; otherwise they start at the new purchase settlement time.
- Repeated verification of the same order/token is idempotent and must never grant the same days twice.
- Customer-facing prices remain in IRR (rial), matching the approved product contract. Preserve Bazaar's localized price string verbatim; do not convert to toman or hardcode unapproved prices.
- The client callback is evidence only; it cannot activate access by itself.

## Release blockers

1. Configure five **consumable in-app products**, not subscription products, in Bazaar Pishkhan with the exact product IDs and approved prices.
2. Confirm that the five product IDs are unique and that the app's package name exactly matches the Pishkhan app.
3. Configure `BAZAAR_RSA_PUBLIC_KEY` and Bazaar OAuth credentials as Worker secrets. Do not commit secrets.
4. Apply `schema.sql` to an isolated D1 database and run Worker/Android tests.
5. Connect the purchase flow to a real authenticated user session and the visible plan screen.
6. Test purchase, server verification, consume, retry-after-consume-failure, repurchase, overlapping-term stacking, refund/reversal and account switching on a Bazaar-enabled physical device.
7. Keep `BILLING_V2_ENABLED=false` until all release blockers pass.

Do not submit the app or enable live payments based only on unit tests.


## Dual-store extension (integration branch)

The canonical Billing V2 Worker now supports a server-selected provider:
- `BILLING_STORE=BAZAAR`: existing Bazaar verifier and Poolakey purchase flow.
- `BILLING_STORE=MYKET`: Myket signed-purchase verifier and Myket SKU-bound order creation.
- The client sends a plan ID and signed purchase evidence only. It cannot select the store.
- Both providers settle into the same `billing_orders`, `billing_access`, and `billing_events` ledger.

For Myket, configure `MYKET_SKU_MAP`, `MYKET_PACKAGE_NAME`, and the `MYKET_PUBLIC_KEY` Worker secret from the actual developer account. No example SKU or production package name is assumed. Existing Bazaar databases need the one-time `migrations/0002-myket-store-columns.sql`; fresh isolated databases use the updated `schema.sql`.

The current Myket verifier validates the signed original purchase data and order/package/SKU binding. It does not yet perform an authoritative live refund/revocation lookup. Do not enable public checkout until this gap and the production commercial-authentication contract are resolved. See `DUAL-STORE-INTEGRATION.md`.
