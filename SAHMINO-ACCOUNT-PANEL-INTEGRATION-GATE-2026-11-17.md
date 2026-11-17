# Sahmino account panel and order history — integration gate

Date: 2026-11-17
Branch: `feat/android-subscription-preview-20261115`
Reviewed HEAD before this note: `40c7aff05c02f28da4036b2ddfa96a6c3941212d`

## Verified existing implementation

- The PWA already contains the five approved plan choices and their final Toman display amounts in `index.html`. This UI must be reused, not rebuilt.
- `server/prepaid-plans.cjs` defines the five server-owned plans in IRR.
- `server/d1-sahmino-subscription-v2.sql` defines the five-plan order catalogue, payment-event ledger, unique pending-order constraint and order-history indexes.
- `server/prepaid-orders-api.cjs` creates pending orders using server-owned prices and supports finding a pending order.
- `server/prepaid-account-overview.cjs` returns entitlement status and the latest 20 orders, merging v2 and legacy history.
- Tests exist for the plan catalogue, order creation, account overview, settlement and Worker routes.
- The Worker routes for prepaid orders and overview are guarded by `PREPAID_ORDERS_ENABLED`; they use the pilot HS256 bearer-token identity.
- SMS OTP routes are separately guarded by `SAHMINO_OTP_ENABLED`; they issue an HttpOnly session cookie and resolve an internal `sahamban_users.id`.

## Blocking integration defects — do not paper over these

1. The prepaid Worker endpoints authenticate with the pilot JWT (`AUTH_HMAC_SECRET`), not the OTP session cookie (`sahmino_session`).
2. OTP-created accounts are resolved by internal user ID; the existing prepaid order and overview modules resolve by `auth_subject`. OTP-created rows can have `auth_subject = NULL`. Consequently, a successful OTP login does not currently authenticate the existing prepaid overview/order endpoints.
3. The static PWA does not have a configured Worker API base URL or a client integration for authenticated account overview/order history.
4. The OTP SMS adapter is provider-neutral and requires a private service binding. No real SMS vendor adapter, credentials, sender approval, or sandbox delivery evidence is present.
5. The Worker/D1 example is a template with a placeholder database ID. No production D1 migration or deployment evidence is present.
6. Cross-origin cookie behavior between GitHub Pages, Worker hosting and Android WebView has not passed real-device acceptance.

## Required implementation sequence

1. Add internal-user-ID variants for prepaid overview and order creation. The ID must come only from a validated server-side OTP session lookup; never accept a user ID from request JSON, query parameters or headers.
2. Add cookie-authenticated Worker routes for overview, order history and pending-order creation. Keep pilot JWT routes isolated. Use exact-origin CORS, CSRF protection for POST, no-store responses, bounded JSON bodies and fail-closed database behavior.
3. Add PWA account panel integration: resolve session, render active/expired/no-subscription states, show paid-until and remaining time, list up to 20 orders with plan/amount/status/date, and support creating a pending order. No checkout URL or payment action until a verified provider integration exists.
4. Add worker/API tests for cross-account isolation, missing/expired/revoked session, history pagination/limit, malformed database rows, order amount tampering, duplicate pending orders and CSRF/origin rejection.
5. Select and implement the SMS provider adapter; run sandbox delivery and verify session persistence in supported mobile browsers and the Android WebView.
6. Apply migrations to a separately provisioned test D1 database, deploy only to a private test Worker after owner approval, and perform end-to-end tests on a real phone.

## Safety state

- Checkout remains disabled.
- A pending order is not a payment and must never grant Pro.
- Auto-renew remains unavailable and manual renewal remains the default.
- Do not enable either feature flag for public traffic.
- Do not merge this feature branch into `main` without explicit owner approval.

## Acceptance evidence still required

A green unit-test suite is not a substitute for: test-D1 migration evidence, sandbox SMS delivery, browser/WebView cookie persistence, API-to-PWA account isolation, and physical-device acceptance. Record the test Worker URL and device/browser versions only after the owner provisions the environment.
