# Day 2 closeout — historical price-basis evidence and release gates

Scope: PR #164, building on independent draft PRs #156–#160. This document defines **acceptance criteria**, not a claim of live-source verification. No merge, deploy, trade, holdings change, price rewrite, or financial order is authorized.

## Current invariant

Historical TSETMC daily closes from `GetClosingPriceDailyList/{insCode}/0` (fields `dEven`, `pClosing`) carry `UNKNOWN_NOT_ATTESTED` / `NOT_ESTABLISHED`. Their adjustment basis is **not** inferred from valid dates, prices, indicators, a same-day quote, a matching synthetic fixture, or a user-supplied `INDEPENDENTLY_ATTESTED` string.

Until independent evidence has been verified and bound to the exact instrument, time range and dataset:
- Entry/exit recommendations, stops, targets and risk-per-share from the decision engine are suppressed. SMA, RSI and MACD are diagnostic only.
- Entry ranking, event studies and temporal holdout are blocked for the unverified series.
- Portfolio holdings and raw histories are unchanged.
- No capital-adjustment ledger is applied to an unverified raw/adjusted source.

## Independent source-evidence acceptance checklist

For **each** source series and instrument, a reviewer must obtain and retain:
1. Exact symbol and `insCode`; provider hostname, endpoint, query parameters, capture UTC timestamp, HTTP status/content type, raw response digest and immutable artifact location.
2. Documented meaning of the endpoint's raw/adjusted mode and the precise mode argument, supported by independently inspected provider documentation or an authenticated upstream source. A parser's own labels do not prove provider origin.
3. Three genuinely **separate** dated normalized series for `adjustPrices=0` (raw), `1` (capital + cash dividends) and `2` (capital only), plus the independently captured daily `dEven/pClosing` series. Do not fabricate modes or relabel the same response as different modes.
4. Exact Gregorian session-date alignment, duplicate/missing-date checks, unit and price-type agreement, positive finite prices, coverage counts, numerical tolerance and discriminating-date counts. Record evidence for the three-mode classifier in PR #160; ambiguous or mixed matches must stay `UNKNOWN_NOT_ATTESTED`.
5. Traceable corporate-action documentation for each affected interval (issuer identity, effective date, pre/post share counts, cash dividend amount and ex-date when applicable); cross-check event dates and ratios against PR #158. A matching ratio by itself does not authenticate the source or prove the action cause.
6. Reviewer identity, verification date, independent source cross-check, signed/immutable review record, explicit permitted instrument/date span, digest of the exact verified dataset, rejection reasons and expiry/revalidation conditions.
7. Negative/replay tests: swapped instrument, changed digest, out-of-range date, wrong mode, stale artifacts, duplicate session, mismatched units, partial evidence, mutated prices and self-asserted attestation all fail closed.

## Crucial trust boundary

The string `INDEPENDENTLY_ATTESTED` currently behaves as an input contract in several JavaScript paths; it is **not cryptographic or independently verified proof**. Never expose a UI switch or browser-fed field that can set this status. Before enabling any financial decision using a verified dataset, implement a trusted verification boundary that checks immutable evidence references, symbol/insCode, date coverage, mode and content digest. The trusted reviewer/authority must not be provided by untrusted request data. This is **not** implemented by PR #164 and is a release blocker, not a reason to silently activate signals.

## Test and CI acceptance

- Core `analyze` itself returns `DATA_BASIS_UNVERIFIED`, null stop/target/risk-per-share and only descriptive indicators for missing/unverified evidence.
- `decisionPlan` returns `NO_ACTION / DATA_BASIS_UNVERIFIED`; export preserves no actionable classification.
- v129 UI, v130 screener, v131 sample, v133 ranking, v132 audit, v134 holdout and portfolio UI cannot bypass the missing-evidence gate.
- Unit, smoke, Chromium and WebKit checks run on the **same exact PR head** and complete successfully. Investigate each failing job; never interpret previous-head green runs as current-head approval.
- Real retrieval of all three TSETMC modes and independently authenticated source/capital-action evidence are distinct mandatory tasks; synthetic mode classifier tests do not close them.

## Completion status

Implemented in PR #164: unknown-basis propagation, consumption guards, direct core engine gating, focused regression coverage. PRs #156–#160 remain separate review-only drafts.

Not completed: independently authenticated real-world three-mode retrieval and financial source review; trusted evidence verification boundary; complete all-green CI on the final head. PR #164 remains Draft and must not be merged or deployed without explicit approval.
