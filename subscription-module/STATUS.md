# Development status

## Product and architecture decisions
- One Sahmino product and shared account/entitlement service.
- Bazaar distribution must use Bazaar billing; Myket distribution must use Myket billing.
- Prefer one shared Android source tree with store-specific build configurations/adapters if this is the safest, simplest route after host-app validation.
- All amounts are IRR (ریال), never toman.
- Five fixed-duration plans: 30, 60, 90, 180, and 365 days.
- Manual one-time purchases; no automatic recurring charge assumed.
- The independent module does not import or reuse legacy subscription code.

## GitHub safety
- Work is on `feature/sahmino-subscriptions-independent`.
- Default branch `main` has not been modified.
- Every reviewed milestone is committed to this feature branch.
- Unverified prototypes are not described as production-ready.

## Completed and committed

### M1 — Independent domain and documentation
- `README.md`: project scope, architecture and trust boundary.
- `PLAN_CATALOG.json`: canonical machine-readable plan prices.
- `STORE_INTEGRATION_CONTRACT.md`: provider separation and verification rules.
- `core/domain.mjs`: executable five-plan catalog, plan lookup, and renewal duration calculation.
- `core/provider-contract.md`: neutral billing adapter contract.
- `server/schema.sql`: initial D1 schema for store SKU mapping, orders, entitlements and events.
- `android/StoreBillingProvider.kt`: provider-neutral Kotlin contract.
- `android/FLAVOR_BUILD_GUIDE.md`: shared source tree and store-specific packaging guide.

### M2 — Domain test automation
- `package.json`: Node test command.
- `tests/domain.test.mjs`: verifies all five exact IRR prices, JSON catalog parity, unknown plan rejection, early renewal, expired/absent entitlement, and invalid inputs.
- `.github/workflows/sahmino-subscription-tests.yml`: CI workflow using Node 22.
- Status: GitHub Actions run #101 completed successfully on Node 22. All six domain tests passed (plan catalog/IRR, JSON parity, unknown plan, early renewal, expired/absent expiry, invalid input). This validates only the pure domain layer, not payment or server integration.

## Fixed plan catalog
| Plan ID | Days | Price (IRR) |
|---|---:|---:|
| sahmino_30d | 30 | 1,500,000 |
| sahmino_60d | 60 | 2,850,000 |
| sahmino_90d | 90 | 4,050,000 |
| sahmino_180d | 180 | 7,650,000 |
| sahmino_365d | 365 | 14,600,000 |

Durations currently mean fixed 24-hour days, not calendar months. This distinction must remain explicit in UI/backend copy.

## Inspected host-repository context (read-only)
- The repository contains a pilot Android WebView wrapper under `android-pilot/`.
- It currently identifies itself as a test-only pilot package and explicitly says it is not a production marketplace release.
- Existing legacy subscription/worker files exist under `server/`; they are not dependencies of this independent module and have not been changed.
- Host app integration cannot be finalized until the real production Android application identity, packaging model, and account/auth integration are confirmed.

## Not completed / release blockers
- Inspect the full host application architecture and identify the actual production Android wrapper/source.
- Confirm whether one artifact can reliably serve both stores or store-specific build artifacts are required.
- Confirm each store's current policy for fixed-duration digital access sold as one-time IAP.
- Pin current official Bazaar and Myket SDK versions.
- Implement actual store SDK adapters.
- Implement trusted server-side verification separately for each store.
- Implement authenticated API routes and durable idempotent settlement.
- Test refund, revocation, pending, cancellation, restore, duplicate and concurrent purchase cases.
- Build and test on real devices and store test accounts.

## Next milestone
Run the domain CI workflow and fix any failures. Then design the backend order/settlement contract against the verified production runtime, rather than assuming a Cloudflare/D1 API shape.
