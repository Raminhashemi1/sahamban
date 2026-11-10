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
