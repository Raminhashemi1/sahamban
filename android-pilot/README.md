# Sahmino Android — CafeBazaar and Myket

## Identity
- Application ID configured in Gradle: `ir.manahesab.sahmino`.
- Internal source namespace: `ir.sahamban.pilot`.
- Publisher registration for this package in either store is not yet verified.
- Both store flavors intentionally use the same application ID because each publisher must install the same registered app identity. Installing the second APK replaces the first; the two store APKs cannot be installed side by side. Uninstall the current pilot before installing the other flavor. Do not add a debug application ID suffix for store billing tests, because that changes the package identity expected by the publisher.

## Scope and approved catalogue
Only CafeBazaar and Myket are in this Android integration. ZarinPal and Google Play are excluded. Renewal defaults to manual; no auto-renewal is exposed by these one-time purchase flows.

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
- `BAZAAR_SKU_30D` through `BAZAAR_SKU_365D`, and `MYKET_SKU_30D` through `MYKET_SKU_365D` — exact publisher-console product IDs.

Worker variables:
- `BAZAAR_SKU_30D`, `BAZAAR_SKU_60D`, `BAZAAR_SKU_90D`, `BAZAAR_SKU_180D`, `BAZAAR_SKU_365D`.
- `MYKET_SKU_30D`, `MYKET_SKU_60D`, `MYKET_SKU_90D`, `MYKET_SKU_180D`, `MYKET_SKU_365D`.

Worker secrets:
- `MYKET_IAB_PUBLIC_KEY`.
- `BAZAAR_CLIENT_ID`, `BAZAAR_CLIENT_SECRET`, `BAZAAR_REFRESH_TOKEN`.

**How product IDs are obtained:** first register the app/package in each store's developer console and upload a build if that console requires it to unlock in-app products. Then, inside that app's in-app products section, create five products and enter a unique product ID/SKU for each one yourself. The store does not automatically create these five IDs when the APK is uploaded. Save each ID exactly as entered; IDs are normally immutable after product creation. Use the exact same strings in that store's Gradle properties and Worker variables. Bazaar and Myket each have their own separate product catalogue, so create/configure five products in each store (ten entries total). The current `sahmino_pro_30d` etc. values in Gradle are fallback placeholders only, not IDs issued by either store. Keep `SAHMINO_OTP_ENABLED` and `PREPAID_ORDERS_ENABLED` false until the deployment and acceptance gates below pass.

## Release blockers

1. Register/verify the exact package ID and create all five products in each publisher console; supply their actual IDs and displayed prices.
2. Obtain the public verification keys, CafeBazaar API credentials/permissions, and approved test accounts.
3. Deploy the Worker and apply the real D1 migrations/bindings. No production deployment or D1 migration is claimed by this branch.
4. Resolve authenticated session cookie behavior: the current GitHub Pages PWA origin and a `workers.dev` API are cross-site. Confirm a reliable same-site custom domain or approve a secure native session-exchange design; do not weaken cookie policy as a shortcut.
5. Confirm both stores' current policies and API contracts for fixed-duration digital entitlements, one-time consumable repurchase, and consume timing.
6. Confirm Myket refund/revoke reconciliation and CafeBazaar refund/void lifecycle handling.
7. Build and inspect debug APKs, then run sandbox purchases (success, cancel, decline, restore, retry, duplicate/replay, wrong account/SKU/package, network loss, consume failure, refund) on physical devices.
8. Configure permanent release signing securely; complete store listing, privacy/support material, and publisher review.

## CI status and safety

GitHub Actions run `44241041761` succeeded at commit `41981064297b80a7da3dc0f0bf0218f62d9c2d9b`. It compiled both store variants, assembled both debug APKs and uploaded the ZIP artifact for seven days. Inspection of the downloaded APK DEX confirms Poolakey/CafeBazaar billing classes only in the Bazaar APK and Myket billing classes only in the Myket APK. This does not deploy the Worker or validate publisher credentials, package registration, product IDs, or actual purchases.

The workflow produces **internal debug-only** APK artifacts for device validation; never upload them to either store. No live payment is enabled by this documentation; release remains blocked until all publisher, deployment, session, and device acceptance checks pass.
