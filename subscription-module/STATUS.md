# Development status

## Decisions
- Product: one Sahmino app/product, distributed through Cafe Bazaar and Myket.
- Preferred architecture: one shared source tree with store-specific build configurations/adapters if this is the most reliable path after checking host-app constraints.
- Payment routing: Bazaar listing uses Bazaar billing; Myket listing uses Myket billing.
- Shared account and server-side entitlement across both distributions.
- Currency: all plan amounts are IRR (ریال).
- Purchase model: one-time manually renewed duration plans; no automatic recurring charge assumed.
- Legacy subscription code is not reused.

## Milestones

### M1 — Independent domain foundation
- Defined the five canonical plan IDs, durations, and IRR prices.
- Defined provider-neutral billing concepts.
- Drafted initial D1 tables for store SKU mapping, orders, entitlements, and events.
- Added domain tests for plan prices and renewal date calculation.
- Status: initial implementation exists; needs integration/runtime review.

### M2 — Order and settlement foundation
- Added server-side order creation policy: user identity comes from verified auth, while price/duration/SKU are resolved server-side.
- Added settlement service contract and idempotency requirements.
- Added API contract for plans, current entitlement, order creation, and purchase verification.
- Status: service-level implementation exists; D1 atomicity and SQL date arithmetic require dedicated integration tests before production.

### M3 — Android purchase orchestration
- Added provider-neutral Android billing interface.
- Added coordinator flow: create order, launch store purchase, submit evidence, wait for backend settlement, then consume.
- Added recovery path for owned purchases.
- Status: source outline exists; not yet compiled against the actual Android host app or SDKs.

### M4 — Store distribution architecture
- Documented a shared source tree with separate Bazaar and Myket Gradle flavors/source sets as a candidate architecture.
- Added a provider factory outline and flavor build guide.
- Status: example only; must be reconciled with the host app Gradle version, package identity, signing, and each store's publication requirements.

### M5 — Server services
- Added initial order creation and entitlement lookup service modules.
- Added a verifier registry boundary for distinct Bazaar and Myket trusted verifiers.
- Status: not yet wired to deployed Cloudflare Worker routes or production authentication.

## Not completed / release blockers
- Confirm exact host Android app structure, Gradle plugin, Kotlin version, min/target SDK, and applicationId.
- Confirm current official Bazaar and Myket SDK coordinates and pin versions.
- Implement actual Bazaar and Myket SDK adapters.
- Implement store-specific server-side receipt/token verification using current official APIs.
- Bind verified app user identity to order creation and verification endpoints.
- Complete D1 migration and test atomic/idempotent settlement under concurrent requests.
- Handle refund, revocation, cancellation, pending purchases, and restore/recovery according to each store.
- Build both distribution artifacts and test on devices/accounts from both stores.
- Verify policy compatibility for one product/package distributed in both stores.

## Change log
- Initial independent subscription work recorded on branch `feature/sahmino-subscriptions-independent`.
