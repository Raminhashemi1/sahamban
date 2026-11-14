# Correction — committed Vesakht adjustment capture identity (2026-11-14)

## Supersedes the prior discrepancy claim
The earlier statements in this file claiming that the 15-row adjustment capture contains `insCode=25514780181345710` were incorrect and are withdrawn. Do not rely on that claim or on the earlier `FIN-05=BLOCKED_INSTRUMENT_ID_CROSSWALK` disposition.

## Exact repository re-check
Re-opened the exact committed files on both `feat/day2-history-basis-gates-20261109` (PR #164) and `test/day4-integration-conflict-resolution-20261113` (PR #169):
- `evidence/day3/vasakht-20261110-manifest.json` declares `insCode=25514780181345713`.
- `evidence/day3/vasakht-20261110-daily-500.json` contains 500 rows; visible row IDs are `25514780181345713`.
- `evidence/day3/vasakht-20261110-adjustments-15.json` contains 15 rows; every visible raw JSON `insCode` numeric lexeme is `25514780181345713`, not `...710`.
- Both branches return the same Git blob SHA for the adjustment file: `341d031b7693efacab02d6b602887498efa7674d`; the file text/length is 2,076 bytes on both refs.
- Manifest metadata records adjustment SHA-256 `9363ac67e70d2b86c398d46b4d33dc4e623df35132bef8b0417e7087be6c5cdd`, 2,076 bytes and 15 rows. This text review did not independently compute SHA-256 over downloaded raw bytes.

## Verifier implications
The strict verifier compares each original raw `insCode` lexeme with the manifest ID before JavaScript numeric conversion. Given the visible committed payload, the expected ID-check result is a match; the earlier predicted `RAW_INSTRUMENT_ID_MISMATCH_ADJUSTMENTS` was based on the erroneous reading and is withdrawn.

A new regression test was added to PR #169 to load the exact committed manifest, daily bytes and adjustment bytes and run the verifier against them. It asserts `RAW_BYTES_MATCH_MANIFEST_FOR_REVIEW`, 500/15 row counts, and that all financial trust/eligibility flags remain false. That test is pending exact-head CI at the time of this correction.

## Correct disposition
- `FIN-05=NO_COMMITTED_ROW_ID_MISMATCH`. The repository's committed daily and adjustment row IDs agree with the manifest.
- This does **not** authenticate the live TSETMC provider, prove that the capture was obtained from the claimed source, or attest the historical adjustment basis/capital-action completeness.
- The previous 14/15 event-date numerical comparison remains a diagnostic result, not provider authentication or trading approval. It may be revisited under the existing evidence and reconciliation criteria; it is not blocked by the withdrawn row-ID mismatch.
- Keep `sourceAuthenticated=false`, `historyPriceBasisVerified=false`, `capitalActionsVerified=false`, `entryEligible=false`, and `tradingSignalsEnabled=false`. Do not weaken the verifier or alter raw data.

## Next bounded action
Wait for the exact-head PR #169 test to run. If it passes, record the byte/hash/schema result as repository-artifact integrity only. Then continue with the separate provider-origin authentication and independent adjustment-basis evidence gates; do not claim those are satisfied by repository consistency.

No raw data, prices, adjustment records, manifest, verifier or holdings were modified by this correction. No merge, deployment, order, trade or payment occurred.
