# Cafe Bazaar manual time-plan release checklist

Use the two-stage upload below. The first signed bootstrap upload intentionally has checkout disabled and does not require store product IDs. Public paid release remains blocked until all acceptance gates pass.

## Stage 1 — bootstrap package before product IDs exist
- [ ] Build the complete Bazaar flavor with the permanent package `ir.sahmino.app` and checkout disabled (`SAHAMBAN_BILLING_ENABLED` unset/false; no SKU variables).
- [ ] Sign the bootstrap APK/AAB with the owner's production key in a secure local/CI signing environment. Never use the debug certificate.
- [ ] Upload to the unpublished/draft Bazaar listing or the initial track required by Bazaar to register the app package. Do not enable public checkout or announce release.
- [ ] After the package is registered and Bazaar exposes in-app product setup, create the five consumable products below and record the generated Product IDs.

## Stage 2 — configure store products after the first upload

## Product setup
- [ ] Confirm the final Android applicationId/package name registered in Bazaar.
- [ ] Create five **consumable in-app products**, not Subscription products, for the 30, 60, 90, 180 and 365-day access plans.
- [ ] Record the exact five Product IDs and map them to the internal plan IDs in `BAZAAR_SKU_MAP`.
- [ ] Confirm the five products are configured as consumable and have the exact approved Rial prices:

| Internal plan | Bazaar price (IRR) |
|---|---:|
| `SAHAMBAN_PRO_30D` | 1,500,000 |
| `SAHAMBAN_PRO_60D` | 2,850,000 |
| `SAHAMBAN_PRO_90D` | 4,050,000 |
| `SAHAMBAN_PRO_180D` | 7,650,000 |
| `SAHAMBAN_PRO_365D` | 14,600,000 |
- [ ] Confirm Bazaar returns the approved localized Rial (IRR) price string; preserve it verbatim and do not convert it to Toman.
- [ ] Confirm user-facing text says every term is renewed only by a new explicit purchase; no automatic debit.

## Trusted server
- [ ] Bind private D1 database as `SAHAMBAN_DB` and apply `server/billing/schema.sql` after the base user schema.
- [ ] Store `BAZAAR_CLIENT_ID`, `BAZAAR_CLIENT_SECRET`, `BAZAAR_REFRESH_TOKEN` as Worker secrets only.
- [ ] Set `BAZAAR_PACKAGE_NAME` to the final package and `BAZAAR_SKU_MAP` to the exact five Product IDs.
- [ ] Configure `BAZAAR_RSA_PUBLIC_KEY` matching the app's Pishkhan public key.
- [ ] Verify the live Bazaar in-app product validation response, including product kind, purchase state, consumption state, purchase time and order ID.
- [ ] Confirm the Worker rejects refunds, already-consumed receipts, wrong package/SKU/order, invalid signature and replay.

## Android and account recovery
- [ ] Connect Poolakey `purchaseProduct`, `getInAppSkuDetails`, `getPurchasedProducts` and `consumeProduct`.
- [ ] Consume a purchase token only after successful server verification and durable D1 entitlement settlement.
- [ ] If consume fails, keep the entitlement active and retry reconciliation before allowing a duplicate purchase of the same SKU.
- [ ] Load already-settled access from the authenticated Worker account; consumed Bazaar products will no longer be in the pending-purchase inventory.
- [ ] Connect the existing production authenticated identity/session to the HTTPS Billing V2 API. Never hardcode credentials or tokens in WebView.
- [ ] Wire the five plan buttons to server order creation, native `purchaseProduct`, server verification, then token consumption.
- [ ] Test early repurchase stacking days after the current paid-until time.

## Stage 3 — final paid update and release gates
- [ ] Map the five generated Bazaar Product IDs to the five internal plan IDs in `BAZAAR_SKU_MAP`.
- [ ] Build the next version with the exact generated SKUs, Bazaar public key and Worker URL. The release variant must enable checkout only after its complete readiness gate passes.
- [ ] Sign with the same owner-controlled production key and upload the update to the same Bazaar listing.

## Release gates
- [ ] Run D1 migration, Worker tests and Android debug build on the exact PR head.
- [ ] Test purchase, verification, consume, consume failure/retry, repurchase, refund/reversal, network loss, account switching, reinstall and entitlement reload on a Bazaar-enabled physical device.
- [ ] Confirm price display in Rial (IRR) and disclose manual-renewal and refund terms before checkout.
- [ ] Keep checkout disabled until all gates pass.
