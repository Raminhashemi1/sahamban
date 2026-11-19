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

The current Worker still validates the private-pilot HMAC JWT. This is not a commercial login/session implementation. The host app's production identity provider must be integrated before enabling live payments.


## Integration review status

The implementation is available as supplemental draft PR [#188](https://github.com/Raminhashemi1/sahamban/pull/188), based on the existing PR #187 head branch. It is intentionally not merged. Review and merge PR #188 into the PR #187 branch first, then review the combined change as the single canonical Billing V2 implementation.
## 2026-11-19 — account-session integration audit

This is a source audit only; it does not enable checkout or change runtime behavior.

### Confirmed repository state

- The existing PWA account panel and OTP implementation currently live on draft PR #185 (feat/android-subscription-preview-20261115), not on main or this Billing V2 branch.
- That OTP flow authenticates with the HttpOnly sahmino_session cookie and stores only a SHA-256 digest in sahmino_shared_sessions.
- OTP-created rows in sahamban_users currently have auth_subject = NULL.
- This Billing V2 Worker currently accepts only the private-pilot HMAC Bearer token. Its order and settlement queries resolve the account through sahamban_users.auth_subject.
- The Android MainActivity is still a WebView test shell. It does not instantiate BillingV2ApiClient, BillingV2PurchaseFlow, or BillingV2SubscriptionView, and it has no production session-token provider.

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
