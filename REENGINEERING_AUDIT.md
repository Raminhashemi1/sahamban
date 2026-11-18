# Sahamban payment and subscription audit

Date: 2026-11-18
Repository: Raminhashemi1/sahamban
Working branch: codex/reengineering-audit

## Scope

Owner confirmed that all non-payment modules have already been tested and approved. They are out of scope and must not be modified. Work is limited to in-app billing, orders, receipt verification, subscription entitlement, recovery, refund/reversal, and payment UI/API.

## Owner-approved commercial contract

- **Cafe Bazaar only**, using its official Android billing integration (Poolakey).
- Myket, Google Play billing, and direct website payment are out of scope.
- One-time purchase with no automatic renewal.
- Fixed elapsed-day durations, not calendar months.
- Currency: IRR (rial), never toman.
- Early repurchase extends from the current paid-until timestamp; it does not discard remaining days.

| Internal plan ID | Exact duration | Price (IRR) |
|---|---:|---:|
| SAHAMBAN_PRO_30D | 30 days | 1,500,000 |
| SAHAMBAN_PRO_60D | 60 days | 2,850,000 |
| SAHAMBAN_PRO_90D | 90 days | 4,050,000 |
| SAHAMBAN_PRO_180D | 180 days | 7,650,000 |
| SAHAMBAN_PRO_365D | 365 days | 14,600,000 |

The IDs above are server-side catalog keys, not Cafe Bazaar Product IDs. Actual Bazaar Product IDs must be created in the publisher console and mapped explicitly.

## Code changes made on this branch

- `server/prepaid-plans.cjs`: replaced four month-based plans with five fixed-day plans and exact IRR prices; entitlement math adds exact 24-hour days.
- `tests/prepaid-plans.test.cjs`: covers catalog, exact day lengths, leap-day boundary, all five prices, early repurchase, verification and replay.
- `tests/prepaid-orders-api.test.cjs`: covers server-priced pending orders for all five plans.
- `server/d1-prepaid-migration.sql`: fresh additive schema now constrains the five internal plan IDs and exact price pairs.
- `tests/d1-prepaid-migration.test.py`: validates all five price pairs and rejection of incorrect prices.
- `server/prepaid-settlement.cjs`: settlement primitive uses fixed-day entitlement calculation in JS and SQLite/D1 SQL.
- `tests/prepaid-settlement.test.cjs` and `tests/d1-prepaid-settlement-sqlite.integration.test.py`: cover settlement, fixed-day arithmetic, renewal extension, rollback and replay.
- `server/MARKETPLACE-BILLING-PLAN.md`: records the five prices and Cafe Bazaar-only decision.

## Remaining blockers

1. A native Kotlin Poolakey boundary and HTTPS receipt client have been added. Fixed-term plans use one-time `purchaseProduct/getPurchasedProducts` (not recurring subscription APIs). The client submits order ID, product ID and purchase token to the authenticated Worker.
2. Actual Cafe Bazaar Product IDs for all five plans and their explicit server mapping are still needed; no products should be created until the official app build is ready.
3. A fail-closed Worker endpoint now refreshes a server-side Bazaar Developer API access token, validates the exact package/product/purchase token, requires PURCHASED + unconsumed state and exact developer payload/order binding, then atomically settles the D1 order and entitlement. This remains disabled until the five real SKUs, package ID and Bazaar OAuth credentials are securely configured.
4. Refund/reversal processing and entitlement recovery on a real Bazaar-installed device remain outstanding.
5. The Worker is a private pilot prototype; checkout and payments remain disabled. New Bazaar receipt verification regression tests were added to the Worker CI.
6. The D1 migration has not been applied to a production database. Review migration history before applying any schema changes to an existing database.

## Safety and scope

- No non-payment application module was changed.
- No production checkout was enabled.
- No real transaction was made and no marketplace was contacted.
- Do not merge/deploy until the native Bazaar adapter is integrated into the app flow, trusted receipt verification and refund/recovery handling exist, Android CI passes, sandbox tests pass, and owner approval is obtained.
