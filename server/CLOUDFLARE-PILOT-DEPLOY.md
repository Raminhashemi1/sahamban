# Cloudflare pilot: deploy preparation, not production

The user-created Cloudflare Worker and D1 database are visible in supplied screenshots,
but no full backend API or database schema has been deployed to the remote account.
The app is not ready to accept payment. The actual D1 UUID is not fully visible;
do not guess it from a screenshot.

This repository now contains a workflow-dispatch-only deployment pipeline.
It is inactive until the owner separately authorizes the account and provides
a restricted CLOUDFLARE_API_TOKEN GitHub environment secret,
CLOUDFLARE_ACCOUNT_ID and SAHAMBAN_D1_DATABASE_ID environment variables,
and provisions AUTH_HMAC_SECRET in the private Worker settings. Do not paste
secrets into chat, screenshots, public GitHub files, or issue comments.

The workflow demands a confirmation phrase, builds and tests the real Worker,
generates strict no-payment Wrangler metadata, checks for the existing secret,
applies the D1 schema, deploys, then verifies the public health response.
It never enables pending order creation, checkout, banking or subscriptions.
Do not trigger it before reviewing the target remote D1 database and backup plan.
Green GitHub CI is not evidence of a real Cloudflare deployment.
All four commercial release acceptance gates remain open.
