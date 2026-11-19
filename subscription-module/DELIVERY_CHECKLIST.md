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
| 6. Release | Sign and build the final distribution variants, verify package IDs, submit to stores | NOT READY; final package IDs and signing credentials are not provided |

## Work completed on this integration branch

- Based on existing Billing V2 implementation from PR #187, rather than adding a second unrelated ledger.
- Added server-selected `BILLING_STORE` routing; client cannot choose provider.
- Added Myket RSA-signed receipt verification and order/package/SKU/developer-payload binding.
- Added Myket order creation with exact five-key server-side SKU map.
- Added Myket settlement into the same `billing_orders`, `billing_access`, and `billing_events` ledger.
- Added one-time migration for existing Bazaar Billing V2 databases.
- Added Worker routing tests for server-side Myket selection, SKU-bound orders, and client store spoofing rejection.
- Added Myket verifier, order creation, settlement replay/idempotency, and schema/migration tests.
- Preserved Bazaar verification and settlement behavior; fixed the existing Bazaar test mock and idempotent replay validation discovered while running the expanded suite.

## Important limitations

1. Main branch Android app is still a test-only WebView shell; its package ID is `ir.sahamban.pilot`, not confirmed as the published Sahmino package. It has no production commercial login/session contract and no active native billing bridge.
2. Existing Worker authentication is short-lived private-pilot HMAC JWT, explicitly not the commercial account identity implementation.
3. Myket signed receipt verification does not provide a live refund/revocation query. An authoritative Myket API contract or approved reconciliation process is still required before public launch.
4. Myket package name, public key, and five product IDs must come from the real developer panel. Bazaar OAuth credentials and RSA key must also be configured as secrets.
5. The schema migration is prepared and tested only against SQLite test databases; it has not been run against production D1.
6. The existing independent PWA/Android module is a reusable implementation reference. It has not yet been connected to the actual host app Activity and the canonical PR #187 API client.

## CI evidence

- Previous standalone module: Android Bazaar and Myket AAR compilation passed in [run 44528592255](https://github.com/Raminhashemi1/sahamban/actions/runs/44528592255).
- Previous standalone module: PWA/backend tests passed in [run 44528892500](https://github.com/Raminhashemi1/sahamban/actions/runs/44528892500).
- This branch: dual-store Billing V2 Node tests passed in [run 44530625740](https://github.com/Raminhashemi1/sahamban/actions/runs/44530625740).
- Latest dual-store CI including end-to-end Myket flow, Worker routing, Bazaar regression and fresh/migrated D1 schema tests passed in [run 44531003318](https://github.com/Raminhashemi1/sahamban/actions/runs/44531003318).

## Integration review

- Supplemental draft PR [#188](https://github.com/Raminhashemi1/sahamban/pull/188) targets the existing Billing V2 branch from PR #187. It is not merged.
- PR #188 must be reviewed and merged into PR #187's branch before the combined Billing V2 work is considered for \`main\`.

## Safety

- No production deployment or D1 migration was performed.
- No store credentials or signing keys were committed.
- No branch was merged into `main`.
- Keep `BILLING_V2_ENABLED=false` until all six stages pass.
