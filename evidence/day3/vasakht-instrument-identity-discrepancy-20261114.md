# Vesakht adjustment-record instrument identity discrepancy — 2026-11-14

## Observed repository evidence
Reviewed the existing committed evidence files; no new market request was made:
- `evidence/day3/vasakht-20261110-manifest.json` declares requested instrument `25514780181345713`.
- The committed daily capture `vasakht-20261110-daily-500.json` contains 500 rows, all with `insCode=25514780181345713`, dates 2024-10-15 through 2026-11-10, no duplicate dates.
- The committed adjustment capture `vasakht-20261110-adjustments-15.json` contains 15 rows, no duplicate dates, but every row's exact visible `insCode` value is `25514780181345710`, not the manifest/requested `...713`.
- The manifest records 15 adjustment rows and its own SHA-256/byte count, but this text review did not independently re-hash the original captured byte files. GitHub text retrieval is not substituted for the original raw byte artifact.
- The current `tsetmc-capture-integrity-review-v1.cjs` requires every raw `insCode` lexeme in both response files to equal `manifest.insCode`. On the visible committed values, the adjustment file would therefore fail `RAW_INSTRUMENT_ID_MISMATCH_ADJUSTMENTS`. The verifier correctly fails closed; no exception or silent aliasing is authorized.

## Independent public reference checked
A third-party endpoint catalogue describes `GetPriceAdjustList/{insCode}` as adjustment events for an instrument and describes TSETMC search `insCode` as the primary code, while noting `insCode2/3/4` can be old/related codes. Another third-party TSETMC client reference identifies `25514780181345713` as وساخت. These are reverse-engineered/aggregated references, not official provider documentation or authenticated raw API responses:
- https://github.com/amirziveh/tsetmc-skill/blob/master/references/api-endpoints.md
- https://pypi.org/project/tsetmc/0.29.0/

No public search result located an authoritative mapping between `25514780181345710` and `25514780181345713`. Do not infer that the suffix difference is harmless, an alias, a related code, or a wrong instrument without an authoritative instrument-identity crosswalk.

## Disposition
`FIN-05=BLOCKED_INSTRUMENT_ID_CROSSWALK`.
- Do not use the 15 adjustment rows to reconcile the 500 daily rows or issuer events until the exact ID relationship is independently established.
- Preserve the original raw bytes and manifest unchanged. Do not rewrite the IDs, recalculate the raw source hash, or change the verifier to accept a fuzzy/related ID.
- Required evidence: an independently obtained TSETMC instrument search/identity record or other authoritative provider record binding both codes to the same issuer/instrument and explaining why the adjustment endpoint emits `...710` when requested with `...713`. Retain original response bytes, exact request URL, UTC, content type and SHA-256. If no authoritative crosswalk exists, recapture the adjustment endpoint and retain the same strict identity test; otherwise keep the adjustment evidence rejected.
- Once identity is resolved, rerun the existing integrity verifier and event reconciliation against the original bytes. This is an evidence-resolution task, not a reason to reconstruct prices or manufacture three adjustment modes.

## Safety
`sourceAuthenticated=false`, `historyPriceBasisVerified=false`, `capitalActionsVerified=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`, `day3FinalAccepted=false`. No price mutation, merge, deploy, order, trade, payment or holdings change.
