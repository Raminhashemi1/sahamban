# Sahamban Master Progress Register

> Audit snapshot: 2026-11-09 (UTC)
> Repository: https://github.com/Raminhashemi1/sahamban
> Audited baseline: `main` at `48853697ae7df9e20b75dffdb1d957d9563ca9a2`
> Status: first-pass repository / pull-request inventory. This is a control register, not a claim that every source file has received a line-by-line audit.

## 1. Mandatory change-control rule

Before any future Sahamban change:

1. Inspect the current `main` commit and relevant files.
2. Search all open, merged, and closed PRs/issues for the same capability, bug, test, or module.
3. Inspect the exact implementation, tests, CI runs, and deployment/integration state.
4. Classify the work as **already complete**, **partially complete**, **proposed but unmerged**, **failed/blocked**, or **not started**.
5. If partial, continue from the existing implementation/branch and preserve its tests and design; do not recreate it from scratch.
6. Compare branch/base SHAs and changed-file lists before reusing or opening a PR. Rebase/port only after checking for conflicts and duplicated behavior.
7. Do not merge, deploy, alter production data, or enable trading/financial decisions without explicit user approval.
8. Record the result and new PR/commit/CI evidence in this file.

A green CI run means the tested code passed those workflows. It does **not** by itself mean a PR was merged, deployed, connected to production, or validated against real market data.

## 2. Repository and audit scope

- Default branch: `main`.
- The repository PR inventory was reviewed across the earliest and latest GitHub search pages, covering PR history from #1 through #162 (including gaps in numbering).
- The latest 100 PR records and the oldest 100 PR records overlap; the open-PR search currently identifies **14 open PRs**.
- Main-branch baseline files inspected: `README.md`, `index.html`, `portfolio-pilot-v61.js`, and `.github/workflows/smoke-tests.yml`.
- The live market overlay in `portfolio-pilot-v61.js` explicitly describes itself as a pilot, keeps quote calculations in memory, and does not write to the holdings storage key.
- This is the first-pass PR and architecture inventory. A deeper module-by-module source review, live deployment audit, and real-provider validation remain outstanding.

## 3. Current open PR register

| PR | Current state | Audit finding / next action |
|---|---|---|
| #8 | Open, draft, not mergeable | Very stale v49 risk-engine branch: 3 commits ahead but 1,385 behind main. Compare with merged risk-engine work (#7/#10 and later safety work) before any reuse. Do not continue this branch blindly. |
| #137 | Open, draft | GitHub-hosted runner diagnostic: DNS resolved but outbound TCP/HTTPS to TSETMC timed out. This is an environment-specific network limitation, not proof that TSETMC is down. Branch is 6 ahead / 183 behind main. Keep as diagnostic history; do not merge as production market validation. |
| #139 | Open, draft | Same-day TSETMC daily-endpoint corroboration. Same-provider second endpoint, not an independent provider. Branch is 20 ahead / 182 behind main. Requires review/rebase and real response-shape validation before considering merge. |
| #152 | Open | CODAL remote-byte corroboration for local document review. Hash/byte match is not issuer-signature verification or proof of financial figures. Review-only. |
| #153 | Open | CODAL `LetterSerial` versus `TracingNo` identity semantics. Review whether its changes are already superseded or should be integrated with the other CODAL PRs. |
| #154 | Open | Duplicate CODAL source-row protection for EPS/DPS action chains. Review dependencies with #153 and #155 before integration. |
| #155 | Open | DPS gate requires capital-action reconciliation. Review together with #148 and #154; do not duplicate reconciliation logic. |
| #156 | Open | Standalone historical-price adjustment ledger and tests. Review-only; not connected to production history or trading. |
| #157 | Open | Marks the current TSETMC historical `pClosing` basis as `UNKNOWN_NOT_ATTESTED`. Changes `portfolio-pilot-v61.js`; important safety change, but not merged into main. |
| #158 | Open | Review-only TSETMC price-adjustment versus CODAL capital-event cross-check. Synthetic tests only; no production integration. |
| #159 | Open | Offline comparison of daily history with chart `a=0` and `a=1` modes. Synthetic tests only; does not establish live provider basis. |
| #160 | Open | Offline three-mode classifier: none, capital-plus-dividends, capital-only. Synthetic tests only; no automatic price adjustment. |
| #161 | Open | Adds adapter regression tests and CI coverage. The adapter source file `tse-client-three-mode-adapter-v161.js` is already present on main and is not in this PR's changed-file list; do not recreate the adapter. Verify its provenance and actual callers separately. |
| #162 | Open | Bounded opt-in TSETMC raw-response collector with SHA-256 manifest. All 11/11 listed PR workflows now completed successfully. Tests use mocked responses; no live TSETMC response was fetched. Collector output is not authenticated provider evidence. |

### Open-PR branch divergence

- #156–#160 are each one commit behind the current main baseline used in this audit; their branches are separate and should not be merged as a batch without integration review.
- #161 and #162 target the current baseline.
- #137 and #139 are substantially stale (183 and 182 commits behind main respectively).
- #8 is extremely stale and likely superseded; compare with the merged v49 risk work before touching it.

## 4. Market-history / adjustment work: dependency map

The following are distinct layers, not interchangeable implementations:

1. **#156 — adjustment ledger arithmetic:** applies explicitly supplied, traceable corporate-action factors to explicitly raw prices; rejects double adjustment. Review-only helper.
2. **#157 — production-feed basis guard:** labels the existing TSETMC history basis unknown unless separately established. This is a safety guard in the pilot file, but it is still in an unmerged PR.
3. **#158 — event corroboration:** compares price-adjustment evidence with CODAL capital-event records. It does not prove event causation.
4. **#159 — chart-mode cross-check:** compares daily closes against explicit TSETMC chart raw/adjusted modes (a=0/1). Offline only.
5. **#160 — three-mode classifier:** distinguishes none / capital-only / capital-plus-dividends using supplied series. Offline only.
6. **#161 — response adapter:** normalizes caller-supplied TSE Client responses into the classifier contract. Adapter code is already on main; this PR adds tests/CI rather than a new adapter source file.
7. **#162 — bounded evidence capture:** captures exact bytes from two fixed TSETMC endpoints and hashes them. This records responses but does not authenticate source origin or price basis.

**Important integration gap:** the PR descriptions explicitly keep these tools review-only. No evidence reviewed so far proves that live authenticated three-mode series are being fetched, classified, and safely integrated into production charts, valuation, technical indicators, or trading gates. Do not connect them to production without a separate, reviewed design and explicit approval.

## 5. Verified CI snapshot

For PR heads #156–#162, the GitHub connector returned 11 workflow runs per head; all 11 runs were completed with `success` at the time of this audit. This includes the smoke, Chromium/WebKit proxy, mobile safety, quote-basis, broker-safe-amount, and synthetic lifecycle workflows.

Scope limits:
- The tests described in these PRs use synthetic fixtures or mocked HTTP responses.
- No live TSETMC response was fetched by #156–#162 CI.
- A successful workflow is not equivalent to live data validation or production integration.

## 6. Merged capability milestones observed in PR history

The merged PR history indicates substantial existing implementation; future work must extend these rather than rebuild them:

- Portfolio quote/valuation pilot and market-data validation (v48–v61 range).
- Professional risk and technical-indicator work (v49/v50), with later safety and UI integration.
- ETF/NAV, liquidity, turnover, concentration and portfolio overview diagnostics (#61–#83).
- Mobile portfolio UX, responsive tables/cards, accessibility, PWA install/update and offline acceptance (#84–#128).
- External symbol screening, decision support, market sampling, signal audit, candidate ranking and temporal holdout diagnostics (#129–#134).
- CODAL/fundamental accounting, EPS/DPS, capital-action reconciliation and valuation safeguards (#142–#155), with some follow-on safeguards still in open PRs.

This list is a milestone index derived from PR titles/descriptions, not a substitute for inspecting the actual code paths and current runtime behavior.

## 7. Known blockers and safety boundaries

- GitHub-hosted runner connectivity to TSETMC has timed out in the diagnostic recorded by #137. The user's phone/browser previously reached the public endpoint; execution network matters.
- Current TSETMC historical `pClosing` basis is not established by same-day price matching alone.
- A SHA-256 hash proves byte identity for the captured payload, not provider authenticity, issuer signature, accounting correctness, or price-adjustment basis.
- Synthetic tests demonstrate logic against fixtures, not correctness of real-world market records.
- Do not mutate original price history or enable automatic capital adjustments based on unverified/caller-asserted series.
- Do not mark a symbol eligible for entry or enable trading signals from these review-only modules.

## 8. Next audit actions (ordered)

1. Audit the open PR graph and dependencies #152–#162; decide which are independent, which depend on one another, and which should remain diagnostic-only.
2. Inspect the actual main-branch callers for `tse-client-three-mode-adapter-v161.js` and confirm whether the adapter is used anywhere or is only a dormant helper.
3. Inspect #156–#160 source and tests together, identify duplicate responsibilities, and prepare one coherent integration plan without deleting their independent evidence.
4. Review #157's change against the current pilot file and determine whether the unknown-basis guard should be ported to main before any adjustment work proceeds.
5. Establish a permitted real-world TSETMC capture environment and collect a manually reviewed sample; do not treat #162's mocked tests as live validation.
6. Audit CODAL PRs #152–#155 against merged #143/#146/#148/#150/#151 and map any remaining gaps.
7. Continue module-by-module source and deployment audit, recording verified callers, data flows, storage writes, tests, CI and deployment status.

## 9. Change log

- 2026-11-09: Initial PR/repository inventory created from GitHub history and current main baseline. No production code, data, PR state, or deployment was changed during this audit.
