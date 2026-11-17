# Sahmino marketplace receipt integration — 2026-11-17

Branch: feat/sahmino-store-receipt-verification-20261117

## Implemented in this branch

### Server
- Myket receipt verification: verifies the exact originalJson bytes against the configured RSA public key using RSASSA-PKCS1-v1_5/SHA-1, then checks package name, configured SKU, purchased state, and the server-created order ID in developer payload.
- CafeBazaar receipt verification: refreshes an OAuth access token on the server, calls the CafeBazaar Developer API purchase-validation endpoint, and checks the returned purchase state and developer payload against the server order.
- Both adapters derive plan and amount only from the server order/catalogue. Client prices, account IDs, and entitlement flags are not accepted.
- Provider transaction/event identifiers are SHA-256 digests; raw purchase tokens are not stored as event keys.
- Added POST /api/v1/me/prepaid-receipts. It requires exact Origin, active HttpOnly OTP session cookie, CSRF header, both feature flags, and an order owned by the authenticated D1 user.
- The receipt is verified before the D1 batch commits the order, unique provider event and prepaid entitlement.
- Exact retry of an already committed receipt is idempotent, allowing a lost HTTP response to be recovered without granting the same purchase twice.
- The endpoint is POST-only and rejects bearer-only pilot tokens.
- Added synthetic RSA and mocked CafeBazaar OAuth/validation tests, route privacy/feature-gate tests, and CI invocation.

### Android
- Added a shared native HTTP client for server-created orders and receipt submission. It refuses non-HTTPS API origins, missing session cookies, malformed order IDs, and oversized bodies.
- Myket: the purchase payload is now the server order ID, not a device-local random value. The UI creates/reuses the authenticated server order, launches Myket purchase, submits originalJson/signature, and consumes the Myket item only after server settlement. Existing owned purchases are re-submitted for safe reconciliation.
- CafeBazaar: added a Poolakey bridge using the official one-time product flow, server order ID as developer payload, purchase-token submission to the Worker, and consume only after server settlement. Owned products are re-submitted during inventory recovery.
- Both flavors use per-flavor SKU configuration and enable the buy action only after the store reports a matching price and an API base URL is configured.

## Required runtime configuration

Do not copy secrets into Git, issues, or chat.

Gradle properties for the Android build:
- SAHMINO_API_BASE_URL — HTTPS origin of the deployed Worker API, with no path or trailing slash.
- SAHMINO_PWA_ORIGIN — exact browser origin configured as PWA_ORIGIN in the Worker.
- MYKET_IAB_PUBLIC_KEY and BAZAAR_IAB_PUBLIC_KEY — public keys for the matching store app where local SDK verification is enabled.
- Each store's five SKU properties must match the exact product IDs configured in its publisher console. The current defaults are placeholders, not verified store products.

Worker variables:
- MYKET_SKU_30D, MYKET_SKU_60D, MYKET_SKU_90D, MYKET_SKU_180D, MYKET_SKU_365D.
- BAZAAR_SKU_30D, BAZAAR_SKU_60D, BAZAAR_SKU_90D, BAZAAR_SKU_180D, BAZAAR_SKU_365D.

Worker secrets:
- MYKET_IAB_PUBLIC_KEY — RSA public key for the exact Sahmino Myket app.
- BAZAAR_CLIENT_ID, BAZAAR_CLIENT_SECRET, BAZAAR_REFRESH_TOKEN — publisher-authorized CafeBazaar Developer API credentials.

Existing private bindings still required:
- SAHAMBAN_DB with base schema, OTP migrations, and the Sahmino subscription v2 migration applied.
- SAHMINO_OTP_VERIFIER_SECRET, SAHMINO_OTP_RATE_LIMIT_SECRET, and the private SAHMINO_SMS_PROVIDER service binding.
- Exact PWA_ORIGIN.

The SAHMINO_OTP_ENABLED and PREPAID_ORDERS_ENABLED flags must remain false until deployment and end-to-end tests are accepted. The example Wrangler file deliberately sets them false.

## Remaining blockers

1. No Worker deployment or real D1 migration has been performed. The example Wrangler file intentionally contains a fake D1 ID.
2. No publisher console was accessible. Product IDs, public keys, package registration, SKU prices, merchant/API permissions, and test-account access remain unverified.
3. No Android Gradle build has yet been run against the new client and Poolakey bridge. The build must prove both bazaarDebug and myketDebug compile and package the correct isolated SDK.
4. The current PWA origin is GitHub Pages. A Worker on workers.dev is a different site; its HttpOnly session cookie may be blocked in Android WebView/browser third-party-cookie contexts. The native client reads the API-host cookie from CookieManager and fails closed if it is absent. Do not globally enable third-party cookies as a workaround. A same-site custom PWA/API domain or a reviewed native session-exchange design is required for reliable commercial login and payment.
5. The Myket verifier checks the signed purchase record, but a verified Myket refund/revoke notification or reconciliation feed has not been integrated. Refund handling must be confirmed with the provider before claiming lifecycle completeness.
6. The CafeBazaar Developer API endpoint follows published integration examples. Confirm its current response contract and app permissions against the current publisher documentation and complete the official test/live flow before production.
7. The server checks the configured SKU and trusted order amount; it cannot independently infer the price charged from the purchase-validation response. The owner must verify each SKU's exact displayed price and currency in both publisher consoles before enabling purchases.

## Acceptance tests still required

- Build both bazaarDebug and myketDebug and verify that each package contains only its intended billing SDK.
- In each store's test environment: connect, load actual SKU price, buy all five plans, cancel, fail, retry, and restore.
- Verify wrong package/SKU/state/payload, another user's order, changed signature, replay, duplicate provider token, and mismatched plan are denied.
- Verify D1 atomic rollback at every settlement stage and retry after a lost response cannot double-grant.
- Confirm CafeBazaar and Myket consumption occurs only after Worker settlement and can be retried after a lost response.
- Test expiry, refund/revoke, account recovery, app reinstall, device change, and session persistence on supported Android WebViews.
- Confirm premium server resources enforce access from D1, not a local UI flag.

**Release decision: NOT READY FOR LIVE PAYMENTS.** The backend and Android receipt/order paths are now coded behind closed feature flags, but no deployed Worker, real credentials, Android build, publisher-console verification, or store sandbox acceptance has been proven.
