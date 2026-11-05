# Zero-domain-cost launch path — Sahamban Pro 1.0

## Owner decision
The owner does not want to purchase a domain or pay upfront for hosting. A paid custom domain is therefore **not a release prerequisite** for the first controlled pilot. Do not purchase one or block independent development on it.

## Recommended staged path

### Stage 1 — no-domain, no-upfront-cost pilot
- Keep the public PWA on its existing GitHub Pages address.
- Do not collect card details, bank credentials, OTPs, or screenshots as proof of payment inside the app.
- Initially invite a small, controlled group of pilot users.
- If paid access is tested before a payment API exists, issue a unique invoice/order ID and display the amount and bank transfer instructions only after an administrator configures them privately.
- An administrator must reconcile the incoming transfer against the actual bank statement/transaction record, matching amount, time, payer/reference and order ID, before granting access. A user-uploaded receipt or success redirect is never sufficient.
- Record each verified settlement once; refunds/disputes suspend access pending review. Use the server-side entitlement and order state machines already in this repository.
- Clearly label this as a manual pilot, not an automated checkout or full commercial launch.

### Stage 2 — provider-hosted payment link (still no custom domain)
- Evaluate a payment-link provider that hosts the checkout page on its own domain and explicitly accepts software subscriptions/financial-analysis services.
- The user shares the hosted link from Sahamban; no custom domain is needed for the checkout page.
- Before selection, obtain written confirmation of merchant eligibility, identity/business requirements, fees, settlement destination, API/webhook availability, refund/chargeback handling and terms.
- Some no-site link products are card-to-card services that rely on SMS forwarding from the merchant's Android phone. These are not the same as a direct Shaparak PSP gateway and should not be described as such.
- Automatic activation is allowed only after a server-side authenticated provider API/webhook verifies exact order, amount, currency, merchant and final settlement status. If the provider only offers a dashboard/manual link, retain manual bank reconciliation; never trust browser callback or uploaded receipt.

### Provider shortlist for no-site checkout
- Bluepal publicly describes hosted payment links without a website and a server-side transaction confirmation step. It is a candidate to ask about; its public page alone does not prove approval for annual subscriptions or this investment-analysis service.
- Payexa documents a no-website payment link, but it uses personal card-to-card transfer, an Android SMS-forwarding app, an active personal-card setup and a fee wallet. Treat it as a different, operationally dependent payment method, not a direct bank PSP or preferred commercial checkout.
- Do not create an account, submit identity documents or accept a provider's terms on the owner's behalf. Compare fees and obtain explicit written acceptance of the business category first.

### Stage 3 — free backend subdomain, only if required
- A free workers.dev endpoint may be evaluated for a prototype backend; it does not require buying a domain and Cloudflare documents a free Workers plan quota.
- It is a hobby/free endpoint, not automatically suitable for a business-critical financial service. Review availability, data residency, privacy, Iran network reachability, account eligibility, provider callback reachability, secrets management and persistence before using it for production.
- Do not deploy real payment secrets or production customer data until the backend and security controls are accepted.
- The current GitHub Pages PWA is static and cannot safely store gateway secrets, verify settlements, or enforce subscription entitlements by itself.

## No-upfront-cost constraints
- Domain purchase: not required for the pilot.
- Paid hosting: not required for a manual, limited pilot.
- Payment processing fees: cannot be assumed to be zero; any provider may charge per transaction or require a wallet balance.
- Compliance: identity/KYC, tax, consumer terms and financial-service eligibility may still apply even without a website/domain.
- No guarantee that a provider will accept GitHub Pages, a free subdomain, a manual-transfer model or this specific financial-analysis product. Confirm in writing before promising live checkout.

## Security acceptance checklist
- [ ] User account is authenticated on a trusted server.
- [ ] Server generates an immutable order ID and reads amount from server-side plan catalog.
- [ ] A receipt image, browser redirect, query parameter or client success=true never grants Pro access.
- [ ] Payment is verified either by direct provider server-to-server verification or by administrator reconciliation against actual bank records.
- [ ] Event/payment IDs are unique in a transactional persistent database.
- [ ] Refunds/chargebacks suspend access pending reconciliation.
- [ ] Paid entitlement is checked server-side for premium APIs; hiding buttons in static PWA is not access control.
- [ ] Pilot terms, privacy, support and cancellation/refund rules are visible.

### Stage 1 manual-transfer control model now in repository

`manual-bank-reconciliation.cjs` and `tests/manual-bank-reconciliation.test.cjs` implement and test a server-only domain rule: a pending order can only be marked manually verified after an authenticated payment-reconciler role independently checks a matching settled bank credit. The module does not access a bank, authenticate a real admin, persist a ledger, or activate Pro on its own. Production must enforce admin authorization, transaction uniqueness and atomic order/entitlement writes in a trusted backend. Do not expose this function directly to a browser.

## Current state
Existing server-only order and annual-entitlement modules are testable business logic, not a deployed backend. No bank account, payment provider, payment link, free backend account, credentials or merchant approval has been assumed. Gate C remains OPEN until an actual verified payment and entitlement lifecycle passes end-to-end acceptance.