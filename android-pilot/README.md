# Sahmino Android — CafeBazaar and Myket

## Identity

- Owner-approved Android application ID: `ir.manahesab.sahmino`.
- Source namespace: `ir.sahamban.pilot` (internal Java/BuildConfig namespace).
- The exact same application ID must be registered for Sahmino in both stores.
- The ID is approved by the owner but is not yet registered/verified in either
  store console.

## Scope

Only CafeBazaar and Myket are in scope. Website checkout, ZarinPal and Google
Play are excluded from this Android work. Auto-renewal is not being implemented
unless a store explicitly supports the owner's opt-in policy; current default
is manual renewal.

The existing five-plan preview is preserved. Approved prices:

| Plan | Duration | Price (Toman) |
|---|---:|---:|
| SAHMINO_PRO_30D | 30 days | 150,000 |
| SAHMINO_PRO_60D | 60 days | 285,000 |
| SAHMINO_PRO_90D | 90 days | 405,000 |
| SAHMINO_PRO_180D | 180 days | 765,000 |
| SAHMINO_PRO_365D | 365 days | 1,460,000 |

## Android store variants

Gradle defines `bazaar` and `myket` product flavors. The module currently
declares the official Myket Billing Client 2.2 SDK and the official Myket
Maven repository. The official SDK sample documents both store flavors and
the Bazaar/Myket market service binding values.

The following public verification keys are intentionally not committed:

- `BAZAAR_IAB_PUBLIC_KEY`
- `MYKET_IAB_PUBLIC_KEY`

Five product IDs in `app/build.gradle` are proposed placeholders only. They
must be created/approved in each publisher console and then checked against
the server catalog before purchase is enabled:

| Plan | Proposed product ID |
|---|---|
| 30 days | `sahmino_pro_30d` |
| 60 days | `sahmino_pro_60d` |
| 90 days | `sahmino_pro_90d` |
| 180 days | `sahmino_pro_180d` |
| 365 days | `sahmino_pro_365d` |

## Work still required — purchases are disabled

The current `SubscriptionPreviewActivity` is display-only. Its purchase button
is disabled. Gradle flavors and SDK dependency are not a completed billing
integration.

Before enabling purchases:

1. Obtain written/current confirmation from BOTH stores that one-time
   consumable purchases can be used for fixed-duration digital entitlements,
   including same-SKU repurchase and consumption requirements.
2. Register the Sahmino app in both consoles with the exact package ID above.
3. Create the five products in both consoles, and obtain each store's public
   verification key and sandbox/test account.
4. Implement each store's native purchase adapter and authenticated account
   binding with a server-generated one-time nonce.
5. Verify receipt/signature, app package, SKU, amount, currency, account,
   transaction identity and purchase state on the server. A client callback
   alone must never grant Pro.
6. Atomically settle the order, append the exact purchased days to the current
   paid-through date, and record a unique provider event/payment ledger.
7. Consume a consumable purchase only after server verification and durable
   entitlement commit. Reconcile unconsumed purchases after crashes/network
   loss; support restore and refund/revocation.
8. Test success, cancel, decline, duplicate receipt, wrong account/SKU/amount,
   network loss, consume failure, refund and reinstall on physical devices
   using each store's approved test route.

## Release blockers

- Store app records, package registration, five approved SKUs, public keys and
  sandbox/test accounts have not yet been supplied or verified.
- Native billing flows and server-side receipt verification are not yet
  implemented.
- Store policy approval for fixed-duration consumable entitlement and
  repurchase/consume behavior is pending.
- Permanent release signing and secure signing CI are not configured.
- Physical-device end-to-end tests are not complete.
- Store listing assets, descriptions, privacy/support details and review
  submission are not complete.

## CI safety

GitHub Actions validates source, manifest and store-flavor configuration and
compile-checks both variants. It deliberately does NOT assemble, upload or
publish APKs before the owner confirms release readiness. No debug artifact
should be uploaded to either store.
