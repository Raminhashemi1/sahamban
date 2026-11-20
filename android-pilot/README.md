# Sahmino Android pilot — native account and in-app billing host

This module is the Android wrapper for the existing Sahmino PWA at
`https://raminhashemi1.github.io/sahamban/`. It now includes a native username/password
sign-in host and a native subscription screen connected to Billing V2. This
is not a signed production release or a marketplace-ready package.

## Implemented in source

- `MainActivity` checks the Worker password-auth session on cold start, presents the
  Persian native username/password login when needed, and exposes a native
  **اشتراک سهمینو** entry after authentication.
- The subscription entry composes
  `BillingV2SubscriptionHost` → `BillingV2CookieSessionProvider` →
  `BillingV2ApiClient` → the store-flavor coordinator →
  `BillingV2PurchaseFlow` → `BillingV2SubscriptionView`.
- Separate Bazaar and Myket flavors share the same app code and the same
  server-side entitlement ledger.
- Exactly five manual, fixed-day products are displayed. No free tier and no
  automatic renewal are implemented.
- The approved server prices are shown in Rial. The localized marketplace
  display price is shown alongside them.
- Purchase tokens are sent to the Worker for signature/provider verification.
  The app consumes a store token only after the Worker confirms durable
  entitlement settlement.
- Session cookies stay in Android's native CookieManager and native HTTPS
  requests; no WebView JavaScript bridge is installed.
- The Worker password-auth and billing flags default to disabled. A debug checkout can
  only be opted in when the exact package, HTTPS Worker URL, all five unique
  non-placeholder SKUs, and the flavor's public verification key are supplied.
  Release checkout is hard-disabled in Gradle.

## Five approved products

| Duration | Server plan ID | Price (IRR) |
|---:|---|---:|
| 30 days | `SAHAMBAN_PRO_30D` | 1,500,000 |
| 60 days | `SAHAMBAN_PRO_60D` | 2,850,000 |
| 90 days | `SAHAMBAN_PRO_90D` | 4,050,000 |
| 180 days | `SAHAMBAN_PRO_180D` | 7,650,000 |
| 365 days | `SAHAMBAN_PRO_365D` | 14,600,000 |

The marketplace products must be configured as consumable one-time in-app
products, not auto-renewing subscriptions. The Worker remains authoritative
for price, duration, account ownership, and entitlement expiry.

## Build configuration

The temporary default application ID is `ir.sahamban.pilot`. It is not the
final store identity. The final application ID must be explicitly supplied by
the owner and must match the package registered in both marketplaces.

Gradle reads these environment variables:

- `SAHAMBAN_APPLICATION_ID` and `SAHAMBAN_EXPECTED_PACKAGE_NAME`
- `SAHAMBAN_WORKER_BASE_URL` and `SAHAMBAN_PWA_ORIGIN`
- `SAHAMBAN_BILLING_ENABLED=true` (debug opt-in only)
- `SAHAMBAN_SKU_PRO_30D`, `SAHAMBAN_SKU_PRO_60D`,
  `SAHAMBAN_SKU_PRO_90D`, `SAHAMBAN_SKU_PRO_180D`,
  `SAHAMBAN_SKU_PRO_365D`
- `BAZAAR_RSA_PUBLIC_KEY` for the Bazaar flavor
- `MYKET_PUBLIC_KEY` for the Myket flavor

Placeholder values beginning with `REPLACE_` are rejected. Do not guess
package names, product IDs, public keys, or Worker URLs. The Android workflow
reads public identifiers from GitHub Actions Variables and verification
public keys from Actions Secrets. Private merchant credentials and the auth rate-limit secret belong only in Cloudflare Worker Secrets, never in the APK.

## Worker configuration required before login or checkout

Deploy a matching Worker revision for each flavor. Both Worker configurations
must point to the same private D1 database and exact PWA origin. Keep
`SAHMINO_PASSWORD_AUTH_ENABLED=false` until the password-auth migration is
applied and existing users have credentials provisioned securely.

Required Worker secret:
- `SAHMINO_AUTH_RATE_LIMIT_SECRET` (at least 32 random bytes)

Provision credentials only for existing ACTIVE user records through the
owner-controlled secure process. Use `scripts/create-sahmino-credential.mjs`
to produce a SQL statement from environment variables; never pass passwords
as command-line arguments or commit the generated SQL. Remove the temporary
SQL file after applying it to the intended private D1 database. The script
does not create accounts and does not expose public self-registration.

No SMS provider, OTP endpoint, or SMS secret is part of the login flow.
Marketplace secrets remain separate:
- Bazaar `BAZAAR_CLIENT_ID`, `BAZAAR_CLIENT_SECRET`,
  `BAZAAR_REFRESH_TOKEN`, and `BAZAAR_RSA_PUBLIC_KEY`
- Myket `MYKET_PUBLIC_KEY`

The actual package name and five store SKU IDs must be configured in both
marketplaces and the corresponding Worker `BAZAAR_SKU_MAP` /
`MYKET_SKU_MAP`. The server rejects missing and placeholder SKU maps before
creating an order.

## Build and tests

GitHub Actions workflow `Sahamban Android pilot debug APK` builds both
`assembleBazaarDebug` and `assembleMyketDebug` with Java 17, Android SDK 36,
Gradle 8.13, AGP 8.12.3, and Kotlin 2.2.0. Artifacts are unsigned debug test
builds, not marketplace releases.

For local development:

```sh
gradle -p android-pilot :app:assembleBazaarDebug :app:assembleMyketDebug
```

## Still requires owner action or physical/provider access

1. Confirm the final Android application ID and store publisher accounts.
2. Create five consumable products in each marketplace at the approved Rial
   price points and provide the real SKU IDs.
3. Deploy the current Bazaar and Myket Workers, Shahmiz SMS Worker, shared D1,
   OTP migrations, secrets, and exact PWA origin.
4. Configure Myket's authoritative refund/revocation reconciliation. The
   current signed-purchase verifier does not independently prove that a
   previously valid purchase was not refunded later.
5. Run the complete purchase lifecycle on physical devices with store test
   accounts: password login, purchase, receipt verification, consume, retry, restore,
   repurchase, expiry, account switching, refund, and network loss.
6. Only after acceptance, configure release signing in an owner-controlled
   secure environment and prepare store submissions.

## Data migration and WebView limitations

This wrapper does not migrate Chrome/PWA localStorage into WebView. Existing
users must export and verify a backup in the original PWA before moving data.
Backup export/download and import must be physically tested with synthetic
data. Do not uninstall the existing PWA or wipe its data during testing.

Only the Sahmino HTTPS PWA origin is kept inside WebView. Other HTTPS links
open externally; non-HTTPS and special-scheme navigation is blocked. File and
content access, cleartext traffic, automatic Android backup, and JavaScript
bridges are disabled. Physical-device testing is still required for RTL,
accessibility, slow/offline networks, file import/export, and session-cookie
persistence.

**A successful build or CI run is not a live purchase acceptance test.**
Checkout remains disabled by default and must not be enabled against
unconfigured or production systems merely to test the UI.
