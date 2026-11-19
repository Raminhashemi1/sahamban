# Sahmino subscription module — current status

## Scope
Independent, embeddable five-plan subscription purchase module. No legacy subscription code is imported or reused.

## Product rules
- All prices are IRR (ریال).
- 30 days: `SAHAMBAN_PRO_30D` — 1,500,000
- 60 days: `SAHAMBAN_PRO_60D` — 2,850,000
- 90 days: `SAHAMBAN_PRO_90D` — 4,050,000
- 180 days: `SAHAMBAN_PRO_180D` — 7,650,000
- 365 days: `SAHAMBAN_PRO_365D` — 14,600,000
- These are manually renewed, fixed-duration, one-time consumable store purchases. They are not auto-renewing subscriptions.
- The entitlement ledger is shared; store transaction verification and Android SDK adapters are separate per store.

## Implemented

### PWA
- `pwa/subscription-plans.js`: embeddable RTL five-plan selector.
- `pwa/subscription-plans.css`: selector styles.
- `pwa/native-billing-client.js`: promise-based client for the native WebMessage bridge.

### Android
- `android/src/main/kotlin/ir/sahmino/subscription/StoreBillingProvider.kt`: provider-neutral interface and purchase data types.
- `android/src/main/kotlin/ir/sahmino/subscription/SubscriptionPurchaseCoordinator.kt`: create order → purchase → server verify → settle → consume; includes restore/retry.
- `android/src/main/kotlin/ir/sahmino/subscription/HttpBillingBackendClient.kt`: authenticated Worker API client.
- `android/src/main/kotlin/ir/sahmino/subscription/SahminoBillingWebBridge.kt`: exact-origin AndroidX WebMessageListener bridge.
- `android/src/bazaar/kotlin/...`: concrete Poolakey 2.3.0 adapter and flavor factory.
- `android/src/myket/kotlin/...`: concrete Myket Billing Client 2.2 adapter and flavor factory.
- `android/build.gradle.kts`: standalone Android library with Bazaar and Myket product flavors.
- Both Android release flavors compiled successfully in GitHub Actions run [44527042694](https://github.com/Raminhashemi1/sahamban/actions/runs/44527042694). The workflow uploaded AAR artifact `sahmino-billing-android-aar` (artifact ID `14531232351`).
- Toolchain is AGP 8.12.3, Kotlin 2.2.0, Gradle 8.13, Java 17, compileSdk 36, minSdk 26. This upgrade is required by the Kotlin metadata version of the official Myket 2.2 SDK.

### Backend / Worker
- `core/domain.mjs` and `PLAN_CATALOG.json`: canonical plan catalog and fixed-duration renewal rules.
- `server/schema.sql`: independent Billing V2 D1 schema.
- `server/order-service.mjs`: server-owned plan price and store SKU mapping.
- `server/entitlement-service.mjs`: entitlement lookup.
- `server/settlement-service.mjs`: conditional, idempotent D1 settlement batch.
- `server/providers/bazaar-verifier.mjs`: Bazaar Developer API v2 OAuth refresh and in-app purchase validation.
- `server/providers/myket-verifier.mjs`: server-side RSA verification of signed Myket IAB purchase data.
- `worker/routes.mjs`: authenticated order, entitlement and provider-specific verify routes.
- `worker/create-billing-worker.mjs`: deployment factory; store is fixed by server-side `BILLING_STORE`, never by a client field.
- Two store deployments can share the same D1 database and entitlement ledger.

### Provider handling
- Bazaar: verifies purchase state, developer payload/order binding and consumption state through Developer API v2. A newly settled item is consumed only after the backend returns PAID.
- Myket: verifies the signed original purchase JSON, app package, product SKU, purchase state and signed developer payload. A live Myket Developer API refund/revocation lookup is not implemented because an authoritative endpoint contract was not established from the reviewed official SDK sample.
- Raw purchase tokens are not persisted; only SHA-256 hashes are stored.
- Default SKU mapping uses the canonical plan IDs. Override server-side maps if the store developer panels already use different product IDs. The defaults do not claim those SKUs are already created in the store panels.

## Automated validation
- Node tests cover domain rules, order creation, provider verifiers, Worker routes and configuration factory.
- SQLite tests execute the exact settlement SQL extracted from the service and cover successful grant, replay protection, early renewal and transaction rollback.
- GitHub Actions run [44526725332](https://github.com/Raminhashemi1/sahamban/actions/runs/44526725332): both Android release flavors compiled successfully.
- Latest Node and SQLite tests passed in GitHub Actions run [44527234029](https://github.com/Raminhashemi1/sahamban/actions/runs/44527234029). See [all workflow runs](https://github.com/Raminhashemi1/sahamban/actions).

## Remaining host integration / release gates
1. Connect the production app's real commercial session token provider to `HttpBillingBackendClient` and the Worker's `authenticateRequest`. The supplied dossier documents only a pilot token; it does not define the production auth contract.
2. Set the exact production PWA HTTPS origin and attach `SahminoBillingWebBridge` in the actual production WebView Activity.
3. Deploy the Worker factory separately with `BILLING_STORE=BAZAAR` and `BILLING_STORE=MYKET`, using the matching secrets and server-side SKU map for each.
4. Apply and verify `server/schema.sql` against the actual production D1 database; no live migration has been run.
5. Configure the actual app package name and app-specific Myket public key; configure Bazaar Developer API credentials. No credentials are in GitHub.
6. Run real purchases, interruption/recovery, consume, refund/revocation and renewal tests on physical devices using both store test accounts.

## GitHub
- All work is on `feature/sahmino-subscriptions-independent`.
- The default branch has not been changed.
- No production secrets or live infrastructure have been modified.
