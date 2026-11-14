# FIN-06 — correction to adjustment ID research (2026-11-14)

## Correction to prior premise
The earlier research note incorrectly stated that the committed adjustment rows used `25514780181345710`. That statement is withdrawn. Exact GitHub file reads on both PR #164 and PR #169 show all 15 raw adjustment-row `insCode` values equal `25514780181345713`, matching the manifest and daily history. Both branches expose the same adjustment-file Git blob SHA `341d031b7693efacab02d6b602887498efa7674d`.

The manifest records:
- Request URL: `https://cdn.tsetmc.com/api/ClosingPrice/GetPriceAdjustList/25514780181345713`
- Capture time: `2026-11-10T18:12:03.032Z`
- Content type: `application/json; charset=utf-8`
- Size: 2,076 bytes
- Rows: 15
- SHA-256: `9363ac67e70d2b86c398d46b4d33dc4e623df35132bef8b0417e7087be6c5cdd`

The row-ID mismatch and need for an ID crosswalk are therefore **not supported by the committed artifacts**. No alias or identity mapping between ...710 and ...713 is needed to explain these saved files.

## What remains unverified
The committed files being internally ID-consistent does not authenticate the provider or the original network capture. Direct TSETMC CDN access was unavailable from the prior browsing environment; no fresh provider-origin response was obtained. Secondary endpoint catalogues describe the relevant search, identity and adjustment endpoints but are reverse-engineered documentation, not authoritative evidence:
- https://github.com/amirziveh/tsetmc-skill/blob/master/references/api-endpoints.md
- https://github.com/5j9/tsetmc/blob/main/tsetmc/instruments.py
- https://github.com/semnan-university-ai/tsetmc-dataset/blob/master/tsetmc.php

## Correct disposition
`FIN-06=COMMITTED_ID_CONSISTENCY_CONFIRMED / PROVIDER_AUTHENTICATION_PENDING`.
- Do not retain the prior `BLOCKED_NEEDS_PROVIDER_IDENTITY_RESPONSE` status on the basis of the withdrawn ...710 claim.
- The 14/15 event-date comparison remains a numerical diagnostic. It is not independent provider authentication, adjustment-basis attestation, capital-action completeness, or trading authorization.
- A new PR #169 regression test loads the exact committed manifest and raw files through the existing verifier. It is pending exact-head CI; if successful, it will establish byte/hash/schema consistency for the repository artifacts only.
- Continue to require independent source authentication and evidence for historical adjustment basis/capital actions before financial use.

Safety flags remain false: `sourceAuthenticated=false`, `historyPriceBasisVerified=false`, `capitalActionsVerified=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`, `day3FinalAccepted=false`. No source data, prices, holdings, merge, deployment, order, trade or payment changed.
