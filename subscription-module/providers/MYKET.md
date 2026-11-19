# Myket integration notes (official Android sample reviewed)

Source reviewed:
- Official Myket organization sample: https://github.com/myketstore/billing-sample-android
- Current sample README declares Maven artifact `ir.myket:billing:2.2`, Java/Kotlin support, and Android API 21+.
- The official sample documents the IAB v3 `IabHelper` flow: `startSetup`, `queryInventoryAsync`, `launchPurchaseFlow`, and `consumeAsync`.
- The sample documents signed purchase fields: order ID, package name, product ID/SKU, purchase time, purchase state, developer payload, purchase token, original JSON, and signature.
- The official sample documents a multi-store Gradle flavor pattern with Myket and Bazaar market service identifiers and a store-specific public key.

## Product type for Sahmino
The five Sahmino offers are fixed-duration, manually renewed access periods. They are NOT automatic recurring subscriptions. Configure each as a one-time consumable in-app product in Myket, then consume only after the backend confirms settlement. The entitlement duration is maintained by Sahmino's backend.

## Client contract
For every purchase:
1. Backend creates the order first.
2. Native Myket SDK launches an in-app purchase for the SKU configured for that plan.
3. Set the SDK developer payload to the backend `orderId`.
4. Send only `orderId`, `originalJson`, and `signature` to `POST /api/v2/billing/verify`.
5. Wait for the backend's `PAID` result.
6. Only then call Myket `consumeAsync` for the returned purchase.
7. If the app is interrupted before consume, query inventory on next launch and retry verification/consumption idempotently.

Do not send or log raw purchase tokens except where the SDK's local consume API requires the token. The server stores only SHA-256(token).

## Server verifier implemented here
`server/providers/myket-verifier.mjs` verifies the signed `originalJson` using RSASSA-PKCS1-v1_5 with SHA-1 and the Myket app public key, then checks:
- exact application package name,
- completed purchase state,
- product ID matches the server-created order,
- developer payload equals the server order ID.

The order amount is taken from the server's canonical plan catalog, never from the client receipt. Myket's signed IAB purchase JSON does not expose a trusted paid-amount field in the reviewed sample, so the configured Myket SKU price must be kept equal to the canonical IRR amount in the developer panel.

This is cryptographic signature verification of the signed purchase response. It is not a live Myket Developer API status/refund lookup. Refund/reversal reconciliation must not be claimed complete until the official Developer API endpoint and credentials are confirmed.

## Configuration injected into Worker
- `MYKET_PUBLIC_KEY_BASE64`: Base64 DER/SPKI RSA public key from the Myket developer panel.
- `MYKET_PACKAGE_NAME`: exact production Android applicationId.
- `MYKET_SKU_MAP`: server-side map from canonical plan IDs to Myket product IDs.

Never commit the public key, SKU map, or production package identity as guessed values. Public keys are not private credentials, but they must be the correct app-specific key.

## Multi-store packaging
The official Myket sample explicitly demonstrates Gradle product flavors:
- Myket market package: `ir.mservices.market`
- Bazaar market package: `com.farsitel.bazaar`

Use store-specific manifest placeholders and public keys per flavor. This is the preferred practical implementation for one shared source tree with two store-compatible artifacts, unless host app/store policy validation proves a single artifact is accepted and reliably routes to the correct billing provider.

## Verification boundary
The verifier has automated cryptographic tests using generated RSA keys. It still requires a real Myket app-specific public key and real test purchase on a device distributed/tested through Myket before release certification.
