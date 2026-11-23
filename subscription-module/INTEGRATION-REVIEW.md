# Sahmino integration review — 2026-11-23

## Scope
This review checks the integration of the username/password authentication work (PR #192) into the dual-store billing release work (PR #191). It does not deploy, migrate production data, enable checkout, or alter store identities.

## Verified repository state
- Billing integration branch: `integration/sahmino-app-billing-complete`
- Billing branch head at review: `abe24e94feceb454e219f09c51b3b40c0454784b`
- Billing PR: [#191](https://github.com/Raminhashemi1/sahamban/pull/191), open and Draft, targeting `codex/reengineering-audit`.
- Authentication PR: [#192](https://github.com/Raminhashemi1/sahamban/pull/192), open and Draft, head branch `feature/sahmino-username-password-auth`.
- PR #192 head at review: `e52b01bead39ed375b055b11aa7220750b23a1c9`.
- GitHub reports PR #192 as not mergeable. Comparing its head branch with the billing integration branch reports `diverged`, 169 commits ahead and 60 behind, with a merge base at `dca196547b4779e1d372d17aa65181a3f9f8c281`.
- Authentication CI and Android Debug CI on the PR #192 head both passed (runs [45004169414](https://github.com/Raminhashemi1/sahamban/actions/runs/45004169414) and [45004169433](https://github.com/Raminhashemi1/sahamban/actions/runs/45004169433)).

## Authentication implementation reviewed
The PR #192 source contains:
- Username normalization for Iranian mobile numbers, including Persian/Arabic digits.
- PBKDF2-HMAC-SHA256 password derivation with 310,000 iterations, 16-byte random salt and 32-byte digest.
- Hashed session bearer storage, Secure/HttpOnly cookie, session validation and revocation.
- HMAC-keyed username/IP rate-limit buckets, fail-closed when the shared secret is absent.
- One-time recovery codes stored as SHA-256 digests; recovery changes password and revokes sessions.
- Exact PWA-origin checks and feature flags defaulting disabled.
- Local Worker+D1 end-to-end coverage for login, recovery, session revocation, CSRF, logout and billing boundary.

## Integration decision
**Do not merge PR #192 wholesale into PR #191.** The branches have diverged substantially and PR #192 contains workflow, Android host, Worker, billing and migration changes beyond the authentication-only surface. A direct merge or retarget could silently bring unrelated historical changes or reintroduce superseded OTP/billing code.

The correct next engineering action is a narrowly scoped integration branch based on the current billing branch, carrying only the required password-auth source, additive migrations, native login/recovery host, Worker route changes and their tests. Resolve the interfaces against the current Billing V2 implementation, then run the complete Billing V2 + password-auth + local Worker/D1 + both Android flavor CI suites before updating PR #191. Preserve the existing D1 user IDs and migration history; do not rewrite applied migrations.

## Release safety
- Keep `SAHMINO_PASSWORD_AUTH_ENABLED=false`, `BILLING_V2_ENABLED=false`, and `PILOT_AUTH_ENABLED=false` until deployment and acceptance gates pass.
- Do not deploy to production or run production D1 migrations from this review.
- Do not merge either Draft PR or publish artifacts solely because CI passed.
- Release signing, production Cloudflare access, physical-device acceptance and marketplace publication remain external gates.
- Product IDs remain deliberately deferred until after the initial app publication with checkout disabled.

## Conclusion
Authentication source and tests are present and CI-passing on their own branch, but the PR is not safe to integrate as a whole. The integration blocker is branch divergence and overlapping changes, not missing product IDs. No production change was made during this review.
