# Shahmiz OTP provider adapter

Provider identity: the user named «شاهمیز». The public site currently brands the
service «شهمیز OTP» at https://shahmiz.ir/. Confirm this is the same account
before putting a live token into Cloudflare.

## Official public API facts reviewed 2026-11-19

The current official homepage was re-opened during this deployment review. It still publishes the `send-otp.php` contract below. We found no official documentation on that page for an `api.shahmiz.ir/v1/otp` endpoint, `X-API-Key`, or a provider-generated `verify` template; do not switch to those unverified details.

The provider's public homepage documents:
- POST https://shahmiz.ir/api/send-otp.php
- Header: Authorization: Bearer YOUR_TOKEN
- JSON body: { "mobile": "09123456789", "code": "482913" }
- Success example: { "success": true, "deducted_amount": 200, "remaining_balance": 29800 }

The public page does not document a message ID, upstream idempotency support, delivery
receipt semantics, a formal error catalogue, or a sandbox. The adapter's
`idempotencyKey` is an internal contract field only; it is not forwarded as an
idempotency guarantee. Do not automatically retry a timed-out send because the
provider may have accepted it before the connection failed. The adapter therefore
does not invent these fields and only treats HTTP success plus JSON
`success === true` as provider acceptance. Acceptance is not proof of handset
delivery. Provider rejection and transport errors fail closed.

## Deployment shape

The OTP application Worker talks only to a Cloudflare Service Binding named
`SAHMINO_SMS_PROVIDER`. The dedicated provider Worker in
`sms-providers/shahmiz-worker.mjs` holds `SHAHMIZ_API_TOKEN` as a Worker
secret and calls the official Shahmiz endpoint. The token never reaches the
browser, OTP application Worker response, source control, or logs.

1. Deploy this provider Worker with `wrangler.shahmiz.toml`.
2. Set its secret using `wrangler secret put SHAHMIZ_API_TOKEN --config wrangler.shahmiz.toml`.
3. Add the Service Binding shown below to the OTP application Worker's config.
4. Set `SAHMINO_OTP_ENABLED=true` only after the D1 OTP runtime migration is
   confirmed on the target database, secrets are present, and the provider
   account is funded and verified.
5. Send a single test OTP to an owner-controlled number and confirm receipt.
6. Confirm the code received is the same code verified by the application's D1-backed OTP challenge; only then enable OTP for real users.

Application Worker binding:

```toml
[[services]]
binding = "SAHMINO_SMS_PROVIDER"
service = "sahmino-shahmiz-sms"
```

Provider Worker secret is `SHAHMIZ_API_TOKEN`. Application Worker secrets
remain separate: `SAHMINO_OTP_VERIFIER_SECRET` and
`SAHMINO_OTP_RATE_LIMIT_SECRET`.

Do not turn on billing checkout as part of SMS setup. OTP acceptance only
establishes that the provider accepted the send request; it does not activate
a subscription or prove a purchase.
