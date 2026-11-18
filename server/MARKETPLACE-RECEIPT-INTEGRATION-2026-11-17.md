# Sahmino marketplace receipt integration — status 2026-11-18

Branch: `feat/sahmino-store-receipt-verification-20261117`

## Implemented in source

### Server
- Myket receipt verifier validates the signed `originalJson` with the configured RSA public key, then checks package name, configured product ID, purchased state, purchase time, and the server-generated order ID in developer payload.
- CafeBazaar verifier refreshes a server-side OAuth token and calls the Developer API purchase validation endpoint; it checks purchased state and the order-bound developer payload.
- The server order and authoritative prepaid plan catalogue determine plan, amount and currency. Client-supplied price or entitlement fields are not accepted.
- Provider transaction/event identifiers are SHA-256 digests; raw purchase tokens are not used as ledger event IDs.
- `POST /api/v1/me/prepaid-receipts` requires exact Origin, authenticated HttpOnly OTP session cookie, CSRF header, feature flags, and an order owned by the authenticated D1 user.
- Receipt verification precedes the D1 settlement batch. The order, unique provider event and prepaid entitlement are committed atomically; an exact settled retry is idempotent.
- Route rejects bearer-only pilot tokens and remains closed while the feature flags are false.

### Android
- Shared native API client creates server orders and submits receipts over HTTPS. It fails closed without the expected authenticated session cookie and CSRF token.
- Myket one-time purchase flow uses the server order ID as developer payload; signed purchase evidence is submitted to the Worker. Consume is called only after server settlement. Owned purchases are resubmitted for recovery.
- CafeBazaar uses Poolakey one-time products with server order ID as developer payload. The purchase token is submitted to the Worker and the item is consumed only after settlement. Owned purchases are resubmitted during inventory recovery.
- Both flavors gate the purchase action on configured API origin and a store-reported price match for the selected plan.
- Manual renewal is the only renewal mode in these flows; no automatic recurring billing is represented as available.

## Correct project phase (2026-11-18)

The project is currently **pre-upload integration debugging**, not publisher-console product setup or public release preparation. Real Bazaar/Myket product IDs are therefore not expected yet. Placeholder SKUs may be used only for source-level and mocked contract tests; they must never be treated as live store products or used to enable real checkout.

Current work should validate the adapters, order/receipt API contracts, signature/provider-verification handling with controlled fixtures, idempotent settlement, entitlement extension, and consume-after-settlement logic. Real store checkout and provider sandbox acceptance require the app to be registered in each store and the store-specific products/test configuration to exist.

Correct order:
1. Finish automated and mocked payment integration tests and fix both flavor/channel flows.
2. Verify server order, receipt verification, settlement, entitlement and failure/retry behavior.
3. Build and inspect debug APKs for internal validation.
4. Only after integration debugging is complete, register/upload the app as required by each publisher console.
5. Create five products separately in each store, then configure the actual IDs, prices and provider credentials.
6. Deploy the Worker/D1 configuration and complete physical-device sandbox acceptance.
7. Prepare signed official release builds and submit for store review/publication.

Do not block steps 1–3 on product IDs that can only be created later in publisher consoles. Keep production payment feature flags disabled throughout pre-upload debugging.

## Verified CI evidence

Latest observed run:
- Run: `44240549816`
- Commit: `f892920d57b52505aa7aac8fa218ef7b41cca5b8`
- Result: **success**
- Passed Java/source tests for URL policy, five-plan catalogue, manual one-time purchase policy, signed Myket evidence extraction, IRR price matching, flavor configuration and marketplace flow contracts.
- Passed embedded dashboard JavaScript syntax check.
- Passed Gradle compile tasks `:app:compileBazaarDebugJavaWithJavac` and `:app:compileMyketDebugJavaWithJavac`.

A later workflow run `44241041761` at commit `41981064297b80a7da3dc0f0bf0218f62d9c2d9b` assembled both internal debug APKs and uploaded the artifact; inspection confirmed store SDK isolation. Neither run deployed a Worker, applied live D1 migrations, or executed either store's sandbox/live purchase flow.

## Required runtime configuration

Android Gradle properties:
- `SAHMINO_API_BASE_URL` — deployed HTTPS Worker origin, no path/trailing slash.
- `SAHMINO_PWA_ORIGIN` — exact browser origin configured in Worker.
- `MYKET_IAB_PUBLIC_KEY`, `BAZAAR_IAB_PUBLIC_KEY`.
- Five exact publisher-console SKU IDs per store via `MYKET_SKU_30D` ... `MYKET_SKU_365D` and `BAZAAR_SKU_30D` ... `BAZAAR_SKU_365D`.

Worker variables:
- `MYKET_SKU_30D`, `MYKET_SKU_60D`, `MYKET_SKU_90D`, `MYKET_SKU_180D`, `MYKET_SKU_365D`.
- `BAZAAR_SKU_30D`, `BAZAAR_SKU_60D`, `BAZAAR_SKU_90D`, `BAZAAR_SKU_180D`, `BAZAAR_SKU_365D`.

Worker secrets:
- `MYKET_IAB_PUBLIC_KEY`.
- `BAZAAR_CLIENT_ID`, `BAZAAR_CLIENT_SECRET`, `BAZAAR_REFRESH_TOKEN`.

Private bindings:
- `SAHAMBAN_DB` with base schema, OTP migrations and Sahmino subscription v2 migration applied.
- `SAHMINO_OTP_VERIFIER_SECRET`, `SAHMINO_OTP_RATE_LIMIT_SECRET`, and private `SAHMINO_SMS_PROVIDER` service binding.
- Exact `PWA_ORIGIN`.

Keep `SAHMINO_OTP_ENABLED` and `PREPAID_ORDERS_ENABLED` false until real deployment and end-to-end acceptance.

## Later-stage prerequisites — not blockers for current pre-upload debugging

1. No Worker deployment or real D1 migration has been performed; the example configuration intentionally has no production database ID.
2. Publisher consoles were not accessible. Exact package registration, five product IDs and displayed IRR prices per store, public keys, CafeBazaar API permission/credentials and test accounts remain unverified.
3. APK assembly and packaged dependency inspection have not been run. The successful CI run only compiled Java variants.
4. Current PWA origin is GitHub Pages, while a `workers.dev` API is cross-site. HttpOnly API session cookie access may fail in supported WebView/browser contexts. Resolve with a same-site custom PWA/API domain or a reviewed native session-exchange design; do not globally enable third-party cookies.
5. Confirm current Myket refund/revoke reconciliation and CafeBazaar refund/void lifecycle APIs with the providers.
6. Confirm current CafeBazaar Developer API response contract, app permission and Myket receipt contract using current publisher documentation and provider test accounts.
7. Server order amount is authoritative, but provider validation responses do not independently prove the charged IRR price. Publisher-console displayed price/currency must be verified for every SKU.
8. No physical-device sandbox purchase, restore, cancellation, failure, refund or reinstall test has been performed.
9. Permanent release signing, store listing assets, privacy/support details and publisher review remain outstanding.

## Acceptance gate

- Build `bazaarDebug` and `myketDebug` APKs and inspect each APK to ensure only its intended billing SDK is packaged.
- In each store's approved test environment, verify all five SKUs and success/cancel/failure/retry/restore paths.
- Deny wrong package, SKU, state, payload, signature, another user's order, replay, duplicate provider token and mismatched plan.
- Test atomic D1 rollback and retry after a lost HTTP response without duplicate entitlement.
- Verify consume only after durable server settlement and recovery after consume/network failure.
- Test expiry, refund/revoke, account recovery, reinstall, device change and session persistence on physical Android devices.
- Confirm premium resources enforce entitlement from D1, not local UI state.

**Current decision: continue pre-upload integration debugging; do not enable live payments.** Both store variants have been compiled and internal debug APKs assembled in CI. Publisher setup, production deployment and physical-device store checkout are later-stage acceptance tasks.
