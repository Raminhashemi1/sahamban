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
