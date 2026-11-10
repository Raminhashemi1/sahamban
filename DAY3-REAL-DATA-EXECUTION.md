# Day 3 — real TSETMC data evidence execution (2026-11-10)

**Scope:** MASTER-PLAN Day 3: real market-data testing, buy/sell calculations, major bug fixes. This is an execution checkpoint and reproducible capture protocol, **not** a declaration of provider authentication or Day 3 completion. The main trade-cost module has already been implemented; do not duplicate it.

## Exact preflight

- Active integration branch: `feat/day2-history-basis-gates-20261109`, Draft PR [#164](https://github.com/Raminhashemi1/sahamban/pull/164). Do not merge any PR without explicit user approval.
- Read-only collector already exists in independent **unmerged** PR [#162](https://github.com/Raminhashemi1/sahamban/pull/162) (head `d3e511d3eb1fe5eb226337b79376cbd5e293eddc`), and three-mode response adapter already exists in independent **unmerged** PR [#161](https://github.com/Raminhashemi1/sahamban/pull/161) (head `7d71adbc9cd7836d3679eca2400d286ce0f328ce`). PRs #156–#160 are also independent review-only branches; nothing is implicitly integrated.
- `GetClosingPriceDailyList/{insCode}/{Top}` uses `Top` as a maximum record count in current third-party endpoint references; **/0, /1, /2 are NOT three adjustment modes**. TSE Client's library-level `adjustPrices=0/1/2` is a different contract; library/consumer labels are not provider-origin proof.
- Inspect exact-head CI before running or recording any acceptance statement; earlier successful workflow runs never validate new commits.

## Test 1: read-only source capture — status BLOCKED_NETWORK

2026-11-10: the preceding chat reported a local DNS failure, but no independently reproducible local command output was retained in this session. Treat that report as unverified, not as a new executed test. No authenticated provider HTTP payload was obtained in this session. No HTTP response, provider bytes, price dataset or meaningful digest was obtained. The existing GitHub Runner Smoke artifact `13741265949` on `278d8df64a1dfcb6cb416acf8b18167f91a67556` separately reported `UNVERIFIED_NETWORK / UND_ERR_CONNECT_TIMEOUT` at `2026-11-10T06:35:25.340Z`. These network-specific failures **do not establish that TSETMC is offline** or that another trusted machine cannot access it.

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

## 2026-11-10 — Actual live-readiness test and completion assessment

**Base SHA:** `a324e62c37b1057d3023b2f2f41fbf69df4b71c6`. PR #164 is **OPEN / DRAFT / not merged**. CI on this SHA had nine successes and two running at the last check (Smoke `42770635860`, 100-holding `42770635916`); **do not claim 11/11 yet**. WebKit run `42770636075` succeeded. Smoke artifact `13741517462` contained `live-market-v111.json`: `checked_at=2026-11-10T06:46:28.663Z`, `status=UNVERIFIED_NETWORK`, `network_error_code=UND_ERR_CONNECT_TIMEOUT`, `source=https://cdn.tsetmc.com/api`, `symbol=فولاد`. The artifact exists while the overall workflow might still be running.

**Independent local executed diagnostic:** at `2026-11-10T06:48:23Z`, `socket.getaddrinfo('cdn.tsetmc.com',443)` failed with `gaierror(-3, 'Temporary failure in name resolution')`; at `06:48:28Z` the same call failed for `www.tsetmc.com`. There was no successful HTTP response or raw provider dataset. This is not proof of global TSETMC outage.

**Documentation checked, still third party:** `GetClosingPriceDailyList/{insCode}/{Top}` uses `Top` as row count (0=all); `tse-client.getPrices` has a different library-level `adjustPrices=0|1|2` contract. Sources: https://github.com/amirziveh/tsetmc-skill/blob/master/references/api-endpoints.md ; https://github.com/solitraderbusiness/tsetmc-mcp/blob/main/docs/endpoints.md ; https://github.com/m-ahmadi/tse-client/blob/master/README.md . None constitute provider-signed proof of source or adjustment semantics.

**Conclusion:** fee estimator and regression tests already implemented; authenticated raw data, three independently verified adjustment modes and fee-receipt reconciliation are **NOT VERIFIED**. Day 3 cannot be marked completed by the agreed acceptance gates. Do not rebuild or merge PR #161/#162, enable financial signals, or rewrite prices.

**Single next dependency:** run existing PR #162 collector on a trusted reachable network with independently checked public `insCode`; provide raw response files + manifest for review. Actual independent three-mode provider evidence and a de-identified brokerage receipt are subsequently required.

## 2026-11-10 — Targeted readiness review: capture size and market fee classification

**Preflight at starting head `d3ba4a41379359ed25f21e593d692e43fc2dbf25`:** PR #164 open/draft/unmerged. Of 11 returned GitHub Actions workflows, **10 SUCCESS and quote-basis/atomicity run 42771834142 still IN_PROGRESS** at the latest exact-head check. Smoke 42771834116 and WebKit 42771834139 SUCCESS. This is an interim CI snapshot, not 11/11. No production code was changed.

**New bounded-collector risk (review only):** PR #162's existing `tsetmc-live-evidence-v162.cjs` has `MAX_BYTES=1024*1024` for each HTTP response. The independent community technical reference https://github.com/amirziveh/tsetmc-skill/blob/master/SKILL.md reports a July 2026 full daily-history response for فولاد around **1.56 MB**, larger than that cap. This comparison identifies a plausible `DAILY_TOO_LARGE` outcome *even on a reachable network* for a long-history instrument; it is NOT a newly captured provider payload or proof of current exact size. Do not silently lift the safety cap, truncate evidence, or relabel missing history as valid. To run the existing collector unchanged, first select an independently identified short-history instrument whose verified original response meets the cap; long-history capture requires an explicitly tested bounded handling design in the collector's own PR. Neither approach makes the data source authenticated.

**Market fee-rate ambiguity, not an implemented fix:** `trade-cost-v1.js` describes TSE and IFB ordinary-share/rights fee ceilings through one schedule. Its original broker source https://idbr.ir/fees describes the edition-49 rates as the same across those markets, whereas other currently published market explainers report an IFB purchase rate of 0.3632% vs TSE 0.3712% (e.g. https://sahmino.com/articles/karmzd-o-malyat-maaamlat-pysh-az-sod-chkdr-az-pol-shma-km-myshod and https://bazaarbasheh.ir/learn/trading-fees-and-tax/). **Source conflict; no regulator primary circular and no actual trade receipt were authenticated.** Do not silently change the numeric engine to an unverified alternative; document market-specific classification as an open fee-reconciliation check before approving a non-TSE estimate. Existing calculator remains a ceiling estimate only.

**Unchanged closure gates:** No authentic TSETMC original response captured or adjustment modes independently verified. No de-identified broker execution record was supplied. Keep historical basis `UNKNOWN_NOT_ATTESTED`, signals disabled and Day 3 `IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE`. No merge, deploy, order, holdings change, architecture rewrite or duplicate collector/adapter.

**Single next task:** secure a read-only authentic provider raw capture using the existing PR #162 collector from a trusted accessible network and a verified `insCode`, mindful of its 1 MiB bound; preserve raw bytes and SHA-256 manifest for source review.


## 2026-11-10 — network-path reconciliation and newest live probe

- Current PR #164 base before this documentation update: `d2e395943b62d6d9a4364728abd41caf08d825ae`, OPEN/DRAFT/unmerged. Exact-head CI latest: 8 SUCCESS, 3 IN_PROGRESS (Smoke `42772645101`, WebKit `42772645129`, 20-holding `42772644394`). No result may be transferred to the documentation commits that follow.
- Downloaded latest exact-head Smoke artifact `13742616389`, `live-market-v111.json`: `checked_at=2026-11-10T07:03:55.438Z`, `UNVERIFIED_NETWORK`, `UND_ERR_CONNECT_TIMEOUT` for CDN, symbol فولاد. No response price/history obtained by GitHub runner.
- Ran a fresh read-only probe from this ChatGPT execution container: `socket.getaddrinfo('cdn.tsetmc.com',443)` and HTTPS GET both failed with local `gaierror(-3), Temporary failure in name resolution`. This is specific to this container, not proof of provider outage.
- Important correction/reconciliation of earlier shorthand: separate PR #137 diagnostic `42396816602` observed DNS success (three IPv4 addresses) on GitHub runner but TCP 443 timeout and HTTPS `UND_ERR_CONNECT_TIMEOUT`; another prior local container probe got DNS failure. Different execution networks have different failure points. Never describe this as global TSETMC DNS failure/outage.
- PR #137 also records the user's earlier physical Android-browser screenshot: public فولاد endpoint, quote/history connection and same-history match succeeded, reported close 4,410 IRR and market date 20261107; freshness was explicitly `UNVERIFIED_OUTSIDE_SESSION`. This is valuable network-specific field evidence but it is historical, user-device/browser evidence, not a retained original raw API payload, not a current-session quote, and not source-authenticated history. The same page is available at https://raminhashemi1.github.io/sahamban/market-connectivity-test.html. The next field check is only necessary if current-session freshness is a required acceptance item; it does not replace PR162 raw capture.
- Public community docs report the CDN may geo-block non-Iranian IPs (HTTP 303/403) and describe the endpoint contracts; this is third-party evidence only, not official SLA. Sources: https://github.com/amirziveh/tsetmc-skill/blob/master/SKILL.md and https://github.com/solitraderbusiness/tsetmc-mcp/blob/main/docs/endpoints.md .
- Existing PR162 collector is not a three-mode history fetcher; PR163 register explicitly says it only captures daily-list and adjustment-list, while three TSE Client modes and transport-bound response provenance remain unimplemented. Do not conflate successful same-provider chart/history match with independent basis attestation.
- No code/plan/PR state change. Day 3 remains IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE. No merge, deployment, signals, orders or holdings access. Next single dependency: user-provided trusted-network raw capture/manifest from PR162 or authorized equivalent; keep all gates closed.
