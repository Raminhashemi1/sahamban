# Sahmino Android host — username/password and in-app billing

This module wraps the Sahmino PWA and exposes a native subscription screen.
It is an unsigned pilot build, not a production release or marketplace-ready package.

## Implemented
- Native username/password login gates PWA startup.
- The username is the user's Iranian mobile number in canonicalized format; no SMS or one-time code is sent.
- Passwords are sent only over HTTPS to the Worker. The native form clears its password field after successful login.
- The Worker issues a Secure, HttpOnly session cookie. Android stores it in CookieManager and keeps it out of WebView JavaScript, local storage, logs, and URLs.
- Cold starts revalidate the stored session; logout revokes the server-side session.
- The authenticated native subscription host composes the cookie provider, Billing V2 API, Bazaar/Myket coordinator, purchase flow, and five-plan UI.
- The WebView instance is preserved when returning from the native subscription screen.
- Both marketplace flavors use the shared server entitlement ledger. Release checkout remains hard-disabled.

## Product catalog

| Duration | Internal ID | Price (IRR) |
|---:|---|---:|
| 30 days | `SAHAMBAN_PRO_30D` | 1,500,000 |
| 60 days | `SAHAMBAN_PRO_60D` | 2,850,000 |
| 90 days | `SAHAMBAN_PRO_90D` | 4,050,000 |
| 180 days | `SAHAMBAN_PRO_180D` | 7,650,000 |
| 365 days | `SAHAMBAN_PRO_365D` | 14,600,000 |

Products are consumable one-time purchases with manual renewal only. The
server is authoritative for plan, price, duration, account, and expiry.

## Build configuration

The default application ID `ir.sahamban.pilot` is temporary. The owner must
supply the real package registered in both marketplaces.

Gradle environment variables:
- `SAHAMBAN_APPLICATION_ID`, `SAHAMBAN_EXPECTED_PACKAGE_NAME`
- `SAHAMBAN_WORKER_BASE_URL`, `SAHAMBAN_PWA_ORIGIN`
- `SAHAMBAN_BILLING_ENABLED=true` (debug-only opt-in)
- `SAHAMBAN_SKU_PRO_30D`, `SAHAMBAN_SKU_PRO_60D`,
  `SAHAMBAN_SKU_PRO_90D`, `SAHAMBAN_SKU_PRO_180D`,
  `SAHAMBAN_SKU_PRO_365D`
- `BAZAAR_RSA_PUBLIC_KEY` or `MYKET_PUBLIC_KEY` for the selected flavor

Placeholder identifiers are rejected. Never guess product IDs, package names,
keys, or Worker URLs.

## Worker and D1 setup

Both store Workers must share one private D1 database and exact PWA origin.
Apply the base schema, existing Billing V2 migrations as appropriate, and
`server/migrations/0004-username-password-auth.sql`. Provision accounts
with `scripts/provision-sahmino-user.mjs`; it reads a JSON object from stdin
and prints a SQL insert containing only the derived PBKDF2 password hash.

Required Worker settings:
- `SAHMINO_PASSWORD_AUTH_ENABLED=false` until migration and account provisioning are complete.
- `BILLING_V2_ENABLED=false` until all release gates pass.
- `PILOT_AUTH_ENABLED=false` in both deployments.
- A private `AUTH_RATE_LIMIT_SECRET` of at least 32 bytes, set as a Worker secret.

The old SMS/OTP schema is retained only for migration compatibility and
historical data preservation. The current Worker and Android app do not
invoke any SMS provider or OTP route.

## Automated build and validation

GitHub Actions validates the password-auth service, D1 migration, Worker
session contract, Android host, and both store adapters. The Android workflow
builds unsigned Bazaar and Myket debug artifacts only. A green CI run is not
proof of live purchase behavior.

## Owner actions still required

1. Confirm the final Android application ID and marketplace publisher accounts.
2. Provide the real five SKU IDs for each marketplace and verify exact prices.
3. Provision actual user accounts and communicate initial passwords through
   a separate secure channel; this repository does not contain user passwords.
4. Decide and implement a non-SMS password reset process before public launch
   (for example, verified administrator-assisted reset). Do not use phone
   number possession as proof of identity.
5. Deploy the two Workers with the same D1 database, configure Worker secrets,
   and apply migrations only after backup and environment verification.
6. Complete Myket refund/revocation reconciliation.
7. Test login, session persistence, logout, account switching, purchase,
   verification, consume/retry, restore, repurchase, expiry, refunds, and
   network-loss recovery on physical devices with marketplace test accounts.
8. Configure owner-controlled release signing and store submissions.

No production deployment, live D1 migration, real purchase, or release
signing is performed by this source integration.
