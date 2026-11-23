# Sahmino Android host — username/password and in-app billing

This module wraps the Sahmino PWA and exposes a native subscription screen.
The current CI output is unsigned and for engineering validation. A separate owner-signed bootstrap release can be uploaded as an unpublished/draft listing before store product IDs exist.

## Implemented
- Native username/password login gates PWA startup.
- The username is the user's Iranian mobile number in canonicalized format; no SMS or one-time code is sent.
- Passwords are sent only over HTTPS to the Worker. The native form clears its password field after successful login.
- The Worker issues a Secure, HttpOnly session cookie. Android stores it in CookieManager and keeps it out of WebView JavaScript, local storage, logs, and URLs.
- Cold starts revalidate the stored session; logout revokes the server-side session.
- Native login includes one-time recovery-code password reset. Ten random recovery codes are provisioned offline, shown once, stored only as SHA-256 digests, and each successful reset revokes all active sessions.
- The authenticated native subscription host composes the cookie provider, Billing V2 API, Bazaar/Myket coordinator, purchase flow, and five-plan UI.
- The WebView instance is preserved when returning from the native subscription screen.
- Both marketplace flavors use the shared server entitlement ledger. Checkout is fail-closed per flavor: it stays disabled until the final package, HTTPS Worker, all five real store product IDs, and that store's public verification key are configured. The release build inherits this readiness gate instead of forcibly disabling checkout forever.

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

The owner-approved permanent application ID is `ir.sahmino.app`. Both Bazaar and Myket listings must use this exact package ID.

Gradle environment variables:
- `SAHAMBAN_APPLICATION_ID`, `SAHAMBAN_EXPECTED_PACKAGE_NAME`
- `SAHAMBAN_WORKER_BASE_URL`, `SAHAMBAN_PWA_ORIGIN`
- `SAHAMBAN_BILLING_ENABLED=true` only for the final store build after real SKU mapping and verification are ready
- `SAHAMBAN_SKU_PRO_30D`, `SAHAMBAN_SKU_PRO_60D`,
  `SAHAMBAN_SKU_PRO_90D`, `SAHAMBAN_SKU_PRO_180D`,
  `SAHAMBAN_SKU_PRO_365D`
- `BAZAAR_RSA_PUBLIC_KEY` or `MYKET_PUBLIC_KEY` for the selected flavor

Placeholder identifiers are rejected. Never guess product IDs, package names,
keys, or Worker URLs.

## Two-stage marketplace upload (SKU IDs are created after the first upload)

The store-generated product IDs are deliberately **not** a prerequisite for completing the app. Use this sequence for each store, keeping the exact same permanent application ID `ir.sahmino.app`:

1. **Bootstrap upload:** build and owner-sign a release variant with the five SKU variables empty and `SAHAMBAN_BILLING_ENABLED` unset/false. This produces the complete app shell, authentication, PWA, subscription UI and marketplace SDK integration, but checkout remains disabled by the Gradle readiness gate. Upload it to the store's unpublished/draft listing or the store's required initial review track; do not announce public availability or accept payment.
2. **Create products:** after the store has accepted the app package/listing sufficiently to expose in-app product setup, create the five consumable products in that store and copy the exact IDs it generates. Do not invent IDs or use the internal plan IDs as store SKUs.
3. **Configure server:** map those five store IDs to the five internal `SAHAMBAN_PRO_*` plan IDs in that store's Worker configuration. Keep `BILLING_V2_ENABLED=false` while validating configuration.
4. **Final signed update:** build and owner-sign the next version with the real five SKU variables, correct package ID, Worker URL and public verification key. The release flavor enables checkout only if every required value passes the fail-closed gate. Upload this update to the same listing.
5. **Acceptance and activation:** test actual sandbox/test-account purchases, receipt verification, settlement, consume, restore, refund/reversal and interruption recovery on a physical device. Only then set `BILLING_V2_ENABLED=true` for the relevant store Worker.

The initial bootstrap package is a store-onboarding artifact, not the public paid release. The final paid release is the signed update after SKU mapping. No second app listing or package-ID change is needed.

## Worker and D1 setup

Both store Workers must share one private D1 database and exact PWA origin.
Apply the base schema, existing Billing V2 migrations as appropriate, and
`server/migrations/0004-username-password-auth.sql`. Provision new accounts or set credentials on an existing account with
`scripts/provision-sahmino-user.mjs`; pass the existing internal `userId` to
update a backfilled account. It reads JSON from stdin and prints SQL containing
only the derived PBKDF2 password hash.

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
4. Define and rehearse the secure offline delivery and ownership-verification
   process for the ten one-time recovery codes. If all codes are lost or used,
   an authorized operator must verify ownership and perform a controlled
   credential/code rotation; phone-number possession alone is not proof.
5. Deploy the two Workers with the same D1 database, configure Worker secrets,
   and apply migrations only after backup and environment verification.
6. Complete Myket refund/revocation reconciliation.
7. Test login, session persistence, logout, account switching, purchase,
   verification, consume/retry, restore, repurchase, expiry, refunds, and
   network-loss recovery on physical devices with marketplace test accounts.
8. Configure owner-controlled release signing and store submissions.

No production deployment, live D1 migration, real purchase, or release
signing is performed by this source integration.
