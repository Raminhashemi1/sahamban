# FIN-07 — fail-closed verifier audit for the observed adjustment ID mismatch (2026-11-14)

## Scope
Read-only source/test audit of the existing `tsetmc-capture-integrity-review-v1.cjs` and its regression suite on `feat/day2-history-basis-gates-20261109`. No source code changed and no test execution is claimed.

## Findings
- The verifier binds the manifest to the fixed TSETMC host, exact daily/adjustment endpoint URL, expected filename, content type, byte length and SHA-256 before parsing.
- It scans original raw JSON `insCode` decimal lexemes before `JSON.parse` to avoid JavaScript precision loss for 15–20 digit instrument codes.
- It compares every raw ID lexeme in each response to the exact `manifest.insCode`; a mismatch returns `RAW_INSTRUMENT_ID_MISMATCH_<KIND>`.
- For the current manifest (`insCode=25514780181345713`) and observed adjustment rows (`insCode=25514780181345710`), the verifier's deterministic expected disposition is `CAPTURE_NOT_VERIFIED / RAW_INSTRUMENT_ID_MISMATCH_ADJUSTMENTS`.
- The existing regression suite includes `real-format per-row instrument identity mismatch is rejected even with recomputed SHA` for both daily and adjustment payloads, and additional tests for 17-digit numeric JSON lexeme precision. This is adequate generic regression coverage for the observed class of mismatch; no redundant test or code patch was added.
- The verifier's success state is only `RAW_BYTES_MATCH_MANIFEST_FOR_REVIEW`; all source authentication, price basis, capital actions and trading flags remain false.
- The live capture collector in the separate PR #162 intentionally records fixed endpoint response bytes and does not itself authenticate provider identity. The strict byte/ID verifier is a separate review step; do not treat collector status `CAPTURED_FOR_MANUAL_REVIEW` as financial acceptance.

## Test/CI boundary
- The active branch's `.github/workflows/smoke-tests.yml` contains `node --test tests/tsetmc-capture-integrity-review-v1.test.cjs`.
- PR #164 latest head at this audit: `c35e73f79c85f63a3b4320a49c3a220314daab7a`; direct `check-runs`, combined status and workflow-run lookups all returned zero entries. Therefore this test suite was **not confirmed executed on current PR #164 HEAD**.
- PR #162 current head `3cc42ee88ff3c2434dfa04b43e010df4475bdda4` has 12/12 exact-head check runs and 11/11 workflows success, but its changed files are the collector and tests, not this verifier; do not transfer that CI result to PR #164.

## Disposition
`FIN-07=PASS_STATIC_FAIL_CLOSED_REVIEW / EXACT_HEAD_CI_UNVERIFIED`.
No code change warranted. Preserve strict behavior and raw artifacts. The verifier rejects the mismatch but cannot explain why the provider returned a different ID. FIN-05/06 remain blocked pending provider-origin identity evidence.

## Safety
No raw evidence, manifest, price, adjustment row, verifier or holdings were changed. `sourceAuthenticated=false`, `historyPriceBasisVerified=false`, `capitalActionsVerified=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`, `day3FinalAccepted=false`. No merge/deploy/release/trade/order/payment/holdings mutation.