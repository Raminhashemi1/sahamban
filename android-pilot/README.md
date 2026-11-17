# سهمینو — Android pre-release billing integration

This module is a development wrapper for the Sahmino Android app. The debug APK is not a signed production release and must not be uploaded as a production APK.

## Current verified scope
- Separate Android flavors: `bazaar` and `myket`.
- Cafe Bazaar adapter uses Poolakey 2.2.0 `subscribeProduct`.
- Myket adapter uses Billing 2.2 `launchSubscriptionPurchaseFlow`.
- The adapters return raw purchase evidence only. The app must send it to an authenticated backend; an SDK success callback must never grant Pro access.
- The subscription preview displays the five approved plans and IRR prices:
  - 30 days: 1,500,000 IRR
  - 60 days: 2,850,000 IRR
  - 90 days: 4,050,000 IRR
  - 180 days: 7,650,000 IRR
  - 365 days: 14,600,000 IRR
- Auto-renewal is intended to be enabled by default; the user must be able to cancel renewal through the marketplace while retaining access through the paid period.
- Android Debug builds for both flavors succeeded in workflow run 44034290249 at commit `f2fca7ca147c8baa76a33cb6308ef9daf647ea66`.

## Explicitly NOT complete
- The purchase button is disabled. `SubscriptionPreviewActivity` does not call `MarketplaceBillingClient.subscribe`.
- No end-to-end authenticated Android-to-Worker account/session handoff exists.
- Worker has no provider receipt-verification endpoint. Its health response states payments and checkout are disabled.
- Prepaid order creation returns `checkoutEnabled:false`; it only creates a pending record and is not a checkout.
- The D1 settlement primitive is not a provider verifier. Never pass client-supplied verification flags to it.
- No provider-specific renewal, cancellation, refund, expiry, restore or subscription-status reconciliation endpoint exists.
- No confirmed SKU mapping exists for the five plans in either publisher account.
- No confirmed draft listing/package ID exists in either publisher account.
- No publisher-authorized sandbox account or end-to-end test evidence is recorded.
- Current `applicationId` is temporary `ir.sahamban.pilot`; it is not approved for release.
- No production release signing configuration, production deployment, migration, or marketplace submission has been performed.

## Before any release
1. Owner creates/opens a **draft, unpublished** app record in both publisher consoles and confirms the package ID. Public release is not required for development.
2. Confirm both stores support the requested five auto-renewing subscription durations and create their draft/test subscription SKUs.
3. Supply Bazaar developer API credentials and Myket verification public key/API contract via secure Worker secrets (never Git).
4. Implement provider-specific server verification, binding provider token/SKU/package/order to the authenticated user and exact plan.
5. Persist authoritative provider subscription ID, current period expiry, auto-renew status and cancellation state. Reconcile renewals, cancellation, refunds and chargebacks idempotently.
6. Implement a real commercial authentication/session handoff between app and Worker; the current pilot HMAC identity is not sufficient for launch.
7. Wire purchase, restore, manage/cancel subscription and entitlement refresh to the authenticated API. Fail closed when provider verification is unavailable.
8. Add tests for replay, wrong user, wrong SKU/package, invalid signature, expired/cancelled/refunded subscription, renewals and concurrent callbacks.
9. Run physical-device sandbox purchases, renewals, cancellations and restore tests separately for Bazaar and Myket.
10. Configure final application ID, release signing, privacy disclosures and marketplace compliance; only then prepare public release.

## Build diagnostic APKs
Use GitHub Actions workflow `Sahamban Android pilot debug APK`, or locally:

```bash
gradle -p android-pilot :app:assembleBazaarDebug :app:assembleMyketDebug
```

Optional local properties/environment variables:
- `BAZAAR_PUBLIC_KEY`
- `MYKET_PUBLIC_KEY`

Do not commit keys, tokens, credentials or signing files. Debug artifacts are for development only and are not release candidates.

## Current project gates
PR #186 remains open and Draft. Do not merge it, deploy production, enable checkout, or publish Sahmino until both store integrations pass all release gates above.
