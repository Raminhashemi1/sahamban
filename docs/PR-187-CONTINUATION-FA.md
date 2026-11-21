# Sahmino Billing V2 — continuation and integration record

Updated: 2026-11-20

## Product contract
- Android in-app purchase through Cafe Bazaar and Myket only.
- Exactly five manually renewed, fixed elapsed-day products. No free tier and no automatic renewal.
- All server-side amounts are IRR (rial), never toman.

| Plan ID | Duration | Price (IRR) |
|---|---:|---:|
| `SAHAMBAN_PRO_30D` | 30 days | 1,500,000 |
| `SAHAMBAN_PRO_60D` | 60 days | 2,850,000 |
| `SAHAMBAN_PRO_90D` | 90 days | 4,050,000 |
| `SAHAMBAN_PRO_180D` | 180 days | 7,650,000 |
| `SAHAMBAN_PRO_365D` | 365 days | 14,600,000 |

## Integration branches
- PR #187: Bazaar Billing V2 core, based on `codex/reengineering-audit`.
- PR #188: Myket adapter and shared ledger; its integration branch was 17 commits behind the current codex base and had overlapping edits in settlement and tests.
- PR #189: native OTP session bridge, Android subscription host, store-specific app flavors.
- PR #190: server-authoritative IRR plan catalog and database migration.

The integration branch `integration/sahmino-app-billing-complete` now carries the dual-store + OTP host and the approved price catalog. It also contains a merge commit with the codex reengineering-audit base so the previous branch divergence is resolved without dropping either store adapter.

## Android purchase path
`MainActivity` → native OTP login/session → `BillingV2SubscriptionHost` → `BillingV2CookieSessionProvider` → `BillingV2ApiClient` → flavor-specific `BillingV2Coordinator` → `BillingV2PurchaseFlow` → five-plan native UI.

The app still uses the temporary package `ir.sahamban.pilot` by default. The final applicationId, marketplace SKU IDs, signing, and production endpoint must be supplied by the owner before a store build can be enabled. Debug checkout is opt-in only when the package, HTTPS Worker URL, five unique SKU values and store public key are all present. Release checkout remains disabled in Gradle.

## Database and settlement
- Fresh database: base user schema, then `server/billing/schema.sql`.
- Existing Billing V2 database: `0002-myket-store-columns.sql` if not already applied, then `0003-authoritative-irr-prices.sql` exactly once.
- Both stores use `billing_orders`, `billing_access`, and `billing_events`.
- Server and D1 enforce the exact plan-to-IRR amount mapping.
- Purchase token consumption occurs only after verified, durable settlement.
- Early repurchase stacks days after the current expiry; expired access starts at settlement time.

## External gates that cannot be completed from source code alone
1. Confirm the final app package name and publisher ownership for both stores.
2. Create five consumable product SKUs in each store, with the approved IRR price points, and supply the real IDs.
3. Configure the shared production D1 database, exact PWA origin, Worker URLs, OTP/SMS provider binding and secrets.
4. Configure Bazaar OAuth credentials and both stores' public verification keys as Worker secrets.
5. Apply the OTP and Billing V2 migrations to the intended database after backup and migration-history verification.
6. Validate Myket refund/revocation behavior against its actual supported provider contract; signature validation alone cannot detect a later refund.
7. Run both APK flavors on physical devices with marketplace test accounts, including login, purchase, server verification, consume, retry, restore, repurchase, expiry, account switching and refund.
8. Keep OTP and checkout flags disabled until deployment and physical acceptance pass.

Never merge, deploy, run a production migration, enable payments, or publish a signed release merely because CI is green.
