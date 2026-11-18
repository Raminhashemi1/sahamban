# Sahamban payment and subscription audit

Date: 2026-11-18
Repository: Raminhashemi1/sahamban
Base: main
Working branch: codex/reengineering-audit

## Scope correction

The owner confirmed that the non-payment Sahamban modules have already been tested and accepted. Do not refactor, retest, or modify portfolio, market-data, technical/fundamental analysis, broker import, or other accepted modules. This branch is reserved for payment gateway, checkout, purchase verification, subscription entitlement, renewal/cancellation, refund/reversal, and payment-related UI/API only.

## Findings from the current main branch

### 1. There is no live payment gateway integration

- `server/worker-api.mjs` explicitly reports `paymentsEnabled:false` and `checkoutEnabled:false` on its health route.
- The Worker exposes pending-order and entitlement read paths only. There is no provider checkout, redirect/session creation, callback/webhook verification, or provider reconciliation route.
- `server/prepaid-orders-api.cjs` creates a server-priced pending order, but explicitly returns `checkoutEnabled:false` and `proEnabled:false`.
- `server/prepaid-settlement.cjs` is a settlement primitive that assumes a trusted provider-verification result. It is not a provider adapter and is not wired to a Worker route.
- `server/README.md` correctly documents that the Worker is a prototype, not deployed, and that production identity, D1 migration, provider verification and refund handling are prerequisites.

### 2. Payment channels are not yet aligned

- `server/BANK-PSP-INTEGRATION-PLAN.md` documents a direct Iranian PSP/payment-provider path for website sales and records an owner decision about settlement to the owner's personal bank account. It also states that the PSP, merchant credentials, account settlement details and acceptance are not yet confirmed.
- `server/MARKETPLACE-BILLING-PLAN.md` gives Myket/Cafe Bazaar in-app billing priority, with the website PSP path deferred unless separately approved.
- These are materially different checkout channels. A single implementation must not assume both or silently choose one.

### 3. Android billing implementation is absent from the current tree

- `android-pilot/README.md` describes an install-test-only WebView wrapper and explicitly says there is no checkout, Pro subscription or payment integration.
- `android-pilot/app/build.gradle` has no Poolakey or Myket billing dependency.
- `MainActivity.java` contains only the WebView shell and no billing adapter.
- `tests/sahmino-bazaar-subscription-contract.test.cjs` refers to `android-pilot/app/src/bazaar/...` source files that are not present in the current recursive Git tree. The smoke workflow does not currently invoke this contract test. This test/source mismatch needs resolving before treating Bazaar billing as implemented or tested.

### 4. Existing reusable payment domain logic

- `server/prepaid-plans.cjs`: four fixed prepaid durations (3, 6, 9, 12 months), prices in IRR, UTC calendar-month expiry and provider-qualified receipt replay protection.
- `server/prepaid-orders-api.cjs`: authenticated-subject order creation using server catalog prices.
- `server/prepaid-settlement.cjs`: D1 settlement batch primitive after trusted provider verification.
- `server/prepaid-account-overview.cjs` and access gates: read-only entitlement visibility and fail-closed access decisions.
- `server/d1-prepaid-migration.sql`: additive prepaid schema with unique provider/payment constraints.
- Corresponding tests cover the domain and parts of the persistence contract. These are not proof of a live gateway integration.

## Payment-only work plan

1. Confirm the one intended checkout channel and actual provider.
2. Trace the end-to-end order lifecycle for that provider only: server-priced order -> provider checkout -> verified return/webhook or server-side status query -> atomic settlement -> entitlement update -> account history.
3. Review idempotency, duplicate callbacks, amount/currency/account/product matching, signature/API verification, pending-order expiry, concurrent requests, refunds/chargebacks and cancellation semantics.
4. Repair only payment/subscription code and its dedicated tests.
5. Keep all checkout and purchase flags disabled until real provider sandbox evidence and owner approval exist.
6. Do not ask for or commit merchant passwords, API secrets, private keys, bank credentials, national ID, or account numbers. Configure secrets only in the provider's or hosting platform's secure secret store.

## Blocking clarification

The repository has two different documented directions: direct Iranian website PSP settlement, and Myket/Cafe Bazaar in-app purchases. The owner must confirm which one is the faulty payment flow currently being used, and name the actual provider/market. Until then, implementing a gateway adapter would require guessing and could create an incompatible or unsafe payment path.

## Change status

- No application or payment code has been changed by this audit.
- The earlier broad re-engineering proposal is withdrawn; accepted non-payment modules are out of scope.
- No checkout has been enabled, no provider has been contacted, no real payment has been made, and no production deployment has occurred.
