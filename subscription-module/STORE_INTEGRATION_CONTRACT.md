# Store integration contract

The app has one shared subscription domain and two independent store adapters.

## Distribution rule
- Bazaar-distributed app: route purchases only through Bazaar billing.
- Myket-distributed app: route purchases only through Myket billing.
- Both distributions use the same backend entitlement service and account identity.
- Product/SKU identifiers are configured separately per store and must come from the respective developer console. Never invent them or assume they match.

## Shared adapter interface
Each concrete adapter must support:
- connect
- query product details
- purchase a configured SKU with an opaque server order reference
- query owned/pending purchases for recovery
- consume/acknowledge only after backend settlement, as required by that store's product type/API
- disconnect / lifecycle cleanup

## Trust boundary
The client may submit purchase evidence, but the server must:
1. Load the pending order belonging to the authenticated user.
2. Select the verifier for the order's store.
3. Verify package identity, SKU, purchase state, token/order identity, and refund/revocation state with that store's trusted API.
4. Ensure the purchase maps to the expected server-owned plan and amount.
5. Settle exactly once.
6. Return the server entitlement.

Do not grant entitlement based solely on client callbacks or client-supplied price, duration, user ID, or expiry.

## Release caution
Gradle flavors are a candidate way to package only the matching SDK in each store artifact. Do not merge the example Gradle snippet until the actual host app Gradle/Kotlin versions and both stores' package/signing policies are checked.
