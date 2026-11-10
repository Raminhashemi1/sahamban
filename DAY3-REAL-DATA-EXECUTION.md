# Day 3 — real TSETMC data evidence execution (2026-11-10)

**Scope:** MASTER-PLAN Day 3: real market-data testing, buy/sell calculations, major bug fixes. This is an execution checkpoint and reproducible capture protocol, **not** a declaration of provider authentication or Day 3 completion. The main trade-cost module has already been implemented; do not duplicate it.

## Exact preflight

- Active integration branch: `feat/day2-history-basis-gates-20261109`, Draft PR [#164](https://github.com/Raminhashemi1/sahamban/pull/164). Do not merge any PR without explicit user approval.
- Read-only collector already exists in independent **unmerged** PR [#162](https://github.com/Raminhashemi1/sahamban/pull/162) (head `d3e511d3eb1fe5eb226337b79376cbd5e293eddc`), and three-mode response adapter already exists in independent **unmerged** PR [#161](https://github.com/Raminhashemi1/sahamban/pull/161) (head `7d71adbc9cd7836d3679eca2400d286ce0f328ce`). PRs #156–#160 are also independent review-only branches; nothing is implicitly integrated.
- `GetClosingPriceDailyList/{insCode}/{Top}` uses `Top` as a maximum record count in current third-party endpoint references; **/0, /1, /2 are NOT three adjustment modes**. TSE Client's library-level `adjustPrices=0/1/2` is a different contract; library/consumer labels are not provider-origin proof.
- Inspect exact-head CI before running or recording any acceptance statement; earlier successful workflow runs never validate new commits.

## Test 1: read-only source capture — status BLOCKED_NETWORK

2026-11-10: a local DNS resolution probe using Python `socket.getaddrinfo('cdn.tsetmc.com', 443)` failed with `gaierror [Errno -3] Temporary failure in name resolution`. No HTTP request was sent from this environment. No HTTP response, provider bytes, price dataset or meaningful digest was obtained. The existing GitHub Runner Smoke artifact `13741265949` on `278d8df64a1dfcb6cb416acf8b18167f91a67556` separately reported `UNVERIFIED_NETWORK / UND_ERR_CONNECT_TIMEOUT` at `2026-11-10T06:35:25.340Z`. These network-specific failures **do not establish that TSETMC is offline** or that another trusted machine cannot access it.

**Reuse existing reviewed collector, do not rewrite it:** On a trusted device/network where public TSETMC is accessible, check out **PR #162's exact branch/commit in a separate working directory**; do not merge it into PR #164. Obtain the public numeric 8–25 digit `insCode` from an independently checked instrument identity (never guess it). With Node's built-in fetch support, opt in by running:

```bash
node scripts/collect-tsetmc-evidence-v162.cjs <REAL_INS_CODE> ./private-tsetmc-capture
```

This specific CLI only collects two fixed TSETMC CDN paths for the specified insCode: `/api/ClosingPrice/GetClosingPriceDailyList/{insCode}/0` and `/api/ClosingPrice/GetPriceAdjustList/{insCode}`. It writes two exact UTF-8 JSON response files and a manifest with SHA-256, source URLs and capture UTC time, only when both requests meet its caps and schema checks; the CLI does not install into PR #164 and never accesses holdings or sends orders. On failure no successful capture is claimed. Keep artifacts in a **non-public** directory, and redact any sensitive unrelated records before sharing. Independently verify instrument identity and provider/source semantics; local DNS/proxy/trust stores are not an attestation authority.

## Test 2: three adjustment modes — status NOT_VERIFIED

After Test 1 succeeds, independently collect **three distinct raw response artifacts** from documented `tse-client` `getPrices` invocations with `adjustPrices` 0, 1 and 2, using consistent `symbol`, `startDate`, `daysWithoutTrade`, `cache:false`, and `mergeSimilarSymbols:false`. Record the exact command/library version, source URL/transport as observed, instrument identity, UTC collection time, content digest and the raw bytes for each response. The three-mode adapter of PR #161 can normalize user-supplied responses into PR #160's reviewer classifier only after metadata checks; neither adapter nor classifier authenticates provider responses. Numerical matching is correspondence only. Do not invent adjusted price series or assume that `GetPriceAdjustList` supplies complete adjusted price histories.

Cross-check actual corporate actions and source disclosure (issuer, dates, dividends, share-count ratios) against independently reviewed records. Reject ambiguous/mixed series and keep `UNKNOWN_NOT_ATTESTED` until a trusted digest-, instrument-, date- and mode-bound verification boundary is implemented and reviewed. Caller-set `INDEPENDENTLY_ATTESTED` is never sufficient.

## Test 3: financial calculation reconciliation — status NOT_VERIFIED

After reliable real inputs and a safely redacted brokerage transaction receipt are available, compare `trade-cost-v1.js` estimates against actual buy/sell fees, tax, rounding, caps and any brokerage discount. It is a ceiling estimate for ordinary shares/rights only, not ETF trading and not an order executor. Do not upload client ID/account numbers, holdings, trade IDs or personal details to a public repository. Record only de-identified numerical differences and the permitted verification conclusion.

## Stop conditions and next single action

- **Currently blocked:** no authenticated real-market provider bytes due to DNS/network failure here and previous GitHub runner timeout; no real mode-0/1/2 attestation, no broker receipt reconciliation, no release readiness.
- **Next single action:** on a trusted network with public TSETMC connectivity, run the pre-existing PR #162 read-only collector for an independently checked insCode and preserve raw JSON plus manifest for independent review. If the device cannot connect, record only the environment-specific error; do not interpret it as an empty market dataset.
- In all cases: no signals, trade, merge, deployment, financial data mutation or user-holdings access. PR #164 remains Draft.
