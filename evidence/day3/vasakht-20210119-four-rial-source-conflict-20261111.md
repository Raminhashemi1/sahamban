# 2021-01-19 Vesakht 4-IRR difference — tick-grid reconciliation

Date: 2026-11-11. Instrument: `25514780181345713` (وساخت). This is a precision/market-tick reconciliation; original source bytes remain unchanged.

## Source observations

- Daily endpoint, 20210118 and 20210119: `pClosing=60750`, `priceYesterday=60750`; both rows have `zTotTran=0` and `qTotTran5J=0`.
- Adjustment endpoint, 20210119: `pClosingNotAdjusted=60754`, `pClosing=59910`.
- Thus the raw event reference is 4 IRR above the daily close, but 60754 is not on the valid 10-IRR price grid applicable at this price level.

## Resolution at executable quote precision

The Tehran Stock Exchange's published tick-size notice, effective 1400/02/12 (2021-05-02), says the minimum order-price increment for shares priced at 5,000 IRR and above remains **10 IRR**; only prices below 5,000 IRR move from 10 IRR to 1 IRR. Therefore, on 1400/10/30 (2021-01-19), a 60,754-IRR value was not an executable quote tick. The nearest valid 10-IRR quote is 60,750 IRR.

This is independently corroborated by the actual adjacent daily history: all 57 nearby active-session closing prices are on the 10-IRR grid; the event-day and adjacent zero-trade rows carry the same 60,750-IRR close.

The adjustment ratio also reconciles after applying the same quote-grid precision:

`59910 / 60754 = 0.9861079105902492`

`60750 × (59910 / 60754) = 59906.055568...` IRR, which rounds to the nearest valid 10-IRR quote tick as **59,910 IRR**, exactly the adjustment endpoint's post-event reference.

So the four-rial difference is not evidence that the daily close should be overwritten, nor a four-rial software arithmetic error. It is a sub-tick difference between the adjustment endpoint's unrounded pre-event reference and the exchange's executable daily close. The two endpoints agree once compared at the applicable quote precision.

## Disposition

- Classify this event as `TICK_GRID_RECONCILED_10_IRR`, not an unexplained 4-IRR price conflict.
- Preserve original `60750`, `60754` and `59910` values exactly; do not rewrite raw source data.
- Use 10-IRR tick normalization only for this dated, price-band-specific reconciliation. Do not introduce a generic ±4/±5 IRR tolerance for other dates or instruments.
- The 57-session local grid check is corroboration, not a substitute for the published market tick rule.
- This resolves the **numeric comparison at executable quote precision**. It does not authenticate the event's corporate-action type, full historical adjustment basis, or independent provider origin.

## Evidence references

- Tehran Stock Exchange tick-size notice, reported by SENA: from 1400/02/12, prices below 5,000 IRR move from a 10-IRR to 1-IRR tick; prices at/above 5,000 IRR remain on 10 IRR: https://shmi.ir/اطلاعیه-درخصوص-حداقل-تغییر-قیمت-هر-سفا/
- Broker notice reproducing the same rule and effective date: https://t.me/s/kharazmibroker?before=24093&q=%23اطلاعیـه_مهم
- Secondary historical price-adjustment table lists 30 Dey 1399 as 6,075 toman before and 5,991 toman after adjustment; this is only displayed-to-toman corroboration, not exact-IRR authority: https://bourseeye.com/stocks/136/وساخت-سرمایه-گذاری-ساختمان-ایران/capital-increases
- TSE Client adjustment method uses `priceBeforeEvent` and `priceAfterEvent` as the event ratio inputs; it is a documented library implementation, not a provider guarantee of raw quote precision: https://github.com/m-ahmadi/tse-client/blob/master/README.md

## Safety boundary

`day3FinalAccepted=false`, `historyBasisAuthenticated=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`. This reconciliation does not authorize signals, orders, deployment, or price-history mutation.
