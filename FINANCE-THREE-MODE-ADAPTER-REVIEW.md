# Financial three-mode adapter review — 2026-11-14

## Scope
This note records the FIN-02 adapter input hardening and FIN-03 classifier contract audit. It does not authenticate market data, certify adjustment basis, or authorize trading.

## FIN-02 — strict adapter input types
- Adapter source commit: 32bd1a388c98f7789e35ecd607f515a66dd1d26f
- Regression test commit: 2e16a333aacabd9526791703f4e5f51f11c44675
- Require instrument code as a decimal string; reject numeric IDs to avoid precision loss.
- Require raw daily pClosing and each mode close to be finite positive numbers already; do not coerce strings, booleans, null, objects, NaN or Infinity.
- Adapter remains normalization-only. Caller-supplied request metadata is not transport evidence.

## FIN-03 — classifier audit
Reviewed PR #160 exact head e642f017444f91f4a4aa1de423ed6a3470e90472:
- Gregorian date validation and duplicate-date rejection.
- Exact four-series date intersection; minimum overlap and discriminating observations.
- Strict finite positive numeric prices and tolerance-bounded matching.
- Ambiguous, unmatched and mixed discriminating observations fail closed; no majority vote.
- Source authentication, capital adjustment, entry eligibility and trading signals remain false.
- No classifier defect justified a code change. Existing PR #160 exact-head 11/11 workflows passed; these are synthetic tests only.
- `requiredAgreement` is configurable from 0.90 to 1.00 but the additional zero-ambiguous/zero-unmatched/zero-other-mode constraints make accepted agreement effectively 100%. This is conservative; do not relax without a separate explicit policy decision.

## Exact-head verification status
The adapter regression test count is six. On 2026-11-14, GitHub's commit workflow-run query and combined status returned no check rows for head 2e16a333aacabd9526791703f4e5f51f11c44675. The earlier 11/11 result on 7d71adbc9cd7836d3679eca2400d286ce0f328ce does not transfer to the new SHA. This note is committed to the existing PR branch to produce a fresh PR event/check snapshot; do not claim PASS until exact-head checks are observed.

## Safety
`providerAuthenticated=false`, `historyBasisAuthenticated=false`, `threeModesVerified=false`, `capitalAdjustmentAllowed=false`, `entryEligible=false`, `tradingSignalsEnabled=false`. No merge, deployment, release, order, trade, payment or holdings mutation.
