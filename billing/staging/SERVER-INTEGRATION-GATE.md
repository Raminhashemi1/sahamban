# Sahmino billing server integration boundary — implementation gate

Status: **BLOCKED / CONTRACT ONLY**. This file deliberately does not choose a backend framework, create an API route, provision infrastructure, or enable payment.

## Repository finding
The current billing work is an isolated Node.js test/prototype area plus PostgreSQL DDL/fixtures and a GitHub Actions workflow. No existing root `package.json`, `server/package.json`, or `backend/package.json` was found on the repository's `main` branch during this review. Therefore a deployable backend stack, app authentication middleware, user table, secret manager, deployment target and database migration system cannot safely be inferred.

## Trust boundary
The current `validateClaim(claim, authenticatedPrincipal, buildChannel)` function is only a fail-closed input validator. Its `authenticatedPrincipal` argument is trusted input to the function; it does **not** authenticate a request. It is unsafe to expose this function directly as an HTTP endpoint unless the caller is populated exclusively by verified server-side authentication middleware.

Required future request path:
1. TLS endpoint receives a request; request body is untrusted.
2. Authentication middleware validates the actual session/token signature, issuer, audience, expiry, revocation and required claims. It derives the account UUID from the authenticated session, never from the request body.
3. Server maps the authenticated account to an allowed store/build channel using trusted release configuration. A client-supplied channel is only a consistency check.
4. Server validates product ID against a server-owned SKU catalogue mapped to exactly 30/60/90/180/365 days. Client-supplied duration, price, currency, expiry and entitlement flags are never authoritative.
5. Provider-specific adapter verifies the purchase with the official provider endpoint using server-held credentials. Verify application/package/bundle ID, product/SKU, purchase state, environment, ownership/account binding where supported, purchase token uniqueness, and revocation/refund status. A timeout or ambiguous response is PENDING and grants nothing.
6. Only after provider verification, a single DB transaction locks the account row, enforces unique (provider, purchase ID), writes purchase + audit + outbox + entitlement snapshot, and commits atomically.
7. A worker processes provider acknowledgement/consumption and reconciliation from the outbox. Retry safely; never grant twice.
8. Entitlement reads come from the server snapshot, not a local client flag. Financial market-data/signal eligibility remains a separate server-side gate.

## Security requirements before any endpoint is enabled
- Rate limits, request size limits, strict schema validation, TLS, CSRF protection if cookie-authenticated, replay protection and generic client errors.
- Provider tokens and secrets never appear in logs, error responses, analytics or source control. Store only keyed digests or restricted encrypted references as justified.
- Webhook signature/authentication, timestamp/replay checks, idempotent event IDs, delayed/out-of-order event handling.
- Least-privilege DB role; staging/prod separation; migrations with rollback plan; backups, restore test, retention and audit access policy.
- No client-controlled `authenticatedPrincipal`, `accountId`, `providerVerified`, `approved`, `price`, `currency`, `expiresAt` or entitlement flags.
- Security/privacy review and explicit owner approval before real credentials, sandbox adapters, deployment, merge or release.

## Decisions needed from project owner before implementation
1. Existing backend repository/service and runtime (or approval to create a separate backend repository).
2. Authentication provider and stable internal account identifier.
3. Hosting region/provider, PostgreSQL hosting and secrets management.
4. Per-store SKU/product IDs and actual console configuration for five durations.
5. Approved refund, partial refund, chargeback, cancellation, grace-period and renewal policy.
6. Whether web subscriptions use a licensed Iranian payment service provider and the exact server callback/query contract.
7. Legal entity, merchant eligibility and country-specific requirements for each store.

## Current state
All provider adapters, checkout, live verification, credentials, production entitlements and deployments remain disabled/not implemented. Existing SQL scripts are disposable CI fixtures only. The PR remains draft and unmerged. No live purchase, release, APK change or production migration has occurred.
