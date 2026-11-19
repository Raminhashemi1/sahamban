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

The current Worker authentication still uses the private-pilot HMAC contract. It is not the production commercial account session provider; do not use these templates to enable public checkout until the production identity adapter is implemented.

## 4. Deploy with checkout disabled

Only after code review and migration approval:
```sh
wrangler deploy --config server/wrangler.bazaar.toml
wrangler deploy --config server/wrangler.myket.toml
```

Keep `BILLING_V2_ENABLED=false` in both configs. Verify health, CORS origin, account authentication, D1 connectivity, and store-specific SKU mapping without enabling purchase routes.

## 5. Public checkout release gate

Do not set `BILLING_V2_ENABLED=true` until:
- The production commercial session provider is integrated and tested.
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
