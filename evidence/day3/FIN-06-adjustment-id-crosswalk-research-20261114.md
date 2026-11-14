# FIN-06 — adjustment response identity research (2026-11-14)

## Question
Does TSETMC's documented/observed API contract explain why the manifest requested `GetPriceAdjustList/25514780181345713` but every visible row in the 15-row response carries `insCode=25514780181345710`?

## Repository evidence (primary artifacts)
- Manifest: `evidence/day3/vasakht-20261110-manifest.json` records the exact URL `https://cdn.tsetmc.com/api/ClosingPrice/GetPriceAdjustList/25514780181345713`, capture time `2026-11-10T18:12:03.032Z`, content type `application/json; charset=utf-8`, 2,076 bytes, 15 rows, SHA-256 `9363ac67e70d2b86c398d46b4d33dc4e623df35132bef8b0417e7087be6c5cdd`.
- The committed adjustment JSON has 15 rows; all visible `insCode` values are `25514780181345710`. Daily file and manifest use `25514780181345713`.
- Prior 2026-11-11 event-date audit's 14/15 numerical preceding-close matches are preserved as diagnostics only. That report does not establish a row-level ID crosswalk. Corporate-action interpretation for `...713` is therefore provisional.

## Public technical research (secondary, not official)
- TSETMC reverse-engineered endpoint catalog says `Instrument/GetInstrumentSearch/{query}` returns primary `insCode` plus `insCode2`, `insCode3`, `insCode4`, which may be old/related codes; it describes `GetPriceAdjustList/{insCode}` as price-adjustment history for an instrument. It does not document the meaning of the row-level `priceAdjust[].insCode` or explain a mismatch between request and row ID. Source: https://github.com/amirziveh/tsetmc-skill/blob/master/references/api-endpoints.md
- The `5j9/tsetmc` client passes the requested instrument code to `GetPriceAdjustList` and retains response `insCode` as a string column; it does not define a crosswalk or suppress/normalize that field. Source: https://github.com/5j9/tsetmc/blob/main/tsetmc/instruments.py
- A public secondary instrument dataset maps symbol وساخت to `25514780181345713`; it contains no verified mapping to `...710`. Source: https://github.com/semnan-university-ai/tsetmc-dataset/blob/master/tsetmc.php
- Exact-code web searches for `25514780181345710` returned no independent mapping. These sources are community-maintained/reverse-engineered and cannot authenticate provider output.

## Direct provider access
- Attempted the TSETMC CDN instrument search and both instrument identity endpoints, plus the price-adjustment endpoint, from the available browsing environment. All were inaccessible through this environment. No response body, HTTP status, or current provider record was obtained. This is an access limitation, not evidence that the endpoints are down.
- No available GitHub connector action can dispatch a workflow. No workflow or runner was launched and no new network capture was produced.

## Disposition
`FIN-06=BLOCKED_NEEDS_PROVIDER_IDENTITY_RESPONSE`.
- No basis to classify `...710` as alias, predecessor, related code, typo, or wrong instrument.
- Keep `tsetmc-capture-integrity-review-v1.cjs` strict; keep `RAW_INSTRUMENT_ID_MISMATCH_ADJUSTMENTS` fail-closed.
- Do not join the 15 events to 5,935/500 daily rows, attribute them to issuer corporate actions, recalculate adjusted prices, or promote prior 14/15 numeric matches to accepted financial evidence.
- Next required artifact is a provider-origin response from `Instrument/GetInstrumentSearch/وساخت` and `Instrument/GetInstrumentIdentity/{code}` for both codes, or a fresh `GetPriceAdjustList/25514780181345713` capture. Preserve exact request URL, UTC timestamp, HTTP status, content type, raw response bytes and SHA-256. A trusted Iran-network runner/browser may be needed due current environment access limits.

## Current related PR/CI status
- PR #164 current head at this checkpoint: `a49deedb16ac087c22e5a675aaf9af9780088595`; direct GitHub check-runs endpoint returned 0 checks, and workflow-run lookup returned 0 runs for that exact SHA. No exact-head CI pass is claimed. PR remains open and unmerged.
- Separate Android PR #166 current head: `7b1f881dc2e99c2d421cfb6027a75cbff0f45a50`; direct check-runs returned 12/12 completed success, and workflow-run lookup returned 11/11 completed success. PR remains open/Draft. Issue #167 remains open. This is not PWA physical end-to-end acceptance; Android work remains separate and paused in this finance lane.

## Safety
`sourceAuthenticated=false`, `historyPriceBasisVerified=false`, `capitalActionsVerified=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`, `day3FinalAccepted=false`. No data mutation, merge, deploy, release, order, trade, payment or holdings change.