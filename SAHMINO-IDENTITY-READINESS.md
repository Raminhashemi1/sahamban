# Sahmino identity and account-linking readiness

Status: architecture gate only — no identity provider selected, no login implementation, no production deployment.

## Current verified boundary

- `server/worker-api.mjs` accepts a short-lived HS256 token issued for the controlled private pilot.
- The pilot token is signed with the private `AUTH_HMAC_SECRET`; it is not a public registration or login flow.
- The token lifetime is capped at one hour and its issuer/audience are fixed to the pilot API.
- Worker account lookup binds the verified subject to `sahamban_users.auth_subject` using a prepared SQL parameter.
- `GET /api/v1/me/prepaid-overview` and prepaid order routes remain feature-flagged and rely on that pilot identity.
- The five-plan order and entitlement code does not create accounts, authenticate visitors, or verify payment.
- The PWA and Android subscription screens are previews; checkout remains disabled.

## Required identity contract

A commercial identity integration must use a selected, supported OpenID Connect provider or an equivalently reviewed identity service. The provider must be chosen before implementing provider-specific endpoints, callback URLs, keys, issuer allowlists, or account migrations.

1. Browser sign-in uses Authorization Code Flow with PKCE. Validate state and nonce; use exact registered redirect URIs and HTTPS.
2. The backend validates the provider's signature and key ID, exact issuer, audience/client ID, expiry, not-before, nonce, and authorized-party claim where applicable. Reject unsigned tokens, algorithm confusion, unknown issuers, and untrusted key URLs.
3. The durable external identity key is the exact pair `(issuer, subject)`. Email, display name, phone number, and client-supplied account IDs are profile attributes, never account keys.
4. Resolve the verified identity to one internal `sahamban_users.id`; all entitlement, order, history, and future premium API queries use that internal account reached from the verified identity.
5. Never automatically merge an existing account because two accounts share an email address. Account linking requires an authenticated session for the existing account plus fresh authentication of the new identity, with an auditable confirmation.
6. Use server-managed sessions in Secure, HttpOnly, appropriately SameSite cookies; protect state-changing requests against CSRF. Do not put access tokens, refresh tokens, or session secrets in URLs, logs, source control, or browser localStorage.
7. Apply rate limits and abuse controls to sign-in, callback, recovery, and account-linking paths. Keep authentication logs free of credentials and bearer tokens.
8. Define session expiry, refresh rotation, logout, account disablement, identity unlinking, and compromised-account recovery before commercial release.
9. Do not let a client create or select `auth_subject`, `user_id`, entitlement state, plan price, or paid-until date.
10. Preserve the private pilot as a separately gated test path. Do not reinterpret its HMAC token as a public identity credential.

## Account data migration

The current schema already has a unique `sahamban_users.auth_subject` column. It does not yet represent a provider-qualified identity namespace. Before a real provider is connected, design an additive migration that:

- stores provider issuer and provider subject separately, with a unique constraint on the pair;
- references the existing internal user row;
- records creation/linking timestamps and an audit trail;
- does not store provider access or refresh tokens unless a reviewed feature strictly requires them;
- does not infer ownership or merge accounts from email;
- supports a controlled migration for any already-enrolled pilot users.

Do not apply a production migration until existing account rows have been inventoried and a recovery/rollback plan has been reviewed.

## Required acceptance tests

- Valid provider token maps to exactly one internal account.
- Wrong issuer, audience, signature, key ID, nonce, expiry, or algorithm is rejected before any account lookup.
- A provider subject from another issuer cannot collide with or access an existing account.
- Client-supplied `user_id`, `auth_subject`, email, price, and entitlement fields cannot override verified identity or server state.
- Account linking requires fresh proof of both identities; same-email accounts are not silently merged.
- Disabled accounts, revoked sessions, and provider logout/revocation states fail closed.
- Cross-origin, CSRF, replay, brute-force, and callback-state attacks are rejected.
- A user's order history and entitlement never disclose another user's records.
- The private pilot remains disabled for public registration and payment.

## Decisions still required from the product owner

1. Which identity provider/service is authorized for Sahmino, and which channels must it support (web, Android, and any store-distributed app)?
2. Which sign-in methods are wanted (email OTP, password, Google, Apple, phone, or a subset)?
3. What is the approved account recovery and support process?
4. Are existing private-pilot accounts to be migrated, or kept isolated?

Until these decisions are made, provider-specific code, public registration, production identity migration, and paid access must remain unimplemented. The next implementation slice is the provider adapter and identity-link migration, followed by tests against that provider's sandbox.

## Release gate

Identity is not production-ready merely because a JWT parses or a unit test passes. Keep checkout and public premium access disabled until provider sandbox acceptance, migration review, session security review, account recovery, and end-to-end account-isolation tests pass.
