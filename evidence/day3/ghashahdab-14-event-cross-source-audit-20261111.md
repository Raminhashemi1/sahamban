# غشهداب — cross-source event reconciliation (2026-11-11)

**Scope:** numerical *comparison*, not corporate-action or financial authenticity. No source prices modified; no signals enabled.

- Instrument: `33611155027418901` (غشهداب)
- Daily original: user-provided `0 (1).json`; 757,418 bytes, SHA-256 `df33beb68c7481cde286a85f115e1853e123179c64fa48f485ecef96c7b31eb8`; 2,367 daily rows, descending unique dates `2026-11-11` through `2017-01-04`; 215 zero-transaction rows; every row has the same instrument code.
- Adjustment input: **14 event rows manually transcribed from the user's TSETMC browser screenshot** of `GetPriceAdjustList/33611155027418901` (not a cryptographically verified raw JSON download). The user-provided daily original and that screenshot are distinct evidence types.
- Comparison methodology: `pClosingNotAdjusted` on event date vs `pClosing` of the **immediately preceding chronological row** in the daily history. Do not confuse this with same-day close, which can reflect trades after event adjustment.
- Result **13/14 exact**, **1/14 discrepancy**; same-day comparison only **7/14** exact and is not the correct general boundary.

| Event date | Previous daily date | Previous close (IRR) | Event pre (IRR) | Event post (IRR) | Pre−previous (IRR) |
|---|---|---:|---:|---:|---:|
2026-08-29 | 2026-08-26 | 2314 | 2314 | 2284 | 0
2025-08-05 | 2025-08-04 | 1282 | 1282 | 1255 | 0
2024-07-21 | 2024-07-20 | 1699 | 1699 | 1676 | 0
2023-07-22 | 2023-07-19 | 4030 | 4030 | 4009 | 0
2022-07-23 | 2022-07-20 | 2452 | 2452 | 2422 | 0
2021-07-11 | 2021-07-10 | 3307 | 3307 | 3247 | 0
2020-08-09 | 2020-08-05 | 30210 | 30210 | 29806 | 0
**2020-05-26** | **2020-05-23** | **34076** | **32614** | **34076** | **-1462**
2019-07-27 | 2019-07-24 | 3641 | 3641 | 3441 | 0
2019-03-13 | 2019-03-12 | 2677 | 2677 | 2311 | 0
2018-07-26 | 2018-07-25 | 1917 | 1917 | 1647 | 0
2018-02-17 | 2018-02-14 | 2056 | 2056 | 1761 | 0
2017-07-09 | 2017-07-08 | 2035 | 2035 | 1813 | 0
2017-05-21 | 2017-05-20 | 2064 | 2064 | 1966 | 0

## Notable anomaly — 2020-05-26

- Adjustment endpoint (as shown in user screenshot): `pClosingNotAdjusted=32614`, `pClosing=34076` (post **greater** than pre).
- Prior daily close 2020-05-23: `pClosing=34076`. Same-date daily on 2020-05-26: `pClosing=34770`, `priceYesterday=34076`, `pDrCotVal=33990`, `priceChange=-86`, `zTotTran=16243`. The trade count is **nonzero**, unlike many other adjustment-date rows.
- An unusual but important coincidence: **event post-adjustment price 34076 exactly equals the preceding daily close 34076**. This alone does **not** establish field reversal or an official explanation.
- The 1,462 IRR discrepancy is **not** a rounding or tick-size issue; no generic tolerance or synthetic corrected price is justified.
- Further source evidence needed: raw `GetPriceAdjustList` response preserved byte-for-byte, corporate-action details or official TSETMC data definitions for the specific event, ideally independent primary-source corroboration. Screenshot alone cannot authenticate corporate-action causality.

## Decision and safety

`historyBasisAuthenticated=false`, `day3FinalAccepted=false`, `threeModesVerified=false`, `tradingSignalsEnabled=false`, `entryEligible=false`. **Do not pass financial release gates** or silently substitute `34076` for `32614`. This is an additional independent cross-symbol anomaly, **not** proof of a generic software calculation bug. No merge/deployment performed.
