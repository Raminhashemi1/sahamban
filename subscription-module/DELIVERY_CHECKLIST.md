# Subscription integration delivery status

**Single remaining-work tracker:** [خط پایان — LINE-END.md](LINE-END.md)

Do not maintain a second pending-task list here. All owner actions, ordering, evidence requirements, closeout rules, and the definition of release readiness live in `subscription-module/LINE-END.md`.

## Implemented source scope (not a pending task list)

- Native Android OTP host and authenticated subscription entry.
- Five fixed-day manually renewed plans.
- Bazaar and Myket flavor-specific store clients and server verification paths.
- Shared D1 order/access/event ledger and server-owned IRR catalog.
- Server settlement before purchase-token consumption.
- Restore and catalog-readiness safeguards with automated regression coverage.
- Worker OTP/session, origin/CSRF and billing routes with automated tests.

## Validation boundary

CI and debug APK builds validate source/build consistency only. They do not establish production deployment, real account authentication, live D1, store-side product setup, real purchases, refund reconciliation, physical-device acceptance, or signed release acceptance.

The detailed physical test procedure remains in [PHYSICAL_ACCEPTANCE_MATRIX.md](../server/billing/PHYSICAL_ACCEPTANCE_MATRIX.md). Deployment instructions remain in [DEPLOYMENT_RUNBOOK.md](../server/billing/DEPLOYMENT_RUNBOOK.md).

Continue only from the first open item in [LINE-END.md](LINE-END.md). When an item is accepted, remove it from that single open list and record its evidence in that document.