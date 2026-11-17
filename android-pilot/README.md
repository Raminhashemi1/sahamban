# Sahmino Android — CafeBazaar and Myket distribution

The Android wrapper now defines two separate store flavors. CI compile-checks both variants without assembling or uploading APKs:

- `bazaarDebug` — CafeBazaar Billing binding.
- `myketDebug` — Myket Billing binding.

The two artifacts are for integration testing only. They are not release builds
and do not process purchases or grant Pro access yet.

## Application identity\n\nThe owner approved the permanent Android application ID `ir.manahesab.sahmino`.\nThe Gradle `applicationId` is set to this value. The Android source namespace\nremains `ir.sahamban.pilot` intentionally; it is an internal Java/BuildConfig\nnamespace and does not change the installed package ID. Register this exact\napplication ID in both CafeBazaar and Myket before uploading any APK. Do not\ncreate separate package IDs per store.\n\n## Existing work preserved

- Existing PWA and five-plan preview remain in place.
- Approved prices remain 150,000 / 285,000 / 405,000 / 765,000 /
  1,460,000 Toman for 30 / 60 / 90 / 180 / 365 days.
- No website checkout, ZarinPal, Google Play Billing or auto-renewal is in
  the Android distribution scope.
- Each store receives its own build flavor; runtime installer metadata is
  not used to select or authorize billing.

## Store SDK and configuration

The Android module uses the Myket Billing Client 2.2 SDK from the official
Myket Maven repository. Its official sample documents the CafeBazaar and Myket
market bind addresses and a multi-store Gradle flavor configuration.

Gradle properties (public verification keys only; never commit keys):

- `BAZAAR_IAB_PUBLIC_KEY`
- `MYKET_IAB_PUBLIC_KEY`

Example local build after the publisher obtains the public keys:

```sh
gradle -p android-pilot \
  -PBAZAAR_IAB_PUBLIC_KEY='...' \
  -PMYKET_IAB_PUBLIC_KEY='...' \
  :app:assembleBazaarDebug :app:assembleMyketDebug
```

The five product IDs are currently proposed IDs and must be created and
approved in BOTH developer consoles before they become live catalog IDs:

| Plan | Product ID | Price (Toman) |
|---|---|---:|
| 30 days | `sahmino_pro_30d` | 150,000 |
| 60 days | `sahmino_pro_60d` | 285,000 |
| 90 days | `sahmino_pro_90d` | 405,000 |
| 180 days | `sahmino_pro_180d` | 765,000 |
| 365 days | `sahmino_pro_365d` | 1,460,000 |

## Critical billing implementation still required

The Gradle flavors and SDK dependency are wiring groundwork, NOT a completed
billing integration. The current subscription screen keeps the purchase action
disabled. Before enabling it, implement and test all of the following:

1. Confirm with each store that one-time consumable IAP is permitted for a
   fixed-duration digital Pro entitlement, and confirm SKU re-purchase rules.
   Do not use recurring subscriptions or auto-renew.
2. Implement the native SDK purchase flow for each flavor, with the current
   authenticated Sahmino account and a server-generated opaque purchase nonce.
3. Send purchase data to the Sahmino server; verify signature/receipt and
   package, SKU, amount, order, user and transaction identity server-side.
4. Atomically add the purchased plan duration to the account entitlement with
   idempotency and a payment ledger.
5. Consume a consumable purchase only after server verification and successful
   entitlement commit. If the server is unavailable, do not consume; reconcile
   on next launch.
6. Support restore/reconciliation, refunds/revocations and repeated callback
   handling. Do not trust local UI or installer package name for entitlement.
7. Test successful purchase, cancel, decline, duplicate receipt, network loss,
   consume failure, refund and reinstall on physical devices with each market.

## Release blockers

- Final package/application ID is still `ir.sahamban.pilot` (temporary); owner
  must approve and register a permanent ID in both consoles.
- Store accounts, app listings, five approved SKUs, public keys and sandbox
  test accounts are not yet supplied/verified.
- Native purchase-to-server receipt verification is not implemented.
- Permanent release signing key and secure CI signing are not configured.
- Store screenshots, descriptions, privacy/support URLs, content declarations
  and review submissions are still owner/store-console tasks.
- Debug artifacts must never be uploaded as release packages.

## CI

The store-specific debug build is the registration-preview package only; it is not a public release artifact.\n
GitHub Actions builds `app-bazaar-debug.apk` and `app-myket-debug.apk`
under artifact `sahmino-market-debug-apks-NOT-FOR-STORE`. These are only for
checking that both flavors compile. Physical-device store sandbox tests remain
required.
