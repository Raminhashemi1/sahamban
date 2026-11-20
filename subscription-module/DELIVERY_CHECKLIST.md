# Sahmino subscription integration — delivery checklist

Updated 2026-11-20. This checklist records the integrated Android host and
remaining release dependencies.

## Product contract
- Cafe Bazaar and Myket only.
- Five fixed-day, manually renewed consumable in-app products.
- No free tier and no automatic renewal.
- Canonical prices are IRR: 30/60/90/180/365 days at 1,500,000 /
  2,850,000 / 4,050,000 / 7,650,000 / 14,600,000.

## Source implementation
- Native username/password login gates PWA startup; username is the user's
  Iranian mobile number. No SMS, OTP, or phone verification is used.
- Worker verifies PBKDF2 password hashes, applies username/IP rate limits,
  and creates revocable D1-backed HttpOnly sessions.
- The authenticated native subscription host composes the session provider,
  Billing V2 API, Bazaar/Myket coordinator, purchase flow, and five-plan UI.
- Both stores settle to the shared entitlement ledger.
- Server-side price/duration constraints, duplicate settlement guards,
  post-settlement consume, restore, and retry flows remain in place.
- Debug checkout remains opt-in; release checkout remains disabled.

## External release blockers
1. Confirm final Android application ID.
2. Create the five consumable products in both stores and provide real SKU IDs.
3. Configure the two Workers to use the same private D1 database and exact PWA origin.
4. Set a private AUTH_RATE_LIMIT_SECRET and the store-specific credentials.
5. Apply migration 0004 for username/password auth after backup and migration review.
6. Provision existing/new user accounts through the secure offline password-hash process.
7. Define non-SMS password recovery before public release; a phone number alone
   is not proof of ownership.
8. Complete Myket refund/revocation reconciliation.
9. Run physical-device tests for login, persistence, logout, account switching,
   purchase, receipt verification, consume/retry, restore, repurchase, expiry,
   refunds, network loss, and data backup/import/export.
10. Configure owner-controlled release signing and marketplace submission.

## Safety gates
- `SAHMINO_PASSWORD_AUTH_ENABLED=false` and `BILLING_V2_ENABLED=false`
  remain deployment defaults.
- `PILOT_AUTH_ENABLED=false`; legacy pilot tokens are disabled in deployments.
- No production Worker deployment, D1 migration, live purchase, or release
  signing is performed by source CI.
- Old OTP schema files are retained only for migration compatibility and
  preservation of historic records; the active Android and Worker code paths
  do not use SMS or OTP.

Do not duplicate the existing Android host or Billing V2 purchase flow.
