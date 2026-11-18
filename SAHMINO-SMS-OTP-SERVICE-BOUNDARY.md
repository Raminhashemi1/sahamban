# Sahmino SMS OTP service boundary

Status: domain-service prototype implemented and CI-tested. Public HTTP routes and production account/session issuance remain intentionally disabled.

## Implemented

- `server/sms-otp-core.cjs`: Iran-only mobile normalization, cryptographic numeric OTP and challenge ID generation, HMAC verifier bound to phone/challenge/code.
- `server/sms-otp-service.cjs`: provider-neutral request and verification orchestration.
- Provider adapter contract: `sendOtp({ destination, message, idempotencyKey })` returns an accepted/rejected result. Provider exceptions fail closed.
- Request path validates Iran mobile and a keyed IP pseudonym, checks repository quotas, reserves quota and stores a pending challenge before calling the adapter, then marks delivery accepted or failed.
- Response returns only challenge ID, 120-second expiry and 60-second resend wait. It never returns OTP or verifier.
- Verify path checks accepted delivery, expiry, supersession and five-attempt cap; a wrong code records a failed attempt.
- A correct code must pass repository `consumeChallengeOnce` (atomic compare-and-consume) before `resolveOrCreateByVerifiedPhone` and `createSharedSession` are called.
- Tests use an in-memory fake repository and fake adapter; no real SMS provider is called.

## Required production repository contract

A production D1 repository adapter is not yet implemented. It must provide:

1. `checkSendQuota` and `createChallengeAndReserveQuota` as atomic operations with persisted per-phone, per-IP and global quotas. The 60-second resend cooldown, five sends per phone per hour and twenty sends per IP per hour are conservative starting defaults in this prototype and must be reviewed before launch.
2. `createChallengeAndReserveQuota` must atomically supersede previous live challenges for that phone, reserve quota, and insert the challenge. Do not use process-local locks.
3. `markChallengeAccepted/Failed` must update only the matching pending challenge.
4. `recordFailedAttempt` must atomically increment only a live, unconsumed challenge and lock at five.
5. `consumeChallengeOnce` must be a single conditional D1 write/batch that verifies ID, HMAC verifier, accepted state, expiry, no supersession, no prior consumption, and attempts below five. Exactly one concurrent verification may succeed.
6. `resolveOrCreateByVerifiedPhone` must run only after consumption, create/link a phone identity under a unique constraint, and never merge by email or accept a caller-supplied user ID.
7. `createSharedSession` must issue a server-managed, revocable session with secure cookie properties for web and an equivalent platform-protected exchange for Android. Session signing/lookup keys must be separate from the OTP verifier key.

## Why no Worker route is exposed yet

The existing Worker authenticates only a private pilot HMAC subject. It does not have the production identity/session repository. Wiring the domain service to a route before the D1 repository, persistent abuse controls, CSRF/session design and account migration exist would create a misleading or unsafe login path. Keep public login and all payment/checkout flags disabled.

## Acceptance tests

`tests/sahmino-sms-otp-core.test.cjs`, `tests/sahmino-sms-otp-service.test.cjs`, and `tests/d1-sahmino-sms-otp-migration.test.py` cover normalization, verifier secrecy, delivery failure, invalid input, expiry, supersession, five failed attempts, replay and concurrent consume behavior in the fake repository. CI is not a substitute for integration tests against the eventual D1 repository and provider sandbox.
