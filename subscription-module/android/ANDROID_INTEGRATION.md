# Android module integration

This module now contains:
- Common Kotlin billing contract and purchase coordinator.
- Common Worker HTTP client (requires the production commercial bearer-token provider).
- Origin-restricted AndroidX WebMessageListener bridge.
- Bazaar source-set adapter using Poolakey.
- Myket source-set adapter using the official Myket Billing Client.
- Two Gradle product flavors: bazaar and myket.

## 1. Include the module in the host Android project

Copy or add this directory as a Gradle subproject and include it in the host settings file:

```kotlin
include(":subscription-module:android")
```

In the host settings.gradle.kts dependencyResolutionManagement repositories, include:

```kotlin
repositories {
    google()
    mavenCentral()
    maven("https://jitpack.io")
    maven("https://maven.myket.ir")
}
```

The host project must provide Android Gradle Plugin and Kotlin Android plugin versions. The supplied dossier's pilot baseline is AGP 8.9.2/Kotlin 2.0.21. The official Myket Billing Client 2.2 sample is built with AGP 8.12.3/Kotlin 2.2.0/Gradle 8.13/compileSdk 36. To compile both flavors together, align the host Android build toolchain to AGP 8.12.3, Kotlin 2.2.0, Gradle 8.13, Java 17, compileSdk 36, and keep minSdk 26. This is the only deliberate toolchain upgrade from the pilot dossier.

## 2. Build the correct store flavor

Build one shared source tree into the store-specific artifact:
- Bazaar: `bazaarRelease`
- Myket: `myketRelease`

The module's Gradle file pins:
- Bazaar Poolakey 2.3.0 (as identified in the supplied dossier).
- Myket Billing Client 2.2 (as in the official Myket sample).

Set the Myket app-specific Base64 public key as a local Gradle property or CI secret named `MYKET_PUBLIC_KEY`. Do not commit it. The Bazaar client uses Poolakey local signature checking disabled because the Worker validates the receipt through Bazaar Developer API v2.

Both flavors share the same account, PWA UI, backend protocol, plan catalog, and entitlement model. Store-specific billing SDK code is isolated in the flavor source sets.

## 3. Wire the host Activity

The host Activity must:
1. Create the matching flavor's StoreBillingProvider using `createStoreBillingProvider`.
2. Create `HttpBillingBackendClient` with the production HTTPS Worker base URL, the flavor's store name, and a provider that reads the real logged-in user's commercial bearer token.
3. Create `SubscriptionPurchaseCoordinator`.
4. Wrap it in `CoordinatorBillingBridgeActions`.
5. Create `SahminoBillingWebBridge` using the exact production PWA HTTPS origin and the Activity lifecycle coroutine scope.
6. Call `bridge.remove()` when the Activity is destroyed and before loading an untrusted URL.
7. Enable the billing bridge only for the exact PWA origin. Do not use addJavascriptInterface or wildcard origins.

The production origin and commercial session token provider are host-app-specific. The pilot dossier does not identify a production PWA origin or a commercial bearer-token source, so this module intentionally does not invent either value.

## 4. Worker deployment

Deploy the same Worker code twice (or use two isolated Worker environments) with a server-side constant:
- Bazaar environment: BILLING_STORE=BAZAAR
- Myket environment: BILLING_STORE=MYKET

The Worker store resolver must return this deployment constant and must not read a client-controlled store header/body field. Both deployments may bind to the same D1 database so the user's entitlement remains shared.

Worker secrets/config:
- Common: AUTH_HMAC_SECRET (or the real auth verifier config), PWA_ORIGIN, SAHAMBAN_DB, BILLING_V2_ENABLED.
- Bazaar: BAZAAR_PACKAGE_NAME, BAZAAR_CLIENT_ID, BAZAAR_CLIENT_SECRET, BAZAAR_REFRESH_TOKEN, BAZAAR_SKU_MAP.
- Myket: MYKET_PACKAGE_NAME, MYKET_PUBLIC_KEY_BASE64, MYKET_SKU_MAP.

The current router is dependency-injected. Host Worker entrypoint must construct the verifier map and order product maps from environment bindings and inject a resolver backed by BILLING_STORE.

## 5. Product configuration

All five plans are one-time consumable in-app products, not auto-renewing store subscriptions. Configure the five SKUs separately in each store's developer panel, with prices exactly matching the canonical IRR amounts in PLAN_CATALOG.json. The product IDs remain server-side configuration and are never supplied by the PWA.

## 6. Test before release

- Build both Gradle flavors.
- Install each build from its matching test distribution/store environment on a physical device.
- Test purchase success, user cancellation, network loss after purchase, app process death before verify, app process death after settlement but before consume, restore/retry, duplicate verify, refunded purchase, and expired/active renewal.
- Confirm the Worker has the live D1 migration applied and that the auth verifier uses the real commercial login session.
- Do not enable production purchases until all tests pass.


## 7. PWA wiring
Load the native billing client before the subscription selector, then mount the selector into a host element:

```html
<div id="subscription-root"></div>
<link rel="stylesheet" href="/path/to/subscription-plans.css">
<script type="module">
  import { mountSubscriptionPlans } from "/path/to/subscription-plans.js";
  await mountSubscriptionPlans(document.querySelector("#subscription-root"));
</script>
```

The native client exposes window.SahminoBilling and maps bridge actions to Android. Do not instantiate a second JavaScript interface or expose billing credentials to the PWA.
