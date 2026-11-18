# Cafe Bazaar fixed-term billing release checklist

Do not enable checkout until every item below is completed and verified.

## Product setup
- [ ] Confirm the final Android applicationId/package name in Bazaar.
- [ ] Create five managed, one-time in-app products (not auto-renewing subscriptions).
- [ ] Configure exact product IDs for 30, 60, 90, 180 and 365 days.
- [ ] Confirm displayed prices and currency with the product owner. The server is authoritative and uses IRR internally; the customer-facing UI must label amounts in toman if that is the agreed product requirement. Never silently divide or relabel values.

## Trusted server
- [ ] Bind private D1 database as `SAHAMBAN_DB` and apply the prepaid schema/migrations.
- [ ] Configure `BAZAAR_BILLING_ENABLED=true` only after tests pass.
- [ ] Store `BAZAAR_CLIENT_ID`, `BAZAAR_CLIENT_SECRET` and `BAZAAR_REFRESH_TOKEN` as Worker secrets (never in Android, PWA, logs or repository).
- [ ] Set `BAZAAR_PACKAGE_NAME` to the exact production package.
- [ ] Set `BAZAAR_PRODUCT_IDS_JSON` to a JSON object mapping the five server plan IDs to the exact Bazaar product IDs.
- [ ] Deploy the Worker and verify authenticated receipt checks against Bazaar test purchases.

## Android and recovery
- [ ] Set the real applicationId and HTTPS Worker base URL in the signed Android release configuration.
- [ ] Obtain the authenticated bearer token from the app's approved identity flow; never hardcode or mint it in the WebView.
- [ ] Wire purchase initiation to a native screen/bridge with strict origin and caller validation.
- [ ] After purchase, submit the server order ID, SKU and purchase token to the Worker.
- [ ] Grant access only from a successful server SETTLED response.
- [ ] Consume the managed purchase only after settlement.
- [ ] On app start/restore, query unconsumed purchases and submit each to the same server verification endpoint; never grant access from local purchase history alone.

## Release gates
- [ ] Worker tests and Android debug/release builds pass on the exact PR head.
- [ ] Test all five plans, cancellation, network interruption, duplicate callbacks, refunded/invalid receipt, account mismatch and reinstall/restore.
- [ ] Verify extension of an existing paid term, exact expiry, and idempotent repeated receipt delivery.
- [ ] Review privacy disclosures and Bazaar billing requirements.
- [ ] Keep checkout disabled until all release gates are green.
