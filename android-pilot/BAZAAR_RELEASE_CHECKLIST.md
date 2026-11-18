# Cafe Bazaar manual time-plan release checklist

Do not enable checkout or submit the app until every item is completed.

## Product setup
- [ ] Confirm the final Android applicationId/package name registered in Bazaar.
- [ ] Create five **consumable in-app products**, not Subscription products, for the 30, 60, 90, 180 and 365-day access plans.
- [ ] Record the exact five Product IDs and map them to the internal plan IDs in \`BAZAAR_SKU_MAP\`.
- [ ] Confirm the five products are configured as consumable and have the approved prices.
- [ ] Confirm Bazaar returns localized Rial price strings; app display must convert the amount to Toman (divide by 10) and label it تومان.
- [ ] Confirm user-facing text says every term is renewed only by a new explicit purchase; no automatic debit.

## Trusted server
- [ ] Bind private D1 database as \`SAHAMBAN_DB\` and apply \`server/billing/schema.sql\` after the base user schema.
- [ ] Store \`BAZAAR_CLIENT_ID\`, \`BAZAAR_CLIENT_SECRET\`, \`BAZAAR_REFRESH_TOKEN\` as Worker secrets only.
- [ ] Set \`BAZAAR_PACKAGE_NAME\` to the final package and \`BAZAAR_SKU_MAP\` to the exact five Product IDs.
- [ ] Configure \`BAZAAR_RSA_PUBLIC_KEY\` matching the app's Pishkhan public key.
- [ ] Verify the live Bazaar in-app product validation response, including product kind, purchase state, consumption state, purchase time and order ID.
- [ ] Confirm the Worker rejects refunds, already-consumed receipts, wrong package/SKU/order, invalid signature and replay.

## Android and account recovery
- [ ] Connect Poolakey \`purchaseProduct\`, \`getInAppSkuDetails\`, \`getPurchasedProducts\` and \`consumeProduct\`.
- [ ] Consume a purchase token only after successful server verification and durable D1 entitlement settlement.
- [ ] If consume fails, keep the entitlement active and retry reconciliation before allowing a duplicate purchase of the same SKU.
- [ ] Load already-settled access from the authenticated Worker account; consumed Bazaar products will no longer be in the pending-purchase inventory.
- [ ] Connect the existing production authenticated identity/session to the HTTPS Billing V2 API. Never hardcode credentials or tokens in WebView.
- [ ] Wire the five plan buttons to server order creation, native \`purchaseProduct\`, server verification, then token consumption.
- [ ] Test early repurchase stacking days after the current paid-until time.

## Release gates
- [ ] Run D1 migration, Worker tests and Android debug build on the exact PR head.
- [ ] Test purchase, verification, consume, consume failure/retry, repurchase, refund/reversal, network loss, account switching, reinstall and entitlement reload on a Bazaar-enabled physical device.
- [ ] Confirm price display in Toman and disclose manual-renewal and refund terms before checkout.
- [ ] Keep checkout disabled until all gates pass.
