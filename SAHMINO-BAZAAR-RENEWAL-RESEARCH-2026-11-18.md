# Sahmino CafeBazaar renewal architecture research — 2026-11-18

Repository: `Raminhashemi1/sahamban`
Working branch: `feat/android-subscription-preview-20261115`

## Purpose

Record the renewal facts and implementation gaps before changing the payment lifecycle. This is a research/architecture note, not approval to enable checkout or automatic renewal.

## Confirmed from the current repository

- The only supported store channel is CafeBazaar. Myket, Google Play, direct website checkout and other providers remain out of scope.
- Poolakey uses Subscription APIs: `getSubscriptionSkuDetails`, `subscribeProduct`, and `getSubscribedProducts`.
- The Worker verifies each receipt against CafeBazaar Developer API and obtains `validUntilTimestampMsec` and `autoRenewing`.
- The Worker currently rejects settlement when `autoRenewing !== false` with `AUTO_RENEW_POLICY_UNRESOLVED`.
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
