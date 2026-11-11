# Day 3 real-evidence reconciliation — Vesakht (2026-11-10)

**Result: numerical reconstruction completed; final financial attestation NOT complete.** This file is a review-only record, not trading approval.

## Actual source capture
- Instrument `وساخت`, `insCode=25514780181345713`, ISIN `IRO1SAKH0007`.
- Daily: `https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceDailyList/25514780181345713/500`, 500 rows covering 2024-10-15–2026-11-10; original captured bytes SHA-256 `c974e81430cbf58240d0b89018bdadfd60fd352bf78299f8d2e396634d7dece3`.
- Adjustment events: `https://cdn.tsetmc.com/api/ClosingPrice/GetPriceAdjustList/25514780181345713`, 15 entries, 2009-01-20–2026-01-20; bytes SHA-256 `9363ac67e70d2b86c398d46b4d33dc4e623df35132bef8b0417e7087be6c5cdd`. Captured `corporateTypeCode` is null; no event-type inference from that field.
- Manifest SHA-256 `6e39a7c9a50f62015813a9391da6c2175ddc18702dc38034a2ab543b4908e474`; capture at `2026-11-10T18:12:03.032Z`.

## Actual in-range event verification
- 2025-02-02: original 1443 IRR, adjusted 1413, delta 30 IRR. Secondary reported dividend 30 IRR in [AGM republication](https://t.me/s/Codal360_ir/279261).
- 2026-01-20: original 1185 IRR, adjusted 1105, delta 80 IRR. Secondary reported dividend 80 IRR in [AGM republication](https://t.me/s/NoavaranCodal/390591).
- The latest large capital increase on 2022-05-22 (1,090,296,000 → 30,842,726,351 shares) predates the 500-row window, supported by independent third-party capital-action listings. This does **not** prove an exhaustive absence of subsequent actions from issuer-original documents.

## Three-mode numerical basis
[Published tse-client source](https://github.com/m-ahmadi/tse-client/blob/master/README.md) defines `adjustPrices=0` raw, `1` capital + cash dividends, `2` capital only. TSETMC `GetClosingPriceDailyList/.../500` final argument is `Top` (maximum rows), **not** the tse-client adjustment mode.

- Mode 0 = captured raw `pClosing` series.
- Mode 1 = independently reconstructed chronological daily closes multiplied by applicable later event ratios `1413/1443` and `1105/1185`, according to date-boundary rule, rounded to two decimal places; this is **computed, not separately retrieved from tse-client**.
- Mode 2 = mode 0 **only conditionally**, if no capital increases within the 500-row span; **not** an independently observed mode-2 provider/library output.
- Separate local review-only JSON created from originally saved capture bytes: `vasakht-day3-three-mode-reconstruction-review-only-20261110.json`, SHA-256 `e051250f03228fa336a1811804c79a9fc753f2a88673b13f9393da332b14851d`.

## Explicit unresolved release conditions
1. Direct original Codal/issuer evidence for each in-window action and an exhaustive issuer-authenticated capital ledger were not obtained.
2. Genuine separately executed `tse.getPrices(...,adjustPrices:0|1|2)` source outputs were not obtained: legacy upstream `TseClient2.aspx` failed with `InstrumentAndShare`.
3. Only 500 rows, not full instrument history, were captured.
4. Independently trusted, immutable evidence-review signing/verification boundary required in `DAY2-HISTORY-BASIS-EVIDENCE-GATES.md` is not implemented.
5. Broker fee 3 IRR difference is scoped only to DEC-006 pilot exception; it does not authenticate broker fee component rules.

**Non-negotiable:** `day3FinalAccepted=false`, `historyBasisAuthenticated=false`, `entryEligible=false`, `tradingSignalsEnabled=false`. Do not merge, deploy, alter holdings, or issue financial actions based on this review. Do not ask user to re-fetch the same data or rerun failed TseClient2 service.

## 2026-11-11 — Actual blocker isolation: network probe vs independent issuer evidence
- Exact-head GitHub Actions check for PR #164 at `55e1c4ed0839d6ffda17f22c076a4f86d7c3c50f`: 13/14 jobs completed successfully, including `fail-closed-regressions`, Smoke, Chromium, WebKit and 20/100 synthetic lifecycle; the `capture` job remained in progress, with no raw response artifact yet available when checked. The `fail-closed-regressions` log confirms **10 unit tests passed**, `RECONCILED 500 raw sessions`, and `DAY3_ACCEPTED False`. The raw arithmetic is complete and must not be reworked.
- The GitHub-hosted probe was automatically triggered on PR changes although outbound TSETMC access had previously timed out. Repeated code/documentation commits were causing repeated long-running probes without establishing provider authenticity. Commit `0a5f5f0ae35597b3cb1936771bd5adc57fd1257c` changed only the existing `.github/workflows/day3-vesakht-evidence-probe.yml` to **manual `workflow_dispatch` only** and renamed it explicitly as a connectivity diagnostic. Existing numerical tests and local evidence capture tooling remain unchanged. This prevents the automatic network diagnostic from blocking every documentation/code iteration. The change itself still needs exact-head CI review.
- External public cross-checks performed: the Sahmino `وساخت` page lists 80 IRR cash dividend (1404/11/01) and 30 IRR cash dividend (1403/11/15), aligning with the previously recorded 2026-01-20 and 2025-02-02 adjustment observations; Bourseeye lists corresponding historical adjustment ratios and the 1401/03/01 capital increase. Reference pages: https://sahmino.com/symbol/sakh?tab=chart and https://bourseeye.com/stocks/136/وساخت-سرمایه-گذاری-ساختمان-ایران/capital-increases . These are **secondary/aggregated sources only**, not independently authenticated issuer disclosures, and a date/price match is not corporate-action causation proof.
- A republication of the 1404 issuer AGM decision reports 80 IRR DPS and links an original CODAL `DownloadFile.aspx` document (https://t.me/s/NoavaranCodal?q=%23وساخت); attempting to open that original CODAL link through the available web interface produced an accessibility error. **Do not mark primary CODAL verified.**
- Direct reads of both `cdn.tsetmc.com` original closing-price and adjustment URLs also failed from this interface; no new authenticated raw bytes or independently executed TSE Client outputs 0/1/2 were obtained. This is a network/access limitation of the current environment, not evidence that the endpoints are universally unavailable.
- **Precisely remaining gate:** trusted issuer-original CODAL records for relevant actions, separately obtained mode 0/1/2 with complete instrument/mode/time/hash binding, independent price-basis attestation and full-history scope (as required by existing release criteria). Existing captured 500/15 bundle and synthetic/CI regressions can support a bounded pilot review only. No new arithmetic implementation or trader-facing signal is justified. Keep all acceptance and trading flags false.
