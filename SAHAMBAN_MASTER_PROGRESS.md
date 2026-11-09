# Sahamban Master Progress Register

> Audit snapshot: 2026-11-09 (UTC)
> Repository: https://github.com/Raminhashemi1/sahamban
> Audited baseline: `main` at `48853697ae7df9e20b75dffdb1d957d9563ca9a2`
> Status: first-pass repository / pull-request inventory. This is a control register, not a claim that every source file has received a line-by-line audit.

## 0. Mandatory fresh-session bootstrap (cross-chat / context-reset)

This project must not depend on the previous ChatGPT page, conversation history, or model memory. At the beginning of every new conversation, new coding-agent session, or context-window reset, the assistant/agent must:

1. Read `AGENTS.md` and this file from the current default branch (`main`).
2. Read `README.md`, verify the current `main` HEAD SHA, and note the progress-register revision.
3. Search existing GitHub PRs/issues (open, closed, merged) for the requested task and inspect related code, branches, changed files, commits, reviews, CI and deployment/integration state.
4. Reconstruct the last completed step, exact incomplete step, existing tests, dependencies and blockers before proposing or making changes.
5. Continue from the existing implementation if work is partial. Do not recreate modules, tests, or files merely because the conversation changed.
6. If the register is stale, reconcile it against GitHub and update it before continuing.
7. If the register or repository cannot be accessed, do not guess or modify project files; explain the missing evidence/access.

The first response in a fresh session must briefly report the reviewed `main` SHA, progress-register revision, related existing PRs/implementations, completion state, and precise continuation point. The user should not need to repeat project history.

`AGENTS.md` is the agent-facing instruction entry point; `START_HERE.md` is the human-readable entry point. Both point to this durable register. The README links to the entry point.

**Before PR #163 merges:** `AGENTS.md`, `START_HERE.md`, and this register are proposed files on branch `docs/master-progress-audit-20261109`, not yet present on `main`. A new session must locate PR #163, verify its current state/head SHA, and read the proposed files from that verified branch if they are absent from `main`. Do not mistake passing checks for merge or claim every ordinary ChatGPT conversation automatically loads repository instructions.

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

## 8A. Follow-up source and CI inspection (2026-11-09)

- `main` was rechecked at commit `48853697ae7df9e20b75dffdb1d957d9563ca9a2` via GitHub commit search and branch compare; PR #163 was 5 commits ahead and 0 behind that baseline before this follow-up edit.
- PR #163 remains **open, Draft, unmerged**. On its prior head `bb54b4460b0fa621ec39f9ddba2bd5ab9892df20`, all 11 returned PR workflow runs were completed successfully. New documentation commits require a new head/CI check; do not carry over the 11/11 claim to unverified commits.
- The exact adapter source `tse-client-three-mode-adapter-v161.js` exists on `main` (blob `158cb94b9df35ae1232c2930bac22acbf4c92128`). PR #161 changes only `.github/workflows/smoke-tests.yml` and `tests/tse-client-three-mode-adapter-v161.test.cjs`, not the adapter source: **do not rebuild the adapter**.
- `main`'s `index.html` script list does **not** load the adapter, and `portfolio-pilot-v61.js` has no `buildTseClientThreeModeSeries` or adapter reference. This establishes no integration in those inspected entry points; other possible callers or deployments have NOT received an exhaustive audit.
- PR #157 is open and unmerged. The reviewed diff adds `labelUnverifiedHistoricalBasis` with `historyPriceBasis:'UNKNOWN_NOT_ATTESTED'`, `capitalAdjustmentAllowed:false`, Jalali date labels and tests. On `main`, `getHistoricalOne` still returns `{symbol,marketDate,history,insCode}` without that provenance guard. **Do not mark main's daily history as proven raw**. Assess porting the existing #157 change; do not invent a second guard.
- `main`'s smoke workflow has neither the #157 basis-guard regression nor the #161 adapter regression; both are in their separate unmerged PRs.
- **Next engineering audit:** inspect #157 against the current pilot and its callers, and #161 against any remaining entry points/deployment bundles; prepare an integration/dependency proposal, without merging or changing finance flows without approval.


## 8B. Deeper source / runtime integration audit (2026-11-09)

- Reconfirmed the audited main baseline at 48853697ae7df9e20b75dffdb1d957d9563ca9a2. Main index.html blob is c7d0c068280d6f78adb4586f5fa6a769d960efeb; portfolio-pilot-v61.js blob is 4d5686f34e39e11390bffa33b9691871a6aa841a; technical-analysis-v50.js blob is b57360a4f87d60e6ea80c0f00208d601ac5f4569.
- Current PR branch comparison against main: #156 is 4 ahead / 1 behind; #157 6 ahead / 1 behind; #158 5 ahead / 1 behind; #159 3 ahead / 1 behind; #160 5 ahead / 1 behind; #161 2 ahead / 1 behind. These branches are diverged from main and need rebase/integration review before merging. #162 is 5 ahead / 0 behind at head d3e511d3eb1fe5eb226337b79376cbd5e293eddc; #163 is 8 ahead / 0 behind at head bb76a5f802746ef17420c5a4ef79c9f1d6ae6706.
- Exact-head CI was rechecked: 11/11 workflows completed successfully for each current head #156 2bbb46958ae144d351d76c38fcccc18d34f9c954, #157 998829c290f854d044dbea0ae7a94614d87a1d7e, #158 dcdb337b7ce9c06c543a8fd003adadd5e202f269, #159 4f83353db4a235d581a0cdf3d402b63a033fe81d, #160 e642f017444f91f4a4aa1de423ed6a3470e90472, #161 7d71adbc9cd7836d3679eca2400d286ce0f328ce, #162 d3e511d3eb1fe5eb226337b79376cbd5e293eddc, and #163 bb76a5f802746ef17420c5a4ef79c9f1d6ae6706. These are synthetic/mock-heavy workflows; they do not establish live market validity, merge, or deployment.
- Reviews, review comments, and issue comments were empty for PRs #157, #160, #161, #162, and #163 at the time checked.
- Main index.html loads 56 script assets, including portfolio-pilot-v61.js, but not tse-client-three-mode-adapter-v161.js. The standalone portfolio-pilot-v61.html loads only the pilot script. All 56 scripts referenced by main index.html were scanned for the adapter filename, global, and builder function; no references were found. The adapter file exists on main (blob 158cb94b9df35ae1232c2930bac22acbf4c92128) but is a dormant helper in the inspected application entry points, not a live product integration.
- PR #161 adapter output keys (dailyHistory, noneAdjusted, capitalPlusDividends, capitalOnly) align with PR #160 classifier input contract. However, no explicit adapter-to-classifier composition regression test exists. The adapter sets requestSettingsVerified:true while its own provenance says CALLER_SUPPLIED_REQUEST_METADATA and its note says request metadata is caller-asserted; clarify this field as metadata consistency rather than transport-level request verification before relying on it.
- PR #162 opt-in CLI captures two fixed endpoints only: GetClosingPriceDailyList/{insCode}/0 and GetPriceAdjustList/{insCode}. It stores raw UTF-8 response bodies and SHA-256 hashes in a user-selected local directory, while keeping source authentication, price-basis verification, capital-action verification, entry eligibility, and trading signals false. It does not fetch the three TSE Client getPrices modes (0/1/2), does not provide transport-bound response metadata to PR #161, and does not bridge #162 to #161. CI uses mocked fetchers; the live CLI was not run in this audit.
- PR #157 current head adds the fail-closed UNKNOWN_NOT_ATTESTED label, source metadata, Gregorian-to-Jalali calendar-only labels, and capitalAdjustmentAllowed:false at the pilot history-return boundary. Exact-head CI is 11/11 green. On main, getHistoricalOne still returns {symbol,marketDate,history,insCode} without these fields.
- Additional downstream finding: main technical-analysis-v50.js consumes the sahamban:verified-historical-quotes-v50 event and calculates SMA/RSI/MACD directly from q.history; it does not inspect a history-basis field. Its UI text describes the incoming data as verified. Therefore porting #157 alone would attach unknown-basis metadata but would not surface that limitation in the technical-analysis UI or change indicator calculations. Treat this as a provenance-disclosure/integration gap for read-only analysis, not evidence of automated trading. Before porting, decide whether to display a clear unknown-basis warning and/or suppress only those interpretations that require a known adjustment basis.
- PR #156 ledger requires an explicit RAW_UNADJUSTED input and caller-supplied action evidence. Do not feed current main pClosing history into it or label it raw from same-day matching. PR #159 compares daily history to same-provider chart a=0/a=1 series and can establish correspondence with a chart mode only; it does not authenticate the provider. PR #160 classifies among three supplied modes using overlap/discriminator thresholds, but likewise keeps source authentication, capital adjustment permission, entry eligibility, and trading signals false. PR #158 is a review-only price-adjustment/CODAL cross-check and does not prove event causation.
- No live TSETMC sample was collected by the CI runs or this audit. PR #162 provides a manual opt-in collection path, but that CLI was not executed.

### Revised next engineering actions

1. Prepare a bounded integration proposal for #157 that includes the downstream technical-analysis disclosure/gating decision; do not port only the label and imply the consumer is basis-aware.
2. Add a composition test for #161 adapter output into #160 classifier, and clarify caller-asserted request metadata versus transport-verified request/response binding.
3. Design a permitted, bounded way to fetch the three TSE Client modes with request/response binding; #162 daily/adjustment collector is not that fetcher.
4. Rebase #156–#161 from current main before any integration; preserve the distinct review-only responsibilities and tests.
5. Keep all market-history outputs review-only until live source, identity, price basis, and calendar contracts are independently reviewed. Do not connect them to valuation, stored history, order flow, or trading authorization without a separate approved change.

## 9. Session handoff record

- Last audited `main` baseline: `48853697ae7df9e20b75dffdb1d957d9563ca9a2` (2026-11-09).
- Current documentation work branch: `docs/master-progress-audit-20261109`.
- Current documentation PR: #163 (Draft, open, unmerged); latest head bb76a5f802746ef17420c5a4ef79c9f1d6ae6706, 8 commits ahead / 0 behind main, exact-head CI 11/11 successful.
- Exact next step: do not merge #163 without explicit user approval. Continue with the revised engineering actions in section 8B, beginning with a #157 downstream provenance/UI proposal and a #161-to-#160 composition-test proposal. Recheck main, PR states, and deployment before any code change.

## 10. Change log

- 2026-11-09: Initial PR/repository inventory created from GitHub history and current main baseline. No production code, data, PR state, or deployment was changed during this audit.
- 2026-11-09: Added a cross-session bootstrap protocol in `AGENTS.md`, a human entry point in `START_HERE.md`, and a README pointer. The protocol requires every fresh conversation/context reset to re-read the register and verify GitHub before continuing.
- 2026-11-09: Rechecked PR #163 CI at previous head, verified adapter source on `main`, inspected its two main app entry points and #157's unmerged basis guard; documented the pre-merge branch fallback to prevent lost context before documentation is merged.

- 2026-11-09: Completed deeper runtime/dependency audit for #156–#162: checked current branch divergence and exact-head CI; scanned all 56 scripts loaded by main index.html for #161 adapter references; confirmed #157 metadata is not consumed by the technical-analysis UI; documented that #162 does not fetch the three TSE Client modes. PR #163 remains Draft and unmerged.
