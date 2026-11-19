# Sahmino subscription delivery checklist

Updated: 2026-11-19

This is the six-stage completion tracker. "Implemented" means source code is committed and automated checks cover it; it does not imply production credentials, real store accounts, or live deployment exist.

| Stage | Work | Status |
|---|---|---|
| 1. App integration | Connect selector, native bridge, real commercial session provider, and host WebView | PARTIAL: Bazaar/Myket native coordinators and Worker API client are coded; MainActivity/PWA UI wiring is blocked on production session-token provider |
| 2. Backend consolidation | One Billing V2 Worker contract, one D1 entitlement ledger, Bazaar and Myket provider adapters | CODED ON THIS BRANCH; supplemental draft PR [#188](https://github.com/Raminhashemi1/sahamban/pull/188) opened against PR #187's head branch |
| 3. Store configuration | Create exact five products in both developer panels and configure SKU maps/package/public keys/OAuth | TEMPLATES READY; owner must supply exact five product IDs per store, real package ID, public keys and Bazaar OAuth credentials |
| 4. Deployment | Apply migration, deploy per-store Worker configurations, configure secrets and exact HTTPS origins | RUNBOOK READY; both templates are configured to use one shared D1 ID; no production resources or secrets changed |
| 5. Real payment acceptance | Purchase, replay, interrupted flow, consume, restore, refund/revocation and renewal tests on physical devices | TEST MATRIX READY; live execution requires owner test accounts, configured products and installed builds |
| 6. Release | Sign and build the final distribution variants, verify package IDs, submit to stores | DEBUG BUILD SUCCESSFUL for code commit `650a27ee` in [run 44537588855](https://github.com/Raminhashemi1/sahamban/actions/runs/44537588855); both store APK artifacts were uploaded. Current branch head `35757d1b` contains documentation-only changes after that build. Release signing and final package identity remain missing |

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
- Updated the host Android build to AGP 8.12.3 / Kotlin 2.2.0 / Gradle 8.13 / compileSdk 36. Both store-specific debug APKs compiled successfully for code commit `650a27ee` in [run 44537588855](https://github.com/Raminhashemi1/sahamban/actions/runs/44537588855). Artifact: `sahamban-android-pilot-dual-store-debug-UNSIGNED-FOR-STORE` (7-day retention). These are unsigned debug/test APKs, not release APKs. The purchase/restore orchestration feature gate remains hard-coded false for debug and release builds.
- Preserved Bazaar verification and settlement behavior; fixed the existing Bazaar test mock and idempotent replay validation discovered while running the expanded suite.

## Important limitations

1. Android now has separate Bazaar and Myket flavor coordinators and an HTTPS Billing V2 client. The host `MainActivity` remains a test-only WebView shell and intentionally does not instantiate the billing bridge: it has no production commercial login/session token provider. The temporary package ID is `ir.sahamban.pilot`, not confirmed as the published Sahmino package.
2. Existing Worker authentication is short-lived private-pilot HMAC JWT, explicitly not the commercial account identity implementation.
3. Myket signed receipt verification does not provide a live refund/revocation query. An authoritative Myket API contract or approved reconciliation process is still required before public launch.
4. Myket package name, public key, and five product IDs must come from the real developer panel. Bazaar OAuth credentials and RSA key must also be configured as secrets.
5. The schema migration is prepared and tested only against SQLite test databases; it has not been run against production D1.
6. The native billing coordinators are implemented in the pilot app's Bazaar/Myket source sets, and the API client is aligned to the Worker request/response contracts. `MainActivity` still does not instantiate the billing flow: production identity/session-token delivery and UI integration are not present. The temporary application ID is `ir.sahamban.pilot`, not the confirmed published Sahmino package.

## CI evidence

- Latest dual-store backend, schema/migration, provider verification/settlement, Worker routing and Android wiring checks passed on commit `dc11bc1`: [run 44537964748](https://github.com/Raminhashemi1/sahamban/actions/runs/44537964748). The same checks passed again after the checklist update; run [44538349380](https://github.com/Raminhashemi1/sahamban/actions/runs/44538349380) completed all test steps successfully.
- Both Bazaar and Myket debug APKs compiled and were uploaded successfully for code commit `650a27ee`: [run 44537588855](https://github.com/Raminhashemi1/sahamban/actions/runs/44537588855). Artifact: `sahamban-android-pilot-dual-store-debug-UNSIGNED-FOR-STORE`, expires 2026-11-26. SHA-256: `4204f0fa4fa31a8fb7a5bf1be16a84b002908d569bf89e6229acc91951622b95`. Branch head `35757d1b` contains documentation-only changes after the APK build; Android source is unchanged.
- APKs are unsigned debug/test builds, not release-signed packages. No live Bazaar/Myket account purchase or production deployment has been performed.

## Integration review

- Supplemental draft PR [#188](https://github.com/Raminhashemi1/sahamban/pull/188) targets the existing Billing V2 branch from PR #187. It is not merged.
- PR #188 must be reviewed and merged into PR #187's branch before the combined Billing V2 work is considered for \`main\`.

## Safety

- No production deployment or D1 migration was performed.
- No store credentials or signing keys were committed.
- No branch was merged into `main`.
- Keep `BILLING_V2_ENABLED=false` until all six stages pass.
