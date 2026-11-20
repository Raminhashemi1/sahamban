# Dual-store Billing V2 integration

This branch consolidates the existing Billing V2 backend with a second store adapter. It does not deploy anything.

## One ledger, store-specific provider

- `BILLING_STORE=BAZAAR` selects Bazaar for that Worker deployment.
- `BILLING_STORE=MYKET` selects Myket for that Worker deployment.
- The client cannot choose or override the store.
- Both deployments use the same `billing_orders`, `billing_access`, and `billing_events` tables and therefore the same account entitlement.
- Orders created for Myket persist `store='MYKET'` and the server-resolved `store_product_id`.
- Bazaar keeps its existing verification path and schema fields for compatibility.

## Myket Worker configuration

Required non-secret configuration:
- `BILLING_STORE=MYKET`
- `MYKET_PACKAGE_NAME=<exact Android applicationId>`
- `MYKET_SKU_MAP=<JSON object containing all five plan IDs and exact product IDs from Myket developer panel>`

Required secret:
- `MYKET_PUBLIC_KEY=<Base64 X.509 SubjectPublicKeyInfo RSA public key from Myket>`

Do not use sample SKU IDs or a pilot package name in production. The Worker fails closed when the map or public key is missing.

## Current Myket verification boundary

The Myket adapter verifies the RSA-SHA1 signature of the original purchase JSON, exact package name, persisted product SKU, purchase state, and developer payload/order binding. It hashes the purchase token and settles into the existing shared entitlement ledger idempotently.

A live Myket refund/revocation API lookup has not been implemented. Signature verification alone does not prove that a purchase has not subsequently been refunded. Keep public checkout disabled until the authoritative Myket refund/ownership reconciliation contract is confirmed and implemented, or an approved operational reconciliation process is defined.

## Migration

- Fresh isolated databases: apply `schema.sql`.
- Existing databases created from the earlier Bazaar-only schema: apply `migrations/0002-myket-store-columns.sql` exactly once.
- Never run both paths on the same database.
- No production D1 migration was run by this branch.

## Authentication

The PR #189 branch adds cookie-authenticated OTP session resolution: the Worker validates the HttpOnly `sahmino_session` cookie against the shared D1 session repository, then resolves the active internal user ID server-side. The legacy private-pilot HMAC JWT remains for isolated tests. However, the OTP request/verify/logout routes and PWA account UI are still a separate unmerged PR #185 dependency; no production SMS binding, secrets, Worker deployment, or physical-device session acceptance has been completed.


## Integration review status

The implementation is available as supplemental draft PR [#188](https://github.com/Raminhashemi1/sahamban/pull/188), based on the existing PR #187 head branch. It is intentionally not merged. Review and merge PR #188 into the PR #187 branch first, then review the combined change as the single canonical Billing V2 implementation.
## 2026-11-19 — account-session integration audit

This is a source audit only; it does not enable checkout or change runtime behavior.

### Confirmed repository state

- The existing PWA account panel and OTP implementation currently live on draft PR #185 (feat/android-subscription-preview-20261115), not on main or this Billing V2 branch.
- That OTP flow authenticates with the HttpOnly sahmino_session cookie and stores only a SHA-256 digest in sahmino_shared_sessions.
- OTP-created rows in sahamban_users currently have auth_subject = NULL.
- This Billing V2 Worker currently accepts only the private-pilot HMAC Bearer token. Its order and settlement queries resolve the account through sahamban_users.auth_subject.
- The Android MainActivity is a test-only WebView shell, but it does expose the subscription entry point and instantiates `BillingV2SubscriptionHost`. When package/SKU settings pass, the host composes `BillingV2CookieSessionProvider`, `BillingV2ApiClient`, the store coordinator, `BillingV2PurchaseFlow`, and `BillingV2SubscriptionView`. The app remains a pilot shell, not the confirmed final commercial Android package.

### Required integration before connecting the purchase screen

1. Bring the approved OTP account/session routes and their D1 schema into the canonical Worker without replacing the existing PWA account UI.
2. Add a server-validated bridge from the HttpOnly OTP session to Billing V2 identity. Resolve the active D1 session to its internal user_id server-side; never accept a user ID from the client and never expose a session bearer or billing token to WebView JavaScript.
3. Make order creation, purchase verification, settlement, entitlement refresh, and account switching consistently use that authenticated internal user identity. Preserve the pilot JWT path only for isolated tests until it can be retired safely.
4. Wire the existing native five-plan view to the store-specific Billing V2 flow only after the authenticated session provider and exact Worker origin are configured.
5. Keep checkout disabled until real SMS sandbox delivery, isolated D1 migration, package/SKU/public-key mapping, and physical-device account-isolation tests pass.

### No duplicate work / safety boundary

- Do not rebuild the five-plan UI, store SDK adapters, receipt verifiers, or shared settlement ledger; those already exist on this branch.
- Do not treat PR #185 OTP implementation as production-ready: its SMS provider binding, deployed Worker origin, D1 migration, and physical WebView cookie acceptance remain unverified.
- Do not merge the draft PRs, deploy, migrate production D1, or enable BILLING_V2_ENABLED as part of this audit.
## 2026-11-19 — OTP session bridge implementation

Draft PR #189 adds cookie-authenticated identity support to the existing Billing V2 routes.

- The Worker recognizes the HttpOnly sahmino_session cookie only when SAHMINO_OTP_ENABLED=true, validates it against the shared D1 session repository, and resolves the internal active user_id server-side.
- Cookie-authenticated POST requests require the exact configured PWA Origin and X-Sahmino-CSRF: 1. Credentialed CORS is explicit. Duplicate, malformed, expired, revoked, or disabled OTP cookies fail closed and cannot fall back to a pilot JWT.
- Order creation, Bazaar/Myket receipt ownership checks, settlement, and entitlement lookup accept the trusted internal user_id. Legacy HMAC pilot authentication remains for isolated tests only.
- The branch includes the OTP session repository, core/service dependencies, and additive D1 schema files needed by the session lookup.
- CI now runs the Billing V2 suites, OTP session/service tests, and OTP migration tests; the latest run on PR #189 completed successfully.

### Remaining release dependencies

- PR #185 still contains the OTP request/verify/logout routes and PWA account panel; it remains a separate draft dependency and has not been merged.
- No SMS provider binding or production secrets are configured, and no D1 migration or Worker deployment has been performed.
- The Android pilot source now wires `MainActivity` → `BillingV2SubscriptionHost` → `BillingV2PurchaseFlow` and includes a native Worker-cookie session provider. This corrects the earlier source-audit wording that said the flow was not wired at all. End-to-end operation is still blocked by the unmerged PR #185 OTP route/PWA dependency, missing production Worker/SMS/store configuration, temporary package ID and missing SKU values; the billing build gate remains false. Physical-device cookie persistence, logout/revocation, account switching, and sandbox purchase/restore tests are outstanding.
- Physical Android/WebView cookie persistence, account switching/revocation, and real store sandbox purchase/restore tests remain mandatory before enabling checkout.
- Keep SAHMINO_OTP_ENABLED and BILLING_V2_ENABLED off until those release gates pass.


## 2026-11-20 — corrected Android host wiring status

A fresh inspection of the current PR #189 source confirms:

- `MainActivity.showWebApp()` adds the subscription entry point.
- `MainActivity.showSubscription()` instantiates `BillingV2SubscriptionHost` and displays its view.
- The host composes the native cookie-session provider, Billing V2 API client, store-specific coordinator, purchase flow, and five-plan UI if the exact package and five SKU values pass validation.
- This is a real source-level host wiring path in the pilot app, but not an enabled or accepted commercial checkout path.
- `SAHAMBAN_BILLING_ENABLED` remains hard-coded false in both build types. The app ID is still `ir.sahamban.pilot`; product SKU values, production Worker origin, OTP route deployment/SMS secrets, and real store credentials are not configured.
- PR #189 backend validation passed on commit `5834d9ca8f1ce44cb580ef3b071a3790684b6a1a` ([run 44607013630](https://github.com/Raminhashemi1/sahamban/actions/runs/44607013630)). This does not prove current Android APK compilation, device acceptance, or a live purchase.
- PR #185 remains a separate unmerged dependency for OTP routes and PWA account UI. No production deployment, migration, checkout activation, or release signing was performed.
