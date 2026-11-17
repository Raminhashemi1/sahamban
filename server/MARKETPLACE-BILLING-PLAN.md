# Sahmino — Bazaar & Myket billing completion plan
Last reconciled: 17 November 2026

## Product decisions currently confirmed by the owner
- The app is not publicly released. All current work is pre-release development/testing; do not ask for published-app product IDs.
- Five plans, all prices in IRR:
  - `SAHMINO_PRO_30D`: 30 days, 1,500,000 IRR
  - `SAHMINO_PRO_60D`: 60 days, 2,850,000 IRR
  - `SAHMINO_PRO_90D`: 90 days, 4,050,000 IRR
  - `SAHMINO_PRO_180D`: 180 days, 7,650,000 IRR
  - `SAHMINO_PRO_365D`: 365 days, 14,600,000 IRR
- Store-managed auto-renewal is enabled by default. The subscriber may cancel auto-renewal; cancellation must not remove already-paid access before the current billing period ends.
- No Google Play work. Current channel priority is Cafe Bazaar and Myket only.
- Public release comes after both billing integrations are verified and tested.

## Verified repository state
- Separate Android product flavors exist for Bazaar and Myket.
- Bazaar adapter calls Poolakey `subscribeProduct`; Myket adapter calls `launchSubscriptionPurchaseFlow`.
- Both adapters return purchase evidence to the app layer; neither adapter may independently grant Pro.
- Server-side plan catalogue and D1 order/entitlement/payment-event schema exist.
- Worker currently exposes health, entitlement, pilot-order and prepaid-order/overview routes only. It has NO public receipt-verification route and no provider-specific subscription reconciliation/cancellation route.
- The prepaid order API explicitly returns `checkoutEnabled:false`; creating a pending order is not a completed checkout.
- Existing settlement module is a low-level atomic settlement primitive for already-verified provider events. It is NOT a provider verifier and must never be called with client-asserted `verified:true`.
- The current settlement schema extends access by fixed days. For store-managed recurring subscriptions, provider-confirmed expiry/renewal state and cancellation state must be persisted; do not infer recurring renewals from local timers or client callbacks.
- The UI is still a preview and purchase is not end-to-end wired.
- The Android debug workflow previously succeeded for both flavors (run 44034290249, commit f2fca7ca147c8baa76a33cb6308ef9daf647ea66).
- Subscription module workflow succeeded (run 44035614260, commit 6a19af0d95375c76d0a8e000dfac0959aa8f684e).
- These CI results prove compilation/tests only, not live provider billing.
- PR #186 remains open and Draft. No merge or public release has occurred.

## Provider-specific implementation requirements

### Cafe Bazaar
- SDK client flow: Poolakey recurring subscription API.
- Server must validate the subscription token using Cafe Bazaar Developer API with the exact package name and subscription SKU.
- Server must store provider-confirmed subscription state and expiry, and support cancellation through the provider API when the user requests it.
- Bazaar developer API uses OAuth client credentials/refresh token; all credentials are server secrets. Never commit them.
- Provider API reference used for the endpoint shape: https://github.com/Geeksltd/CafeBazaar.DeveloperApi (third-party client implementation referencing Bazaar Developer API). Official publisher portal: https://developers.cafebazaar.ir/fa/

### Myket
- SDK client flow: Myket Billing recurring subscription API.
- Client receipt signature/original JSON is untrusted input until cryptographically verified using the publisher public key and/or official server verification API.
- Server must verify package, SKU, developer payload/order association, purchase state, token uniqueness, active subscription and provider expiry.
- Server must support cancellation/status reconciliation according to the actual Myket publisher API available to this app.
- Official SDK sample: https://github.com/myketstore/billing-sample-android

## Why this cannot honestly be marked complete yet
The following provider-specific configuration/evidence is not in this repository:
1. Exact package/application ID registered as a draft for each marketplace.
2. Five actual subscription SKU IDs per marketplace (or confirmation from the publisher console that the selected plan durations/SKUs are supported).
3. Bazaar developer API OAuth client ID, client secret and refresh token, stored only as Worker secrets.
4. Myket publisher public key and confirmed server-verification/status/cancel API contract for this publisher account.
5. Sandbox/test account and test purchase configuration for each marketplace.

These are pre-release publisher-console settings; they do not require public release. Do not invent SKU IDs, package IDs, credentials, API response fields or subscription expiry timestamps.

## Remaining implementation sequence
1. Confirm the package ID already registered as the draft app in each publisher console (do not change it during this billing task).
2. Create/configure the five subscription products in each console, in test/draft mode where supported, and record their exact SKU IDs.
3. Add Bazaar OAuth credentials and Myket verification key/API credentials as encrypted Worker secrets.
4. Implement provider-specific server verification modules and authenticated receipt endpoints. Verify package, SKU, purchase token, order payload, user association, payment state, expiry, amount/currency where returned, and idempotency.
5. Extend D1 with provider subscription ID/token, current period start/end, auto-renew state, cancellation timestamp, last provider sync and event ledger; process renewals, cancellation, expiry, refunds and chargebacks idempotently.
6. Connect Android purchase, restore/query status, and manage/cancel subscription actions to the authenticated Worker APIs. Do not grant access from SDK callback alone.
7. Build both flavors, run unit/integration tests, then perform sandbox/device purchases and cancellation/renewal tests for both stores.
8. Only after both pass, prepare the public release.

## Security / release gates
- Fail closed: if provider verification/status cannot be obtained, do not grant or extend entitlement.
- Never trust client-supplied amount, package, SKU mapping, expiry or `verified` flag.
- Never log receipt tokens, OAuth secrets, public/private key material or account credentials.
- Never deploy D1 migrations or enable payments on production without owner approval.
- Do not merge PR #186 or publish the app before both stores pass end-to-end tests.
