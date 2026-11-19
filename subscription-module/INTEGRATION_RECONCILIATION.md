# Billing V2 integration reconciliation

Date: 2026-11-19

## Why this note exists

The repository already contains active draft work for Billing V2. This independent module was developed separately to provide a provider-neutral Android/PWA layer for both Bazaar and Myket. A review of the open pull requests and their source trees found a backend collision that must be resolved before either implementation is merged or deployed.

Relevant existing drafts:
- PR #187 — Bazaar Billing V2 implementation integrated into `server/worker-api.mjs` and the existing `android-pilot` wrapper: https://github.com/Raminhashemi1/sahamban/pull/187
- PR #185 — subscription dashboard and Android wrapper work: https://github.com/Raminhashemi1/sahamban/pull/185
- PR #186 — five-plan catalogue / billing architecture: https://github.com/Raminhashemi1/sahamban/pull/186

## Confirmed collision

Both PR #187 and this independent module currently define:
- `POST /api/v2/billing/orders`
- `POST /api/v2/billing/verify`
- `GET /api/v1/me/entitlement`
- D1 tables named `billing_orders`, `billing_access`, and `billing_events`

However, the schemas are not compatible:
- PR #187's Bazaar schema references the existing `sahamban_users(id)` table and stores `bazaar_product_id` / `bazaar_order_id`.
- This module's provider-neutral schema stores a `store` discriminator and generic `store_product_id` / `store_order_id` fields, and expects a caller-supplied authenticated user ID.
- PR #187's Worker authenticates the pilot HMAC subject and resolves it to an existing user row; this module intentionally requires an injected commercial authenticator returning a stable user ID.

Deploying both handlers or applying both schemas as-is would create duplicate route ownership and an incompatible shared D1 schema. Do not merge both backend implementations unchanged.

## Recommended consolidation path

1. Keep PR #187's existing host Worker and account identity mapping as the canonical production integration point, subject to owner review and its existing feature gate.
2. Generalize the canonical Billing V2 schema once: retain the existing foreign key to `sahamban_users(id)`, add a trusted `store` discriminator, and normalize store product/order fields. Use one entitlement table and one event ledger.
3. Port the Myket signature verifier from this module into the canonical Worker as the second provider adapter. Provider selection must come from the persisted order, never a client parameter.
4. Reuse the existing canonical order and settlement service. Do not keep a second order/access/event ledger.
5. Keep the reusable Android/PWA components from this module only if their host bridge and API contract are adapted to the canonical Worker endpoints and account token. Otherwise, keep them as isolated reference code until host integration is accepted.
6. Add migration and integration tests against the canonical schema before enabling any checkout feature flag.
7. Preserve all current feature gates. No live migration, production secret change, Worker deployment, or payment enablement is performed by this module branch.

## Current branch decision

This branch remains an isolated implementation and has not modified `main` or the existing draft PR branches. It is not ready to merge as a second Billing V2 backend. Its validated value is the dual-store adapter research, PWA/native bridge protocol, Android flavors, and independent test coverage. The next production step is consolidation with the canonical host branch, not deployment of a parallel ledger.
