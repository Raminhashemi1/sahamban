# Sahmino paid launch — four channels, ONE closure checklist

Owner goal: **all four payment channels active**. Do not replace this requirement with a free-only release or a new app rewrite.

## Exact product contract

For each channel, **exactly** 30, 60, 90, 180, 365 fixed 24-hour days. Never 270; do not silently substitute calendar months/year or an unsupported subscription billing interval. Product name, currency, final customer price, tax, renewals, refunds, payment processing and store policy must match the approved commercial terms.

## Evidence inventory: no assumptions

| Channel | Five approved console SKUs | Price/currency | Merchant/region | Provider-side verified sandbox purchase | Refund/replay | Launch |
| --- | --- | --- | --- | --- | --- | --- |
| CafeBazaar | UNKNOWN | UNKNOWN | Not verified | Not verified | Not verified | BLOCKED |
| Myket | UNKNOWN; fixed duration support unverified | UNKNOWN | Not verified | Not verified | Not verified | BLOCKED |
| Google Play | UNKNOWN; exact fixed-day support unverified | UNKNOWN | Eligibility for commercial sale to Iran not established | Not verified | Not verified | BLOCKED |
| Official website/PWA | UNKNOWN | UNKNOWN | Approved domain + lawful PSP not supplied | Not verified | Not verified | BLOCKED |

**This table is a list of missing independently verifiable facts, not a statement that accounts do not exist.** Owner said accounts are available, but the GitHub connector does not authenticate into merchant consoles. No actual storefront inventory, merchant eligibility, receipts, prices, payment tokens, host or signed release was supplied to this execution session.

## Verified channel-specific implementation constraints (official docs checked 2026-11-15)

| Channel | Required server-side verification | Exact duration caveat |
| --- | --- | --- |
| CafeBazaar | Use the current Bazaar developer API and verify purchase on the server using the developer API credentials/token; never trust the app callback alone. The developer's current API/token and package/product mapping must be configured from that app's console. | Five exact day counts must be represented by five separately configured products unless the current console/API explicitly supports the required duration model. Actual SKU list remains unknown. |
| Myket | Implement only against Myket's current official developer API/SDK contract and verify purchase server-side before granting. The live account's application key, SKU configuration and purchase verification response schema have not been provided to this repository. | Support for exact 30/60/90/180/365-day fixed terms is not established by accessible official public docs or the screenshot of the app list. Must be confirmed in the Myket console before claiming parity. |
| Google Play | Verify tokens server-to-server with Google Play Developer API; process lifecycle changes via RTDN; acknowledge only after successful durable processing. | **Important mismatch:** Play Console prepaid base-plan duration choices are 1 day, 3 days, 1 week, 4 weeks, 1/2/3/4/6/8 months and 1 year—not arbitrary exact 30/60/90/180/365-day terms. Do not label 4 weeks as 30 days or calendar months as fixed 60/90/180 days. Need a deliberate product-model decision (for example, supported one-time products with app-managed fixed-day access if allowed by current policy, or adjust the shared term contract). |
| Official website | Create payment request server-side, bind it to a pending order/user/amount/currency, validate callback status and call PSP verify API server-side; grant only after verified success. | Fixed day terms can be app-managed, but PSP merchant, registered domain, amount unit (Rial/Toman), callback domain and refund/chargeback process must be configured and tested. No PSP has been selected or proven connected. |

### Public documentation checked
- CafeBazaar current API entry point: https://developers.cafebazaar.ir/fa/guidelines/in-app-billing/api/postman-and-bazaar-api-new
- Google Play supported merchant/developer locations: https://support.google.com/googleplay/android-developer/answer/9306917
- Google Play prepaid base-plan duration choices: https://support.google.com/googleplay/android-developer/answer/140504
- Google Play backend purchase verification and RTDN: https://developer.android.com/google/play/billing/backend
- Google Play Developer API setup: https://developer.android.com/google/play/billing/getting-ready

The screenshot of Myket's developer console proves that a Myket developer account page is accessible and lists other active apps. It does **not** prove Sahmino is registered, that billing SKUs exist, or that server verification is configured.

## Smallest remaining critical path

1. **Console facts (owner-assisted, non-secret):** provide five SKU identifiers per store, the currency and final price of each, plus confirmation of fixed-day/renewal semantics. For Play also provide approved merchant/sales region and console-based proof that five exact durations are supported; for Myket provide actual approved product mode; for website, domain and PSP provider name. Keep access tokens, passwords, keystores and merchant secrets out of chat and git.
2. **Provider-specific server purchase verification:** on a protected backend, verify package/app IDs, product, environment and purchase status against the provider before atomic credit; no self-asserted client approval. Include unique provider-qualified purchase key, replay/refund/revoke/restore, acknowledgement or consumption per channel.
3. **Sandbox evidence:** perform at least one approved test purchase and refund/replay per channel under developer-owned authorized sandbox/test setup. Audit exact outcomes without leaking receipt tokens.
4. **Release evidence:** final package/signing and store listing, privacy/financial disclosures, financial-data feature gates and exact-build smoke tests. Obtain explicit final release approval before merging, signing, uploading or making payments live.

## Repository-only evidence gate

`billing/staging/sahmino-four-channel-release-evidence.cjs` checks a **non-secret review inventory**: four channels, five products each, safe SKU formats, priceMinor and ISO currency plus a reviewer reference for merchant eligibility, provider verification, refund/replay, sandbox purchase and legal/privacy approval. Its output `ready` means **only that supplied review fields satisfy structural checks**. It never authenticates documents, checks console status or enables checkout. Do not use it as a deployment or entitlement authority. Tests use fictional references explicitly and do not constitute store evidence.

## Release status
**NO-GO for all-four-live launch.** No production secrets, access, checkout or payment flags have been connected. Keep draft PR #184 unmerged pending legitimate merchant/account evidence, actual billing tests, and separately approved release.

## 2026-11-15 continuation — synthetic four-channel settlement conflict gate

- Continued exclusively in existing draft PR #184 on this billing branch; PR #164, Android branches, main, product UI, subscription production status and original five-day plan were untouched.
- Before changes, PR #184 head was 2f8ed952ada695677b1bddda524963099f8f5b06. Existing four-channel synthetic evidence reconciler and its 7 tests were re-read, avoiding duplicate provider adapters.
- Code commit 862e9b74caf427aab083e21fcfeedd92923b7ba9: synthetic provider reconciliation now fails closed when an injected mock claims SETTLED while marking any of refunded/revoked/chargeback/cancelled/pending true. This prevents a contradictory synthetic match, **not** a real receipt check.
- Test commit ac6d328962f3301985a93804770d6b0cd8ee1e61: added a Node test covering all five contradictory flags for each of the four channels (20 negative cases), plus non-grant assertions and a false-flag control. Test file is included in the pre-existing isolated CI workflow. **Tests committed, execution not confirmed.**
- Exact test-commit SHA ac6d328962f3301985a93804770d6b0cd8ee1e61: GitHub connector returned 0 PR-triggered workflow records and 0 combined status records. This does not prove failure or success; push-triggered workflow might not be enumerated. Local CLI could not reach github.com (DNS resolution failure), so no local exact-source test claim.
- Next action is to inspect a completed **exact-SHA** synthetic-billing CI run (Node plus disposable PostgreSQL), if available; afterward obtain owner-authorized official console SKU/price/eligibility and provider-side sandbox credentials via an approved secret channel. Do not claim four real gateways activated or use synthetic verification to grant entitlements.
- Four production checkout channels remain DISABLED, merchant/provider-verification and Google Play exact-day eligibility BLOCKED. No merge, deploy, market release, live payment, transaction, asset change or secret was performed.

## 2026-11-15 — exact twenty-product synthetic matrix regression

- Continued only on existing billing PR #184. Before this change, branch head 2d7c1392cc82e7af7b44bfc65ddcb6d6a1e252d5; no new provider credentials, approved merchant product catalog, PSP or legitimate live receipt became available.
- New test commit be4c0b37e9524f037c44001010cc9766c008773b adds explicit **4 channels x 5 exact fixed-day terms = 20 synthetic combinations**, checks SKU mismatch refusal and proves no case yields providerVerified or a real entitlement. Also confirms malformed/oversized tokens are rejected without calling the injected provider query.
- This strengthens regression coverage, **not** provider integration, storefront account approval, official SKUs, live backend merchant verification, or launch completion. Exact-test-head PR-workflow and combined-status API calls returned no entries; CI outcome remains UNVERIFIED until successful matching-head execution is observed. No local Node execution evidenced.
- The previous contradictory-lifecycle-flag change (862e9b74 / ac6d3289) remains; this new test does not repeat it.
- Single next non-duplicative prerequisite is the non-secret four-provider SKU and terms catalog from official owner merchant consoles plus lawful merchant/region qualification and website PSP/domain; verified provider adapters must not be enabled until their authoritative credentials, backend verification and refund/replay tests exist. Leave checkout disabled. Do not request secrets in GitHub or chat.
