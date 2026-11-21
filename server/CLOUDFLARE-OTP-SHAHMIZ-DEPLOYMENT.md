# Cloudflare OTP + Shahmiz deployment runbook

This runbook is intentionally staged. It does not enable checkout and it does
not permit OTP to be enabled until the provider and D1 are verified.

## 0. Preconditions (owner/operator)

- Confirm the Shahmiz account is the same service as the official site
  `https://shahmiz.ir/` and obtain its API token from the provider dashboard.
- Confirm the target Cloudflare account, production PWA origin, and the exact
  private D1 database intended to be shared with Billing V2.
- Confirm a verified, owner-controlled Iranian mobile number for one live OTP
  test. Never put API tokens in chat, source control, command history, or logs.

## 1. Prepare and deploy the isolated SMS provider Worker

From the repository's `server/` directory, copy
`wrangler.shahmiz.toml.example` to `wrangler.shahmiz.toml` and keep the
configuration file out of source control. Deploy the provider Worker:

```sh
npx wrangler login
npx wrangler deploy --config wrangler.shahmiz.toml
npx wrangler secret put SHAHMIZ_API_TOKEN --config wrangler.shahmiz.toml
```

The Worker has `workers_dev = false`; it is intended to be called only through
a Cloudflare Worker Service Binding. Do not expose it as a public HTTP endpoint.

## 2. Prepare the OTP application Worker

Copy `wrangler.bazaar.toml.example` to `wrangler.bazaar.toml` (do not commit
the copy). Replace every `REPLACE_...` placeholder with the exact production
D1 database ID/name, PWA origin, package name and Bazaar SKU mapping. Confirm
that the D1 binding points to the same intended database used by Billing V2.

The configuration explicitly keeps both `SAHMINO_OTP_ENABLED` and
`BILLING_V2_ENABLED` false. Keep them false during deployment.

Apply the schema in order to the isolated target D1 database, after reviewing
that its existing `sahamban_users` table is compatible:

1. `d1-schema.sql` (existing base application schema, if not already applied)
2. `d1-sahmino-sms-otp.sql`
3. `d1-sahmino-sms-otp-runtime.sql`
4. The existing Billing V2 schema and migrations required by this same Worker.

Do not apply test-only or unrelated legacy schemas to production. Take a D1
backup/export before any production migration and inspect the resulting tables
and indexes afterwards.

Set the application Worker secrets through Wrangler (values only in the
interactive secret prompt):

```sh
npx wrangler secret put SAHMINO_OTP_VERIFIER_SECRET --config wrangler.bazaar.toml
npx wrangler secret put SAHMINO_OTP_RATE_LIMIT_SECRET --config wrangler.bazaar.toml
```

The Shahmiz token belongs only on the provider Worker, not the application
Worker. The application Worker config already declares the
`SAHMINO_SMS_PROVIDER` service binding to `sahmino-shahmiz-sms`.

## 3. Deploy with features disabled

```sh
npx wrangler deploy --config wrangler.bazaar.toml
```

Verify the health endpoint reports `paymentsEnabled: false` and
`checkoutEnabled: false`. Verify OTP endpoints return `FEATURE_DISABLED`.
Do not enable billing checkout as part of SMS deployment.

## 4. Controlled live OTP test

Only after confirming account identity, D1 migrations, secrets, Worker
deployment, and Service Binding:

1. Change only `SAHMINO_OTP_ENABLED` to `true` in the deployment environment.
2. Send exactly one OTP to the owner-controlled test number.
3. Confirm the provider accepts the request and the handset receives the code.
4. Verify that exact code against the corresponding D1 challenge.
5. Verify the HttpOnly session cookie, session lookup, logout/revocation, and
   rate limits. Check logs for absence of OTP plaintext, phone numbers, and
   provider credentials.
6. If any step fails, set `SAHMINO_OTP_ENABLED=false` immediately and
   investigate. Do not repeatedly resend a timed-out request: the provider
   documents no upstream idempotency guarantee.

## 5. Billing remains a separate release gate

Do not set `BILLING_V2_ENABLED=true` until the official Bazaar app identity,
five real SKU identifiers, marketplace credentials, receipt verification,
and live D1 settlement have been confirmed. A successful OTP test is not a
purchase test and does not grant subscription access.

## Current status

Code, adapter tests, and CI validation are committed. This runbook is a
controlled deployment procedure, not evidence that anything has been deployed
to the user's Cloudflare account. No account token, provider token, D1 ID,
production origin, or Bazaar credential was available to this session.
