# Sahmino SMS OTP identity — provider-neutral implementation contract

Status: approved direction is mobile-number sign-in with SMS one-time codes. The SMS gateway/vendor is intentionally not selected. This document is a design and implementation gate, not a live authentication service.

## Scope of the accepted decision

- Primary sign-in identifier: a verified mobile number.
- Proof of possession: a short-lived, single-use SMS OTP.
- Provider integration: vendor-neutral adapter; Kavenegar, Melipayamak, Twilio, or another provider can be connected later without changing the account/session domain.
- No SMS provider credentials, sender IDs, templates, endpoints, or live SMS sending are configured.
- The existing private-pilot HMAC token remains separate and is not converted into a public login mechanism.
- Checkout, order creation for public users, and paid entitlement activation remain disabled.

## Proposed flow

1. Client requests a code for a mobile number over HTTPS.
2. Server normalizes and validates the number before creating a challenge.
3. Server applies rate limits by normalized number, IP/network signal, and global sending budget before calling the provider.
4. Server generates a cryptographically random numeric code. The code is never returned to the client, logged, or persisted in plaintext.
5. Server stores only a keyed verifier (HMAC with a dedicated secret), challenge ID, normalized number, expiry, attempt count, send state, and timestamps. The verifier secret is separate from session-signing keys.
6. A provider adapter sends the message. Its interface returns a normalized accepted/rejected result and provider reference; it never receives account/session authority.
7. Client submits challenge ID and code. Server compares verifiers in constant time, checks expiry and attempt limits, and atomically consumes the challenge exactly once.
8. Only after successful verification does the server resolve or create the internal user account and issue a server-managed session.
9. Existing accounts are resolved by the verified phone identity, not by email or a client-supplied user ID. Do not silently merge accounts.
10. Authenticated account endpoints resolve the internal account from the server-side session and return only that user's subscription overview and orders.

## Provider adapter boundary

Define a narrow server-only interface, conceptually:

- `sendOtp({ destination, message, idempotencyKey })` → normalized `{ accepted, providerMessageId? }`
- Provider-specific HTTP authentication, request signing, response parsing, retries, and delivery-status handling live only inside the selected adapter.
- The OTP domain service owns code generation, verifier storage, expiry, rate limits, attempt limits, challenge consumption, and session issuance.
- Provider errors must not reveal whether a mobile number has an account. Public responses should avoid account enumeration.
- Retry only when safe and idempotent; never create multiple valid challenges from an ambiguous provider timeout.
- Provider credentials are secret bindings, never repository files, client configuration, build artifacts, or logs.

## Security requirements before implementation

- HTTPS only; strict request body size and content-type checks.
- Numeric OTP generated with a cryptographically secure RNG; no Math.random.
- Store HMAC verifier, not plaintext OTP. Use constant-time comparison.
- Proposed OTP lifetime: 120 seconds; this is a product default proposal, not yet confirmed.
- Proposed maximum verification attempts: 5 per challenge; not yet confirmed.
- Enforce resend cooldown and rolling per-number, per-IP, and global quotas; thresholds must be configurable and tested.
- A resend invalidates or supersedes prior outstanding challenges for that number.
- Consume a challenge atomically once; concurrent correct submissions must not create multiple sessions or identities.
- Generic responses and timing-conscious handling to reduce account enumeration.
- Do not log phone numbers, OTPs, verifier values, session cookies, authorization headers, or provider credentials. If operational correlation is required, use a keyed, rotating pseudonymous identifier.
- Session cookies: Secure, HttpOnly, SameSite policy chosen for the deployed web origin; CSRF protection for state-changing requests. Android native storage must use platform-protected storage if native sessions are introduced.
- Session expiry, rotation, logout, device/session revocation, account closure, number change, SIM-swap support policy, and recovery require explicit design.
- Do not treat SMS possession as high-assurance authentication for sensitive account changes. Require step-up proof and support review for phone-number replacement or account recovery.
- Protect send and verify endpoints with abuse monitoring and operational kill switches.

## Account identity and migration

The verified phone number is an identity credential, not a display-only profile field. Store it in a dedicated identity table with a unique normalized number and a foreign key to the internal user. Preserve an audit trail for enrollment, replacement, and revocation. Do not use the current generic `auth_subject` as an unqualified phone number without a reviewed migration. Do not merge existing accounts by matching email. Inventory any pilot accounts before designing a migration; production data is not to be modified by this work.

## Required tests

- Accept supported number formats and canonicalize to one E.164 value; reject malformed/ambiguous values.
- Never expose OTP or verifier in HTTP response, logs, or persisted plaintext.
- Expired, malformed, incorrect, over-attempt, superseded, and already-consumed challenges fail closed.
- A challenge cannot be consumed twice under concurrent submissions.
- Rate limits apply independently to number, IP, and global provider budget.
- Provider rejection/timeout does not authenticate a user or create a session.
- Provider retries are idempotent and do not fan out multiple valid messages.
- Unknown and existing numbers receive indistinguishable public responses where the flow permits.
- Cross-origin, CSRF, replay, brute-force, and oversized-body attacks are rejected.
- User A cannot read User B's subscription overview or order history by changing any client-supplied identifier.
- Public OTP authentication never accepts the private pilot token as an alternative identity and vice versa.
- No test calls a real SMS gateway; use a deterministic fake adapter.

## Decisions still open

1. Confirm supported phone-number country scope and canonical format (Iran-only or international).
2. Confirm OTP expiry, attempt limit, resend cooldown, and quota thresholds. Suggested starting values above are proposals only.
3. Confirm account recovery and phone-number-change policy, including lost SIM and recycled-number cases.
4. Select a provider only after comparing delivery coverage, sender/template requirements, data processing terms, reliability, and cost.
5. Decide whether web and Android share a server-managed session flow or Android receives a separate short-lived session/token exchange.

## Release gate

Do not enable public login, subscription endpoints, or paid access until a real provider sandbox is integrated, session and abuse controls are reviewed, account migration is approved, recovery is tested, and end-to-end account-isolation tests pass. No live SMS, payment, or production deployment is authorized by this specification.
