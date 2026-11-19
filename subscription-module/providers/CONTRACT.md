# Marketplace provider contract (independent billing module)

## Purpose
One application codebase serves both stores. A runtime-selected provider adapter performs the store-specific purchase and verification flow. Both adapters settle into the same user entitlement ledger.

## Trust boundaries
1. The Android client starts the purchase flow with the selected store SDK.
2. The client sends the resulting opaque purchase evidence to the authenticated Worker endpoint.
3. The Worker selects the provider adapter from the order's persisted `store` field, not from a client-supplied provider name.
4. The provider adapter verifies the evidence against the store's official verification mechanism.
5. Only a normalized `verified: true` result from that server-side adapter may be passed to `settleVerifiedPurchase`.
6. The server returns entitlement state; the client never activates an entitlement itself.

## Required server adapter interface

Each provider module must implement:

```js
export async function verifyPurchase({
  order,
  evidence,
  credentials,
  fetchImpl
}) {
  // Return null or { verified: false, reason: '...' } on any uncertainty.
  // On success return only:
  // {
  //   verified: true,
  //   store: 'BAZAAR' | 'MYKET',
  //   storeOrderId: '...',
  //   productId: '...',
  //   amountIrr: 123,
  //   purchaseTokenHash: '<64-char lowercase SHA-256 hex>'
  // }
}
```

Rules:
- Never trust a client boolean, callback success, product ID, amount, package name, order ID, or claimed store without checking it against the persisted order and official provider response.
- Never accept a provider response that cannot be authenticated or whose fields are incomplete.
- Never store or log raw purchase tokens, signatures, private keys, client secrets, or refresh tokens.
- Hash purchase tokens with SHA-256 before persistence.
- Timeouts, malformed responses, network errors, unknown response codes, and unverifiable states fail closed.
- Enforce provider, application package identity, product ID, transaction/order ID, purchase state, and amount/currency where the provider exposes them.
- A store-specific verifier must be selected using the store value stored on the order. Do not allow the request body to switch adapters.

## Consumption policy
For consumable products, call the provider's consume operation only after the server confirms successful settlement. If settlement fails or is indeterminate, do not consume; allow a safe retry/reconciliation path. Consumption itself must be retried idempotently and tracked separately. Do not treat consumption success as proof of payment.

## Refund/reversal policy
A verified refund/reversal must be an authenticated provider event. It must create an immutable `PURCHASE_REVERSED` event and apply a documented entitlement policy. Do not infer refund from client state or delete historical order/event rows.

## Runtime store selection in the single app codebase
- Resolve the marketplace from trusted Android install-source information or another platform-authenticated signal.
- Map only explicitly approved installer identities to `BAZAAR` or `MYKET`.
- Unknown or sideloaded installation sources must disable in-app purchase rather than silently selecting a store.
- Keep one shared PWA/UI and entitlement API; only the native billing adapter differs.
- Installer package identifiers and the exact Myket SDK/API protocol are intentionally not guessed. They must be confirmed from current official documentation and a real test installation before implementation.

## Current integration status
- Bazaar: dossier identifies Poolakey 2.3.0 and its purchase/consume flow. The independent server verifier still needs to be implemented and tested against the official Bazaar API.
- Myket: official developer portal is identified at https://developer.myket.ir/fa/, but its technical page content could not be retrieved in the current research pass. No Myket endpoint, SDK signature, response schema, or installer package name is invented here.
- Both: no production credentials or store product IDs are committed.
