# Sahmino Subscription Module — independent implementation

This module is developed independently of the legacy subscription code in the host repository.

## Product decision
One Sahmino product and shared account/entitlement service. The Cafe Bazaar distribution must use Bazaar billing; the Myket distribution must use Myket billing. The preferred implementation is one shared application source tree with store-specific build configuration/adapters if that proves the safest and least complex route after inspecting the host app.

## Canonical plans
All amounts are IRR (ریال), not toman:
- 30 days: 1,500,000
- 60 days: 2,850,000
- 90 days: 4,050,000
- 180 days: 7,650,000
- 365 days: 14,600,000

The executable catalog is in `core/domain.mjs`; `PLAN_CATALOG.json` is its machine-readable mirror and is checked by tests.

## Renewal rule
A new purchase extends from the later of the current valid expiry or current UTC time. Durations currently mean fixed 24-hour days (30/60/90/180/365), not calendar months.

## Development
Run `npm test`.

## Safety boundary
No client callback grants entitlement. The server must verify each purchase with the corresponding store's trusted mechanism and settle it idempotently before the app consumes a consumable item.

## Current status
See [STATUS.md](STATUS.md). No production payment adapter or store verifier is claimed complete.
