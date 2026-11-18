# Cafe Bazaar subscription release checklist

Do not enable checkout or submit the app until every item is completed.

## Product setup
- [ ] Confirm the final Android applicationId/package name in Bazaar.
- [ ] Create five actual subscription SKUs (not one-time in-app products) for the agreed 30, 60, 90, 180 and 365-day terms, if Bazaar Pishkhan offers those exact billing periods.
- [ ] Confirm in Pishkhan that each SKU's billing period is exactly the required duration. Do not approximate a 30-day term with a calendar month or a 365-day term with a year unless Bazaar's configured product definition explicitly matches.
- [ ] Configure and verify all five product IDs. Never ship placeholder SKUs.
- [ ] Confirm the final customer-facing prices with the product owner. The UI must show toman, not rial; do not invent prices or silently relabel the Bazaar localized price.

## Trusted server
- [ ] Bind private D1 database as \`SAHAMBAN_DB\` and apply \`server/billing/schema.sql\` after the base user schema.
- [ ] Store \`BAZAAR_CLIENT_ID\`, \`BAZAAR_CLIENT_SECRET\`, \`BAZAAR_REFRESH_TOKEN\` as Worker secrets only.
- [ ] Set \`BAZAAR_PACKAGE_NAME\` to the final package and \`BAZAAR_SKU_MAP\` to the exact five-SKU JSON mapping.
- [ ] Verify the real Bazaar subscription-validation response, including \`kind\`, \`validUntilTimestampMsec\`, \`autoRenewing\`, and whether the response returns \`developerPayload\`. The backend deliberately fails closed if the order binding cannot be proven.
- [ ] Verify access token refresh and error handling against the live developer API using a test purchase.

## Android and recovery
- [ ] Set the final applicationId and configure the matching Bazaar RSA public key as \`BAZAAR_RSA_PUBLIC_KEY\` during build.
- [ ] Confirm Poolakey local signature verification and subscription capability on a Bazaar-enabled device.
- [ ] Connect the existing authenticated identity flow to the HTTPS Billing V2 API; never hardcode credentials or tokens in WebView.
- [ ] Wire the five plan buttons to server order creation, then native \`subscribeProduct\`, then server verification.
- [ ] Grant access only after successful server verification and durable settlement.
- [ ] Restore using \`getSubscribedProducts\` and revalidate each token server-side. Never grant access from local purchase history alone.
- [ ] Refresh provider expiry and auto-renewal status; cancellation of auto-renewal must not revoke already-paid access.

## Release gates
- [ ] Confirm the exact five billing periods are supported/configurable by Bazaar.
- [ ] Run D1 migration, Worker tests, Android build, and test purchase on the exact PR head.
- [ ] Test new subscription, cancellation, renewal, expiration, refund/reversal, duplicate callbacks, network loss, account switching, reinstall and restore.
- [ ] Confirm price display in toman and disclose renewal/cancellation/refund terms before checkout.
- [ ] Keep checkout disabled until all gates pass.
