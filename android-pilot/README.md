# Sahmino Android — CafeBazaar only

## Identity
- Application ID configured in Gradle: `ir.manahesab.sahmino`.
- Internal source namespace: `ir.sahamban.pilot`.
- Publisher registration for this package in either store is not yet verified.
- Both store flavors intentionally use the same application ID because each publisher must install the same registered app identity. Installing the second APK replaces the first; the two store APKs cannot be installed side by side. Uninstall the current pilot before installing the other flavor. Do not add a debug application ID suffix for store billing tests, because that changes the package identity expected by the publisher.

## Scope and approved catalogue
**This pilot is CafeBazaar-only.** Myket (out of scope), ZarinPal and Google Play are out of scope; the app produces one CafeBazaar APK. Renewal defaults to manual; no auto-renewal is exposed by these one-time purchase flows.

| Plan | Duration | Final price (IRR) |
|---|---:|---:|
| SAHMINO_PRO_30D | 30 days | 1,500,000 |
| SAHMINO_PRO_60D | 60 days | 2,850,000 |
| SAHMINO_PRO_90D | 90 days | 4,050,000 |
| SAHMINO_PRO_180D | 180 days | 7,650,000 |
| SAHMINO_PRO_365D | 365 days | 14,600,000 |

The existing five-plan preview is preserved; the work below connects its purchase action rather than rebuilding the preview.

## Implemented source paths

- Gradle isolates `bazaar` and `myket` product flavors and their billing SDKs.
- Myket adapter obtains the server-created order ID as developer payload, sends signed `originalJson` and signature to the Worker, and consumes only after server settlement.
- CafeBazaar adapter uses Poolakey one-time products, sends the server order ID as developer payload, submits the purchase token to the Worker, and consumes only after settlement.
- The Worker verifies Myket RSA signature and purchase fields, or calls the CafeBazaar Developer API; it derives amount/duration from the server order and records settlement idempotently.
- Android only enables the purchase action after the store-reported product price matches the configured IRR plan and an HTTPS API origin is configured.
- Receipt/order APIs require the authenticated session cookie and CSRF protection. Missing session/configuration fails closed.

These are implemented source paths, not evidence that either publisher account, production credentials, or live purchases have been validated.

## Required private configuration

Android Gradle properties (never commit private values):
- `SAHMINO_API_BASE_URL` — deployed HTTPS Worker origin.
- `SAHMINO_PWA_ORIGIN` — exact configured PWA origin.
- `BAZAAR_IAB_PUBLIC_KEY`, `MYKET_IAB_PUBLIC_KEY`.
- `BAZAAR_SKU_30D` through `BAZAAR_SKU_365D`, and `
Worker variables:
- `BAZAAR_SKU_30D`, `BAZAAR_SKU_60D`, `BAZAAR_SKU_90D`, `BAZAAR_SKU_180D`, `BAZAAR_SKU_365D`.

Worker secrets:
- `BAZAAR_CLIENT_ID`, `BAZAAR_CLIENT_SECRET`, `BAZAAR_REFRESH_TOKEN`.

**Product ID timing — not a current development prerequisite:** No store product IDs are expected at the present pre-upload debugging stage. The fallback values such as `sahmino_pro_30d` are development placeholders only. Before upload, continue with source/contract tests, local build checks, and mocked receipt-verification tests without enabling real purchases. After the app is registered in each publisher console and that console permits in-app product creation, create the five products there, record the exact IDs and store prices, then replace the placeholders in the Android Gradle properties and Worker variables. CafeBazaar maintain separate product catalogues. Do not block the current integration-debugging phase on these future publisher-console values. Keep `SAHMINO_OTP_ENABLED` and `PREPAID_ORDERS_ENABLED` false until server deployment and end-to-end acceptance pass.

## Work sequence and release gates

### Current phase — pre-upload payment integration debugging
1. Fix and test CafeBazaar-specific Android adapters and their UI/channel selection.
2. Verify server order creation, authoritative plan/amount mapping, receipt validation contracts, idempotent settlement, entitlement extension, and consume-after-settlement behavior using automated tests and mocked provider responses.
3. Verify failure paths: cancellation, declined/unverified receipt, wrong SKU/package/payload, duplicate/replay, timeout, retry, and no entitlement on failure.
4. Build both debug flavors and validate installation/channel-specific UI. Real store checkout is not claimed before publisher registration and store test setup.
5. Keep production payment flags disabled. Do not require real store product IDs in this phase.

### Later phase — after integration debugging
6. Register/upload the app in each publisher console as required by that store.
7. Create the five real products separately in CafeBazaar, record exact product IDs and displayed prices, and configure Android/Worker values and provider credentials.
8. Deploy the Worker and apply reviewed D1 migrations/bindings; resolve the PWA/API same-site session design.
9. Run store sandbox/test purchases and physical-device acceptance for CafeBazaar, including refund/revoke and recovery.
10. Configure permanent release signing, prepare official release builds, upload for publisher review, and publish only after owner approval.

## CI status and safety

GitHub Actions run `44241041761` succeeded at commit `41981064297b80a7da3dc0f0bf0218f62d9c2d9b`. It compiled the CafeBazaar variant, assembled the CafeBazaar debug APK and uploaded the ZIP artifact for seven days. Inspection of the downloaded APK DEX confirms Poolakey/CafeBazaar billing classes only in the Bazaar APK and Myket billing classes only in the Myket APK. This does not deploy the Worker or validate publisher credentials, package registration, product IDs, or actual purchases.

The workflow produces **internal debug-only** APK artifacts for device validation; never upload them to either store. No live payment is enabled by this documentation; release remains blocked until all publisher, deployment, session, and device acceptance checks pass.
