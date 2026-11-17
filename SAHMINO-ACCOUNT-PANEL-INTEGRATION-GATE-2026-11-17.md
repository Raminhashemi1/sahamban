# Sahmino account panel and pending-order integration gate

Date: 2026-11-17
Branch: `feat/android-subscription-preview-20261115`
Reviewed HEAD: `f6849bdfb9a71e1bb88809c54937bf54bf674de7`

## Verified implementation

- The PWA already contains the five approved plan choices and final Toman display amounts in `index.html`. Reuse this UI; do not rebuild it.
- `server/prepaid-plans.cjs` owns the five final IRR prices.
- `server/d1-sahmino-subscription-v2.sql` defines the five-plan order catalogue, payment-event ledger, unique pending-order constraint and order-history indexes.
- `server/prepaid-orders-api.cjs` creates pending orders from server-owned prices and retrieves a user's pending order.
- `server/prepaid-account-overview.cjs` returns entitlement status and the latest 20 orders, merging v2 and legacy history.
- `server/worker-api.mjs` has cookie-authenticated OTP-session routes for overview and pending-order creation. The internal user ID comes from a validated active server-side session, not client input. Pilot JWT routes remain isolated.
- `sahmino-account-panel.js` resolves the OTP session, reads overview/history, checks for an existing pending order, and creates a pending order through `POST /api/v1/me/prepaid-orders`.
- The panel no longer calls the nonexistent `/api/v1/me/prepaid-checkout` route and never expects a checkout URL or redirects to a payment provider.
- Regression coverage is in `tests/sahmino-account-panel.test.cjs`, included in `.github/workflows/sahmino-subscription-v2.yml`.

## Latest verified CI evidence

For commit `f6849bdfb9a71e1bb88809c54937bf54bf674de7`, the Sahmino subscription v2 GitHub Actions job completed successfully. Its logs show all three new account-panel regression tests passing, together with the existing subscription, Worker API, settlement and D1 migration tests.

This is automated code-level evidence only. It is not a real browser, deployed Worker, production D1, SMS delivery, or physical-device acceptance test.

## Remaining blockers — do not enable public traffic

1. `window.SAHMINO_API_BASE` has no deployment value in the static PWA. The owner must provision and approve the private test Worker URL before browser-to-Worker integration can operate.
2. `SAHMINO_OTP_ENABLED` and `PREPAID_ORDERS_ENABLED` remain disabled by default. Do not enable them for public traffic.
3. The SMS adapter still requires a real provider binding, approved sender, credentials and sandbox delivery evidence. Tests use a fake/provider-neutral adapter only.
4. The D1 schema is tested with SQLite fixtures, but no separately provisioned test D1 database has been migrated. Production D1 must not be touched without inventory, backup, rollback and owner approval.
5. Cross-origin cookie persistence, CSRF behavior and account isolation still require acceptance on supported browsers and the Android WebView.
6. No verified end-to-end payment path is enabled. The Zarinpal adapter is a separately tested module, not proof of a deployed callback, order binding or payment settlement flow.
7. Auto-renew remains unavailable. Manual renewal is the default; do not implement or enable recurring charges without explicit consent and a supported provider contract.

## Next implementation sequence

1. Provision a private test Worker and test D1 after owner approval; record the exact API origin and set `SAHMINO_API_BASE` only in the approved deployment configuration.
2. Run OTP-session-to-order integration tests against test D1, including missing, expired and revoked sessions; cross-account isolation; origin/CSRF rejection; duplicate pending orders; and client price/user-ID tampering.
3. Verify SMS sandbox delivery and session-cookie persistence on a real phone and supported mobile browsers.
4. Only then begin provider-specific sandbox checkout and server-side receipt/callback verification. A pending order must never grant Pro.
5. Keep Bazaar, Myket, website and Google Play purchase paths separate until their product IDs, signatures and verification contracts are confirmed.

## Safety state

- Checkout and payment activation remain disabled.
- A pending order is not a payment and must never grant Pro.
- Auto-renew remains unavailable; manual renewal is the default.
- No production D1 migration, public deployment, release or merge is authorized by this work.
- Do not merge this feature branch into `main` without explicit owner approval.
