# Sahamban Android pilot wrapper — install test only

This module creates a **debug APK** containing a minimal Android WebView shell
for the existing public GitHub Pages PWA:
https://raminhashemi1.github.io/sahamban/

## Strict scope

- This is **not** a signed production release for Myket, Cafe Bazaar, or Google Play.
  The temporary `ir.sahamban.pilot` package ID and build-generated debug
  certificate must **not** become the final app identity/signing key.
- A store-specific native billing boundary is now split into `bazaar` and `myket` app flavors from one Android codebase. Bazaar uses Poolakey 2.3.0; Myket uses the official Billing Client 2.2 IAB SDK. Both flows use consumable one-time products (not auto-renewing subscriptions), send signed purchase evidence to the server, and consume only after server settlement. The Worker selects the provider from server-side `BILLING_STORE` configuration and grants both stores into the same account entitlement ledger.
- This shell does **not** migrate browser Chrome/PWA localStorage or portfolio
  to WebView. Existing users MUST export their backup in the original PWA first,
  and carefully test an import with synthetic data. Do not uninstall the old
  PWA or wipe its data.
- WebView file imports use Android's system file picker. **Backup export
  and downloads are NOT yet verified in WebView** (blob: download links may
  not work). Test both directions before considering any real user's portfolio.
- It relies on HTTPS to load the current public web app, not an embedded offline
  bundle. Service-worker/offline handling and slow networks require physical
  device validation. No injected native JavaScript interface is used.
- Only HTTPS `raminhashemi1.github.io/sahamban/` navigation remains inside
  the app. Other HTTPS links go to an external browser; non-HTTPS and
  special-scheme navigation is blocked.
- Internet is the only declared Android permission; WebView file/content
  access and cleartext HTTP are explicitly disabled; automatic Android backup
  of app data is disabled.
- A user-approved package ID, actual release signing key handled only in a
  secure owner-controlled build environment, genuine asset/icon and screenshots,
  store policy compliance, private data handling, and physical Android
  acceptance are still prerequisites for release.

## How to build a test APK

GitHub Actions workflow `Sahamban Android pilot debug APK` uses Java 17,
Android SDK 36, Gradle 8.13, Android Gradle Plugin 8.12.3 and Kotlin 2.2.0
to build both `assembleBazaarDebug` and `assembleMyketDebug`. It uploads
**debug artifacts**, not marketplace releases. No key files or signing passwords
are stored in the repository.

For local development with an installed Android SDK:

```sh
gradle -p android-pilot :app:assembleBazaarDebug :app:assembleMyketDebug
```

Run pure Java navigation checks:

```sh
mkdir -p /tmp/sahamban-java-tests
javac -d /tmp/sahamban-java-tests   android-pilot/app/src/main/java/ir/sahamban/pilot/TrustedNavigation.java   android-pilot/tests/TrustedNavigationTest.java
java -cp /tmp/sahamban-java-tests ir.sahamban.pilot.TrustedNavigationTest
```

## Acceptance still required

Physical Android device: PWA loading, RTL, basic navigation, browser
handoff, permissions, synthetic 20/100-holding portfolio import and export,
offline/slow network, cold/warm start, font scaling, TalkBack, and secure
update behavior. Record device/Android/WebView versions and actual results.
Only afterwards choose a market-specific release wrapper/signing approach. The Bazaar flavor uses Poolakey manual consumable-product APIs; the Myket flavor uses the official Myket Billing Client 2.2 IAB v3 purchase/query/consume APIs, resolved from Myket's Maven repository (`https://maven.myket.ir`). Both send signed purchase evidence to the canonical Worker. The Worker verifies the store-specific receipt and settles into the shared D1 entitlement ledger. The token is consumed only after the server has durably granted the time-limited entitlement. The billing coordinator and purchase orchestration are not yet wired into `MainActivity` or the PWA UI; identity/session delivery and user-visible plan/price screens remain release blockers. A consumed purchase is not restored from Bazaar inventory; the user's durable entitlement must be reloaded from the authenticated Worker account. All live purchase flags remain false until package/SKU mapping, public key and server credentials are configured.
Trusted Web Activity (TWA) additionally requires domain-root
`/.well-known/assetlinks.json` associated with the final **real** APK
signing certificate; a Project Pages path alone cannot satisfy it.

## Current integration checkpoint

Latest branch head at this checkpoint: `c0639d16b15141a77749dc72ea21fbfd3309b6b1`.

Both Bazaar and Myket debug APKs compiled successfully for commit `3e450fe7` in workflow run:
https://github.com/Raminhashemi1/sahamban/actions/runs/44536533034

The APK artifact is available for seven days. It is an unsigned debug/test artifact, not a release build. The current branch head has advanced since that build, so this change triggers a fresh build from the current source.

The host `MainActivity` still does not wire the billing purchase flow into Sahmino's real UI/session. The commercial session-token provider and production package identity are not available in this pilot. Do not hard-code credentials or enable the billing feature gate to bypass those blockers.
