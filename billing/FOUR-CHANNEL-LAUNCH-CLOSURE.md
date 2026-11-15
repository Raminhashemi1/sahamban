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

## Smallest remaining critical path

1. **Console facts (owner-assisted, non-secret):** provide five SKU identifiers per store, the currency and final price of each, plus confirmation of fixed-day/renewal semantics. For Play also provide approved merchant/sales region and console-based proof that five exact durations are supported; for Myket provide actual approved product mode; for website, domain and PSP provider name. Keep access tokens, passwords, keystores and merchant secrets out of chat and git.
2. **Provider-specific server purchase verification:** on a protected backend, verify package/app IDs, product, environment and purchase status against the provider before atomic credit; no self-asserted client approval. Include unique provider-qualified purchase key, replay/refund/revoke/restore, acknowledgement or consumption per channel.
3. **Sandbox evidence:** perform at least one approved test purchase and refund/replay per channel under developer-owned authorized sandbox/test setup. Audit exact outcomes without leaking receipt tokens.
4. **Release evidence:** final package/signing and store listing, privacy/financial disclosures, financial-data feature gates and exact-build smoke tests. Obtain explicit final release approval before merging, signing, uploading or making payments live.

## Repository-only evidence gate

`billing/staging/sahmino-four-channel-release-evidence.cjs` checks a **non-secret review inventory**: four channels, five products each, safe SKU formats, priceMinor and ISO currency plus a reviewer reference for merchant eligibility, provider verification, refund/replay, sandbox purchase and legal/privacy approval. Its output `ready` means **only that supplied review fields satisfy structural checks**. It never authenticates documents, checks console status or enables checkout. Do not use it as a deployment or entitlement authority. Tests use fictional references explicitly and do not constitute store evidence.

## Release status
**NO-GO for all-four-live launch.** No production secrets, access, checkout or payment flags have been connected. Keep draft PR #184 unmerged pending legitimate merchant/account evidence, actual billing tests, and separately approved release.
