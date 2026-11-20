# Dual-store Billing V2 deployment runbook

This runbook prepares two store-specific Worker deployments that share one D1 entitlement database. It is a template only; no live resources have been changed.

## 1. Prepare the D1 database

Provision one private production D1 database. Use the same database ID in both Worker configuration files.

Choose exactly one schema path:
- Fresh database: apply `server/billing/schema.sql`.
- Existing database already using the earlier Bazaar Billing V2 schema: apply `server/billing/migrations/0002-myket-store-columns.sql` once.

Do not apply the fresh schema and the upgrade migration to the same database. Take a backup before any production migration and verify the schema after applying it.

## 2. Prepare the Bazaar Worker

Copy `server/wrangler.bazaar.toml.example` to `server/wrangler.bazaar.toml`, then replace the PWA origin, actual application ID, shared D1 database name/ID, and all five Bazaar SKUs from the developer panel.

From the repository root, set secrets:
```sh
wrangler secret put AUTH_HMAC_SECRET --config server/wrangler.bazaar.toml
wrangler secret put BAZAAR_CLIENT_ID --config server/wrangler.bazaar.toml
wrangler secret put BAZAAR_CLIENT_SECRET --config server/wrangler.bazaar.toml
wrangler secret put BAZAAR_REFRESH_TOKEN --config server/wrangler.bazaar.toml
wrangler secret put BAZAAR_RSA_PUBLIC_KEY --config server/wrangler.bazaar.toml
```

## 3. Prepare the Myket Worker

Copy `server/wrangler.myket.toml.example` to `server/wrangler.myket.toml`, then replace the exact PWA origin, actual application ID, same D1 database name/ID, and all five Myket SKUs from the developer panel.

Set the Myket public key as a secret:
```sh
wrangler secret put AUTH_HMAC_SECRET --config server/wrangler.myket.toml
wrangler secret put MYKET_PUBLIC_KEY --config server/wrangler.myket.toml
```

The Worker uses the native username/password account session. Apply the password-auth migration to the shared D1 database and provision credentials for existing ACTIVE users before enabling the password-auth flag. The legacy pilot-token fallback is disabled unless an isolated test deployment explicitly sets PILOT_TOKEN_AUTH_ENABLED=true; never enable that flag in production.

## 4. Prepare username/password authentication

Apply `server/d1-sahmino-password-auth.sql` to the shared private D1 database after a verified backup. Set the same `SAHMINO_AUTH_RATE_LIMIT_SECRET` (at least 32 random bytes) as a Worker secret in both deployments. Keep `SAHMINO_PASSWORD_AUTH_ENABLED=false` until existing ACTIVE users have credentials provisioned using the owner-controlled process documented in `android-pilot/README.md`. Do not enable public self-registration or SMS fallback.

## 5. Deploy with checkout disabled

Only after code review and migration approval:
```sh
wrangler deploy --config server/wrangler.bazaar.toml
wrangler deploy --config server/wrangler.myket.toml
```

Keep `BILLING_V2_ENABLED=false` in both configs. Verify health, CORS origin, account authentication, D1 connectivity, and store-specific SKU mapping without enabling purchase routes.

## 6. Public checkout release gate

Do not set `BILLING_V2_ENABLED=true` until:
- Username/password authentication, session persistence, and account-to-entitlement binding are integrated and tested.
- The exact app package ID and PWA HTTPS origin are confirmed.
- Both store developer panels contain all five products and the maps match exactly.
- Myket refund/revocation reconciliation is implemented or an approved and tested alternative is accepted.
- Physical-device test purchases and interruption/recovery tests pass for both stores.
- Owner-approved release APKs are signed with the real release key.

## Safety

- Both Workers must point to the same D1 database ID.
- The client never supplies the store selector.
- Never commit OAuth secrets, HMAC secrets, signing keys, or private release certificates.
- No production Worker deployment or D1 migration has been executed by this branch.
