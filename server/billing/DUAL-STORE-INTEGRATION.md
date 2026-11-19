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
