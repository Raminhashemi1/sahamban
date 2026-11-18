# Sahmino Android — CafeBazaar only

## Identity

- Owner-approved Android application ID: `ir.manahesab.sahmino`.
- Source namespace: `ir.sahamban.pilot`.
- CafeBazaar is the only supported Android distribution and payment channel.
- Myket, Google Play and website/direct-PSP payment are out of scope and must not be added back without a new explicit owner decision.

## Scope

The existing five-plan preview is preserved; it is not rebuilt. The approved server catalog remains authoritative:

| Plan | Duration | Final price (IRR) |
|---|---:|---:|
| SAHMINO_PRO_30D | 30 days | 1,500,000 |
| SAHMINO_PRO_60D | 60 days | 2,850,000 |
| SAHMINO_PRO_90D | 90 days | 4,050,000 |
| SAHMINO_PRO_180D | 180 days | 7,650,000 |
| SAHMINO_PRO_365D | 365 days | 14,600,000 |

## Bazaar subscription architecture

Sahmino's fixed-term Pro plans are being integrated as CafeBazaar subscription SKUs, not one-time consumable in-app products. The Poolakey calls must therefore be the subscription-specific methods:

- `getSubscriptionSkuDetails` for catalog details.
- `subscribeProduct` to start the purchase.
- `getSubscribedProducts` to restore/query subscriptions.
- `consumeProduct` must never be called for subscriptions.

The server must validate the subscription with CafeBazaar Developer API and use the verified `validUntilTimestampMsec` as the provider expiry. The client callback or a locally calculated number of days must never activate Pro.

Manual renewal remains the default. Any automatic-renewal choice must be explicit and supported by the actual Bazaar subscription contract. Until this is proven and implemented, the UI must not promise auto-renew controls.

## Store configuration

The following key is not committed and must be provided through a secure Gradle property:

- `BAZAAR_IAB_PUBLIC_KEY`

The five current SKU strings are provisional mappings only. They must be reconciled with the exact subscription IDs configured in the CafeBazaar publisher panel before enabling purchases.

## Work still required — purchases remain disabled

1. The Poolakey subscription adapter and raw receipt-evidence extraction are now wired; compile/SDK verification remains pending.
2. Create an authenticated server order before launching Bazaar's subscription flow; bind the server order ID in the Poolakey payload.
3. Send the Bazaar subscription purchase token and order evidence to the authenticated Worker.
4. Verify the purchase server-to-server through Bazaar's OAuth Developer API.
5. Check package name, subscription SKU, purchase state, order payload binding, provider token, account ownership and replay.
6. Use Bazaar's verified expiry timestamp; do not derive `paid_until` from `plan.days`.
7. Atomically record provider event, settle order and update entitlement. Never grant Pro from a pending order or client callback.
8. Add cancellation/renewal handling only after confirming Bazaar's supported behavior; cancellation must not remove already-paid access.
9. Test success, cancel, decline, duplicate receipt, wrong account/SKU, network loss, restore, expiry and refund/revocation on a physical device.

## CI safety

GitHub Actions compile-checks only the Bazaar flavor and runs catalog/security tests. It does not assemble, upload or publish APKs. No production signing, D1 migration, deployment, payment activation, merge or release is implied.
