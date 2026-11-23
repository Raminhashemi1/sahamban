# Sahmino Android app — username/password and in-app billing

This module wraps the Sahmino PWA and exposes a native subscription screen.
The source can produce unsigned verification builds and, after owner-managed signing secrets are configured, signed initial-release APKs with subscription checkout forcibly disabled. Until signing, live Worker setup, device acceptance, and store submission are complete, generated APKs are not marketplace-ready.

## Implemented
- Native username/password login gates PWA startup.
- The username is the user's Iranian mobile number in canonicalized format; no SMS or one-time code is sent.
- Passwords are sent only over HTTPS to the Worker. The native form clears its password field after successful login.
- The Worker issues a Secure, HttpOnly session cookie. Android stores it in CookieManager and keeps it out of WebView JavaScript, local storage, logs, and URLs.
- Cold starts revalidate the stored session; logout revokes the server-side session.
- Native login includes one-time recovery-code password reset. Ten random recovery codes are provisioned offline, shown once, stored only as SHA-256 digests, and each successful reset revokes all active sessions.
- The authenticated native subscription host composes the cookie provider, Billing V2 API, Bazaar/Myket coordinator, purchase flow, and five-plan UI.
- The WebView instance is preserved when returning from the native subscription screen.
- Both marketplace flavors use the shared server entitlement ledger. The initial signed release keeps checkout disabled; billing-enabled release requires a separate owner-confirmed workflow.

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
- `SAHAMBAN_BAZAAR_WORKER_BASE_URL`, `SAHAMBAN_MYKET_WORKER_BASE_URL`, `SAHAMBAN_PWA_ORIGIN`
- `SAHAMBAN_BILLING_ENABLED=true` (debug-only opt-in; checkout is always disabled when `SAHAMBAN_DISTINCT_PILOT_IDS=true`)
- `SAHAMBAN_RELEASE_BILLING_ENABLED=true` (release-only opt-in; used only by the manual owner-confirmed billing update workflow after all commercial and device-acceptance gates pass).
- Five Bazaar product variables: `SAHAMBAN_BAZAAR_SKU_PRO_30D`, `SAHAMBAN_BAZAAR_SKU_PRO_60D`, `SAHAMBAN_BAZAAR_SKU_PRO_90D`, `SAHAMBAN_BAZAAR_SKU_PRO_180D`, `SAHAMBAN_BAZAAR_SKU_PRO_365D`.
- Five Myket product variables: `SAHAMBAN_MYKET_SKU_PRO_30D`, `SAHAMBAN_MYKET_SKU_PRO_60D`, `SAHAMBAN_MYKET_SKU_PRO_90D`, `SAHAMBAN_MYKET_SKU_PRO_180D`, `SAHAMBAN_MYKET_SKU_PRO_365D`.
- `BAZAAR_RSA_PUBLIC_KEY` and `MYKET_PUBLIC_KEY` for their matching flavors.

Placeholder identifiers are rejected. Never guess product IDs, package names,
keys, or Worker URLs.

The two stores have independent product IDs and public keys. Do not reuse Bazaar SKUs in the Myket flavor or vice versa. The release billing gate requires all five unique IDs for each store.

## Worker and D1 setup

Both store Workers must share one private D1 database and exact PWA origin.
Apply the base schema and existing Billing V2 migrations as appropriate, then run these additive migrations exactly once and in order:

1. `server/migrations/0004-username-password-auth.sql` — username/password fields, shared sessions and rate-limit storage.
2. `server/migrations/0005-password-recovery-codes.sql` — one-time recovery-code storage required by the password-reset endpoint.

Do not enable `SAHMINO_PASSWORD_AUTH_ENABLED` until both migrations succeed, account provisioning is verified, and the shared D1 binding is confirmed on both store Workers. Provision new accounts or set credentials on an existing account with
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

## Owner-managed signed initial release

The workflow `.github/workflows/android-pilot-signed-release.yml` builds Bazaar and Myket Release APKs with checkout forcibly disabled. It is manual (`workflow_dispatch`) and requires these GitHub Actions secrets:

- `SAHMINO_RELEASE_KEYSTORE_BASE64`: base64-encoded Android release keystore.
- `SAHMINO_RELEASE_STORE_PASSWORD`: keystore password.
- `SAHMINO_RELEASE_KEY_ALIAS`: signing key alias.
- `SAHMINO_RELEASE_KEY_PASSWORD`: signing key password.

Configure these in the repository's Actions secrets using the publisher-owned signing key. Never commit the keystore or passwords.

Also configure two repository Actions **variables**: `SAHAMBAN_BAZAAR_WORKER_BASE_URL` and `SAHAMBAN_MYKET_WORKER_BASE_URL`, each set to its own production Worker HTTPS origin (scheme and host only; no path, query, or fragment). Bazaar and Myket are separate Worker deployments with different server-side store selection; each Android flavor is compiled with only its matching Worker URL. Native login is the app's startup gate, so a signed app built without either endpoint cannot sign users in or open the PWA. The signed workflow fails closed when either variable is missing or malformed and probes both live Workers before building: each health endpoint must confirm checkout/payments are off and each password-auth session endpoint must return the expected signed-out response (HTTP 401). This prevents signing an app that cannot reach the correct authentication and billing service.

Run the workflow manually only after verifying that both Workers are deployed with the exact PWA Origin, shared production D1, completed migrations, provisioned accounts, and `SAHMINO_PASSWORD_AUTH_ENABLED=true` for the intended release environment. Verify the keystore belongs to the permanent package `ir.sahmino.app`; the workflow verifies both APK signatures and package IDs and confirms checkout remains disabled. It uploads the signed initial-release artifacts. Keep a secure backup of the keystore and its recovery material outside GitHub.

## Owner-managed signed billing-enabled update

The separate manual workflow `.github/workflows/android-pilot-signed-billing-release.yml` is reserved for the later update, not the initial publication. It requires the exact dispatch confirmation `ENABLE_BILLING_RELEASE`, both live Worker health endpoints to report auth and checkout enabled with their correct store identity, all five distinct product IDs per store, both marketplace public keys, and the owner release-signing secrets. It verifies the signed APKs, package, per-flavor Worker, per-flavor SKUs, store identity, and `SAHAMBAN_BILLING_ENABLED=true` before uploading artifacts.

Do not run this workflow until the initial app is published, actual store products are created and prices verified, Myket refund/revocation is accepted and implemented, and the physical-device acceptance matrix passes for both stores. The workflow does not replace those commercial or device tests; the confirmation is an explicit owner release authorization.

## Owner actions still required

1. Configure the final marketplace publisher accounts; the approved Android application ID is `ir.sahmino.app`.
2. Only after the initial checkout-disabled app is published, create the real marketplace product entries according to each store's official contract, then provide their actual IDs and verify exact prices.
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
