# Sahmino subscription integration — delivery checklist

Updated 2026-11-20. This document records the current source-level state and
the remaining release dependencies. It supersedes earlier statements that
the Android subscription host was not wired.

## Product contract

- Cafe Bazaar and Myket only.
- Five fixed-day, manually renewed consumable in-app products.
- No free tier; no automatic renewal.
- All canonical amounts are IRR.

| Plan | Days | Price (IRR) |
|---|---:|---:|
| `SAHAMBAN_PRO_30D` | 30 | 1,500,000 |
| `SAHAMBAN_PRO_60D` | 60 | 2,850,000 |
| `SAHAMBAN_PRO_90D` | 90 | 4,050,000 |
| `SAHAMBAN_PRO_180D` | 180 | 7,650,000 |
| `SAHAMBAN_PRO_365D` | 365 | 14,600,000 |

## Source-level implementation present

- Android `MainActivity` provides native OTP login/session validation/logout.
- After authentication, the native `اشتراک سهمینو` entry opens
  `BillingV2SubscriptionHost`.
- The host composes the cookie-session provider, authenticated API client,
  flavor-specific store coordinator, purchase flow, and five-plan selector.
- Bazaar uses Poolakey; Myket uses the Myket Billing Client. The Worker
  selects the store provider from its own deployment configuration.
- Both providers write to the same `billing_orders`, `billing_access`, and
  `billing_events` ledger.
- The server catalog persists the approved IRR amount. D1 constrains the
  exact plan-to-price pair. Both order paths reject missing or placeholder
  store SKU maps before checkout.
- Android checks the server-returned plan price before launching the store.
- The store token is consumed only after successful server verification and
  durable entitlement settlement.
- Fresh-schema and existing-database migration paths are covered by tests.
- Debug checkout is opt-in only after all package/Worker/SKU/key inputs are
  supplied. Release checkout remains disabled.

## Current automated validation

The dual-store Billing V2 validation workflow passed on the current
integration head. The Android Bazaar and Myket debug variants compiled on
the current Android source revision. These checks establish source/build
consistency only; they do not prove deployed Worker, live D1, SMS, store
provider, physical device, or real purchase behavior.

## External release blockers

1. **Application identity:** confirm the final application ID. The checked-in
   default `ir.sahamban.pilot` is temporary.
2. **Store products:** create the five consumable SKUs in each store and
   provide their actual unique IDs. Verify their configured prices against
   the approved Rial table.
3. **Worker deployment:** deploy matching Bazaar/Myket Workers and Shahmiz
   SMS provider; both marketplace Workers must share the same D1 database
   and PWA origin.
4. **Secrets:** configure OTP verifier/rate-limit secrets, SMS provider token,
   Bazaar OAuth credentials, and store public verification keys.
5. **Migrations:** apply base user schema, OTP migrations, Billing V2 base
   schema, and (for existing Billing V2 databases) migration 0002 if needed
   followed by 0003 exactly once. Verify backup and migration history first.
6. **Myket reversals:** add and validate authoritative refund/revocation
   reconciliation using Myket's supported commercial API/contract.
7. **Physical acceptance:** test OTP login/restart/logout/account switching,
   both stores' purchase and verification, consume, retry, restore,
   repurchase, expiry, refunds, network loss, and data backup/import/export.
8. **Release:** only after acceptance, select release signing identity and
   store submission settings in an owner-controlled secure environment.

## Explicit safety gates

- `SAHMINO_OTP_ENABLED=false` and `BILLING_V2_ENABLED=false` remain the
  deployment defaults.
- The Android default package remains the pilot ID; checkout does not enable
  unless the final package, HTTPS Worker URL, five unique real SKU values,
  and flavor-specific public key are present.
- Release build checkout is hard-disabled.
- No production Worker deployment, D1 migration, store configuration, live
  purchase, or release signing is performed by source CI.

Do not duplicate the existing host or purchase flow. Any further code work
should begin by checking this checklist, the current integration branch, and
the related PR history.

## Additional native checkout contract audit (2026-11-20)

The active app integration is consolidated in draft PR [#191](https://github.com/Raminhashemi1/sahamban/pull/191); do not port the standalone `subscription-module/worker` ledger or duplicate the host purchase flow into the app. The canonical host is `android-pilot` + `server/worker-api.mjs` + `server/billing/`.

An additional source-contract regression now asserts that:
- The selected store connection is established before a server order is created.
- Purchase evidence is bound to the expected package, SKU, and server order.
- Server verification succeeds before the native client consumes a Bazaar or Myket purchase token; verification failure never reaches consumption.
- The Android client payload fields exactly match the Bazaar and Myket Worker verifier contracts.

Exact-head GitHub Actions validation passed on commit `94240c9e09eafc9b353a4d0d881d0593bfd97656`: [run 44805999905](https://github.com/Raminhashemi1/sahamban/actions/runs/44805999905). The Android dual-flavor debug build passed on the same Android source tree at commit `3992cee4632a2fcdccf6a433d8043e414cea31f2`; the only subsequent source change before the audited head was a test-file change. This is compile/test evidence, not physical-device or live-store acceptance.

## Restore/recovery regression audit (2026-11-20)

Added a further native restore contract regression in `tests/android-pilot-wrapper.test.cjs`. It guards the recovery sequence where the marketplace purchase may have completed but the app was interrupted before server settlement:
- Refresh the durable account entitlement before optional marketplace restore, so existing access remains visible even if checkout is disabled or the store is unavailable.
- Require the configured five-product catalog before querying marketplace-owned purchases.
- Validate package and server order reference for each recovered receipt.
- Verify each receipt with the Worker before consuming it; failed verification must leave it unconsumed for retry.
- Keep the durable entitlement result alongside per-receipt restore results.

Regression commit: `a038fc4b3eaf0cebeb5c0b97baf3534a1cf23e66`. Exact-head CI run: [44806694108](https://github.com/Raminhashemi1/sahamban/actions/runs/44806694108) (queued when this note was written; check its final result before treating the new test as passed). This remains source-contract coverage, not physical-device restore acceptance.

## Marketplace price-display safety (2026-11-21)

The native subscription selector now starts with all purchase buttons disabled while it requests the five exact localized product prices from the selected marketplace. Checkout is enabled only when all five plan IDs have valid returned prices; partial or unavailable catalog responses leave every purchase button disabled. The UI now displays the marketplace-localized price only, avoiding a potentially confusing second hard-coded currency representation. The server continues to enforce the canonical IRR price independently during order creation and settlement.

The consumption-failure message was corrected: it no longer claims an automatic retry is queued. It directs the user to run **بازیابی اشتراک**, which re-verifies the still-owned store receipt and retries consumption after server confirmation.

Changes: 0e4225f (native UI), 0081adaa (regression test), cec4424 (push validation workflow). CI run [44868952578](https://github.com/Raminhashemi1/sahamban/actions/runs/44868952578) passed all billing, D1 SQLite, Myket, OTP and schema tests. Android debug build run [44868890953](https://github.com/Raminhashemi1/sahamban/actions/runs/44868890953) was still running when this entry was prepared; do not treat the APK build as passed until its final result is green.

## Checkout catalog gate regression (2026-11-21)

A final UI state audit found that completing the Restore action could re-enable purchase buttons while the marketplace catalog was still loading or had failed. The subscription view now tracks catalog readiness independently from its busy state: purchase buttons are enabled only when the full five-plan localized catalog has loaded and no operation is in progress. Restore completion and asynchronous catalog callbacks both use the same gate, so neither can bypass it. Added a source regression test for the state transition.

Commits: `d4bdc85f` (UI fix), `3dd33bef` (regression). Exact-head validation: [Billing V2 workflow 44869910445](https://github.com/Raminhashemi1/sahamban/actions/runs/44869910445); [Bazaar/Myket debug build 44869910497](https://github.com/Raminhashemi1/sahamban/actions/runs/44869910497). These runs were queued when recorded; check final status before marking this change green.

## Myket subject-session settlement audit (2026-11-21)

A source audit found that the Myket order lookup used by the authenticated subject/pilot-session branch omitted `amount_irr`, while the OTP user-ID branch selected it. The shared settlement routine correctly enforces the canonical plan price, so the subject-authenticated branch would fail closed with `ORDER_PRICE_MISMATCH` for every valid Myket purchase. The query now selects `amount_irr` consistently, and a regression test asserts the subject-session query includes the trusted server amount.

Fix: `f8465642`; regression: `c0f993ed` + import correction `f7667cfe`. Exact-head dual-store Billing V2 validation passed: [run 44870595363](https://github.com/Raminhashemi1/sahamban/actions/runs/44870595363). The two preceding failures were caused by the regression test's missing `readFile` import, not by production service code; the corrected exact-head run is green.
