# Sahmino D1 OTP repository implementation status

Status: D1 repository adapter and additive runtime schema are implemented on the feature branch and included in CI. No production D1 database has been provisioned or migrated. No Worker route invokes this adapter yet.

## Files

- `server/d1-sahmino-sms-otp-runtime.sql`: send-event quota ledger and shared-session table.
- `server/d1-sms-otp-repository.cjs`: Cloudflare D1 adapter for quota checks/reservation, challenge state transitions, conditional atomic consume, verified-phone account resolution, and shared session creation.
- `tests/d1-sahmino-sms-otp-runtime.test.py`: SQLite schema and conditional-update tests.
- `server/sms-otp-service.cjs`: OTP domain service remains provider-neutral and uses repository interface.

## Atomicity

- Send quota reservation, superseding prior challenges, and insertion of the new pending challenge are submitted as a D1 `batch()` transaction. The challenge is created only if the send-event insert succeeds.
- Phone and IP quotas are enforced again in the reservation SQL, not only by the preflight count. The IP value is a 64-character HMAC pseudonym; raw IP is not stored.
- Wrong attempts use a conditional increment constrained by accepted state, expiry, supersession, consumption, and five-attempt maximum.
- Correct verification uses a single conditional `UPDATE ... SET consumed_at` constrained by challenge ID, verifier, accepted state, expiry, no supersession, no prior consumption, and attempts below five. D1's affected-row count is the single-use gate.
- Account resolution runs only after successful consume. The verified phone identity is unique; email is not used to merge accounts.
- Shared sessions use a random 256-bit bearer token. Only its SHA-256 digest is stored. The returned cookie string is Secure, HttpOnly, SameSite=Lax and path-scoped. The Worker must set it as a Set-Cookie response header and must never serialize it in JSON.

## Limits and release caveats

- Prototype quotas: 60-second resend cooldown, five sends per phone/hour, twenty sends per IP pseudonym/hour. Product/security review may adjust these before launch.
- Shared session default lifetime is 30 days (configurable, bounded to 5 minutes–90 days). Session validation, refresh/rotation, revocation endpoints, logout, CSRF policy, Android protected token exchange, and cookie-origin deployment rules still need implementation and tests.
- Provider adapter remains fake-only in tests. No provider credentials or real SMS sending are configured.
- No public Worker routes are added in this slice. The existing pilot-token API is not public identity.
- Do not run the migration against production D1 until a database inventory, backup and rollback plan, and account migration review are approved.
- Checkout and payment flags remain disabled.

## Next integration slice

Implement session-cookie validation and CSRF-safe logout/session revocation, then add Worker OTP routes behind an explicit disabled-by-default feature flag. Use only a fake adapter in local integration tests. A real provider sandbox requires a separate approval and secrets provisioning step.
