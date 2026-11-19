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
