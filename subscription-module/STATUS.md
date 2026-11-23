# Sahmino subscription module — current status

## Scope
Independent, embeddable five-plan subscription purchase module. No legacy subscription code is imported or reused.

## Product rules
- All prices are IRR (ریال).
- 30 days: `SAHAMBAN_PRO_30D` — 1,500,000
- 60 days: `SAHAMBAN_PRO_60D` — 2,850,000
- 90 days: `SAHAMBAN_PRO_90D` — 4,050,000
- 180 days: `SAHAMBAN_PRO_180D` — 7,650,000
- 365 days: `SAHAMBAN_PRO_365D` — 14,600,000
- These are manually renewed, fixed-duration, one-time consumable store purchases. They are not auto-renewing subscriptions.
- The entitlement ledger is shared; store transaction verification and Android SDK adapters are separate per store.

## Implemented

### PWA
- `pwa/subscription-plans.js`: embeddable RTL five-plan selector.
- `pwa/subscription-plans.css`: selector styles.
- `pwa/native-billing-client.js`: promise-based client for the native WebMessage bridge.

### Android
- `android/src/main/kotlin/ir/sahmino/subscription/StoreBillingProvider.kt`: provider-neutral interface and purchase data types.
- `android/src/main/kotlin/ir/sahmino/subscription/SubscriptionPurchaseCoordinator.kt`: create order → purchase → server verify → settle → consume; includes restore/retry.
- `android/src/main/kotlin/ir/sahmino/subscription/HttpBillingBackendClient.kt`: authenticated Worker API client.
- `android/src/main/kotlin/ir/sahmino/subscription/SahminoBillingWebBridge.kt`: exact-origin AndroidX WebMessageListener bridge.
- `android/src/bazaar/kotlin/...`: concrete Poolakey 2.3.0 adapter and flavor factory.
- `android/src/myket/kotlin/...`: concrete Myket Billing Client 2.2 adapter and flavor factory.
- `android/build.gradle.kts`: standalone Android library with Bazaar and Myket product flavors.
- Both Android release flavors compiled successfully on the latest source cleanup in GitHub Actions run [44528592255](https://github.com/Raminhashemi1/sahamban/actions/runs/44528592255). The workflow uploaded AAR artifact `sahmino-billing-android-aar` (artifact ID `14531992190`).
- Toolchain is AGP 8.12.3, Kotlin 2.2.0, Gradle 8.13, Java 17, compileSdk 36, minSdk 26. This upgrade is required by the Kotlin metadata version of the official Myket 2.2 SDK.

### Backend / Worker
- `core/domain.mjs` and `PLAN_CATALOG.json`: canonical plan catalog and fixed-duration renewal rules.
- `server/schema.sql`: independent Billing V2 D1 schema.
- `server/order-service.mjs`: server-owned plan price and store SKU mapping.
- `server/entitlement-service.mjs`: entitlement lookup.
- `server/settlement-service.mjs`: conditional, idempotent D1 settlement batch. The entitlement read is now part of the same atomic batch; entitlement mutation is gated by the unique verification event.
- `server/providers/bazaar-verifier.mjs`: Bazaar Developer API v2 OAuth refresh and in-app purchase validation.
- `server/providers/myket-verifier.mjs`: server-side RSA verification of signed Myket IAB purchase data.
- `worker/routes.mjs`: authenticated order, entitlement and provider-specific verify routes.
- `worker/create-billing-worker.mjs`: deployment factory; store is fixed by server-side `BILLING_STORE`, never by a client field.
- Worker request parsing is byte-bounded while streaming, requires JSON content type, rejects query parameters, and validates an exact HTTPS origin.
- Two store deployments can share the same D1 database and entitlement ledger.

### Provider handling
- Bazaar: verifies purchase state, developer payload/order binding and consumption state through Developer API v2. A newly settled item is consumed only after the backend returns PAID.
- Myket: verifies the signed original purchase JSON, app package, product SKU, purchase state and signed developer payload. A live Myket Developer API refund/revocation lookup is not implemented because an authoritative endpoint contract was not established from the reviewed official SDK sample.
- Raw purchase tokens are not persisted; only SHA-256 hashes are stored.
- Each enabled store deployment now requires an explicit five-entry server-side SKU map with unique non-empty product IDs. The Worker also requires the exact package name and all provider verifier configuration at startup. Canonical internal plan IDs are never assumed to be registered marketplace product IDs.

### Recent hardening
- Added automated protocol tests for PWA/native bridge concurrency, error replies, malformed replies and send failures.
- Added Worker route tests for exact-origin configuration, query rejection, JSON content type and streaming body-size enforcement.
- Worker now rejects over-limit bodies before buffering them in full and rejects non-exact origin configuration.
- Native purchase coordinator now distinguishes explicit cancellation from payment failure.

## Automated validation
- Node tests cover domain rules, order creation, provider verifiers, Worker routes and configuration factory.
- SQLite tests execute the exact settlement SQL extracted from the service and cover successful grant, replay protection (including two stale pre-reads), early renewal and transaction rollback. They also execute the entitlement read inside the same transaction.
- GitHub Actions run [44527042694](https://github.com/Raminhashemi1/sahamban/actions/runs/44527042694): both Android release flavors compiled successfully.
- Latest Node and SQLite tests passed in GitHub Actions run [44544169979](https://github.com/Raminhashemi1/sahamban/actions/runs/44544169979), including atomic settlement response handling, stale concurrent settlement attempts, native-bridge protocol and Worker hardening tests. See [all workflow runs](https://github.com/Raminhashemi1/sahamban/actions).

## Remaining host integration / release gates
1. Connect the production app's real commercial session token provider to `HttpBillingBackendClient` and the Worker's `authenticateRequest`. The supplied dossier documents only a pilot token; it does not define the production auth contract.
2. Set the exact production PWA HTTPS origin and attach `SahminoBillingWebBridge` in the actual production WebView Activity.
3. Deploy the Worker factory separately with `BILLING_STORE=BAZAAR` and `BILLING_STORE=MYKET`, using the matching secrets and server-side SKU map for each.
4. Apply and verify `server/schema.sql` against the actual production D1 database; no live migration has been run.
5. Configure the actual app package name and app-specific Myket public key; configure Bazaar Developer API credentials. No credentials are in GitHub.
6. Run real purchases, interruption/recovery, consume, refund/revocation and renewal tests on physical devices using both store test accounts.

## Existing billing work in the repository
- The repository already has draft Billing V2 work, including PR [#187](https://github.com/Raminhashemi1/sahamban/pull/187) for a Bazaar-focused implementation integrated with the pilot Android wrapper, plus earlier UI/catalogue drafts (#185 and #186).
- This module has overlapping API route paths and D1 table names but a different schema and authentication contract. It must not be merged/deployed alongside those backends unchanged. See [INTEGRATION_RECONCILIATION.md](./INTEGRATION_RECONCILIATION.md) for the concrete collision and recommended consolidation path.

## GitHub
- All work is on `feature/sahmino-subscriptions-independent`.
- The default branch has not been changed.
- No production secrets or live infrastructure have been modified.


## Settlement engine review — 2026-11-19

Reviewed the independent module on `feature/sahmino-subscriptions-independent` at the branch head used by CI commit `754b0f0a4964ba05994287c19e69b9a0449ff6a3`.

### Confirmed implementation
- Settlement validates the authenticated order owner, provider, product, amount, plan, and normalized verified evidence before attempting writes.
- The `CREATED -> PAID` transition is conditional and is performed in a single D1 `batch()` with the verification event and entitlement upsert.
- The verification event and entitlement grant are linked by an event gate; schema uniqueness constraints protect order verification, store order IDs, and purchase-token hashes.
- Entitlement expiry is extended from the later of the existing expiry and settlement time, with fixed plan-day durations.
- The settlement response reads the entitlement within the same batch.

### Validation evidence
- GitHub Actions run [44544169979](https://github.com/Raminhashemi1/sahamban/actions/runs/44544169979) checked out commit `754b0f0a4964ba05994287c19e69b9a0449ff6a3`.
- All 46 Node.js tests passed.
- All 5 SQLite settlement contract tests passed, including stale-pre-read replay protection and rollback on duplicate store token.

### Important limits / next work
- SQLite contract tests execute the SQL extracted from the production service, but they are not a live Cloudflare D1 test. The stale-pre-read test models two callers that both read `CREATED`, then executes their batches sequentially; it does not create two concurrent D1 requests.
- No live D1 binding or production migration has been exercised. D1 atomic-batch behavior and result metadata still require validation in a controlled D1 test database.
- Reversal/refund handling is not implemented as a complete entitlement-reconciliation flow. Do not mark a reversed order and leave the aggregate entitlement unchanged.
- Next settlement work: add a provider-neutral, idempotent reversal ledger and deterministic entitlement recomputation, with tests for out-of-order reversals, repeated reversal notifications, multiple purchases, and rollback. Provider-specific reversal authenticity must remain blocked until each store's authoritative contract is established.
- Production D1 validation requires a dedicated test database and credentials; no live database or production configuration was changed during this review.


## Verified reversal engine — 2026-11-19

### Implemented on the independent branch
- Added `server/reversal-service.mjs` as an internal-only primitive. It accepts only normalized evidence marked verified by a trusted server-side provider adapter; no public HTTP route or client-triggered refund route is exposed.
- Reversal is bound to the authenticated owner, persisted store, store transaction ID, and persisted purchase-token hash.
- One D1 atomic batch conditionally changes `PAID -> REVERSED`, appends an immutable `PURCHASE_REVERSED` event, removes the previous aggregate entitlement, deterministically rebuilds entitlement from all remaining `PAID` orders, and reads the result.
- Entitlement rebuild orders remaining paid purchases by server-set `paid_at` then order ID, extending each fixed plan duration from the later of the previous expiry and that purchase's paid time.
- Repeated notification for the same provider event is idempotent. A second/different reversal for an already reversed order is rejected.
- Added unique constraints for one reversal per order and one application of a provider event ID. Raw receipt/token values remain excluded; hashes only.

### Validation
- GitHub Actions run [44601381376](https://github.com/Raminhashemi1/sahamban/actions/runs/44601381376) passed on commit `6fdc001e628cba6a9f22fa56f003b757ecedd70f`.
- 51 Node.js tests passed.
- 10 SQLite contract tests passed, including reversal of the only purchase, rebuilding after reversing an earlier purchase, out-of-order reversal, duplicate provider-event rejection, and rollback.
- These are CI tests against SQLite and mocked D1 interfaces, not a live Cloudflare D1 validation.

### Deliberate release gate
- Bazaar/Myket authoritative refund or revocation notification contracts have not yet been established and tested. Therefore the reversal primitive is not wired to a Worker route or marketplace webhook, and refund/revocation integration is NOT complete.
- Do not deploy or expose this primitive until each provider adapter authenticates the official event source and normalizes its transaction ID, provider event ID, purchase token hash, and payload hash.
- The schema change adding `provider_event_id` is part of the independent schema. It has not been applied to any live D1 database.


### Final hardening follow-up
- Reversal idempotency now requires both the namespaced provider event ID and the exact normalized payload hash to match a previously applied event. Reusing an event ID with different content is rejected.
- Added a regression test for a provider event ID replayed with a different payload hash.
- GitHub Actions run [44601709782](https://github.com/Raminhashemi1/sahamban/actions/runs/44601709782) passed on commit `e0c7f185cc35bfa63c8f42d793b3d2ed6acd8bcc`: 52 Node.js tests and 10 SQLite contract tests passed.


## Branch audit — 2026-11-22

- Audited the current branch head `15f5e07d304ad7d6a6f932cef40fb7687e25939c`; the branch contains the independent module and the latest change before this audit only updated this status record.
- Confirmed GitHub Actions run [44601792293](https://github.com/Raminhashemi1/sahamban/actions/runs/44601792293) passed on the current branch head: 52 Node.js tests and 10 SQLite contract tests.
- Re-read the settlement/reversal services, D1 schema, unit tests, and SQLite contract tests. No production D1 migration or live provider call is evidenced by these tests.
- The stale-pre-read replay test remains sequential SQLite execution, not concurrent Cloudflare D1 requests. A controlled D1 integration test is still a release gate.
- The internal reversal primitive remains intentionally unwired: authoritative Bazaar/Myket refund or revocation event contracts are not yet verified.
- Next engineering step: add and run a controlled Cloudflare D1 integration/concurrency suite against a dedicated non-production database before claiming live D1 settlement validation. No production credentials or infrastructure were changed.


## Independent branch verification — 2026-11-23

### Repository and branch
- Rechecked the public repository and confirmed this module is present on `feature/sahmino-subscriptions-independent`.
- Branch head at audit start: `6a9e9f01e9b65aa3b35e9b3a5a354dfb3ca59523`.
- No changes were made to `main`, legacy billing files, or existing Billing V2 draft branches.

### Current automated evidence
- GitHub Actions run [44993498359](https://github.com/Raminhashemi1/sahamban/actions/runs/44993498359) passed on the current branch head: 52 Node.js tests and 10 SQLite contract tests.
- Android release-flavor workflow [44528592255](https://github.com/Raminhashemi1/sahamban/actions/runs/44528592255) passed for both Bazaar and Myket AAR compilation. Artifact [sahmino-billing-android-aar](https://github.com/Raminhashemi1/sahamban/actions/runs/44528592255) (artifact ID `14531992190`) remains available.
- The latest domain workflow tests the exact SQL extracted from the settlement/reversal services against SQLite. It does not bind to Cloudflare D1.

### Settlement concurrency assessment
- Re-reviewed the current settlement SQL, schema uniqueness constraints, result checks, and tests.
- The `CREATED -> PAID` conditional update remains the one-shot gate. The verification-event insert and entitlement upsert are dependent on that update/event in the same batch. A failed statement must abort the batch; this is consistent with Cloudflare's documented D1 batch transaction semantics.
- Cloudflare documents that each D1 database processes queries serially and that batch statements execute sequentially, non-concurrently. This supports the conditional-write design against overlapping requests, but it is not a substitute for a controlled test against an actual D1 binding.
- The existing SQLite stale-pre-read test is sequential simulation, not a concurrent Worker-to-D1 integration test. No claim of live D1 concurrency validation is made.

### Release blockers — require owner-provided production configuration/access
1. Dedicated non-production Cloudflare D1 database and permission to apply/test the module schema there.
2. The production commercial-session authentication contract and trusted Worker integration point. The independent Worker intentionally requires an injected authenticator; its route/table names collide with the separate Billing V2 draft and must not be deployed in parallel unchanged.
3. Exact production Android applicationId, exact PWA HTTPS origin, and confirmation of the host Android build/signing setup.
4. Actual Bazaar Developer API credentials and the five Bazaar product IDs from the developer console.
5. Actual Myket app public key and the five Myket product IDs from the developer console.
6. Physical-device test access/accounts for both stores, including interruption, retry, consume, refund/revocation, and renewal scenarios.

### Provider and reversal boundary
- Bazaar verifier uses the documented Developer API v2 refresh-token and in-app validation flow. It must still be exercised with the real application and developer credentials.
- Myket verification currently validates the signed IAB purchase JSON against the app-specific RSA public key and exact package/SKU/developer payload. It is not a live ownership/refund status lookup.
- The internal reversal primitive and its SQLite tests exist, but no provider-authenticated refund/revocation adapter or public reversal route is enabled. Do not expose it until the official event/API contract is validated for each store.
- No live migration, production Worker deployment, production secret change, store payment, or release artifact for the host app was performed during this audit.

### Next safe action
- Continue with controlled D1 integration once the dedicated test database and access are supplied. Then consolidate the module into the canonical host Worker/account identity and shared D1 ledger before enabling checkout. Keep the release feature gate disabled until both store test matrices pass on physical devices.


## Settlement hardening — 2026-11-23

### Changes
- Settlement now revalidates the persisted order amount against the canonical plan catalogue at the point of settlement. A row with a stale or inconsistent amount cannot be settled even if the provider evidence matches that row.
- Provider transaction/order references are length-bounded before they are written to the ledger.
- Settlement order references and authenticated user identifiers are bounded before database access.
- Added regression tests for catalogue drift, oversized provider transaction identifiers, and malformed order references.

### Validation
- GitHub Actions run [45133240332](https://github.com/Raminhashemi1/sahamban/actions/runs/45133240332) passed on commit `7cc9122c8ab3623dae690f275248f13c0fd1ec5f`.
- Node.js: 55 tests passed, 0 failed.
- SQLite settlement/reversal contract: 10 tests passed, 0 failed.
- These remain automated unit/SQLite contract tests; they do not represent a live Cloudflare D1 database test or store payment.

### Release posture
- Checkout remains disabled until the independent module is reconciled into the canonical host Worker and stable account identity, then validated against a dedicated D1 database and physical store test installations.
- Do not deploy this standalone Worker alongside the existing host Billing V2 routes/schema.


## Worker configuration hardening — 2026-11-23

- Enabled Worker startup now fails closed unless the selected store has all five canonical plan IDs mapped to unique, non-empty marketplace product IDs.
- Bazaar deployments require package name, OAuth client ID, client secret and refresh token before the Worker is created.
- Myket deployments require package name and a syntactically valid Base64 public key before the Worker is created.
- Added regression coverage for missing plans, duplicate SKUs, missing Bazaar credentials and malformed Myket public-key configuration.
- The first intermediate CI run after the Worker change failed because the existing test fixture still configured only one SKU. The fixture was updated to the complete five-plan contract; the subsequent run [45133433457](https://github.com/Raminhashemi1/sahamban/actions/runs/45133433457) passed. This is retained as a record of the corrected test contract, not a remaining failure.


## Reversal input hardening — 2026-11-23

- Applied the same bounded-identifier policy to the internal reversal primitive as settlement: authenticated user IDs are limited to 256 characters, order references to 128 characters, and provider transaction IDs to 256 characters.
- Added regression coverage proving oversized values are rejected before any database access.
- This is input validation only; no provider refund webhook or public reversal route was enabled.
- Local Node.js syntax validation and a focused regression test passed (1/1). The branch workflow result is not yet available.


## API identity-boundary hardening — 2026-11-23

- The Worker now rejects authenticated principal IDs longer than 256 characters before any route reaches D1.
- The verify endpoint rejects order references longer than 128 characters before performing an order lookup.
- The entitlement service independently enforces the same 256-character user-ID bound.
- Added route-level regression tests proving oversized identity/order inputs cause no database access, plus direct entitlement-service tests.
- GitHub Actions validation is pending for these latest commits; no passing result is claimed yet.
