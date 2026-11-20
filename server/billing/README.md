# Billing V2 — Sahmino manual fixed-day plans

Exactly five manually renewed, fixed elapsed-day plans are available. There is no free tier and no automatic renewal.

| Internal plan ID | Duration | Approved price (IRR) |
|---|---:|---:|
| `SAHAMBAN_PRO_30D` | 30 days | 1,500,000 |
| `SAHAMBAN_PRO_60D` | 60 days | 2,850,000 |
| `SAHAMBAN_PRO_90D` | 90 days | 4,050,000 |
| `SAHAMBAN_PRO_180D` | 180 days | 7,650,000 |
| `SAHAMBAN_PRO_365D` | 365 days | 14,600,000 |

- The server catalog is authoritative. Both Bazaar and Myket order creation persist `amount_irr`; D1 checks the exact plan-to-price pair.
- Each period is a consumable one-time in-app product, not an auto-renewing subscription. The user explicitly buys again to renew.
- Both stores use the same account entitlement ledger. Days stack after an unexpired entitlement; expired entitlements restart at settlement time.
- The app consumes the store purchase token only after the server verifies the receipt and durably settles the entitlement.
- If consume fails after settlement, the entitlement remains active; the pending store purchase is reconciled on the next app session.
- The client cannot choose the store, plan duration, price, account ID, or entitlement expiry.
- Never convert Rial to Toman in server data. Confirm each marketplace's product configuration against these exact Rial amounts before enabling checkout.

## Store adapters

- `BILLING_STORE=BAZAAR`: Poolakey + Bazaar RSA signature and Developer API in-app purchase validation.
- `BILLING_STORE=MYKET`: Myket IAB signed purchase verification and Myket SKU-bound order creation.
- Both providers settle to `billing_orders`, `billing_access`, and `billing_events`.

## Database

Fresh D1: apply the base user schema, then `server/billing/schema.sql`.

Existing Billing V2 D1: apply `migrations/0002-myket-store-columns.sql` if not already applied, then `migrations/0003-authoritative-irr-prices.sql` exactly once. The latter backfills historic rows and installs plan-price guard triggers. Never run migrations against production until backup and environment have been verified.

## Remaining external release gates

1. Confirm the final Android applicationId registered in each marketplace.
2. Create the five consumable products in each store and record the real, unique SKU IDs.
3. Set both Worker configurations to the same private D1 database and exact PWA origin.
4. Configure marketplace public keys and Bazaar OAuth credentials as Worker secrets; configure OTP secrets and SMS-provider binding.
5. Apply the OTP runtime and Billing V2 migrations to the correct D1 database.
6. Verify Myket refund/revocation reconciliation against its supported provider contract; signature-only validation does not prove a later refund has not occurred.
7. Build and test both market flavors on physical devices with store test accounts, including purchase, verification, consume, retry, restore, repurchase, account switching, expiry, refund and network loss.
8. Keep OTP and billing flags off until the relevant deployment, secrets, migrations and device acceptance tests pass.

No checkout, Worker deployment, production migration, or store configuration is performed by CI.
