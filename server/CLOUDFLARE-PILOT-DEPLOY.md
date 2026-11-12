# Cloudflare pilot deployment status — no commercial payment

## First deployment completed on 2026-11-12

The owner-authorized free pilot deployment succeeded at GitHub Actions
https://github.com/Raminhashemi1/sahamban/actions/runs/43287886357 .
The existing `sahamban-pro-pilot` Worker was updated, and both
`server/d1-schema.sql` and `server/d1-prepaid-migration.sql` were applied
to the existing owner-controlled `sahamban-pilot` D1 database, previously
confirmed empty. The published health endpoint responded successfully with
`paymentsEnabled:false` and `checkoutEnabled:false`.

URL: https://sahamban-pro-pilot.rhashemi284.workers.dev/api/v1/health

**This is an API pilot, not commercial Pro launch or Android store publication.**
No real identity provider, payment gateway, refund/chargeback processor,
paid-feature access integration or storefront checkout is live. Both
`PILOT_ORDERS_ENABLED` and `PREPAID_ORDERS_ENABLED` are explicitly false.

## Safe subsequent deployments

`.github/workflows/cloudflare-pilot-deploy.yml` is **manual-only**, gated by
the exact approval phrase `DEPLOY_PILOT_NO_PAYMENTS`, branch `main`, and the
existing `cloudflare-pilot` environment secret and variables.

It validates the GitHub-held Cloudflare user token, builds the Worker, checks
the Worker signing secret exists, then reads only table names from remote D1:

- **Empty database:** initial installation of base and additive prepaid schema
  is permitted before deploying the Worker.
- **All eleven expected application tables present:** both migration steps are
  skipped; only the Worker is updated.
- **Partial/incomplete schema:** deployment is refused and requires operator
  review. It does not automatically patch or delete existing tables.

The workflow additionally checks that the live health endpoint reports no
payment and that unauthenticated entitlement/order/overview and checkout
requests are denied. Future preview URLs are explicitly disabled in the
generated Wrangler configuration.

The repeat-deployment changes and tests were added **after** the successful
first deployment. They are in repository source control and have not
themselves been applied to Cloudflare. Confirm relevant CI results before
triggering a second manual deployment.

## Guardrails

Do not paste the Cloudflare API token, Worker signing secret, customer data,
payment information or private bank/merchant information into a repository,
screenshots or chat. A green GitHub job proves only what its steps actually
tested. A full business launch still requires real sign-in, provider-verified
and atomic settlement, refund handling, policy and support details,
device acceptance and all Pro release gates.
