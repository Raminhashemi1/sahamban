# Independent subscription module

This module is developed from the supplied Sahamban technical dossier and approved subscription requirements only. It does not reuse legacy billing implementation.

## Fixed plan catalog
All prices are IRR (ریال):
- SAHAMBAN_PRO_30D — 30 days — 1,500,000
- SAHAMBAN_PRO_60D — 60 days — 2,850,000
- SAHAMBAN_PRO_90D — 90 days — 4,050,000
- SAHAMBAN_PRO_180D — 180 days — 7,650,000
- SAHAMBAN_PRO_365D — 365 days — 14,600,000

## Technical baseline stated by the dossier
- PWA: HTML/CSS and vanilla JavaScript.
- Android wrapper: Kotlin/Java WebView.
- Backend: Cloudflare Workers JavaScript ES Modules.
- Database: Cloudflare D1 binding named SAHAMBAN_DB.
- Bazaar SDK identified in dossier: Poolakey 2.3.0.
- Current PWA purchase UI and native WebView billing bridge are not connected.
- A commercial user login/session contract is not present in the dossier.
- Myket integration is not documented in the dossier and must be designed independently against official Myket documentation.

## Independent design rules
- Bazaar distribution calls Bazaar billing only.
- Myket distribution calls Myket billing only.
- Both distributions resolve entitlement for the same authenticated account.
- Store callbacks are not proof of payment; server-side verification is mandatory.
- The server owns user identity, plan, amount, product mapping, and entitlement expiry.
- Purchase settlement must be idempotent.
- A consumable purchase is consumed only after server settlement.
- Automatic renewal is not enabled; renewals are user initiated.
- All durations are fixed day counts as defined in the plan catalog.

## Development and tests
Run `npm test` in this directory.

## Safety
No migration in this module is applied to a live D1 database. No marketplace secrets, product IDs, package identity, or deployment settings are invented or stored here.


## Store-specific integration references
- Myket official SDK and signed purchase verification notes: [providers/MYKET.md](providers/MYKET.md)
- Provider adapter contract: [providers/CONTRACT.md](providers/CONTRACT.md)
- PWA/native Android integration boundary: [android/PWA_NATIVE_BILLING_BRIDGE.md](android/PWA_NATIVE_BILLING_BRIDGE.md)

## Implemented HTTP routes
- `POST /api/v2/billing/orders`: creates an order using the authenticated user, server catalog, server-side product mapping, and trusted distribution resolver.
- `POST /api/v2/billing/verify`: looks up the order for the authenticated user, selects the verifier from the persisted order store, verifies signed purchase evidence, and settles idempotently. The verifier is injected from Worker configuration; no client-selected store is accepted.
- `GET /api/v1/me/entitlement`: returns server-side entitlement state.

Myket verification is implemented as server-side RSA signature verification. Bazaar verification must be wired to the current Bazaar Developer API verifier. Until both verifiers and commercial authentication are configured, do not expose the module to production users.


## Embeddable PWA plan selector
- UI module: `pwa/subscription-plans.js`
- Styles: `pwa/subscription-plans.css`
- Mount with: `mountSubscriptionPlans(document.querySelector('#subscription-root'), window.SahminoBilling)`.
- The native bridge facade must implement `getAvailability()`, `getEntitlement()`, and `purchase(planId)`.
- The UI renders the five fixed IRR prices and never activates access from a store callback. It refreshes entitlement only after the bridge reports server settlement.
- Native bridge and concrete Android SDK adapters still need to be compiled and integrated into the production host Activity before the module is installable as a complete app feature.


## Android implementation files
- Gradle Android library with bazaar/myket product flavors: android/build.gradle.kts
- Shared native coordinator and Worker HTTP client: android/src/main/kotlin/ir/sahmino/subscription/
- Origin-restricted WebView bridge: SahminoBillingWebBridge.kt
- Bazaar Poolakey adapter: android/src/bazaar/kotlin/ir/sahmino/subscription/BazaarBillingProvider.kt
- Myket Billing Client adapter: android/src/myket/kotlin/ir/sahmino/subscription/MyketBillingProvider.kt
- Host wiring instructions: android/ANDROID_INTEGRATION.md
- Worker environment factory: worker/create-billing-worker.mjs

The Android source is compiled by the dedicated GitHub Actions workflow for both store flavors. Live store payments still require the real commercial session provider, production PWA origin, D1 migration, and real store test accounts.


## Important: host Billing V2 reconciliation
The repository already has draft Billing V2 work in PR #187 and related subscription UI drafts. This module defines its own Worker routes and D1 tables with names that overlap PR #187 but use a different schema and auth contract. Do not merge/deploy both backends unchanged. Read [INTEGRATION_RECONCILIATION.md](./INTEGRATION_RECONCILIATION.md) before any consolidation. The recommended production direction is one canonical host Worker, one D1 ledger, and provider-specific Bazaar/Myket adapters.
