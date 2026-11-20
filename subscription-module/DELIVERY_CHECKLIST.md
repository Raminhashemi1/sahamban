# Sahmino subscription delivery checklist

Updated: 2026-11-19

This is the six-stage completion tracker. "Implemented" means source code is committed and automated checks cover it; it does not imply production credentials, real store accounts, or live deployment exist.

| Stage | Work | Status |
|---|---|---|
| 1. App integration | Connect selector, native bridge, real commercial session provider, and host WebView | PARTIAL: MainActivity already exposes «اشتراک سهمینو» and calls BillingV2SubscriptionHost; the host composes the cookie-session provider, BillingV2ApiClient, store-specific coordinator, BillingV2PurchaseFlow, and five-plan selector when package/SKU configuration is valid. End-to-end checkout remains gated off; PR #185 OTP routes/PWA account integration, exact package/SKUs, deployed Worker/session config, and physical-device validation are outstanding |
| 2. Backend consolidation | One Billing V2 Worker contract, one D1 entitlement ledger, Bazaar and Myket provider adapters | CODED ON THIS BRANCH; supplemental draft PR [#188](https://github.com/Raminhashemi1/sahamban/pull/188) opened against PR #187's head branch |
| 3. Store configuration | Create exact five products in both developer panels and configure SKU maps/package/public keys/OAuth | TEMPLATES READY; owner must supply exact five product IDs per store, real package ID, public keys and Bazaar OAuth credentials |
| 4. Deployment | Apply migration, deploy per-store Worker configurations, configure secrets and exact HTTPS origins | RUNBOOK READY; both templates are configured to use one shared D1 ID; no production resources or secrets changed |
| 5. Real payment acceptance | Purchase, replay, interrupted flow, consume, restore, refund/revocation and renewal tests on physical devices | TEST MATRIX READY; live execution requires owner test accounts, configured products and installed builds |
| 6. Release | Sign and build the final distribution variants, verify package IDs, submit to stores | DEBUG BUILD SUCCESSFUL for commit `df738b56` in [run 44541345164](https://github.com/Raminhashemi1/sahamban/actions/runs/44541345164). A fresh build from current integration head `d7258a6c` is queued in [run 44542115399](https://github.com/Raminhashemi1/sahamban/actions/runs/44542115399). Release signing and final package identity remain missing |

## Work completed on this integration branch

- Based on existing Billing V2 implementation from PR #187, rather than adding a second unrelated ledger.
- Added server-selected `BILLING_STORE` routing; client cannot choose provider.
- Added Myket RSA-signed receipt verification and order/package/SKU/developer-payload binding.
- Added Myket order creation with exact five-key server-side SKU map.
- Added Myket settlement into the same `billing_orders`, `billing_access`, and `billing_events` ledger.
- Added one-time migration for existing Bazaar Billing V2 databases.
- Added Worker routing tests for server-side Myket selection, SKU-bound orders, and client store spoofing rejection.
- Added Myket verifier, order creation, settlement replay/idempotency, and schema/migration tests.
- Added separate Bazaar/Myket Wrangler templates and a deployment runbook that enforces one shared D1 database and keeps checkout disabled.
- Added a physical-device acceptance matrix covering payment success, replay, cancellation, offline recovery, consume retry, cross-store account access, and refunds; live execution is still pending.
- Added Bazaar/Myket Android app flavors in the host pilot project, moved the Poolakey coordinator into the Bazaar source set, added the Myket IAB v3 coordinator in the Myket source set, and aligned the API client request bodies with the canonical Worker contract.
- Updated the host Android build to AGP 8.12.3 / Kotlin 2.2.0 / Gradle 8.13 / compileSdk 36. Both store-specific debug APKs compiled successfully for code commit `650a27ee` in [run 44537588855](https://github.com/Raminhashemi1/sahamban/actions/runs/44537588855). A later rebuild for commit `dc964c33` initially encountered transient Maven dependency resolution failures, then succeeded on retry; [run 44539202813](https://github.com/Raminhashemi1/sahamban/actions/runs/44539202813) uploaded both Bazaar and Myket debug APKs. Artifact digest: `sha256:d44c071bceb98ec85f9b9b1229ed81ab54bf4562aa32a899d53e9ac6c0fe9e70`. The artifact is unsigned debug/test only, not a release APK. The purchase/restore orchestration feature gate remains hard-coded false for debug and release builds.
- Preserved Bazaar verification and settlement behavior; fixed the existing Bazaar test mock and idempotent replay validation discovered while running the expanded suite.

## Important limitations

1. Android has separate Bazaar and Myket flavor coordinators and an HTTPS Billing V2 client. `MainActivity` is a test-only WebView shell, but it does expose the subscription entry point and instantiates `BillingV2SubscriptionHost`; the host composes the native cookie-session provider and purchase flow when configuration is valid. The current build gate `SAHAMBAN_BILLING_ENABLED` is hard-coded false for debug and release. The temporary package ID is `ir.sahamban.pilot`, not confirmed as the published Sahmino package.
2. Existing Worker authentication is short-lived private-pilot HMAC JWT, explicitly not the commercial account identity implementation.
3. Myket signed receipt verification does not provide a live refund/revocation query. An authoritative Myket API contract or approved reconciliation process is still required before public launch.
4. Myket package name, public key, and five product IDs must come from the real developer panel. Bazaar OAuth credentials and RSA key must also be configured as secrets.
5. The schema migration is prepared and tested only against SQLite test databases; it has not been run against production D1.
6. The native billing coordinators, cookie-session API client, reusable five-plan selector, and `MainActivity` → `BillingV2SubscriptionHost` → `BillingV2PurchaseFlow` composition are present in the pilot app. This is not yet a releasable end-to-end flow: OTP routes/PWA account UI are a separate unmerged PR #185 dependency; exact store SKU/package values and Worker deployment are not configured; `SAHAMBAN_BILLING_ENABLED` remains false; and physical-device account/session and purchase tests have not run. The temporary application ID is `ir.sahamban.pilot`, not the confirmed published Sahmino package.

## CI evidence

- Latest dual-store backend, schema/migration, provider verification/settlement, Worker routing, Android host security/flavor wiring, and standalone subscription-selector static checks passed in [run 44542741562](https://github.com/Raminhashemi1/sahamban/actions/runs/44542741562) on commit `3264fc15`. The Android build including the new Kotlin UI component is running in [run 44542724017](https://github.com/Raminhashemi1/sahamban/actions/runs/44542724017); compilation and artifact upload are not yet confirmed.
- The Android API client now uses an injected native `BillingV2TokenProvider`; static billing validation passed. This is an integration seam only; the commercial Sahmino session provider is not present in this repository.
- Both Bazaar and Myket debug APKs were successfully uploaded for earlier code commit `650a27ee`: [run 44537588855](https://github.com/Raminhashemi1/sahamban/actions/runs/44537588855). Artifact: `sahamban-android-pilot-dual-store-debug-UNSIGNED-FOR-STORE`, 7-day retention, SHA-256 `4204f0fa4fa31a8fb7a5bf1be16a84b002908d569bf89e6229acc91951622b95`.
- The earlier Android build for commit `df738b5608f1e9ac783e3a768fea0b186c083eca` completed successfully in [run 44541345164](https://github.com/Raminhashemi1/sahamban/actions/runs/44541345164). Both Bazaar and Myket debug APKs were uploaded as `sahamban-android-pilot-dual-store-debug-UNSIGNED-FOR-STORE`; artifact ID `14539051817`, expires 2026-11-26, digest `sha256:0143301be8d494bdad98289e724327e168c60d580b1464616bdfa3baf2dbde8e`. These are unsigned debug/test APKs, not store release files. A new build for latest branch head `d7258a6c` is queued in [run 44542115399](https://github.com/Raminhashemi1/sahamban/actions/runs/44542115399).
- No signed release build, live store purchase, or production deployment has been performed.

## Integration review

- Supplemental draft PR [#188](https://github.com/Raminhashemi1/sahamban/pull/188) targets PR #187's head branch `codex/reengineering-audit`. Both PR #187 (to `main`) and PR #188 remain open drafts; neither is merged.
- PR #188 must be reviewed and merged into PR #187's branch before the combined Billing V2 work is considered for \`main\`.

## Safety

- No production deployment or D1 migration was performed.
- No store credentials or signing keys were committed.
- No branch was merged into `main`.
- Keep `BILLING_V2_ENABLED=false` until all six stages pass.


## Current checkpoint — 2026-11-19

- Current integration head: `d7258a6cc9d49cd6f3a2020c86eb65843f1e9720`.
- Both store-specific debug APK builds and the dual-store backend test workflow passed on this head.
- Repository inspection confirms there is no production login/session implementation in this pilot repository. The existing PWA is loaded from GitHub Pages, and the native MainActivity intentionally has no JavaScript bridge or authenticated account provider. Therefore the next app-integration step cannot be safely completed by inventing a user identity or generating pilot tokens. It requires the actual Sahmino account-session provider from the production app host.
- No live purchase, production D1 migration, store configuration, release signing, or PR merge has been performed.


## Standalone UI checkpoint — 2026-11-19

- Added `android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2SubscriptionView.kt`: native RTL/Persian selector for 30/60/90/180/365-day plans, prices in Rial, explicit no-auto-renewal disclosure, purchase/restore actions, and purchase outcome/error messages.
- Added repository static validation for all five plan IDs, five Rial prices, manual-renewal disclosure, restore and purchase flow calls.
- Documented the exact host-side construction seam in `android-pilot/README.md`.
- This UI is reusable and independently coded, but intentionally not attached to test-only `MainActivity` until the actual commercial account-session provider and store/package settings are available. No real purchase is enabled.


## Corrected app-wiring checkpoint — 2026-11-20

A fresh source inspection corrected stale statements in earlier checkpoints:

- `MainActivity.showWebApp()` creates the «اشتراک سهمینو» entry point.
- `MainActivity.showSubscription()` creates `BillingV2SubscriptionHost` and calls `createView()`.
- When package/SKU configuration passes, the host composes `BillingV2CookieSessionProvider`, `BillingV2ApiClient`, the flavor-specific `BillingV2Coordinator`, `BillingV2PurchaseFlow`, and `BillingV2SubscriptionView`.
- The current app wiring is therefore present in the pilot host; it is not accurate to say that MainActivity never instantiates the billing bridge.
- It remains intentionally non-operational for purchases: `SAHAMBAN_BILLING_ENABLED=false` is hard-coded for both debug and release. The package is still `ir.sahamban.pilot`, store SKU environment values are not supplied, and Worker/OTP routes still depend on the unmerged PR #185 account implementation.
- PR #189 backend/session bridge CI passed on commit `5834d9ca8f1ce44cb580ef3b071a3790684b6a1a` ([run 44607013630](https://github.com/Raminhashemi1/sahamban/actions/runs/44607013630)). This is backend validation, not proof of a current Android APK build or physical-device acceptance.
- No production configuration, D1 migration, live checkout, release signing, or PR merge was performed.
