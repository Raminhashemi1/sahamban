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

## OTP route and cross-origin session status

The Billing V2 Worker branch now mounts the existing OTP request, verify, session-check, and logout routes using the shared D1 OTP repository/service. This is server-side route integration only; it does not mean the SMS provider binding, secrets, D1 migration, or deployed Worker are configured.

The PWA is currently served from GitHub Pages while the Worker uses a separate origin. The session cookie is therefore cross-site. Do not enable WebView third-party cookies globally as a shortcut: that expands cookie exposure to every third-party origin loaded by this WebView. The native cookie provider fails closed if the Worker cookie is unavailable. Before connecting checkout, choose and validate a reviewed same-site/custom-domain deployment, or implement a native OTP sign-in flow that obtains the session over HTTPS and stores it through Android's native CookieManager without exposing it to JavaScript. The latter must include logout/revocation and account-switch handling. Neither path has passed physical-device acceptance yet.

`MainActivity` uses `BillingV2NativeOtpClient` for OTP login/session checks/logout. The billing components remain standalone and checkout is compile-time disabled. The native cookie provider and API client have not been validated together against a deployed Worker, and the subscription view is not yet reachable from the installed app. Checkout must remain disabled until host wiring, real store identifiers, deployed D1/Worker configuration, and physical-device purchase/settlement tests are complete.

## Native OTP login host integration — 2026-11-19

The Android pilot host now checks the Worker session on cold start, presents a native Persian phone/code sign-in screen when no active session exists, stores the Worker-issued session cookie through Android `CookieManager`, and exposes an explicit native logout action that revokes the server session before clearing the cookie. The PWA WebView is loaded only after a successful session check or OTP verification. The native OTP client is not exposed to WebView JavaScript.

This is still a pilot integration. Set `SAHAMBAN_WORKER_BASE_URL` and the matching `SAHAMBAN_PWA_ORIGIN` at build time, deploy the Worker with OTP enabled, apply the D1 migrations, configure the SMS binding and dedicated secrets, and validate the complete request/verify/restart/logout lifecycle on physical devices. With an empty Worker URL the APK deliberately shows a configuration message rather than bypassing authentication. Billing checkout remains disabled and is not wired into this host.

## Native OTP sign-in transport — 2026-11-19

Added `BillingV2NativeOtpClient` as a native HTTPS client for the existing Worker OTP request, verify, and logout endpoints. It sends the exact configured PWA Origin, validates the OTP challenge/session response, and installs the Worker-issued Secure/HttpOnly/SameSite=None cookie into Android's native `CookieManager`. This removes the requirement that a cross-site GitHub Pages fetch successfully persist the Worker Set-Cookie response: the native HTTPS client receives the response and performs the cookie-jar handoff itself. Logout revokes the server session before clearing the native cookie.

The helper does not expose the cookie to JavaScript, local storage, logs, or URLs. It is now wired into the native OTP login screen and pilot MainActivity. The Worker URL, SMS provider binding, secrets, live D1 migration, and physical-device tests are still required. Billing remains disabled and no purchase can be made from this build.

## Acceptance still required

Physical Android device: PWA loading, RTL, basic navigation, browser
handoff, permissions, synthetic 20/100-holding portfolio import and export,
offline/slow network, cold/warm start, font scaling, TalkBack, and secure
update behavior. Record device/Android/WebView versions and actual results.
Only afterwards choose a market-specific release wrapper/signing approach. The Bazaar flavor uses Poolakey manual consumable-product APIs; the Myket flavor uses the official Myket Billing Client 2.2 IAB v3 purchase/query/consume APIs, resolved from Myket's Maven repository (`https://maven.myket.ir`). Both send signed purchase evidence to the canonical Worker. The Worker verifies the store-specific receipt and settles into the shared D1 entitlement ledger. The token is consumed only after the server has durably granted the time-limited entitlement. The native OTP identity/session entry point is wired into `MainActivity`. The store-specific `BillingV2Coordinator`, `BillingV2ApiClient`, `BillingV2PurchaseFlow`, and five-plan `BillingV2SubscriptionView` exist as separate components, but they are not yet composed into the app host. The PWA currently loads after OTP; no native purchase screen is reachable from the installed APK. Do not treat the presence of these components or a successful debug build as an end-to-end purchase integration. A consumed purchase is not restored from Bazaar inventory; the user's durable entitlement must be reloaded from the authenticated Worker account. All live purchase flags remain false until package/SKU mapping, public key and server credentials are configured.
Trusted Web Activity (TWA) additionally requires domain-root
`/.well-known/assetlinks.json` associated with the final **real** APK
signing certificate; a Project Pages path alone cannot satisfy it.

## Current integration checkpoint

Latest branch head at this checkpoint: `c0639d16b15141a77749dc72ea21fbfd3309b6b1`.

Both Bazaar and Myket debug APKs compiled successfully for commit `3e450fe7` in workflow run:
https://github.com/Raminhashemi1/sahamban/actions/runs/44536533034

The APK artifact is available for seven days. It is an unsigned debug/test artifact, not a release build. The current branch head has advanced since that build, so this change triggers a fresh build from the current source.

The host `MainActivity` still does not wire the billing purchase flow into Sahmino's real UI/session. The commercial session-token provider and production package identity are not available in this pilot. Do not hard-code credentials or enable the billing feature gate to bypass those blockers.

## Native OTP cookie-session bridge

`BillingV2CookieSessionProvider` reads only the `sahmino_session` cookie for the configured HTTPS Worker origin from Android's native `CookieManager` and sends it directly from native `HttpsURLConnection` with the configured exact `SAHAMBAN_PWA_ORIGIN` and `X-Sahmino-CSRF: 1`. `BillingV2ApiClient` accepts only this three-header allowlist, resolves it afresh for every request, and never adds an Authorization bearer token. The cookie is not passed into PWA JavaScript, local storage, logs, or URLs. Configure `SAHAMBAN_WORKER_BASE_URL` and `SAHAMBAN_PWA_ORIGIN` consistently with Worker `PWA_ORIGIN`.

This is an integration seam, not proof that WebView has accepted or persisted the cross-site Worker cookie. Android's third-party-cookie policy can prevent a GitHub Pages PWA from storing a cookie set by a different Worker origin. Do not broadly enable third-party cookies as a workaround without a reviewed origin/cookie policy. Physical-device validation must confirm OTP login, cookie availability to native `CookieManager`, logout/revocation, app restart, and account switching. If the cookie is unavailable, the provider fails closed. `MainActivity` still does not instantiate the purchase flow, and checkout remains disabled.

## Authenticated session integration contract

`BillingV2ApiClient` now accepts a native `BillingV2AuthProvider`; the OTP implementation supplies the cookie, exact PWA origin, and CSRF marker as native request headers. It reports `NOT_AUTHENTICATED` without making a network request when no valid session cookie is available. The earlier bearer-token provider contract has been superseded by this shared OTP cookie-session contract.

Session credentials must remain inside native code. Do not pass them to PWA JavaScript, local storage, URL parameters, logs, or a hard-coded pilot-token generator. The current pilot `MainActivity` does not yet instantiate the provider or purchase flow; store SKU configuration, Worker deployment configuration, and physical cookie validation remain prerequisites.


## Rebuild checkpoint — current integration head

The current integration branch includes the native `BillingV2TokenProvider` injection seam and the latest passing dual-store validation. This documentation-only checkpoint intentionally triggers the Android workflow so both Bazaar and Myket debug APKs are rebuilt from the exact current source head. These outputs remain unsigned test artifacts; they are not store-ready release packages.


## Current-head artifact rebuild — 2026-11-19

The Billing V2 validation workflow passed on integration head `2be8ce24fbb75a9d4377efbf0443ea47cb5951a4` in run 44541889889. This documentation checkpoint triggers a fresh Bazaar/Myket debug APK build from the exact current head. The outputs remain unsigned test builds and must not be treated as store-ready releases.


## Standalone subscription selector

`BillingV2SubscriptionView` is a reusable native Android view that renders the five approved manual-renewal plans and their Rial prices, starts an explicitly selected purchase through the injected `BillingV2PurchaseFlow`, exposes restore, and displays success/cancel/failure states in Persian. It does not create identity, hold store credentials, or communicate purchase tokens to WebView JavaScript.

The production host app can attach it after constructing `BillingV2PurchaseFlow` with its authenticated `BillingV2TokenProvider`, exact store SKU map, expected published package name, and the configured store coordinator:

```kotlin
val subscriptionView = BillingV2SubscriptionView(
    context = this,
    purchaseFlow = purchaseFlow,
    onStatusChanged = { message -> /* update host status if needed */ }
)
setContentView(subscriptionView)
```

This selector is independently implemented and covered by repository checks, but it is not installed by the pilot `MainActivity`: that activity still lacks the real Sahmino account-session provider and published package/store configuration. Checkout remains disabled until the host integration is supplied and release acceptance is complete.


## Verified CI state — 2026-11-19

On branch `feat/billing-v2-otp-session-bridge`, commit `fdba34e7ae44b1b67cd82debde8f3d3250ab3860`, the dual-store Billing V2 validation workflow completed successfully and the Android pilot workflow built the Bazaar and Myket debug variants successfully. The uploaded artifact is an unsigned debug APK bundle for installation testing only, not a signed store release. These CI results do not verify live D1, SMS delivery, store developer APIs, real purchases, refunds, or physical-device behavior.

### Remaining owner-provided configuration

- Final Android `applicationId` registered in both stores.
- Five exact Bazaar product IDs and five exact Myket product IDs, configured as consumable one-time products with the agreed prices.
- Worker deployment URL, exact PWA origin, production D1 database binding/migrations, and SMS provider binding/secrets.
- Bazaar merchant/API credentials and matching RSA public key; Myket public key and any officially supported reconciliation credentials.
- Store account access/device test accounts for end-to-end sandbox or controlled live validation.

Do not add placeholder identifiers as if they were real, do not enable checkout, and do not mark release-ready until the configuration and acceptance checklist are verified.


## Native subscription host composition — 2026-11-19

The authenticated Android host now exposes a native “اشتراک سهمینو” entry after the OTP session check succeeds. The entry composes the flavor-specific Bazaar/Myket coordinator, native cookie-session provider, HTTPS Billing API client, purchase orchestration, and five-plan selector. Returning from the selector leaves the authenticated PWA session in place; logout still revokes the server session through the OTP client.

The host fails closed unless the owner supplies the exact published package ID and five distinct store product IDs at build time:
- `SAHAMBAN_EXPECTED_PACKAGE_NAME`
- `SAHAMBAN_SKU_PRO_30D`
- `SAHAMBAN_SKU_PRO_60D`
- `SAHAMBAN_SKU_PRO_90D`
- `SAHAMBAN_SKU_PRO_180D`
- `SAHAMBAN_SKU_PRO_365D`

These are identifiers, not secrets. Do not guess or substitute example SKUs. The purchase feature flag remains compile-time false in debug and release configurations, so the screen can be exercised without opening checkout. The temporary package ID, store credentials, Worker deployment, D1 migrations, production identity provider, refund/revocation process, and physical-device acceptance remain release blockers. A successful compile or visible selector is not evidence of a real store purchase.
