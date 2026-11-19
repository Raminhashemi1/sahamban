# Sahmino dual-store physical acceptance matrix

This matrix is for owner-run physical-device acceptance after the production session provider, store product IDs, developer credentials, and Worker deployments are configured. It is not evidence that these live tests have already been run.

Run every row separately on the Bazaar build and the Myket build. Record app version, package ID, store account, Worker deployment, order ID, and result. Never record full purchase tokens or signing keys in screenshots or logs.

| Case | Action | Expected result |
|---|---|---|
| Account required | Open purchase screen signed out | Checkout unavailable; no order created |
| Store unavailable | Disable/uninstall the target marketplace app | Clear unavailable state; no entitlement |
| Product mapping | Open each of the five plans | Correct store-local product and IRR price shown |
| Wrong SKU | Substitute a different store SKU in a test build | Server rejects order/product mismatch |
| Invalid signature | Alter one byte in original JSON or signature | Server rejects; no entitlement grant |
| Wrong package | Submit a valid receipt from a different package | Server rejects |
| Wrong account payload | Submit receipt whose developer payload is another order ID | Server rejects |
| User cancels | Cancel the marketplace checkout | UI reports cancellation; order remains unpaid and access unchanged |
| Successful purchase | Buy each plan | Server verifies and grants the exact fixed duration |
| Duplicate callback | Submit the same valid evidence twice | One grant only; second response is idempotent |
| App killed before verify | Complete store purchase, terminate app before Worker verify, relaunch and restore | Server reconciliation recovers the valid purchase and settles once |
| Network lost before verify | Complete purchase while offline | No local entitlement; pending receipt is retried after connectivity returns |
| Consume failure | Simulate store consume failure after server settlement | Entitlement remains active; client reports pending consume and retries safely |
| Early renewal | Buy a second plan before current access expires | New duration is appended to current expiry |
| Expired account | Buy after entitlement expiry | New duration begins from verified purchase time/current settlement time according to backend rule |
| Cross-store account | Buy through Bazaar, sign in to same account in Myket build | Same server entitlement is visible; no second user ledger |
| Cross-account restore | Attempt to settle a receipt under another account | Server rejects; no cross-account grant |
| Myket refunded state | Use an approved test refund and inspect signed purchase state / developer portal | Must trigger the approved revocation process before public launch |
| Bazaar refund | Use an approved test refund and replay verification | Server must reject/reverse according to Bazaar Developer API result |
| Logout/login | Sign out and sign into another account on same device | Previous account entitlement is not shown to the new account |
| Expiry display | Compare UI expiry with server entitlement endpoint | Same UTC expiry converted to local display consistently |

## Acceptance criteria

- No access is activated from a client-side store callback alone.
- Every successful grant has one authenticated user, one pending order, one exact SKU/plan mapping, one verified store transaction, and one idempotent settlement event.
- Duplicate or cross-account evidence never extends access.
- Purchases remain consumable only after server settlement.
- Bazaar and Myket builds use their own store SDK but the same authenticated user and D1 entitlement ledger.
- Refund/revocation handling is demonstrated before checkout is enabled publicly.
