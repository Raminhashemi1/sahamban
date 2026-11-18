# Billing V2 — Cafe Bazaar subscriptions

This directory implements the subscription-specific billing domain.

- Five Bazaar subscription SKUs: 30/60/90/180/365-day billing periods.
- Price catalog is integer IRR (never toman); the matching prices must also be configured in Bazaar Pishkhan.
- Android checkout uses Poolakey \`subscribeProduct\`, not \`purchaseProduct\`.
- Restore uses \`getSubscribedProducts\`, not \`getPurchasedProducts\`.
- Subscription tokens are never consumed.
- Backend verifies through Bazaar's subscription-validation API, not the in-app-product validation route.
- The provider's verified expiry is authoritative. Local code must never invent or extend a subscription period by adding plan days.
- Order, user, SKU and server-side price must match before access can be granted.
- The client callback is only evidence; it cannot activate access by itself.
- Renewal state and expiry must be refreshed from the provider. Cancellation of auto-renewal does not immediately revoke already-paid access.

## Release blockers

1. Configure five subscription products in Bazaar Pishkhan with the exact SKUs and periods.
2. Confirm whether each product renews automatically and document cancellation/refund terms in the app before checkout.
3. Confirm the exact response fields and lifecycle behavior against a real Bazaar test purchase using the developer account. The public Poolakey docs describe the client SDK; they do not replace the merchant's current commercial/legal agreement.
4. Apply \`schema.sql\` to an isolated D1 database and run integration tests.
5. Add secure periodic/server-side refresh for renewals, cancellations, refunds and expiry.
6. Keep \`BILLING_V2_ENABLED=false\` until all release blockers pass.

Do not submit the app to Bazaar or enable live payments based only on unit tests.
