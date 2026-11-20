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
