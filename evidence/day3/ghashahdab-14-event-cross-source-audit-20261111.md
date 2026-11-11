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


## Follow-up forensic review — cross-field checks, 2026-11-11

The user-supplied original daily JSON was re-read directly, and its SHA-256 reconfirmed as `df33beb68c7481cde286a85f115e1853e123179c64fa48f485ecef96c7b31eb8`.

### Day-to-day consistency around 2020-05-26

| Daily date | Daily closing (`pClosing`) | Previous reference (`priceYesterday`) | Last trade (`pDrCotVal`) | Trade count |
|---|---:|---:|---:|---:|
| 2020-05-20 | 32454 | 32826 | 34467 | 17102 |
| 2020-05-23 | **34076** | 32454 | 34076 | 1211 |
| 2020-05-26 | **34770** | **34076** | 33990 | **16243** |
| 2020-05-27 | 35890 | 34770 | 36508 | 6368 |

The adjustment endpoint's row for 2020-05-26 has `pClosingNotAdjusted=32614`, `pClosing=34076`. Thus `pClosing` **equals both** the immediately preceding recorded closing price and the event day's `priceYesterday`. The `32614` value appears **nowhere** in the 2,367-row daily capture as an exact numeric field value. This is not an exact daily price match, and it cannot be justified as routine tick-size rounding.

### Why the anomalous factor matters

- TSETMC event-derived ratio: `34076 / 32614 = 1.044827374747...`, a **+4.482737%** factor and the **only ratio greater than 1 among 14 events**.
- If applied retrospectively to the preceding close, it gives `34076 * (34076/32614) = 35603.5376` IRR. Compared with `34770` on 2020-05-26, this would represent a **-2.341% adjusted day-to-day change**.
- By contrast, the daily history's unadjusted closing-price change is `34770 / 34076 - 1 = +2.0366%`.
- These are different series by definition: the apparent adjusted discontinuity **does not alone prove a calculation error**, but blindly treating the event ratio as an authenticated corporate-action factor would introduce a consequential 4.48% rescaling for earlier prices.

### Comparison with ordinary same-day adjustment patterns

- On 2019-07-27, the event's `post=3441` coincides with the daily `priceYesterday=3441` **rather than** previous `pClosing=3641`; on 2017-07-09, `post=1813` similarly coincides with daily `priceYesterday=1813` instead of previous `pClosing=2035`. These events had nonzero trades; **an event date with trades is therefore not, by itself, an error indicator**.
- For 2020-05-26 the event's post-price also matches `priceYesterday`, **but** the daily `priceYesterday` is unchanged from the prior closing price and the event's `pre=32614` does not match that prior close. This *combination* distinguishes the anomaly.
- A historical cross-field check finds only **18/2366** adjacent daily pairs with `priceYesterday !=` prior-day daily `pClosing`, illustrating that altered quote reference is possible and should be audited rather than inferred from date alone.

### External secondary-source check

A secondary market-data display independently **publishes** the same May 26 / 6 Khordad event as a **1.0448** price-adjustment ratio and distinguishes it from the listed 1399 capital increase dated **26 Mordad 1399**:
https://bourseeye.com/stocks/501/%D8%BA%D8%B4%D9%87%D8%AF%D8%A7%D8%A8-%DA%A9%D8%B4%D8%AA-%D9%88-%D8%B5%D9%86%D8%B9%D8%AA-%D8%B4%D9%87%D8%AF%D8%A7%D8%A8-%D9%86%D8%A7%D8%A8-%D8%AE%D8%B1%D8%A7%D8%B3%D8%A7%D9%86/capital-increases

Because that display could re-use TSETMC data, **agreement is evidence that this is not merely screenshot transcription**, **not independent proof** that the ratio is financially legitimate. A distinct CODAL disclosure or official explanation is still needed to classify the cause and authenticate the basis.

### Release impact

Keep the raw daily prices and the reported event ratio unchanged. **Quarantine event 2020-05-26** as `UNATTESTED_UPWARD_FACTOR_AND_PREPRICE_CONFLICT`. A model requiring a fully verified adjusted historical series spanning this event must **fail closed**; avoid removing this factor, reversing fields, or declaring a corporate action without primary-source evidence. All global financial/trading release flags remain false.
