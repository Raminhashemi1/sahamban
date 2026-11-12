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

## Optional controlled-pilot order endpoint (no money movement)

`pilot-orders-api.mjs` and the Worker now support:
- `POST /api/v1/me/orders` only when private environment variable
  `PILOT_ORDERS_ENABLED` is literally `true`, and
  `PILOT_ANNUAL_PRICE_RIAL` is a valid, positive integer from the
  **server's own** plan catalog. The request accepts no user ID, price,
  credit-card details or payment instructions from the browser. An already
  authenticated subject is mapped to a current ACTIVE database user using
  parameter-bound SQL. The server generates an unpredictable order ID.
- `GET /api/v1/me/orders` reads that authenticated user's pending
  order or an explicit absence of one; it never asserts that money was paid.
- A partial UNIQUE index permits at most **one PENDING annual order per
  user**, even under simultaneous requests. Operators must close/expire an
  old order before another can be requested.

Both endpoints are **draft order records only**. No deposit instructions,
checkout link, account number, self-service identity registration or paid
entitlement activation is exposed. Pending orders never unlock Pro.
A completed paid transfer must still pass independently verified bank
reconciliation and an atomic server-side entitlement transaction.

This endpoint is **off by default**, including in the template deployment
configuration. Neither a Pro annual price nor a payment merchant has been
chosen or authorized by the owner. Do not enable order issuance before
merchant terms, actual server identity enrollment and a supported pilot
workflow have been accepted.

Security limitation: A browser with a valid bearer token can call this read
endpoint; no downloadable/static JavaScript can be protected by this API
alone. Premium **server** endpoints need their own checked authorization.
All controlled-pilot setup still depends on owner-created Cloudflare
resources, secure key provisioning and actual account enrollment. No live
payable product can be inferred from a green unit test.

## CI: validate the free Cloudflare runtime without provisioning an account

`.github/workflows/pilot-worker-build.yml` installs a pinned Wrangler CLI,
compiles the Worker with `deploy --dry-run`, and runs
`server/d1-schema.sql` against an **isolated local Cloudflare D1 emulator**
using the non-secret `server/wrangler.local.toml` configuration. It also
runs the signed pilot-token and order/API security regression suites.

The same workflow also runs `tests/worker-local-runtime.cjs` against an
actual locally running Wrangler Worker and private local D1 database. In two
separate runs it checks (1) the default-disabled state, authenticated
entitlement and rejection of cross-origin, unsigned or query-forged requests;
(2) synthetic server-priced annual order creation with the pilot flag
explicitly enabled only for CI, persisted D1 readback, one-pending-order
uniqueness under duplicate requests, browser-body forgery rejection and
absence of checkout/payments. These are offline tests with fake accounts,
synthetic amounts and temporary keys. **The CI flag never enables payment
or any endpoint on the public GitHub Pages PWA.**

This is a stronger compatibility check than standalone Node/SQLite tests,
but it does not create a Cloudflare account, upload the Worker, initialize
a real remote D1 database, prove live network connectivity or enable paid
subscriptions. The local config contains no bank or payment secrets and
pilot order issuance remains off by default.

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

## Atomic manual-bank settlement (not deployed)

`server/manual-settlement-db.cjs` adds an operator-only D1 transactional
coordinator. An independently authorized bank reconciler and verified bank
credit can atomically update the matching order, reconciliation, unique
payment event, annual entitlement and audit. NOT a bank gateway, HTTP
endpoint or production authentication. `tests/manual-settlement-db.test.cjs`
executes real SQLite constraints and tests duplicate credits, race protection,
renewal, suspension and rollback at each failure stage. Bank-credit validation
and admin authentication must be implemented with trusted external systems
before use. No live payment or free cloud service has been enabled.


## Prepaid four-tier Pro access (new, not deployed)

- `prepaid-plans.cjs` contains the provider-neutral 3/6/9/12 Gregorian-calendar-month plan rules and exact launch prices in IRR. It is pure business logic; its verification callback is only a seam for a future trusted provider adapter, not proof of payment.
- `d1-prepaid-migration.sql` is an additive migration for prepaid orders, entitlement dates and provider event deduplication. It deliberately leaves the legacy annual schema intact. Apply only to a private D1 database after backup and migration review.
- `prepaid-access-gate.cjs` is a read-only, fail-closed authorization query for the new prepaid entitlement table. The caller must pass an authentication subject independently verified by a real identity provider. Never accept a browser-supplied account ID as identity.
- `tests/prepaid-plans.test.cjs`, `tests/d1-prepaid-migration.test.py`, and `tests/prepaid-access-gate.test.cjs` cover plan math, schema constraints, replay prevention and authorization denial cases. The new access-gate CI run is pending at time of this update: https://github.com/Raminhashemi1/sahamban/actions/runs/43248190028 .
- No public API route, login system, provider verification adapter, refund processor, D1 deployment or frontend premium lock is connected yet. This is intentional: never unlock Pro from client-side state or a simulated callback. Keep checkout disabled until a trusted identity, provider-specific verification and atomic order/entitlement transaction are implemented and tested.


## Prepaid order API module (not yet routed or deployed)

`prepaid-orders-api.cjs` creates a pending order for one of the four server-catalogued plans using an authenticated subject and a cryptographically random server-generated order ID. It never accepts a client price, never creates a payment URL, and always returns `checkoutEnabled:false` and `proEnabled:false`. It requires an ACTIVE user row and relies on the partial unique index to prevent concurrent pending orders. The read method only returns a pending order belonging to the authenticated subject. Database errors and malformed state fail closed.

The module is unit-tested in `tests/prepaid-orders-api.test.cjs`. It is deliberately not wired into `worker-api.mjs`: the current Worker uses a controlled pilot HMAC token and the legacy annual-only entitlement tables. Before routing this module, implement and verify a real account identity flow, apply the additive prepaid migration to a private D1 database, and build a production-safe provider adapter plus atomic settlement/refund handling. Do not expose manual bank proof, client callbacks or mock verification as payment confirmation.


## Provider-verified prepaid settlement primitive (not wired to a gateway)

`prepaid-settlement.cjs` accepts only a server-produced verification result (never a browser callback), validates provider/event/payment/order IDs, plan, IRR amount and server timestamp, then batches event-ledger insertion, pending-order settlement and entitlement upsert in one D1 batch. The event and payment unique constraints plus pending-order guards prevent replay/double grant. The entitlement SQL computes calendar-month expiry and extends from the current paid-until date when still active. This is a settlement primitive, **not a provider adapter**: no gateway signature/query verification exists yet, and no Worker route calls it. A trusted provider adapter must construct the verified object only after server-to-server confirmation. Refund/chargeback revocation and full D1 integration tests remain outstanding.


## Worker route for prepaid pending orders (feature flag OFF)

`worker-api.mjs` now has `GET/POST /api/v1/me/prepaid-orders`, using the existing short-lived private-pilot HMAC identity only. POST accepts exactly one JSON field (`planId`); amount, currency and random order ID are server-derived. GET returns only the pending order for the authenticated subject. Unknown fields, client-supplied prices, unsupported content types and unauthenticated calls fail closed. The route returns no checkout URL and never grants Pro access.

The route is guarded by `PREPAID_ORDERS_ENABLED === 'true'`; the local Wrangler config explicitly sets it to `false`. **Do not enable this flag for public/commercial use**: the current identity is still a private-pilot HMAC token, the prepaid migration has not been applied to a real private D1 database, and no provider checkout/verification/refund adapter is connected. Worker route tests are added to `tests/worker-api.test.cjs`; the Cloudflare dry-run/build and full local D1 integration workflow must pass before considering even a private pilot.


## Prepaid entitlement visibility in the existing access gate

The Worker entitlement lookup now compares the legacy annual entitlement with `prepaid_subscription_entitlements` and returns the later valid paid-until date. This keeps the existing Pro access endpoint compatible with the four prepaid durations without replacing the older annual pilot schema. The prepaid table is additive and must be applied before deploying this Worker version. Refund/chargeback suspension is not implemented yet; do not treat this read path as a refund processor.


## Read-only prepaid account overview (still private-pilot, not deployed)

`prepaid-account-overview.cjs` and its Worker adapter expose the user's own prepaid entitlement status, UTC paid-until, nonnegative remaining seconds, explicit `autoRenew:false`, and up to twenty most recent order-history records. History is selected by the user ID obtained only through a verified authentication subject. It does not include card/bank data and never initiates or confirms a purchase. DB failures, invalid identity or malformed history fail closed.

`GET /api/v1/me/prepaid-overview` is gated by `PREPAID_ORDERS_ENABLED==='true'` and authenticates with the existing **private-pilot** HMAC token. The default flag is false. Production deployment requires real login, a privately migrated D1 database, refunds and trustworthy gateway verification; the pilot token must not be repurposed as production identity.


## Prepaid overview payment-review safety (2026-11-12)

The read-only prepaid overview now checks the legacy account-level payment suspension flag as well as ACTIVE account status before returning a Pro-enabled response. A suspended or malformed payment-review state fails closed, rather than advertising a usable subscription. This does **not** implement refunds or chargebacks; there is no production gateway or live subscription route. The full suite and Worker dry-run should pass on the relevant commit before release.
