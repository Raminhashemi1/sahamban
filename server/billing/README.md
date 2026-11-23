# Billing V2 — Sahmino manual fixed-day plans

Exactly five manually renewed, fixed elapsed-day plans are available. There is no free tier and no automatic renewal.

| Internal plan ID | Duration | Approved price (IRR) |
|---|---:|---:|
| `SAHAMBAN_PRO_30D` | 30 days | 1,500,000 |
| `SAHAMBAN_PRO_60D` | 60 days | 2,850,000 |
| `SAHAMBAN_PRO_90D` | 90 days | 4,050,000 |
| `SAHAMBAN_PRO_180D` | 180 days | 7,650,000 |
| `SAHAMBAN_PRO_365D` | 365 days | 14,600,000 |

- Server catalog and D1 constraints are authoritative for price and duration.
- Each period is a consumable one-time in-app product; renewal requires an explicit purchase.
- Both stores use one shared account entitlement ledger. Early repurchases stack after current expiry.
- The app consumes a store token only after server verification and durable settlement.
- The client cannot choose the store, price, account ID, or entitlement expiry.

## Authentication

The Android host authenticates with username/password. The username is the
canonical Iranian mobile number; no SMS, OTP, or phone verification is used.
The Worker verifies PBKDF2-HMAC-SHA256 password hashes, rate-limits login
attempts, and issues a hashed, revocable D1-backed session token in a Secure,
HttpOnly cookie. The Worker derives the account ID from that session. Account IDs are opaque D1 primary keys; legacy IDs are preserved and never rewritten to fit a generated-ID pattern.

Apply `server/migrations/0004-username-password-auth.sql` to the shared D1
database. Existing verified phone identities are backfilled as usernames,
but passwords remain unset until securely provisioned. Use
`scripts/provision-sahmino-user.mjs` to generate a password hash and SQL
statement offline. Never commit passwords or password hashes generated for
real users. The old OTP tables are retained only to preserve historical data;
the new Worker does not use them.

## Store adapters

- Bazaar: Poolakey, RSA signature verification, and Bazaar purchase validation API.
- Myket: Myket Billing Client and signed purchase verification.
- Both settle to the shared `billing_orders`, `billing_access`, and `billing_events` ledger.

## Remaining external release gates

1. Confirm the final Android application ID registered in each marketplace.
2. Create five consumable products in each store and record their actual unique SKU IDs.
3. Set both Workers to the same private D1 database and exact PWA origin.
4. Configure `AUTH_RATE_LIMIT_SECRET`, Bazaar OAuth/RSA secrets, and Myket public key as Worker secrets.
5. Apply the username/password auth migration and Billing V2 migrations to the intended D1 database after backup and migration-history review.
6. Provision user accounts through the secure offline process and define a non-SMS password reset procedure.
7. Verify Myket refund/revocation reconciliation against its supported provider contract.
8. Run physical-device tests for login/session/logout, account switching, purchase, verification, consume, retry, restore, repurchase, expiry, refund, and network loss.
9. Keep `SAHMINO_PASSWORD_AUTH_ENABLED` and `BILLING_V2_ENABLED` false until configuration and acceptance pass.

No production deployment, live D1 migration, store configuration, checkout activation, or release signing is performed by CI.
