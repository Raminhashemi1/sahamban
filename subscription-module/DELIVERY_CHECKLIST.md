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
| 6. Release | Sign and build the final distribution variants, verify package IDs, submit to stores | DEBUG BUILD PASSED; release signing and final package identity still missing |

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
- Updated the host Android build to AGP 8.12.3 / Kotlin 2.2.0 / Gradle 8.13 / compileSdk 36. Both store-specific debug APKs compiled successfully in [run 44533319977](https://github.com/Raminhashemi1/sahamban/actions/runs/44533319977) at commit `594143fe`. These are unsigned debug APKs, not release APKs. The purchase/restore orchestration now has an explicit compile-time feature gate that remains hard-coded false for both debug and release builds. A fresh build is required for the latest branch head after subsequent Android source changes.
- Preserved Bazaar verification and settlement behavior; fixed the existing Bazaar test mock and idempotent replay validation discovered while running the expanded suite.

## Important limitations

1. Android now has separate Bazaar and Myket flavor coordinators and an HTTPS Billing V2 client. The host `MainActivity` remains a test-only WebView shell and intentionally does not instantiate the billing bridge: it has no production commercial login/session token provider. The temporary package ID is `ir.sahamban.pilot`, not confirmed as the published Sahmino package.
2. Existing Worker authentication is short-lived private-pilot HMAC JWT, explicitly not the commercial account identity implementation.
3. Myket signed receipt verification does not provide a live refund/revocation query. An authoritative Myket API contract or approved reconciliation process is still required before public launch.
4. Myket package name, public key, and five product IDs must come from the real developer panel. Bazaar OAuth credentials and RSA key must also be configured as secrets.
5. The schema migration is prepared and tested only against SQLite test databases; it has not been run against production D1.
6. The native billing coordinators are implemented in the host app's Bazaar/Myket source sets, and the API client is aligned to the canonical Worker request/response contracts. `MainActivity` still does not instantiate the billing flow: production identity/session-token delivery and UI integration are not present. The last confirmed APK build passed on an earlier commit; rebuild latest branch head before accepting binaries.

## CI evidence

- Latest backend, Bazaar regression, Myket signature/settlement, Worker routing, Android wiring and schema/migration checks passed in [run 44534245212](https://github.com/Raminhashemi1/sahamban/actions/runs/44534245212) and [run 44534221461](https://github.com/Raminhashemi1/sahamban/actions/runs/44534221461). The Android dual-flavor debug build passed in [run 44533319977](https://github.com/Raminhashemi1/sahamban/actions/runs/44533319977) for commit `594143fe`; it must be rerun against the current branch head `3addd7a` before treating those APKs as current. No release APK or live store test is claimed.

- Previous standalone module: Android Bazaar and Myket AAR compilation passed in [run 44528592255](https://github.com/Raminhashemi1/sahamban/actions/runs/44528592255).
- Previous standalone module: PWA/backend tests passed in [run 44528892500](https://github.com/Raminhashemi1/sahamban/actions/runs/44528892500).
- This branch: dual-store Billing V2 Node and SQLite tests passed in [run 44533350142](https://github.com/Raminhashemi1/sahamban/actions/runs/44533350142).
- Latest dual-store CI including end-to-end Myket flow, Worker routing, Bazaar regression and fresh/migrated D1 schema tests passed in [run 44531003318](https://github.com/Raminhashemi1/sahamban/actions/runs/44531003318).

## Integration review

- Supplemental draft PR [#188](https://github.com/Raminhashemi1/sahamban/pull/188) targets the existing Billing V2 branch from PR #187. It is not merged.
- PR #188 must be reviewed and merged into PR #187's branch before the combined Billing V2 work is considered for \`main\`.

## Safety

- No production deployment or D1 migration was performed.
- No store credentials or signing keys were committed.
- No branch was merged into `main`.
- Keep `BILLING_V2_ENABLED=false` until all six stages pass.
