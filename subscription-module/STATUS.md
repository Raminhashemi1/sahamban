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
- Status: GitHub Actions run 44520007761 completed successfully on Node 22. All six domain tests passed after aligning the plan IDs to the dossier. This validates only the pure domain layer, not payment or server integration.

### M3 — Source-aligned domain correction and PWA/native bridge design
- Corrected all five internal plan IDs to the exact dossier identifiers: SAHAMBAN_PRO_30D, SAHAMBAN_PRO_60D, SAHAMBAN_PRO_90D, SAHAMBAN_PRO_180D, SAHAMBAN_PRO_365D.
- Updated executable catalog, JSON catalog, and tests together; CI passed after the correction.
- `android/PWA_NATIVE_BILLING_BRIDGE.md`: independent protocol contract for the PWA/WebView-to-native billing boundary, trusted-origin requirements, message envelope, purchase/restore/entitlement actions, and secret-handling rules.
- Status: design documented; no bridge implementation is claimed complete. The exact production PWA origin and commercial user authentication contract are not supplied in the dossier.

### M4 — Independent Billing V2 data model
- Replaced the earlier generic subscription_orders/subscription_entitlements draft with a dossier-aligned Billing V2 model: billing_orders, billing_access, billing_events.
- Added a store discriminator (BAZAAR/MYKET) and generic store product/order fields so each store has its own transaction identifiers while account entitlement remains shared.
- Added unique indexes for store order IDs and purchase-token hashes, and explicit lifecycle checks.
- Status: schema drafted and committed; not applied to live D1. Must be validated against target D1 runtime and reviewed before migration.

### M5 — Independent backend order and entitlement services
- Added `server/order-service.mjs`: authenticated principal is injected by trusted middleware; store product ID is resolved only from server configuration; amount and plan duration are resolved from the canonical catalog; order and ORDER_CREATED event are written through a D1 batch.
- Added `server/entitlement-service.mjs`: current access is read from `billing_access` and active status is derived using server time; includes the pure manual-renewal expiry policy helper.
- Added `tests/order-service.test.mjs`: checks server-owned price/product mapping, missing mapping rejection, unauthenticated/unknown plan rejection, entitlement status, and manual renewal extension.
- GitHub Actions runs 44520669827, 44520675896, and 44520684135 completed successfully for the backend service commits. These are service-level tests using a fake D1 interface; they do not prove live D1 behavior or production authentication.
- Status: service prototypes and tests committed; Worker routing, trusted commercial auth, store verification, and atomic settlement remain unimplemented.

## Fixed plan catalog
| Plan ID | Days | Price (IRR) |
|---|---:|---:|
| SAHAMBAN_PRO_30D | 30 | 1,500,000 |
| SAHAMBAN_PRO_60D | 60 | 2,850,000 |
| SAHAMBAN_PRO_90D | 90 | 4,050,000 |
| SAHAMBAN_PRO_180D | 180 | 7,650,000 |
| SAHAMBAN_PRO_365D | 365 | 14,600,000 |

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
