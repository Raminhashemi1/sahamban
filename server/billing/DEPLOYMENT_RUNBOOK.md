# Dual-store Billing V2 deployment runbook

This runbook prepares two store-specific Worker deployments that share one D1 entitlement database. It is a template only; no live resources have been changed.

## 1. Prepare the D1 database

Provision one private production D1 database. Use the same database ID in both Worker configuration files.

Choose exactly one billing schema path:
- Fresh database: apply the base user schema, then `server/billing/schema.sql`.
- Existing database already using the earlier Bazaar Billing V2 schema: apply `server/billing/migrations/0002-myket-store-columns.sql` once, then `0003-authoritative-irr-prices.sql` exactly once.

After the base/Billing V2 schema path is verified, apply `server/migrations/0004-username-password-auth.sql` once. This migration backfills usernames from existing verified phone identities, leaves password hashes unset, and adds hashed-session and login-rate-limit storage. It does not send SMS or enable authentication.

Do not apply the fresh schema and the upgrade migration to the same database. Take a backup before any production migration and verify the schema after applying it.

## 2. Prepare the Bazaar Worker

Copy `server/wrangler.bazaar.toml.example` to `server/wrangler.bazaar.toml`, then replace the PWA origin, actual application ID and shared D1 database name/ID. Before the first store upload, keep the five SKU values as explicit `REPLACE_...` placeholders and keep `BILLING_V2_ENABLED=false`; this lets the complete bootstrap app be uploaded without pretending store product IDs already exist.

From the repository root, set secrets:
```sh
wrangler secret put AUTH_RATE_LIMIT_SECRET --config server/wrangler.bazaar.toml
wrangler secret put BAZAAR_CLIENT_ID --config server/wrangler.bazaar.toml
wrangler secret put BAZAAR_CLIENT_SECRET --config server/wrangler.bazaar.toml
wrangler secret put BAZAAR_REFRESH_TOKEN --config server/wrangler.bazaar.toml
wrangler secret put BAZAAR_RSA_PUBLIC_KEY --config server/wrangler.bazaar.toml
```

## 3. Prepare the Myket Worker

Copy `server/wrangler.myket.toml.example` to `server/wrangler.myket.toml`, then replace the exact PWA origin, actual application ID and same D1 database name/ID. Before the first store upload, keep the five SKU values as explicit `REPLACE_...` placeholders and keep `BILLING_V2_ENABLED=false`.

Set the Myket public key as a secret:
```sh
wrangler secret put AUTH_RATE_LIMIT_SECRET --config server/wrangler.myket.toml
wrangler secret put MYKET_PUBLIC_KEY --config server/wrangler.myket.toml
```

Before enabling login, benchmark the 310,000-iteration PBKDF2 verification on the actual Cloudflare plan and inspect Worker CPU usage. Cloudflare Workers Free has a 10 ms CPU limit; Paid defaults to 30 seconds and supports a configurable higher limit. Do not assume the Free plan can serve this authentication workload. If measured CPU exceeds the selected plan limit, keep login disabled and choose a supported plan or redesign the password-verification execution path before rollout.

The Worker uses native username/password authentication and a D1-backed HttpOnly session. Provision real accounts with `scripts/provision-sahmino-user.mjs` (use the existing opaque D1 `userId` for migrated accounts; do not rewrite legacy primary keys), set a private `AUTH_RATE_LIMIT_SECRET` of at least 32 bytes, and keep `SAHMINO_PASSWORD_AUTH_ENABLED=false` until the migration, account provisioning, and password-recovery procedure are reviewed.

## 4. Deploy with checkout disabled

Only after code review and migration approval:
```sh
wrangler deploy --config server/wrangler.bazaar.toml
wrangler deploy --config server/wrangler.myket.toml
```

Keep `BILLING_V2_ENABLED=false` in both configs. Verify health, CORS origin, account authentication, D1 connectivity, and store-specific SKU mapping without enabling purchase routes.

## 5. Create store products after bootstrap upload

1. Build and owner-sign the store-specific bootstrap release with checkout disabled and no store SKU values.
2. Upload it to the corresponding unpublished/draft listing so the permanent package is registered.
3. Create the five consumable in-app products in that store's publisher panel and record the exact generated product IDs.
4. Replace only that store's `BAZAAR_SKU_MAP` or `MYKET_SKU_MAP` with the exact five-value mapping. Do not put these IDs into Git; keep deployment-specific mapping in Worker configuration.
5. Rebuild and owner-sign the next app version with the generated SKUs and matching public verification key. Upload the update to the same listing.
6. Keep checkout disabled while performing test-account purchases and server-side receipt verification.

## 6. Public checkout release gate

Do not set `BILLING_V2_ENABLED=true` until:
- Username/password login, secure session persistence, rate limits, and account provisioning are configured and tested.
- The exact app package ID and PWA HTTPS origin are confirmed.
- The relevant store's five products exist and its Worker SKU map matches the generated IDs embedded in that store-specific final app build.
- Myket refund/revocation reconciliation is implemented or an approved and tested alternative is accepted.
- Physical-device test purchases and interruption/recovery tests pass for both stores.
- Owner-approved release APKs are signed with the real release key.

## Safety

- Both Workers must point to the same D1 database ID.
- The client never supplies the store selector.
- Never commit OAuth secrets, HMAC secrets, signing keys, or private release certificates.
- No production Worker deployment or D1 migration has been executed by this branch.
