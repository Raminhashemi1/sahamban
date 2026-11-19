# Provider-neutral billing contract

Each store adapter must implement the same app-facing operations:

- connect
- load product details
- purchase a configured SKU with an opaque server order reference
- query owned purchases for recovery
- consume/acknowledge only after backend settlement, according to store rules
- disconnect

Normalized purchase evidence may include store, SKU, store order ID, purchase token,
package name, purchase time, opaque order reference, and signed data/signature when
the SDK provides them.

Never trust client-provided price, duration, user ID, or entitlement expiry.
The server resolves plan and SKU from its own catalog and store mapping.
