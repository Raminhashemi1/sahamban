# Cafe Bazaar integration notes

## SDK
The supplied dossier identifies Poolakey 2.3.0 in the Android pilot Gradle configuration. Poolakey's API distinguishes in-app purchases from recurring subscriptions and supports purchase, inventory query, and consume operations. Sahmino's five fixed-duration plans are implemented as one-time consumable in-app products, not auto-renewing subscriptions.

## Client flow
1. Backend creates the order and returns the Bazaar product SKU from server configuration.
2. Native app connects to Poolakey and starts purchaseProduct for that SKU.
3. Set Poolakey PurchaseRequest.payload to the backend orderId.
4. Send the purchase token and orderId to POST /api/v2/billing/verify.
5. The Worker obtains an OAuth access token with the developer refresh token and calls the Bazaar Developer API v2 in-app validation endpoint.
6. Only when purchaseState is 0, developerPayload equals the server order ID, and the item is not yet consumed does the backend settle.
7. After backend PAID response, native app calls Poolakey consumeProduct(purchaseToken).
8. On app restart, query unconsumed purchases and retry the same verification call; an already-paid order is accepted idempotently only when its purchase-token hash matches.

## Server API
OAuth token refresh:
- POST https://pardakht.cafebazaar.ir/devapi/v2/auth/token/
- Form fields: grant_type=refresh_token, client_id, client_secret, refresh_token.

In-app purchase validation:
- GET https://pardakht.cafebazaar.ir/devapi/v2/api/validate/{packageName}/inapp/{productId}/purchases/{purchaseToken}/?access_token={accessToken}

The server verifier checks:
- purchaseState = 0 (purchased; 1 means refunded),
- developerPayload equals the persisted server order ID,
- consumptionState = 1 for first settlement (not consumed),
- for idempotent replay of a PAID order, consumptionState may be 0 only if the stored token hash matches the same verified transaction.

Implementation:
- server/providers/bazaar-verifier.mjs
- Inject config from Worker secrets/bindings: BAZAAR_PACKAGE_NAME, BAZAAR_CLIENT_ID, BAZAAR_CLIENT_SECRET, BAZAAR_REFRESH_TOKEN.
- BAZAAR_SKU_MAP is server-side product mapping. Never accept SKU or price from client.
- Amount is resolved from the canonical server catalog; keep the Bazaar panel price for each configured SKU exactly aligned with the canonical IRR amount.

The endpoint and response fields above are based on the Bazaar Developer API v2 documentation URL referenced by Poolakey's source documentation and the API implementation reference reviewed during development. Before release, verify the credentials and exact API access scope in the developer panel and perform a real sandbox/test purchase. No credentials are stored in the repository.
