# 2021-01-19 Vesakht 4-IRR discrepancy — disposition

Date: 2026-11-11. This is a source-to-source reconciliation, not a price correction.

## Exact observed values from the user's original full-history capture

For instrument `25514780181345713`:
- `closingPriceDaily` row 20210118: `pClosing=60750`, `priceYesterday=60750`, `qTotTran5J=0`, `zTotTran=0`.
- `closingPriceDaily` row 20210119: `pClosing=60750`, `priceYesterday=60750`, `qTotTran5J=0`, `zTotTran=0`.
- `priceAdjust` event row 20210119: `pClosingNotAdjusted=60754`, `pClosing=59910`.
- Difference between the adjustment endpoint's pre-adjustment reference and both daily endpoint close/reference values: **+4 IRR**.
- Both daily rows are zero-trade rows. This is not explained by an event-day trade changing the close.

## What is and is not resolved

The discrepancy is now correctly classified as an **inter-endpoint source conflict**, not an arithmetic defect in Sahamban and not a same-day-versus-prior-day indexing bug. The same 60750 value appears on both daily rows; the adjustment endpoint alone supplies 60754.

No authoritative source in the evidence bundle establishes whether 60754 or 60750 is the legally/market-correct pre-event reference. Third-party price-adjustment tables display 6,075 toman (i.e. 60,750 rial at displayed precision), but this is not authoritative and does not settle the exact 4-rial difference.

Therefore:
- Do **not** replace 60754 with 60750, or vice versa.
- Do **not** apply a 4-rial tolerance or silently round either value.
- Keep this single event quarantined from authenticated historical-basis calculations until a primary exchange/Codal record or another authoritative exact-precision source resolves it.
- All other 14 event dates match the preceding chronological daily close exactly; this supports the earlier finding that nine prior mismatches came from the wrong date comparison, but it does not authenticate corporate-action causation.

## Safety and gate

`day3FinalAccepted=false`, `historyBasisAuthenticated=false`, `tradingSignalsEnabled=false`. Raw captures are unchanged. No trading signal or transaction is enabled by this audit.

## Reproducibility

This disposition is based on exact rows in the user-provided 5,935-row daily capture and the committed 15-row TSETMC adjustment capture. It identifies the source conflict and prevents a false software fix. It cannot honestly claim the 4-IRR source conflict has been resolved.
