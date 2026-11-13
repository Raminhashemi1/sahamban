# Day 3 — engineering pilot closeout, وساخت (2026-11-11)

## Decision and scope
**DAY3_ENGINEERING_PILOT_CLOSED / FINANCIAL_ATTESTATION_NOT_GRANTED.**

User approved finishing the engineering pilot using previously documented **DEC-007 Track B** instead of repeatedly calling the unavailable legacy `tse-client` service. This is a **scope-specific engineering closeout**, not a claim that the original three-mode production acceptance criteria or the independently signed financial evidence requirement passed.

**No new financial source, fabricated adjusted history, autonomous trading, release merge, or deployment is authorized.** Explicit flags remain:
`day3FinalAccepted=false`, `threeModesVerified=false`, `historyBasisAuthenticated=false`, `entryEligible=false`, `tradingSignalsEnabled=false`.

## Exact evidence, checked on original user attachments

| Source | Bytes | SHA-256 |
| --- | ---: | --- |
| Original full TSETMC `GetClosingPriceDailyList/.../0` user file `0.json` | 1,890,848 | `df85d417371d476edf1637f2e03ccae9df7518e02d37b8076442189e047b8247` |
| TSETMC bounded 500-session original file | 158,761 | `c974e81430cbf58240d0b89018bdadfd60fd352bf78299f8d2e396634d7dece3` |
| TSETMC 15 adjustment events original file | 2,076 | `9363ac67e70d2b86c398d46b4d33dc4e623df8b0417e7087be6c5cdd` |
| Original CODAL FY1403 PDF, DPS 30 IRR, tracking 1304830 | 52,754 | `1ac1d28b9656a068b5ade67da3031351f40c0d98579f4750eb35e05f78a8f94f` |
| Original CODAL FY1404 PDF, DPS 80 IRR, tracking 1478213 | 53,950 | `d96d1fbedd58d46efc35fc4cc837b3d9f8ea0133730961f202dff75ab08d5295` |

Original full-history data: 5,935 rows, date span 2001-03-25–2026-11-10, 379 zero-volume rows, all records `insCode=25514780181345713`, no duplicate dates. All **500 bounded rows compare equal as parsed JSON objects to the first 500 full-history rows**.

## Adjustment reconciliation: no silent extrapolation
All 15 adjustment dates exist in the full-history JSON. **Only 5 of 15** have `daily.pClosing == event.pClosingNotAdjusted` on the event date. The other **10 differ**, which is an explicit warning against treating all 15 adjustment-ratio records as an independently validated full-history adjustment ledger.

| Date | Daily pClosing | Event pClosingNotAdjusted | Event pClosing | Daily matches event-before? |
| --- | ---: | ---: | ---: | :---: |
| 2026-01-20 | 1185 | 1185 | 1105 | Yes |
| 2025-02-02 | 1443 | 1443 | 1413 | Yes |
| 2024-01-28 | 2166 | 2166 | 2122 | Yes |
| 2023-03-06 | 1697 | 1697 | 1683 | Yes |
| 2022-02-20 | 29620 | 29620 | 29420 | Yes |
| 2021-01-19 | 60750 | 60754 | 59910 | No |
| 2017-01-22 | 2216 | 2286 | 2216 | No |
| 2016-01-05 | 1973 | 1826 | 1726 | No |
| 2015-01-19 | 3077 | 3237 | 3077 | No |
| 2014-01-21 | 4880 | 5879 | 5829 | No |
| 2013-01-21 | 2409 | 2422 | 2372 | No |
| 2011-12-24 | 1711 | 1761 | 1711 | No |
| 2011-01-24 | 1288 | 1232 | 1177 | No |
| 2010-02-01 | 1418 | 1490 | 1420 | No |
| 2009-01-20 | 1050 | 1310 | 1050 | No |

Two latest in-window events: 2025-02-02 delta **30 IRR** and 2026-01-20 delta **80 IRR**. Both equal user-supplied original CODAL AGM dividend values. The existing 500-session deterministic review and its unit tests remain the bounded engineering pilot. The computed capital+dividend output is explicitly `DERIVED_FOR_REVIEW`; capital-only is conditional and no three genuine modes are claimed.

## Engineering completion versus financial/release readiness
- **Completed for engineering pilot:** original 500-session alignment, 2 in-window dividend numerical cross-checks, existing deterministic review flow and fail-closed decision paths; original complete history now archived by user and structurally reviewed; trade-fee 3-IRR difference remains nonblocking **only** under DEC-006 pilot exception.
- **Excluded from this closeout:** independently authenticated full-period historical price-basis, the 10 mismatched older event semantics, exact separate upstream `adjustPrices=0/1/2` captures, independently enrolled external signing reviewer and live-trading authorization. Those are **financial attestation / release requirements**, not newly discovered Day 3 engineering tasks.
- **Not verified here:** the raw file itself is not yet committed to GitHub; commit records its digest and validation only. Do not misrepresent GitHub documentation as immutable source-byte storage.
- **CI:** final exact GitHub SHA needs its own check. This report does not assert CI-green for itself. Do not merge PR #164 without explicit approval.

## Reopening rule
Reopen the engineering pilot only on a concrete failing regression or proved numerical defect **within the bounded pilot**. If the project later requires financial action or all-period adjusted charting, track external independent provenance and the 10 historical discrepancies under **separate financial-release acceptance**; do not count those as unfinished pilot coding tasks.
