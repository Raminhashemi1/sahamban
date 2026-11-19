# Development status

## Decisions
- Product: one Sahmino app/product distributed through Cafe Bazaar and Myket.
- Shared application source and shared subscription backend.
- Bazaar distribution uses Bazaar billing only; Myket distribution uses Myket billing only.
- Store-specific SDK adapters/build configuration are isolated where required.
- Shared account identity and server-side entitlement across both distributions.
- All plan amounts are IRR (ریال), never toman.
- Manual one-time duration purchases; no automatic recurring charge assumed.
- Legacy subscription implementation is not reused.

## Recorded implementation
This work is saved on the isolated branch `feature/sahmino-subscriptions-independent`.
The repository default branch `main` has not been changed.

### Documentation and decisions
- `subscription-module/README.md`
- `subscription-module/STORE_INTEGRATION_CONTRACT.md`
- `subscription-module/STATUS.md`
- `subscription-module/PLAN_CATALOG.json`

### Domain and database foundation
- `subscription-module/core/domain.mjs`: canonical plan lookup and renewal date calculation.
- `subscription-module/core/provider-contract.md`: vendor-neutral store adapter contract.
- `subscription-module/server/schema.sql`: store SKU mapping, orders, entitlements, and event history tables.

### Android foundation
- `subscription-module/android/StoreBillingProvider.kt`: provider-neutral Kotlin billing interface.
- `subscription-module/android/FLAVOR_BUILD_GUIDE.md`: one shared product/source tree with store-specific distribution build configurations.

## Fixed plan catalog
| Plan | Days | Price (IRR) |
|---|---:|---:|
| sahmino_30d | 30 | 1,500,000 |
| sahmino_60d | 60 | 2,850,000 |
| sahmino_90d | 90 | 4,050,000 |
| sahmino_180d | 180 | 7,650,000 |
| sahmino_365d | 365 | 14,600,000 |

## Important accuracy note
Additional prototypes were generated in the ChatGPT workspace (order service, settlement prototype, purchase coordinator, verifier registry, and example Gradle configuration). They are not yet committed as production-ready code. Before committing those prototypes, they must be reconciled with this branch, reviewed for correctness, and tested in the actual host runtime. In particular, SQL atomicity/date arithmetic and Kotlin/Gradle compilation must be validated.

## Not completed / release blockers
- Inspect actual host Android project structure and build tool versions.
- Pin official, compatible Bazaar and Myket SDK versions.
- Implement concrete store SDK adapters.
- Implement trusted server-side verification separately for each store.
- Wire authentication and API routes in the deployed backend.
- Run D1 migration and concurrency/idempotency tests.
- Handle pending, refunded, revoked, restored, and duplicate purchases.
- Build and test both distribution artifacts on real devices/store test accounts.
- Verify package identity, signing, and each store's publication policy.

## Rule for future work
At the end of each completed, reviewed milestone, commit the files to this feature branch and update this status file. Do not commit unfinished or untested prototypes as production-ready. Never push subscription work directly to `main`.
