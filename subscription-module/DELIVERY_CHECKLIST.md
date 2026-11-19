# Sahmino subscription delivery checklist

Updated: 2026-11-19

This is the six-stage completion tracker. "Implemented" means source code is committed and automated checks cover it; it does not imply production credentials, real store accounts, or live deployment exist.

| Stage | Work | Status |
|---|---|---|
| 1. App integration | Connect selector, native bridge, real commercial session provider, and host WebView | BLOCKED: main Android host is explicitly test-only and has no commercial login/session token provider or billing bridge |
| 2. Backend consolidation | One Billing V2 Worker contract, one D1 entitlement ledger, Bazaar and Myket provider adapters | CODED ON THIS BRANCH; supplemental draft PR [#188](https://github.com/Raminhashemi1/sahamban/pull/188) opened against PR #187's head branch |
| 3. Store configuration | Create exact five products in both developer panels and configure SKU maps/package/public keys/OAuth | OWNER CONFIGURATION REQUIRED; no developer-panel access or credentials in repository |
| 4. Deployment | Apply migration, deploy per-store Worker configurations, configure secrets and exact HTTPS origins | NOT DEPLOYED; production D1/Worker resources and secrets were not changed |
| 5. Real payment acceptance | Purchase, replay, interrupted flow, consume, restore, refund/revocation and renewal tests on physical devices | NOT RUN; requires test accounts and real installed builds |
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
- Added Bazaar/Myket Android app flavors in the host pilot project, moved the Poolakey coordinator into the Bazaar source set, added the Myket IAB v3 coordinator in the Myket source set, and aligned the API client request bodies with the canonical Worker contract.
- Updated the host Android build to AGP 8.12.3 / Kotlin 2.2.0 / Gradle 8.13 / compileSdk 36. Both store-specific debug APKs compiled successfully in [run 44533319977](https://github.com/Raminhashemi1/sahamban/actions/runs/44533319977). Artifact: [sahamban-android-pilot-dual-store-debug-UNSIGNED-FOR-STORE](https://github.com/Raminhashemi1/sahamban/actions/runs/44533319977). These are unsigned debug APKs, not release APKs. The purchase/restore orchestration now has an explicit compile-time feature gate that remains hard-coded false for both debug and release builds.
- Preserved Bazaar verification and settlement behavior; fixed the existing Bazaar test mock and idempotent replay validation discovered while running the expanded suite.

## Important limitations

1. Android now has separate Bazaar and Myket flavor coordinators and an HTTPS Billing V2 client. The host `MainActivity` remains a test-only WebView shell and intentionally does not instantiate the billing bridge: it has no production commercial login/session token provider. The temporary package ID is `ir.sahamban.pilot`, not confirmed as the published Sahmino package.
2. Existing Worker authentication is short-lived private-pilot HMAC JWT, explicitly not the commercial account identity implementation.
3. Myket signed receipt verification does not provide a live refund/revocation query. An authoritative Myket API contract or approved reconciliation process is still required before public launch.
4. Myket package name, public key, and five product IDs must come from the real developer panel. Bazaar OAuth credentials and RSA key must also be configured as secrets.
5. The schema migration is prepared and tested only against SQLite test databases; it has not been run against production D1.
6. The native billing coordinators are implemented in the host app's Bazaar/Myket source sets, and the API client is aligned to the canonical Worker request/response contracts. The host Activity wiring is still blocked on the production identity provider; Android flavor APK compilation is being validated in CI.

## CI evidence

- Latest backend/Android wiring checks, including the explicit purchase-flow feature-gate assertion, passed in [run 44533350142](https://github.com/Raminhashemi1/sahamban/actions/runs/44533350142) and [run 44533339396](https://github.com/Raminhashemi1/sahamban/actions/runs/44533339396). The first dual-flavor APK build attempt [failed before source compilation](https://github.com/Raminhashemi1/sahamban/actions/runs/44532392608) because Gradle could not resolve several remote Maven artifacts. The app repositories were aligned with the known-good standalone module and the build step now retries transient dependency-resolution failures; the latest dual-flavor build is [still running here](https://github.com/Raminhashemi1/sahamban/actions/runs/44533319977). No APK artifact is claimed until a build completes successfully. No APK artifact is claimed until a build completes successfully.

- Previous standalone module: Android Bazaar and Myket AAR compilation passed in [run 44528592255](https://github.com/Raminhashemi1/sahamban/actions/runs/44528592255).
- Previous standalone module: PWA/backend tests passed in [run 44528892500](https://github.com/Raminhashemi1/sahamban/actions/runs/44528892500).
- This branch: dual-store Billing V2 Node tests passed in [run 44532113814](https://github.com/Raminhashemi1/sahamban/actions/runs/44532113814).
- Latest dual-store CI including end-to-end Myket flow, Worker routing, Bazaar regression and fresh/migrated D1 schema tests passed in [run 44531003318](https://github.com/Raminhashemi1/sahamban/actions/runs/44531003318).

## Integration review

- Supplemental draft PR [#188](https://github.com/Raminhashemi1/sahamban/pull/188) targets the existing Billing V2 branch from PR #187. It is not merged.
- PR #188 must be reviewed and merged into PR #187's branch before the combined Billing V2 work is considered for \`main\`.

## Safety

- No production deployment or D1 migration was performed.
- No store credentials or signing keys were committed.
- No branch was merged into `main`.
- Keep `BILLING_V2_ENABLED=false` until all six stages pass.
