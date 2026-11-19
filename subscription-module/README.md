# Sahmino Subscription Module (Independent)

This directory contains a clean-room subscription implementation track. It is isolated from the legacy subscription implementation and is being developed on a feature branch. The default branch is not modified.

## Product and distribution decision
- One Sahmino product and shared application source.
- Store-specific Android build configuration/adapters for Cafe Bazaar and Myket where required.
- Bazaar distribution must use Bazaar billing only.
- Myket distribution must use Myket billing only.
- Both distributions use the same account identity, backend entitlement, and subscription history.

## Fixed subscription plans
All amounts are **IRR (ریال)**, not toman.

| Plan ID | Duration | Price (IRR) |
|---|---:|---:|
| sahmino_30d | 30 days | 1,500,000 |
| sahmino_60d | 60 days | 2,850,000 |
| sahmino_90d | 90 days | 4,050,000 |
| sahmino_180d | 180 days | 7,650,000 |
| sahmino_365d | 365 days | 14,600,000 |

## Architecture principles
1. The shared subscription domain must not depend on either store SDK.
2. Bazaar and Myket integrations are separate provider adapters.
3. The backend is authoritative for order ownership, price, duration, verification, and entitlement.
4. Never grant subscription time from a client-side success callback.
5. Verify a purchase with the matching store's trusted verification mechanism.
6. Consume a consumable purchase only after durable backend settlement.
7. Use idempotent settlement and retain recoverable purchase evidence.
8. Renewal extends from the later of current expiry and current UTC time.

## Current status
This is an implementation-in-progress, not a production-ready billing release. The domain model, initial D1 schema, provider contracts, purchase coordinator outline, and server service contracts are being built and reviewed. Concrete store SDK adapters, deployed Worker routes, authentication integration, official store verification, and end-to-end device tests remain outstanding.

See [STATUS.md](STATUS.md) for the step-by-step log.
