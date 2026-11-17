# Sahmino marketplace receipt backend — engineering change log

Branch: `feat/sahmino-store-receipt-verification-20261117`

## Implemented in this branch

- Added `marketplace-receipt-verifier.mjs`.
  - Myket: verifies the exact `originalJson` bytes against the configured RSA public key using RSASSA-PKCS1-v1_5/SHA-1 (the Myket Billing v2 receipt-signature scheme), then checks package name, configured SKU, purchased state, and the server-created order ID in developer payload.
  - CafeBazaar: refreshes an OAuth access token on the server and calls the CafeBazaar Developer API purchase-validation endpoint using the configured package, server SKU and client-supplied purchase token. It checks the returned purchase state and developer payload against the server order.
  - Both adapters derive plan and amount only from the server order/catalogue. Client prices, account IDs, and entitlement flags are not accepted.
  - Provider transaction/event identifiers are SHA-256 digests, so raw purchase tokens are not persisted as event keys.
  - Missing credentials, keys, or any SKU configuration fail closed. Placeholder SKUs are explicitly rejected.
- Added `POST /api/v1/me/prepaid-receipts` to the Worker.
  - Requires exact configured Origin, an active HttpOnly OTP session cookie, CSRF header, both feature flags, and an order owned by that authenticated D1 user.
  - Verifies the provider receipt before calling the existing D1 batch settlement primitive.
  - Returns success only after the order, unique provider event, and prepaid entitlement are committed.
  - The endpoint is POST-only and rejects bearer-only pilot tokens.
- Added synthetic RSA and mocked CafeBazaar OAuth/validation tests, plus route privacy/feature-gate tests.
- Added the receipt adapter tests to the Worker CI workflow.
- Added explicit fail-closed config placeholders to `wrangler.toml.example`.

## Required runtime configuration

Do not copy secrets into Git, issues, or chat.

Public/non-secret Worker variables (set only after the exact product IDs have been confirmed in each publisher console):
- `MYKET_SKU_30D`, `MYKET_SKU_60D`, `MYKET_SKU_90D`, `MYKET_SKU_180D`, `MYKET_SKU_365D`
- `BAZAAR_SKU_30D`, `BAZAAR_SKU_60D`, `BAZAAR_SKU_90D`, `BAZAAR_SKU_180D`, `BAZAAR_SKU_365D`

Worker secrets:
- `MYKET_IAB_PUBLIC_KEY` — RSA public key for the exact Sahmino Myket app.
- `BAZAAR_CLIENT_ID`, `BAZAAR_CLIENT_SECRET`, `BAZAAR_REFRESH_TOKEN` — publisher-authorized CafeBazaar Developer API credentials.

Existing private bindings still required:
- `SAHAMBAN_DB` with `d1-schema.sql`, OTP migrations, and `d1-sahmino-subscription-v2.sql) applied.
- `SAHMINO_OTP_VERIFIER_SECRET`, `SAHMINO_OTP_RATE_LIMIT_SECRET), `SAHMINO_SMS_PROVIDER).
- Exact `PWA_ORIGIN).

The two flags `SAHMINO_OTP_ENABLED` and `PREPAID_ORDERS_ENABLED` must remain false until the actual deployment and end-to-end tests are accepted. The example file deliberately sets them false.

## Important limitations / remaining blockers

This branch is a backend implementation, not a live payment launch:
1. No Worker deployment or real D1 migration has been performed. The example Wrangler file intentionally contains a fake D1 ID.
2. No publisher console was accessible. Product IDs, public key, package registration, and merchant/API permissions remain unverified.
3. Android still needs to create a server order first, use that exact order ID as the Myket/Bazaar developer payload, submit the resulting receipt/token to this endpoint, and consume the CafeBazaar consumable only after server settlement. This client integration is not yet complete in this branch.
4. The PWA origin is GitHub Pages while the Worker will be on a different site unless the owner provisions a same-site API hostname. The OTP session cookie may be blocked in Android WebView/browser third-party-cookie contexts. Do not enable global third-party cookies as a workaround. A same-site custom API domain or a reviewed native session-exchange design is a prerequisite for a dependable commercial login/payment flow.
5. The Myket verifier validates the signed purchase record but the current branch does not yet implement a confirmed Myket refund/revoke notification or reconciliation feed. Refund handling must be added from the provider's verified contract before claiming lifetime integrity.
6. The CafeBazaar Developer API endpoint is implemented according to the published API integration examples. Before production, confirm its current endpoint/response contract and app permissions against the publisher's current developer documentation and run the official sandbox/live test flow.

## Acceptance tests still required

- Build both `bazaarDebug` and `myketDebug) and verify that the correct SDK is packaged in each flavor.
- In each store's test environment: connect, load actual SKU price, buy all five plans, cancel, fail, retry, and restore.
- Submit a receipt to the Worker and verify wrong package/SKU/state/payload, another user's order, changed signature, replay, duplicate provider token, and mismatched plan are denied.
- Verify D1 atomic rollback at every settlement stage; confirm a network retry after store success cannot double-grant.
- Confirm CafeBazaar consumption occurs only after Worker settlement and can be retried safely after a lost response.
- Test expiry, refund/revoke, account recovery, app reinstall, device change, and session persistence on real supported Android WebViews.
- Confirm the final entitlement endpoint and premium server resources enforce access from D1, not a local UI flag.

**Release decision: NOT READY FOR LIVE PAYMENTS.** The server receipt-validation path is now coded behind closed feature flags, but no live credentials, deployed Worker, Android client flow, or store sandbox acceptance has been proven.
