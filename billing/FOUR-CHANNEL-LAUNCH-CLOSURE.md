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

## 2026-11-15 — end-of-session four-provider safety closure (not live launch)

- Exact PR #184 active branch was inspected at c9a48b4903c72fe4db708e2a15d93f4972a75078; reviewed existing synthetic provider reconciliation, its tests and isolated billing CI workflow before adding changes. No duplicate adapters or payment implementation were created.
- Code commit 774c8aace3cd5005e4b2f197aae10fea7158c8e4 tightens contradictory settlement flags: if a flag is present, only boolean false is accepted. String false/true, numeric 0/1, null or boolean true all fail closed. Any matching fixture still returns providerVerified=false and realEntitlement=false.
- Test commit 90c3eb9852db39996bf9b99db8f09555966fb64d adds four-channel cross-matrix negative cases covering these ambiguous flag encodings (4 x 5 flags x 5 values), in the previously wired isolated test file. New test source has been committed but **no exact-head execution PASS is verified**.
- The existing branch also contains the 20-channel/term synthetic SKU matrix and rejection for 270-day contracts, replay/ledger and four-provider boundaries. These are engineering fixtures, not official receipts.
- Genuine four-provider launch remains EXTERNALLY BLOCKED on **merchant console authentication and approval, exact approved SKU/price/currency records, permitted five-duration billing model in Myket/Play, Play merchant/market eligibility for Iran, website domain/PSP setup, official provider server-to-server purchase and refund verification, authorized sandbox evidence, and merchant-side signing secrets supplied via an approved secret manager**. Public GitHub and the connected GitHub app cannot supply those missing account facts; do not fabricate or request private tokens in chat. Store passwords, private keys and customer receipts must never enter this public repository.
- No paid checkout, permission change, account creation, external provider request, real transaction, merge, deploy, release, trading or personal asset modification performed. Original five-day roadmap unchanged; PR remains Draft/unmerged. The only completed activity here is isolated synthetic billing hardening and its documentation.
- **Next external action (owner-controlled):** supply nonsecret approved SKUs/price/currency/terms and merchant eligibility for CafeBazaar, Myket, Play, and official web PSP/domain; configure credentials in authorized backend secret storage and approve sandbox test access separately. After that, provider-specific verified receipt integrations and sandbox refund/replay evidence can be tested for each channel; only then request final authorization for live enablement.

## 2026-11-15 — design-stage four-channel checkout testing checkpoint

**Product phase clarified by owner:** Sahmino is in late design/development, has not been registered for sale in the four storefront/merchant consoles, and is not published. Therefore the current phase's acceptance must distinguish development-complete *synthetic design* from real merchant integration. Missing production SKUs or sandbox purchases are pre-publication dependencies, not evidence of a missed live-launch step in an unpublished app.

- Existing synthetic ledger and tests were inspected before extending them; no duplicate billing engine or provider stub added.
- Commit 609408110ef13398a39dfcdff62fa93a3c6172cb adds one coherent synthetic lifecycle regression for **all four channels and all five fixed-day plans**: purchase, 24h-day expiration accounting, session-independent balance read ('restore' as in-memory snapshot read, NOT store API restore), duplicate receipt retry, cross-account receipt replay conflict, refund, duplicate refund and denial of reuse after refund. Another test verifies stacking 30+60 days and account isolation across all channels.
- These are test cases committed to an existing CI-listed Node test file, **not** a claim of executed passing tests or an actual installed app/end-to-end PSP integration.
- Design-stage completion depends on obtaining successful exact-commit billing CI for these tests plus agreed package/SDK integration and frontend review. The published-app stage separately requires creating registered app listings and merchant SKUs, official verified receipts, sandbox receipts, compliance, signing, deployment and owner approval. Do not confuse these stages.
- No official provider authenticated access, production purchase, checkout, release flag, deployed server, or merge. All four payment paths remain simulated/disabled. The next review should check exact-SHA CI and then determine whether Android/Web build flavors actually call these billing boundaries, rather than treating isolated ledger tests as app integration.

## 2026-11-15 — four-channel server connector boundary (development only)

- Owner confirmed app development is complete and requested attention on connecting CafeBazaar, Myket, Google Play, and the website rather than more unrelated app work. Existing PR #184 was continued, **without merge or deploy**.
- Added `billing/staging/sahmino-provider-connection-gate.cjs` in commit a6c6460a57260b6618d89de65b572d2e0c9b3d25. A **single server-owned gate** binds authenticated principal, channel-specific server order, exact five-day product catalog (SKU/price/currency), and safe receipt shape before optionally invoking an injected officially authenticated provider-client function. Web PSP also binds merchant ID and order ID and compares returned amount/currency.
- The gate **always returns `providerVerified:false`, `realEntitlement:false`, `checkoutEnabled:false`** even when an injected callback claims SETTLED; a mere callback is NOT authenticated merchant evidence and cannot issue a grant. Credentials, official API clients, durable verified ledger/ack/consume, and app-flavor integration remain missing. `merchantApproved` is a staging configuration input, not permission to release or a substitute for audited provider verification.
- Added `tests/sahmino-provider-connection-gate.test.cjs` in commit dede2f80e73e3ed785ce520e66536b738594fb77, covering 20 unconfigured cases, 20 positive-but-non-authoritative mocked callbacks, tampered account/order/catalog, pending/refunds/web order mismatch, and invalid catalog. It was wired into the existing isolated CI workflow in commit f3f3bc100cef1826f842398c4ccae04eed5237eb.
- Before GitHub commit, an equivalent standalone dependency-free local Node.js gate+suite returned **5/5 passing test cases**. This local result is useful but does **not** prove the exact GitHub committed source or full repository CI is green. Confirm official exact-commit CI separately.
- Current integration blocker by channel: CafeBazaar official account/SDK+server API credentials and console SKU; Myket official supported billing API/SDK plus console products; Google Play Billing Library/app flavor, authorized Google Play Developer API backend (products v2 or subscriptions v2 as applicable), merchant/region approval and exact fixed-day model; website lawful chosen PSP, domain, callback and server verification contract. None can be truthfully treated as active yet.
- Google official guidance: https://developer.android.com/google/play/billing/security and https://developer.android.com/google/play/billing/lifecycle/one-time; server verification requires Google Developer API lookup and PENDING purchases cannot grant entitlement.
- Next scope is **real provider-specific API clients, app build-flavor wiring, and authorized sandbox tests**, after app registration and nonsecret catalog/domain/provider selection. The public GitHub repo must not contain merchant secrets, purchase tokens or private customer data. No payments, public storefront publication, merge or deployment occurred.

## 2026-11-15 — official Google Play read-only API path added; four channels remain not live

- Consulted the Google Play Developer API official `purchases.productsv2.getproductpurchasev2` REST contract, and its 2026 purchase-state schema: `GET https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/purchases/productsv2/tokens/{token}`, OAuth `androidpublisher` scope; response `purchaseStateContext.purchaseState` and `productLineItem[].productId`.
- Added `billing/staging/sahmino-google-play-readonly-client.cjs` at a10276515e64792b66ed6c32071bdd9ba730b1af: server-only OAuth token supplier and injected GET transport, input validation, redirect disabled, ten-second timeout, JSON size bound, strict `PURCHASED`, single matching SKU/quantity, order ID; no tokens or HTTP exceptions in public results.
- Added `asFourChannelQuery` at d5f92764d2c5dae3d33a61f81fb643665eb84222 to adapt the Play API response to the already-existing four-channel gate. Added regression tests including integrated mock bridge at 1bd6810b2fb807a67df4652b1f736617017ad95a and d72c92b3aad573d3cc3f8a5f782dcc05971aa57c. Added the tests to the isolated billing workflow at b5c079ed877522fb254078194fd6913ba517093d.
- This is a **real official API path, not a real verified purchase**: there is no authorized OAuth, merchant console, Play test transaction, independently validated account binding, trusted durable grant, acknowledgement or voided-order reconciliation. Both Play read-only adapter and four-channel gate deliberately return `providerVerified:false`, `realEntitlement:false`; nothing activates billing.
- **Outstanding for CafeBazaar:** authoritative current developer API token/endpoint and authenticated server integration, registered package/products, consumable/ack handling and refund test.
- **Outstanding for Myket:** official developer API contract + signature verification and licensed console product setup; SDK sample and unofficial internet snippets are not equivalent to approved merchant receipts.
- **Outstanding for Google Play:** approved package/products, Play Billing Library Android flavor, server-owned OAuth token, exact-day product model eligibility, account/receipt binding, persistent idempotency and refund reconciliation; first require documented success of the exact-head CI tests.
- **Outstanding for website:** owner-selected lawful PSP + official payment request/verify API contract, domain, pending-order correlation, callback-auth rules and sandbox refund/replay. Do not invent a PSP or deploy speculative callback endpoints.
- No SDK wiring to the actual published APK/PWA, no production secrets, no merchant transactions, no merge/deploy/release. PR #184 remains Draft. Current task remains connecting four provider-specific verified paths before release, not more general app changes.
- Official Play reference: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.productsv2/getproductpurchasev2 and https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.productsv2
