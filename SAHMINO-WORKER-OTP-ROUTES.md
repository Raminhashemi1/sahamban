# Sahmino Worker OTP and shared-session routes

Status: Worker route integration is implemented on the feature branch and disabled by default. No deployment, SMS provider configuration, or public login activation has occurred.

## Feature gate and environment

All routes below return `404 FEATURE_DISABLED` unless `SAHMINO_OTP_ENABLED=true`.

Required private Worker bindings/secrets when enabled:
- `SAHAMBAN_DB`: D1 binding containing the legacy user table and additive OTP/session migrations.
- `SAHMINO_OTP_VERIFIER_SECRET`: dedicated random secret of at least 32 bytes; do not reuse the pilot JWT or session secret.
- `SAHMINO_OTP_RATE_LIMIT_SECRET`: separate random secret of at least 32 bytes used to HMAC the Cloudflare client IP before storage.
- `PWA_ORIGIN`: exact HTTPS browser origin.
- `SAHMINO_SMS_PROVIDER`: private Worker service binding implementing POST `https://sms-provider.internal/send`, accepting the provider-neutral payload and returning JSON `{ "accepted": true, "messageId": "..." }`. No such binding is configured by this change.

## Routes

- `POST /api/v1/auth/otp/request`: JSON body exactly `{ "phone": "..." }`; returns opaque challenge ID and expiry/cooldown only. OTP delivery goes only through the private service binding.
- `POST /api/v1/auth/otp/verify`: JSON body exactly `{ "challengeId": "...", "code": "..." }`; on success sets the Secure, HttpOnly, SameSite=None `sahmino_session` cookie for the cross-origin GitHub Pages PWA and Worker API deployment. Browser third-party-cookie policies may still block it; verify on supported mobile browsers and the Android WebView before enabling login. No bearer token or user ID is returned in JSON.
- `GET /api/v1/auth/session`: validates the cookie against D1 and returns only authentication state/expiry.
- `POST /api/v1/auth/logout`: requires exact configured Origin and `X-Sahmino-CSRF: 1`, revokes the current session and clears the cookie.

All responses are no-store. Requests from any origin other than exact `PWA_ORIGIN` are rejected. Preflight permits only the configured origin and required headers. The route does not expose account identifiers.

## Safety and integration gates

- Feature flag remains unset/false by default.
- A missing provider binding, D1 binding, or dedicated secret fails closed.
- The SMS adapter is not a vendor integration; provider-specific credentials and protocol mapping need a separately reviewed adapter.
- No production D1 migration, deployment, Android native session exchange, session refresh/rotation, account recovery, or CSRF token protocol has been performed.
- Cross-site cookie delivery is configured with `SameSite=None; Secure` and credentialed exact-origin CORS. This is necessary for the current separate PWA/API origins, but it does not override browser third-party-cookie blocking or WebView cookie settings. Treat real-browser validation as a release gate; do not enable the feature flag until it passes.
- The current CSRF defense is strict Origin validation plus a non-simple custom header and exact-origin CORS. Revisit this if cross-origin deployment, subdomains, embedded clients, or new origins are introduced.
- No payment, checkout, subscription activation, or auto-renew behavior is enabled by these routes.

## Tests

Worker tests assert that OTP routes are disabled by default, hostile origins are rejected, preflight includes the required headers (including credentialed CORS), oversized bodies are rejected, and missing D1/secrets fail closed. Repository/schema tests use SQLite and mocks; they are not a live Cloudflare D1 or real-browser integration test. No real SMS is sent.
