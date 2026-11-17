# Sahmino account panel and pending-order integration gate

Date: 2026-11-17
Branch: `feat/android-subscription-preview-20261115`
Reviewed HEAD: `b03406e06fed2e58240e56b71d558595afea3613`

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

## Progress update — 2026-11-17

Reviewed the current Worker routes, order API, account overview, PWA panel, and existing integration gate before making changes.

- Completed the PWA pending-order integration in `sahmino-account-panel.js`: GET and POST use the existing `/api/v1/me/prepaid-orders` cookie-authenticated route.
- The panel reuses the five existing server-approved plan IDs. It first checks for an existing pending order, then creates one only when none exists.
- Removed the obsolete `/api/v1/me/prepaid-checkout` call and all checkout URL handling/redirect behavior from this panel.
- The UI explicitly states that a pending order is not a payment and does not activate Pro.
- Added `tests/sahmino-account-panel.test.cjs` to guard the route, no-checkout safety, and five plan IDs; included it in the subscription-v2 CI workflow.
- GitHub Actions run `44128816453` (subscription-v2 validation on the updated branch head) completed successfully. The syntax, Node unit/API tests, OTP migration/runtime checks, subscription migration checks, and SQLite settlement integration steps all passed.

### Still not accepted / not deployed

- This does not establish that the production PWA has a configured `SAHMINO_API_BASE`, exact-origin CORS allowlisting, or deployed Worker feature flags.
- No real SMS vendor sandbox delivery, production/test D1 provisioning evidence, or physical Android WebView cookie-persistence acceptance was performed here.
- Checkout and automatic renewal remain disabled; pending orders grant no entitlement.
- Pull request #185 remains open and draft. No merge to `main`, public feature-flag enablement, or production deployment was performed.

Next safe gate: provision a private test Worker and test D1 with the owner, configure the exact PWA origin, then verify OTP session persistence and order creation on a real Android WebView before considering any public rollout.


## Progress update — API-origin safety hardening

- Re-read the current branch files and confirmed that the PWA has no deployment value for `window.SAHMINO_API_BASE`; no API hostname was invented or added.
- Hardened `sahmino-account-panel.js`: OTP/account requests now proceed only when the configured API base parses as an HTTPS origin with no path, query, fragment, username or password. Missing or malformed configuration fails closed before any fetch.
- Added VM-based regression coverage for missing configuration, plain HTTP, path-bearing URLs, embedded credentials, query strings and fragments; a valid HTTPS origin is verified to receive credentialed requests.
- Existing CI already includes `tests/sahmino-account-panel.test.cjs`; no duplicate workflow change was needed.
- GitHub Actions run `44129495111` completed successfully on branch commit `b03406e06fed2e58240e56b71d558595afea3613`. The subscription job reports 59 Node tests passing (0 failed), plus successful syntax, OTP migration/runtime, subscription migration and SQLite settlement integration steps.

### Remaining environment gates

- The exact Worker API origin still must be provided/configured by the owner. The PWA intentionally remains disconnected while that value is absent.
- The existing Worker deployment workflow is manual-only, restricted to `main`, requires the exact approval phrase `DEPLOY_PILOT_NO_PAYMENTS`, and uses owner-controlled Cloudflare environment credentials. This work did not invoke it.
- The OTP service binding, D1 OTP/session migration on an approved test database, real SMS sandbox delivery, same-site cookie strategy, and physical Android WebView acceptance remain unverified.
- No deployment, D1 migration, feature-flag enablement, payment activation, automatic renewal, merge or release was performed.
