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

## Integration history
- PR #187: Bazaar Billing V2 core.
- PR #188: Myket adapter and shared ledger.
- PR #189: originally introduced the OTP session bridge and native Android subscription host.
- PR #190: server-authoritative IRR plan catalog and database migration.
- PR #191: consolidated dual-store integration and native app host.
- The new branch `feature/sahmino-username-password-auth` replaces the former OTP login with username/password authentication and is intended to merge into `integration/sahmino-app-billing-complete`, which is the head of PR #191.

The SMS provider, OTP service, native OTP form/client, and active OTP Worker routes have been removed from this feature branch. Historical OTP D1 migration files are retained only so existing data and migration history are not destroyed; the current application does not invoke SMS or OTP.

## Android purchase path
`MainActivity` → native username/password login/session → `BillingV2SubscriptionHost` → `BillingV2CookieSessionProvider` → `BillingV2ApiClient` → flavor-specific `BillingV2Coordinator` → `BillingV2PurchaseFlow` → five-plan native UI.

The username is the canonical Iranian mobile number; the password is verified server-side using PBKDF2-HMAC-SHA256. The Worker issues a revocable, D1-backed session token in a Secure, HttpOnly cookie. Credentials never enter WebView JavaScript, local storage, logs, or URLs. Login attempts are rate-limited by keyed username and IP pseudonyms. Pilot JWT authentication is disabled by default.

The app still uses the temporary package `ir.sahamban.pilot` by default. The final applicationId, marketplace SKU IDs, signing, and production endpoint must be supplied by the owner before a store build can be enabled. Debug checkout is opt-in only when the package, HTTPS Worker URL, five unique SKU values and store public key are all present. Release checkout remains disabled in Gradle.

## Database and settlement
- Fresh database: base user schema, then Billing V2 schema, then `server/migrations/0004-username-password-auth.sql`.
- Existing Billing V2 database: apply `0002-myket-store-columns.sql` if needed, then `0003-authoritative-irr-prices.sql` exactly once, then migration 0004.
- Migration 0004 backfills canonical usernames from existing verified phone identity records but intentionally leaves password fields empty; no default password is created.
- Use `scripts/provision-sahmino-user.mjs` to generate an offline SQL insert for a new account or a guarded update for an existing internal user ID; output contains only a PBKDF2 hash. Password recovery must be designed separately and must not use SMS.
- Both stores use `billing_orders`, `billing_access`, and `billing_events`.
- Server and D1 enforce the exact plan-to-IRR amount mapping.
- Purchase token consumption occurs only after verified, durable settlement.
- Early repurchase stacks days after the current expiry; expired access starts at settlement time.

## External gates that cannot be completed from source code alone
1. Confirm the final app package name and publisher ownership for both stores.
2. Create five consumable product SKUs in each store, with the approved IRR price points, and supply the real IDs.
3. Configure the shared production D1 database, exact PWA origin, Worker URLs, and a private `AUTH_RATE_LIMIT_SECRET`.
4. Provision actual user accounts and decide a non-SMS password recovery/administrator reset process.
5. Configure Bazaar OAuth credentials and both stores' public verification keys as Worker secrets.
6. Apply the username/password and Billing V2 migrations to the intended database after backup and migration-history verification.
7. Validate Myket refund/revocation behavior against its actual supported provider contract; signature validation alone cannot detect a later refund.
8. Run both APK flavors on physical devices with marketplace test accounts, including login, session persistence, logout, purchase, server verification, consume, retry, restore, repurchase, expiry, account switching and refund.
9. Keep `SAHMINO_PASSWORD_AUTH_ENABLED` and checkout flags disabled until deployment and physical acceptance pass.

Never merge, deploy, run a production migration, enable payments, or publish a signed release merely because CI is green.
