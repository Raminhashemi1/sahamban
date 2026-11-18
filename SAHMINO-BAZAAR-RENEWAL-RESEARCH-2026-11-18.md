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
- The database stores a SHA-256 digest of the purchase token as `provider_payment_id`; it does not store the raw purchase token needed to call the provider cancellation endpoint.
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

## Current decision

No runtime code is changed by this note. The UI must not promise an automatic-renewal toggle or claim manual-only purchase is implemented. The current fail-closed rejection of auto-renewing receipts remains in place until the provider behavior and secure token lifecycle are verified.


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
