# FIN-07 — verifier audit corrected against exact committed artifacts (2026-11-14)

## Scope
Read-only review of `tsetmc-capture-integrity-review-v1.cjs`, its regression suite and the exact committed Vesakht capture files. No verifier or raw data was modified.

## Corrected findings
- The verifier binds the manifest to the fixed TSETMC host, exact endpoint URLs, expected filenames, content types, byte lengths and SHA-256 values before parsing.
- It scans original raw JSON `insCode` decimal lexemes before `JSON.parse`, avoiding JavaScript precision loss for long numeric instrument codes.
- Re-opened daily and adjustment capture files on both PR #164 and PR #169. All visible IDs in the 500 daily rows and 15 adjustment rows are `25514780181345713`, matching the manifest. The prior assertion that the adjustment rows contained ...710 was incorrect and is withdrawn.
- Consequently, the earlier predicted `RAW_INSTRUMENT_ID_MISMATCH_ADJUSTMENTS` result for the committed payload was also incorrect. Given the visible row IDs, the verifier's identity check should pass; the remaining exact-byte/hash/schema checks must be exercised against the actual saved files.
- Existing generic tests cover row-level mismatches for both daily and adjustment payloads, recomputed SHA, and 17-digit numeric JSON lexeme precision.
- Added a real-artifact regression test to PR #169 at commit `abf725933519901bd70bfea1667b2031884d7c52`. It loads the exact manifest, daily file and adjustment file, then asserts `RAW_BYTES_MATCH_MANIFEST_FOR_REVIEW`, 500/15 row counts and all financial authorization flags false. Exact-head CI was not yet visible at the time of this note.

## Correct disposition
`FIN-07=STATIC_REVIEW_PASS / REAL_ARTIFACT_CI_PENDING`.
If the new test passes, it confirms only byte/hash/schema and row-ID consistency of the committed repository files. It does not independently authenticate TSETMC, prove historical adjustment basis, establish capital-action completeness or authorize trading.

No raw evidence, manifest, price, adjustment row, verifier or holdings changed. All financial trust/eligibility flags remain false. No merge, deployment, trade, order or payment occurred.
