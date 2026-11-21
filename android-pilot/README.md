# Sahmino Android pilot — native account and in-app billing host

This module is the Android wrapper for the existing Sahmino PWA at
`https://raminhashemi1.github.io/sahamban/`. It now includes a native OTP
sign-in host and a native subscription screen connected to Billing V2. This
is not a signed production release or a marketplace-ready package.

## Implemented in source

- `MainActivity` checks the Worker OTP session on cold start, presents the
  Persian native phone/code login when needed, and exposes a native
  **اشتراک سهمینو** entry after authentication.
- The subscription entry composes
  `BillingV2SubscriptionHost` → `BillingV2CookieSessionProvider` →
  `BillingV2ApiClient` → the store-flavor coordinator →
  `BillingV2PurchaseFlow` → `BillingV2SubscriptionView`.
- Separate Bazaar and Myket flavors share the same app code and the same
  server-side entitlement ledger.
- Exactly five manual, fixed-day products are displayed. No free tier and no
  automatic renewal are implemented.
- The UI displays the localized marketplace price only after all five
  product prices load successfully; incomplete catalog responses keep checkout
  disabled. The server independently enforces the approved Rial price table.
- Purchase tokens are sent to the Worker for signature/provider verification.
  The app consumes a store token only after the Worker confirms durable
  entitlement settlement.
- Session cookies stay in Android's native CookieManager and native HTTPS
  requests; no WebView JavaScript bridge is installed.
- The Worker, OTP, and billing flags default to disabled. A debug checkout can
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

The owner-approved permanent application ID is `ir.sahmino.app` for both Bazaar and Myket. Gradle uses this as the default; CI/release configuration must still set `SAHAMBAN_APPLICATION_ID` and `SAHAMBAN_EXPECTED_PACKAGE_NAME` to the exact same value and the marketplace listing must use that package.

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
public keys from Actions Secrets. Private merchant credentials and OTP
secrets belong only in Cloudflare Worker Secrets, never in the APK.

## Worker configuration required before login or checkout

Deploy a matching Worker revision for each flavor. Both Worker configurations
must point to the same private D1 database and exact PWA origin. Both must
include the `SAHMINO_SMS_PROVIDER` service binding for the Shahmiz SMS Worker.
OTP and Billing V2 flags default to false. Apply the user, OTP, and Billing V2
migrations only after confirming the target database and taking a backup.

Required Worker secrets include:
- `SAHMINO_OTP_VERIFIER_SECRET`
- `SAHMINO_OTP_RATE_LIMIT_SECRET`
- Shahmiz provider `SHAHMIZ_API_TOKEN`
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

## Release closeout

All remaining owner actions and release gates are tracked only in [خط پایان](../subscription-module/LINE-END.md). This README describes implemented behavior and build configuration; it is not a second task list.

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
