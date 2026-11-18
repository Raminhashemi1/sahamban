# Billing v2

New fixed-term billing domain, authored independently of the legacy prepaid modules.

- Five plans: 30/60/90/180/365 elapsed UTC days.
- Prices stored in integer IRR.
- One-time Cafe Bazaar managed products; no automatic renewal.
- Server-owned plan and amount; the client never supplies price.
- Receipt verification must precede settlement.
- Duplicate purchase tokens must never extend access twice.
- Early repurchase extends from max(current expiry, server now).
- Android callbacks and local storage never grant Pro.
- schema.sql is a new isolated schema and is not auto-applied.
- Keep live checkout disabled until product IDs, credentials, package identity and end-to-end tests are ready.
