# Dual-store Billing V2 deployment runbook

This runbook prepares two store-specific Worker deployments that share one D1 entitlement database. It is a template only; no live resources have been changed.

## 1. Prepare the D1 database

Provision one private production D1 database. Use the same database ID in both Worker configuration files.

Choose exactly one billing schema path:
- Fresh database: apply the base user schema, then `server/billing/schema.sql`.
- Existing database already using the earlier Bazaar Billing V2 schema: apply `server/billing/migrations/0002-myket-store-columns.sql` once, then `0003-authoritative-irr-prices.sql` exactly once.

After the base/Billing V2 schema path is verified, prepare the legacy identity/session tables before the password-auth cutover:

- Apply `server/d1-sahmino-sms-otp.sql` before migration 0004 when preserving or importing previously verified phone identities. This creates `sahmino_phone_identities`; migration 0004 deliberately does not invent or import phone ownership from unverified data. If no verified phone identities exist, the table may remain empty and accounts must be provisioned through the approved account-provisioning process.
- Apply `server/d1-sahmino-sms-otp-runtime.sql` before migration 0004 when retaining the prior OTP runtime schema/history. It creates the shared-session and OTP send-event tables. Migration 0004 also creates the shared-session table if absent and revokes every existing unrevoked session during the authentication cutover.

Then apply these additive migrations exactly once and in order:

1. `server/migrations/0004-username-password-auth.sql` — adds username/password fields and rate-limit storage; it backfills usernames only from existing, non-revoked verified phone identities and leaves password hashes unset.
2. `server/migrations/0005-password-recovery-codes.sql` — creates the one-time recovery-code table required by the password-reset endpoint.

Do not apply the SMS schema merely to enable SMS login: the current commercial Worker uses username/password authentication, and no SMS provider or OTP route is enabled by this runbook. The SMS identity schema is only a compatibility/preservation prerequisite when verified legacy phone identities must be retained.

Do not enable `SAHMINO_PASSWORD_AUTH_ENABLED` until both migrations have succeeded and their resulting tables/indexes have been verified. Migration 0004 revokes legacy sessions as part of the authentication cutover. Neither migration sends SMS or enables authentication.

Do not apply the fresh schema and the upgrade migration to the same database. Take a backup before any production migration, record the migration history, and verify the schema after applying each migration.

## 2. Prepare the Bazaar Worker

Copy `server/wrangler.bazaar.toml.example` to `server/wrangler.bazaar.toml`, then replace the PWA origin, actual application ID, shared D1 database name/ID, and all five Bazaar SKUs from the developer panel.

Record the deployed HTTPS Worker origin as the repository Actions variable `SAHAMBAN_BAZAAR_WORKER_BASE_URL`. This URL is injected only into the Bazaar Android flavor. Set the Bazaar product IDs as the five separate Actions variables `SAHAMBAN_BAZAAR_SKU_PRO_30D`, `SAHAMBAN_BAZAAR_SKU_PRO_60D`, `SAHAMBAN_BAZAAR_SKU_PRO_90D`, `SAHAMBAN_BAZAAR_SKU_PRO_180D`, and `SAHAMBAN_BAZAAR_SKU_PRO_365D`; they must match `BAZAAR_SKU_MAP` exactly.

From the repository root, set secrets:
```sh
wrangler secret put AUTH_RATE_LIMIT_SECRET --config server/wrangler.bazaar.toml
wrangler secret put BAZAAR_CLIENT_ID --config server/wrangler.bazaar.toml
wrangler secret put BAZAAR_CLIENT_SECRET --config server/wrangler.bazaar.toml
wrangler secret put BAZAAR_REFRESH_TOKEN --config server/wrangler.bazaar.toml
wrangler secret put BAZAAR_RSA_PUBLIC_KEY --config server/wrangler.bazaar.toml
```

## 3. Prepare the Myket Worker

Copy `server/wrangler.myket.toml.example` to `server/wrangler.myket.toml`, then replace the exact PWA origin, actual application ID, same D1 database name/ID, and all five Myket SKUs from the developer panel.

Record the deployed HTTPS Worker origin as the repository Actions variable `SAHAMBAN_MYKET_WORKER_BASE_URL`. This URL is injected only into the Myket Android flavor; do not point both flavors at the same store-configured Worker. Set the Myket product IDs as the five separate Actions variables `SAHAMBAN_MYKET_SKU_PRO_30D`, `SAHAMBAN_MYKET_SKU_PRO_60D`, `SAHAMBAN_MYKET_SKU_PRO_90D`, `SAHAMBAN_MYKET_SKU_PRO_180D`, and `SAHAMBAN_MYKET_SKU_PRO_365D`; they must match `MYKET_SKU_MAP` exactly.

Set the Myket public key as a secret:
```sh
wrangler secret put AUTH_RATE_LIMIT_SECRET --config server/wrangler.myket.toml
wrangler secret put MYKET_PUBLIC_KEY --config server/wrangler.myket.toml
```

Before enabling login, benchmark the 310,000-iteration PBKDF2 verification on the actual Cloudflare plan and inspect Worker CPU usage. Cloudflare Workers Free has a 10 ms CPU limit; Paid defaults to 30 seconds and supports a configurable higher limit. Do not assume the Free plan can serve this authentication workload. If measured CPU exceeds the selected plan limit, keep login disabled and choose a supported plan or redesign the password-verification execution path before rollout.

The Worker uses native username/password authentication and a D1-backed HttpOnly session. Provision real accounts with `scripts/provision-sahmino-user.mjs` (use the existing opaque D1 `userId` for migrated accounts; do not rewrite legacy primary keys). The script creates ten one-time recovery codes; deliver them once through a separately approved secure offline channel and rehearse account-ownership verification and controlled code rotation. Set a private `AUTH_RATE_LIMIT_SECRET` of at least 32 bytes, identical in both Worker deployments. Keep `SAHMINO_PASSWORD_AUTH_ENABLED=false` until migrations 0004 and 0005, account provisioning, recovery-code delivery, and the PBKDF2 CPU benchmark have all been reviewed and accepted.

## 4. Deploy with checkout disabled

Only after code review and migration approval:
```sh
wrangler deploy --config server/wrangler.bazaar.toml
wrangler deploy --config server/wrangler.myket.toml
```

Keep `BILLING_V2_ENABLED=false` in both configs. Verify health, CORS origin, account authentication, D1 connectivity, and store-specific SKU mapping without enabling purchase routes.

## 5. Public checkout release gate

Do not set `BILLING_V2_ENABLED=true` until:
- Username/password login, secure session persistence, rate limits, and account provisioning are configured and tested.
- The exact app package ID and PWA HTTPS origin are confirmed.
- Both store developer panels contain all five products and the maps match exactly.
- Myket refund/revocation reconciliation is implemented or an approved and tested alternative is accepted.
- Physical-device test purchases and interruption/recovery tests pass for both stores.
- Owner-approved release APKs are signed with the real release key.

## Android billing-enabled release handoff

The initial signed workflow uses `SAHAMBAN_RELEASE_BILLING_ENABLED` unset and therefore produces checkout-disabled APKs. The later manual workflow `.github/workflows/android-pilot-signed-billing-release.yml` is separately gated by the explicit dispatch phrase `ENABLE_BILLING_RELEASE`. It requires both live Worker health endpoints to report `authEnabled=true`, `paymentsEnabled=true`, `checkoutEnabled=true`, and their matching store; it also verifies the five independent product IDs per store, public keys, package, signatures and flavor-specific BuildConfig.

Only configure `SAHAMBAN_RELEASE_BILLING_ENABLED=true` through that workflow after the initial app is published, actual SKUs and prices are verified, Myket refund/revocation handling is accepted, and physical-device acceptance is complete. The debug opt-in `SAHAMBAN_BILLING_ENABLED` cannot enable checkout in CI pilot builds because they use distinct pilot package IDs.

## Safety

- Both Workers must point to the same D1 database ID.
- The client never supplies the store selector.
- Never commit OAuth secrets, HMAC secrets, signing keys, or private release certificates.
- No production Worker deployment or D1 migration has been executed by this branch.
