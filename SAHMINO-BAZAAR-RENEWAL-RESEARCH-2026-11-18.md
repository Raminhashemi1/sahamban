# Sahmino CafeBazaar renewal architecture research — 2026-11-18

Repository: `Raminhashemi1/sahamban`
Working branch: `feat/android-subscription-preview-20261115`

## Purpose

Record the renewal facts and implementation gaps before changing the payment lifecycle. This is a research/architecture note, not approval to enable checkout or automatic renewal.

## Confirmed from the current repository

- The only supported store channel is CafeBazaar. Myket, Google Play, direct website checkout and other providers remain out of scope.
- Poolakey uses Subscription APIs: `getSubscriptionSkuDetails`, `subscribeProduct`, and `getSubscribedProducts`.
- The Worker verifies each receipt against CafeBazaar Developer API and obtains `validUntilTimestampMsec` and `autoRenewing`.
- The initial implementation rejected every `autoRenewing=true` receipt. The current branch has since replaced that blanket check with order-bound consent matching: MANUAL receipts are cancelled and revalidated before settlement; AUTO receipts require a versioned consent record and the provider flag to match. AUTO remains disabled by the `BAZAAR_AUTO_RENEW_ENABLED` rollout gate and is not exposed in the Android UI.
- The database stores a SHA-256 digest of the purchase token as `provider_payment_id` and, in the current branch, an authenticated-encryption envelope (`provider_token_version`, `provider_token_nonce`, `provider_token_ciphertext`) for server-side cancellation. Plaintext purchase tokens must never be persisted or logged.
- Entitlement settlement uses the provider-reported expiry and never computes expiry by adding the plan's day count. It also never shortens an already later `paid_until`.

## Provider API evidence reviewed on 2026-11-18

A public CafeBazaar Developer API integration reference documents:
- Subscription validation at `/devapi/v2/api/applications/{packageName}/subscriptions/{subscriptionId}/purchases/{purchaseToken}/`.
- Subscription cancellation at `/devapi/v2/api/applications/{packageName}/subscriptions/{subscriptionId}/purchases/{purchaseToken}/cancel/`.
- OAuth access-token refresh at `/devapi/v2/auth/token/`.

References:
- https://github.com/Geeksltd/CafeBazaar.DeveloperApi/blob/main/README.md
- https://github.com/Geeksltd/CafeBazaar.DeveloperApi/blob/main/CafeBazaarDeveloperService.cs
- https://t.me/s/CafeBazaarDevelopers/277 (CafeBazaar developer channel announcement that automatic subscription renewal/payment is supported)

These references establish that a cancellation API exists and that CafeBazaar has offered automatic subscriptions. They do **not** establish the exact cancellation response contract, whether cancellation takes effect immediately or at period end, whether a newly purchased subscription can be cancelled synchronously before any renewal, nor whether each current product/account configuration permits a manual-only subscription experience. Those points require current official documentation or a sandbox test in the Sahmino developer account.

## Required design before implementing manual-default renewal

1. Keep all purchase and entitlement grants disabled until the cancellation behavior is verified.
2. For a user's explicit manual-renewal choice, determine whether Bazaar allows a just-created subscription to be cancelled immediately while retaining access through its already-paid `validUntilTimestampMsec`.
3. If cancellation must be called by the Worker, design secure handling for the purchase token. The current hash is intentionally irreversible and cannot be used for cancellation. Do not store a raw token in plaintext. Use authenticated encryption with a managed secret/key, strict access controls, retention limits and redaction from logs; or perform the cancellation in the verified purchase request and persist only the result if that is sufficient.
4. Model provider state separately from entitlement state: purchase verified, renewal scheduled, cancellation requested, cancellation confirmed, and paid-through expiry. A cancellation request alone must not be treated as confirmation.
5. Preserve Pro access until the provider-confirmed paid-through expiry. A successful cancellation must not delete or shorten already-paid entitlement.
6. Automatic renewal must remain a separate explicit opt-in. Before enabling it, disclose amount, renewal interval/next charge timing and cancellation method. Record the consent version, timestamp and user/account.
7. Test failed payment, failed cancellation, duplicate receipt, cancellation retry, already-cancelled subscription, provider outage, and expiry after cancellation.
8. Verify Bazaar's actual behavior for a second purchase while a previous subscription is active. Do not assume the provider stacks time or that the current settlement max-expiry behavior implements Sahmino's manual purchase stacking requirement.

## Original research decision (historical)

At the time this research note was first written, runtime changes were not authorized by the note. The current branch has since implemented the encrypted-token and consent/cancellation flow described in the follow-up audit below. That implementation remains unvalidated against the live Bazaar sandbox and does not authorize checkout or release.


## Follow-up audit — current branch state (2026-11-18)

The implementation has progressed beyond the baseline described in the original research bullets. Treat the bullets above as historical context where noted.

### Implemented in the branch, not yet production-validated

- Purchase tokens are encrypted with authenticated encryption before persistence; the digest remains the provider payment identifier.
- The additive renewal-consent migration defaults old and new orders to MANUAL and requires a consent version plus server timestamp for AUTO.
- Settlement compares the provider's `autoRenewing` value with the order's persisted renewal choice.
- MANUAL purchases that arrive with provider auto-renew enabled call the provider cancellation endpoint and are revalidated. Entitlement is not granted unless the provider reports `autoRenewing=false`.
- User cancellation of an AUTO subscription is behind `BAZAAR_CANCELLATION_ENABLED`; AUTO order creation is separately behind `BAZAAR_AUTO_RENEW_ENABLED`.
- Cancellation confirmation now requires a follow-up provider lookup returning `autoRenewing=false`. A successful cancellation HTTP response alone is insufficient.
- Android currently submits MANUAL only and does not show an AUTO consent control.

### Remaining blockers (must not be inferred from mocked tests)

1. No live CafeBazaar sandbox result in this repository proves immediate cancellation of a newly purchased subscription preserves the paid-through period. This must be verified in the Sahmino developer account.
2. The code's entitlement upsert preserves the later of current and provider-reported expiry; it does not independently add plan duration to the remaining balance. Whether Bazaar's second subscription purchase returns a stacked expiry is unverified. The Sahmino stacking requirement is therefore not yet proven.
3. Provider cancellation lookup consistency and exact paid-through behavior require sandbox observation. Until then, a transient provider state must remain pending/fail-closed.
4. The CI run for head `396d823b3c389f0aace2b8bd46832ba2e03e46b5` is still queued; no test pass is claimed.
5. The additive migrations have not been applied to the production D1 database. Do not apply them to production as part of this branch work.

### Release gate

Keep checkout disabled, `BAZAAR_AUTO_RENEW_ENABLED` unset/false, and `BAZAAR_CANCELLATION_ENABLED` unset/false until CI passes, all migrations are exercised in a non-production D1 database, and the Sandbox tests above are recorded. This note does not authorize deployment or merging to `main`.


## Additional catalog and release audit — 2026-11-18

### Bazaar product identifiers are still provisional

The Android catalog at `android-pilot/app/src/main/java/ir/sahamban/pilot/SahminoBillingCatalog.java` explicitly labels all five product IDs as provisional and says they must be reconciled with the exact subscription IDs configured in the CafeBazaar publisher panel before enabling purchases:

- `sahmino_pro_30d`
- `sahmino_pro_60d`
- `sahmino_pro_90d`
- `sahmino_pro_180d`
- `sahmino_pro_365d`

The Worker verifier independently hardcodes the same mapping. Matching two code locations is not proof that these SKUs exist in the publisher account, are active subscription products, or have the intended duration and price. Before any purchase test, export/check the five actual Bazaar panel records and reconcile product ID, subscription type, period, availability and displayed price against the approved server catalog. Do not change approved plan prices to fit a mismatch; resolve the Bazaar product configuration.

### What the current settlement code actually guarantees

- It grants no more than the provider-verified `validUntilTimestampMsec` and does not calculate expiry locally from plan days.
- It keeps the later of the already-paid entitlement and the new provider expiry, so a second purchase cannot shorten current access.
- It does **not** add the new plan's day count to the user's remaining entitlement. The requirement "manual repurchase adds the purchased period to remaining credit" is only satisfied if Bazaar itself returns a correspondingly extended provider expiry for the second purchase. That provider behavior has not been demonstrated.
- A unit/integration test that feeds a later expiry into SQLite proves storage behavior, not Bazaar's actual second-purchase semantics.

### CI observation

The commit `6e95faa5456eefaf5d1ac05a14a4dfa186b73a12` has a workflow run created by the PR event, but the run and its jobs were still queued at the time of this audit. No passing test result is claimed. Other repository workflows for the same event were queued too, indicating this is not evidence of a subscription-specific test failure.

### Next safe work order

1. Reconcile all five SKU identifiers and configured subscription periods/prices against the Bazaar publisher panel.
2. Run the subscription-v2 workflow and wait for completed job results; fix any actual failing step.
3. Use the Bazaar sandbox/test account to buy a plan, record the first provider expiry, then buy again while entitlement is active and record the second provider expiry. Compare the result with the expected remaining-period-plus-new-period rule.
4. In the same sandbox, test MANUAL purchase cancellation immediately after payment and confirm both `autoRenewing=false` and unchanged `validUntilTimestampMsec`.
5. Only after these observations should implementation changes be made to the expiry model. Do not locally fabricate paid validity if Bazaar does not confirm it.
6. Keep checkout and both renewal feature gates disabled until the above evidence is recorded.

No production migration, deployment, or merge to `main` is authorized by this audit.
