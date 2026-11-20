# Billing V2 — Cafe Bazaar manual time-pass purchases

This directory implements exactly five manually renewed, time-limited access plans. They are displayed to customers as plans, but are **not configured as auto-renewing subscription products**.

| Plan ID | Fixed duration | Approved price (IRR) |
|---|---:|---:|
| `SAHAMBAN_PRO_30D` | 30 days | 1,500,000 |
| `SAHAMBAN_PRO_60D` | 60 days | 2,850,000 |
| `SAHAMBAN_PRO_90D` | 90 days | 4,050,000 |
| `SAHAMBAN_PRO_180D` | 180 days | 7,650,000 |
| `SAHAMBAN_PRO_365D` | 365 days | 14,600,000 |

- Five Bazaar **consumable in-app product** SKUs: 30/60/90/180/365 days.
- Each user explicitly initiates and pays for every new term. No automatic debit or automatic renewal is used.
- The server catalog is the authoritative plan/IRR price map. Every new order persists `amount_irr`; the database rejects a price that does not match its plan ID.
- Configure the same five approved IRR prices against the corresponding consumable product IDs in both Cafe Bazaar and Myket. The marketplace's localized price string is display data and must be checked against this approved amount; do not convert rial to toman.
- After server-side verification and durable entitlement settlement, Android consumes the purchase token. This releases the SKU so it can be purchased again later.
- If consumption fails after settlement, access remains granted and the pending purchase is retried/reconciled on the next app session. Never consume before server settlement.
- The server verifies via Bazaar's in-app product validation API (`/validate/{package}/inapp/{product}/purchases/{token}/`), not the subscription-validation API.
- Access duration is granted by the server using the selected internal plan's fixed day count. If the user buys before the current access expires, the new days are added after the current expiry; otherwise they start at the new purchase settlement time.
- Repeated verification of the same order/token is idempotent and must never grant the same days twice.
- The client callback is evidence only; it cannot activate access by itself.

## Release blockers

1. Configure five **consumable in-app products**, not subscription products, in Bazaar Pishkhan with the exact product IDs and approved prices.
2. Configure the same five approved products/prices in Myket developer console and verify their actual SKU IDs.
3. Confirm that product IDs are unique and that the app package name exactly matches each marketplace app.
4. Configure signing keys and marketplace credentials as Worker secrets. Do not commit secrets.
5. Apply `schema.sql` to a fresh isolated D1 database, or apply migrations `0002-myket-store-columns.sql` then `0003-authoritative-irr-prices.sql` to an existing Billing V2 database. Run Worker/Android tests.
6. Connect the purchase flow to the production authenticated user session and visible plan screen.
7. Test purchase, server verification, consume, retry-after-consume-failure, repurchase, overlapping-term stacking, refund/reversal and account switching on physical devices from both marketplaces.
8. Keep `BILLING_V2_ENABLED=false` until all release blockers pass.

Do not submit the app or enable live payments based only on unit tests.

## Dual-store extension (integration branch)

The canonical Billing V2 Worker supports a server-selected provider:
- `BILLING_STORE=BAZAAR`: Bazaar verifier and Poolakey purchase flow.
- `BILLING_STORE=MYKET`: Myket signed-purchase verifier and Myket SKU-bound order creation.
- The client sends a plan ID and signed purchase evidence only. It cannot select the store.
- Both providers settle into the same `billing_orders`, `billing_access`, and `billing_events` ledger.
- Both providers persist the same approved `amount_irr` value for each plan.

For Myket, configure `MYKET_SKU_MAP`, `MYKET_PACKAGE_NAME`, and `MYKET_PUBLIC_KEY` from the actual developer account. No example SKU or production package name is assumed.

The current Myket verifier validates the signed original purchase data and order/package/SKU binding. It does not yet perform an authoritative live refund/revocation lookup. Do not enable public checkout until this gap and the production commercial-authentication contract are resolved. See `DUAL-STORE-INTEGRATION.md`.
