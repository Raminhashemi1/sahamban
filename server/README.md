# Server-only subscriptions — Pro 1.0 integration boundary

This folder is **not a deployed payment service**. It contains the pure,
testable, vendor-neutral entitlement core only. The public GitHub Pages PWA
cannot securely issue its own paid entitlements, protect provider secrets,
verify payments or enforce premium access on its own.

## What exists now

`subscription-entitlements.cjs` exposes:
- `emptyEntitlement(userId)` — new unpaid server-side state.
- `applyVerifiedEvent(state,event,{verifyProviderEvent,now})` — applies a
  **provider-confirmed** payment, refund, chargeback or cancellation, with
  account matching, replay checks and same-payment uniqueness.
- `accessDecision(state,{now})` — server-side active/expired/suspended decision.

Time is UTC; one annual period is **one Gregorian calendar year**, with
Feb 29 clamped to Feb 28 in a non-leap renewal year. This is an implementation
placeholder; the user-visible commercial terms and calendar must match the
actual plan before payments are accepted.

## Trusted checkout order contract

`subscription-orders.cjs` is a server-only, provider-neutral **order and receipt** validator. It binds the annual plan, an integer IRR price, user ID, order ID and server timestamp, and rejects mismatched settlement receipts before invoking provider verification. Replay of the same receipt leaves the order unchanged, while a conflicting payment ID is rejected. It is tested by `tests/subscription-orders.test.cjs` in smoke CI. The order constructor must only be called by a trusted backend using a price from the server's catalog, never a value supplied by browser JavaScript. A *separate* authenticated backend flow must transactionally record the verified order and issue the corresponding entitlement event exactly once. These files alone do not connect to a bank or accept payments.

## Server-side paid access authorization (not deployed)

`pro-access-gate.cjs` provides an asynchronous, read-only authorization
query for the future trusted D1 backend. It looks up a subscriber by a
**server-verified authentication subject** through a bound SQL parameter,
checks the account is ACTIVE, then computes active/expired/suspended
annual access from the persisted entitlement using the **server's UTC time**.
Unauthenticated requests, no database, invalid account data, absent
subscriptions, expiry and database failures all deny Pro.

The authenticated subject MUST come from independently verified identity
provider signatures and claims, NOT an email, user ID, cookie content or
query parameter supplied directly by the caller. This module does not
authenticate anyone. Its decision must protect actual premium API
endpoints server-side; do not treat a front-end flag or hidden button
as paid access control. Test coverage is in
`tests/pro-access-gate.test.cjs`, included in smoke CI.

## Zero-domain-cost private Worker pilot (not deployed)

`worker-api.mjs` is a **read-only Cloudflare Worker prototype** designed
to run on a no-custom-domain `workers.dev` address with a private D1
database. It provides only:
- `GET /api/v1/health` — explicitly reports checkout/payments disabled.
- `GET /api/v1/me/entitlement` — requires a short-lived, strictly checked
  HS256 pilot token, a valid configured `PWA_ORIGIN`, and a live database
  lookup of a matching ACTIVE authenticated subject. Invalid/expired tokens,
  other origins, missing or unavailable DB, suspended accounts, expired
  subscriptions and invalid entitlements deny access. All responses disable
  caching; database queries bind identity as a prepared-statement parameter.
- All other routes, especially checkout and payment, return 404.

`server/wrangler.toml.example` is a template with a placeholder D1 database
ID, **not deployable unchanged**. No free Cloudflare account or database has
been created. The AUTH_HMAC_SECRET is never included in source control and
must be a high-entropy private secret set through Cloudflare's secret binding.
The GitHub Pages origin is `https://raminhashemi1.github.io`, not the
path ending in `/sahamban/`.

`server/mint-pilot-token.cjs` is an **offline operator-only** helper for
issuing a 15-minute access token to an already authenticated, manually
enrolled pilot subject. Use the SAME private secret as the Worker. Do not
create an endpoint to issue these tokens to unauthenticated visitors, print
them in CI, log them in production, put them in URLs/localStorage, or
treat them as proof of payment. For a commercial release replace this
limited invitation process with a proper sign-in and identity provider.
No client login or paid feature has been added yet.

Security limitation: A browser with a valid bearer token can call this read
endpoint; no downloadable/static JavaScript can be protected by this API
alone. Premium **server** endpoints need their own checked authorization.
All controlled-pilot setup still depends on owner-created Cloudflare
resources, secure key provisioning and actual account enrollment. No live
payable product can be inferred from a green unit test.

## Required provider adapter / production controls

1. A trusted backend authenticates the subscriber and uses the **server-side**
   account identifier. Never let an unauthenticated browser choose `userId`.
2. A server-side provider adapter verifies the **exact** event ID, payment ID,
   account, transaction amount/currency, event type and settlement/refund state
   with the chosen payment gateway using authenticated provider APIs or signed
   webhooks. A redirect success URL, a form field called `verified`, or the
   browser's local storage **is not verification**. The supplied synchronous
   predicate is invoked only *after* that verification and is required to
   return `true`.
3. Store entitlement state with a real transactional database. Add **unique
   database indexes** on provider-qualified event IDs and settled payment IDs,
   and update account state and IDs in **one transaction**, with concurrency
   control. The arrays in this pure module are for deterministic transition
   tests, not a concurrency-safe production event ledger.
4. Persist provider transaction receipts/verification outcomes separately from
   customer portfolio data. No payment credentials, customer PII or secret keys
   in source control, browser JS or GitHub Actions artifacts.
5. Handle refunds and chargebacks by **suspending** access pending accounting
   reconciliation; a later payment must not silently override that state.
6. Protect authenticated `GET /me/entitlement` and premium server APIs with
   rate limiting, request authentication, authorization, logging without
   secrets, and TLS. Merely hiding a button in a PWA does not enforce a Pro plan.
7. Test subscription purchase, failed payment, replay, renewal, cancellation,
   expiry, chargeback and account mismatch in the **gateway's actual sandbox**,
   followed by legally authorized live-payment acceptance.
8. Publish a clear annual price, local tax treatment, renewal calendar,
   cancellation/refund terms, privacy notice, support channel, and any
   investment-advice regulatory permissions required for the service.

## Strict commercial readiness

Nothing in this module or its passing unit tests establishes that:
- a user can log in or pay;
- a payment provider has been selected or connected;
- annual subscriptions can be issued, renewed or revoked in production;
- the public PWA has enforceable premium feature access.

Gate C remains **OPEN** until the backend, gateway, database and subscriber
journeys pass actual integration and security acceptance.

No external provider or production secrets are presumed or hardcoded.
