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


## 8C. Documentation CI refresh after the deeper audit update (2026-11-09)

- The section 8B update created commit e57b43080735f3dd06946aad009fabe2351dd968, which became PR #163 head (9 ahead / 0 behind main).
- At the latest check-runs read for that exact head, 10/12 checks had completed successfully and 2 remained in progress (webkit-mobile and browser). The earlier 11/11 success applies to the preceding head bb76a5f802746ef17420c5a4ef79c9f1d6ae6706 only; do not transfer that result to e57b430.
- This follow-up register commit itself creates another PR head and triggers fresh CI. Re-fetch PR #163 head and check-runs before treating the documentation PR as green. No merge approval has been given.

## 9. Session handoff record

- Last audited `main` baseline: `48853697ae7df9e20b75dffdb1d957d9563ca9a2` (2026-11-09).
- Current documentation work branch: `docs/master-progress-audit-20261109`.
- Current documentation PR: #163 (Draft, open, unmerged). At the last recorded check, head e57b43080735f3dd06946aad009fabe2351dd968 was 9 commits ahead / 0 behind main with 10/12 checks successful and 2 in progress; this register update creates a new head and fresh checks, so re-fetch the latest PR head/status.
- Exact next step: do not merge #163 without explicit user approval. Continue with the revised engineering actions in section 8B, beginning with a #157 downstream provenance/UI proposal and a #161-to-#160 composition-test proposal. Recheck main, PR states, and deployment before any code change.

## 10. Change log

- 2026-11-09: Initial PR/repository inventory created from GitHub history and current main baseline. No production code, data, PR state, or deployment was changed during this audit.
- 2026-11-09: Added a cross-session bootstrap protocol in `AGENTS.md`, a human entry point in `START_HERE.md`, and a README pointer. The protocol requires every fresh conversation/context reset to re-read the register and verify GitHub before continuing.
- 2026-11-09: Rechecked PR #163 CI at previous head, verified adapter source on `main`, inspected its two main app entry points and #157's unmerged basis guard; documented the pre-merge branch fallback to prevent lost context before documentation is merged.

- 2026-11-09: Completed deeper runtime/dependency audit for #156–#162: checked current branch divergence and exact-head CI; scanned all 56 scripts loaded by main index.html for #161 adapter references; confirmed #157 metadata is not consumed by the technical-analysis UI; documented that #162 does not fetch the three TSE Client modes. PR #163 remains Draft and unmerged.

- 2026-11-09: Recorded the refreshed PR #163 CI snapshot: the preceding docs head e57b430 had 10/12 checks successful and 2 in progress; this update creates a new head and requires a fresh check run.

## 2026-11-11 — Cross-session GitHub resumption / evidence status
- Recovered project state directly from GitHub. Default branch `main` remains at tree `48853697ae7df9e20b75dffdb1d957d9563ca9a2` (tree SHA, **not** a commit SHA). `README.md` on main has only the project title; the cross-session docs are proposed on open/draft PR #163, not on main.
- PR #163 before this log: open/draft/unmerged, head `45364ce3f9ee68f502b5a7b12bf60c01a9526871`; 12/12 returned check runs succeeded on that specific head. Its `SAHAMBAN_MASTER_PROGRESS.md`, `AGENTS.md`, `START_HERE.md` were read.
- PR #164 before this log: open/draft/unmerged, head `a7ed9ee0ac7f921d2671a0d0d66bf3fd2e808739`. Exact-head checks: 13 completed/success and 1 `capture` in_progress among 14 returned checks at observation; **not** fully green. A new documentation commit invalidates any assumption of completed CI on its new head.
- Inspected PR #164 changed-file list: existing Day 2 fail-closed history-basis guards and Day 3 data capture/reconciliation workflows, raw bounded `evidence/day3` artifacts, and project continuity docs already exist. Do **not** recreate these capabilities; audit the specific workflows and output artifacts before making claims.
- Maintain the critical symbol-identity correction already documented: `46348559193224090` and its 500-row captured history must **not** be presented as verified `وساخت` data; prior documentation identified it with `فولاد`. Distinguish SHA/byte integrity from independent provider authenticity and instrument identity.
- Day 3 remains `IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE`. Neither documented raw bounded capture nor synthetic passing tests establish verified full history, three authenticated adjustment modes, independent CODAL corporate-action proof, or trading eligibility. Keep `UNKNOWN_NOT_ATTESTED` and fail-closed signal/decision gates.
- Current continuation: inspect the existing Day 3 reconciliation script/CI `capture` outcome and the dedicated Vesakht evidence manifest against its stated scope; independently verify the true instrument identity and original source responses before final acceptance. Do not merge, deploy, modify holdings, rewrite history, enable signals, or enter orders without explicit approval. No such production actions were performed during this resumption.

### 2026-11-11 — Additional exact-source correction after resumption
- Verified `main` branch commit SHA using GitHub branches API: `48853697ae7df9e20b75dffdb1d957d9563ca9a2` (not merely inferred from a tree listing).
- Read existing `DAY3-VASAKHT-SOURCE-RECONCILIATION-20261110.md` on PR #164: a **separate, correctly labelled** bounded `وساخت` capture is recorded for `insCode=25514780181345713` (ISIN `IRO1SAKH0007`), 500 daily rows, 15 adjustment events, with byte hashes and a derived **review-only** numerical reconstruction. This is distinct from the earlier wrongly attributed `46348559193224090` / `فولاد` capture. Do not conflate them. This read checked the document's claims, not an independent rehash of the underlying raw artifacts.
- The stated mode-1 series is **computed** from event ratios; mode 2 is **conditional**; neither substitutes for actual separately executed 0/1/2 TSE Client outputs. Original issuer/CODAL action evidence, complete history, and trusted attestation boundary remain missing. Day 3 final acceptance remains false.
- Rechecked PR #164's **old** pre-documentation head `a7ed9ee0ac7f921d2671a0d0d66bf3fd2e808739`: 13 check runs succeeded; the `capture` check ended **cancelled** (not successful). This status must not be described as fully green and must not be transferred to new documentation commits. No direct raw endpoint capture was performed in this session.

## 2026-11-11 — Day 3 numerical validator hardening (same existing PR #164)
- **Scope:** Continued the existing `day3_vesakht_capture_reconcile.py` and its existing tests on `feat/day2-history-basis-gates-20261109`; no new competing calculator, dataset, PR, or adjustment classification was created.
- **Changes:** `a9109cf7f4444b57318846460e3fd3feeca95f26` adds strict Gregorian YYYYMMDD calendar parsing on daily/event dates, rejects duplicate adjustment-event dates (including events outside the 500-day span), rejects string/boolean/non-finite price inputs, checks every original daily price field for negative values, and validates all adjustment-event prices even when an event precedes the bounded window. The original bounded 500-row requirement and fail-closed flags remain.
- **Tests:** `838f1a1f6f24ac1f989617b732291f6f88e670ca` extends the existing 5-case regression suite to **10 cases**, including invalid calendar dates, duplicate adjustments, non-finite values, negative secondary price field, and invalid out-of-window adjustment value; synthetic fixtures only. `8b6196ad659a8ec366849fd15bd608dec66c5045` updates the existing GitHub Actions job label from five to ten cases. These tests are submitted, **not yet claimed to have passed**.
- **CI observation:** Immediately after `8b6196ad659a8ec366849fd15bd608dec66c5045`, five returned exact-head jobs were queued, with no pass/fail verdict yet. Re-read exact-head checks (especially `fail-closed-regressions`) before claiming validation. Any subsequent documentation commits require their own head checks.
- **Evidence boundary:** The existing correct-instrument `وساخت` captured bundle (`25514780181345713`, 500 rows and 15 adjustments) is **not** the earlier misidentified `46348559193224090` / `فولاد` bundle. These code changes do not fetch or authenticate provider-original bytes, Codal filings, full history, or independently executed TSE Client modes 0/1/2. `day3FinalAccepted=false`, `historyBasisAuthenticated=false`, `tradingSignalsEnabled=false` remain unchanged.
- **Next action:** Verify the new exact-head CI and actual captured-bundle reconstruction. Then independently review original issuer events and separately executed 0/1/2 outputs when available; keep Day 3 blocked until evidence meets its acceptance criteria. No merge, deploy, holdings write, price-history mutation or trading action.

- **Test refinement (2026-11-11):** commit `e92ef105449113589247c0b89492a0e94e331fe5` changes the non-finite regression fixture to an actual JSON non-finite numeric token (`NaN`) rather than a string, verifying the non-finite numeric guard directly. The current branch head and CI must be re-read; no passing result is inferred.

## 2026-11-11 — Duplicate-work prevention audit of GitHub records
- Reviewed current `main` branch SHA `48853697ae7df9e20b75dffdb1d957d9563ca9a2`, open and recently closed PRs, open issue search, existing project continuity docs and exact PR file lists. **16 open PRs** found (#8, #137, #139, #152–#164), with two non-PR issues (#106, #135) returned by repository issue search. The review of closed PRs was a recent 25-result sample, not an exhaustive full-history re-audit.
- Core existing capability baseline: decision support/market screening/signal audit/ranking #129–#134 already have closed PRs; fundamental evidence/valuation #143–#151 also have closed PRs. Do not recreate these modules without first checking the current main implementation and integration.
- Open PR #152–#155 provide additional CODAL document identity, duplicate-action controls, and DPS gate logic; PR #153 and #154 both modify `capital-adjustments.js` and its tests. Check their diffs and ordering before integration to avoid overwriting each other.
- PR #156–#162 include separate review-only price adjustment ledger, historical basis guard, event comparison, chart-mode comparison, three-mode classifier, adapter tests and raw capture tooling. Most share edits to `.github/workflows/smoke-tests.yml`; do not independently re-add or overwrite these test commands. The adapter source is already on main; PR #161 adds tests/CI only.
- PR #157 and PR #164 both modify `portfolio-pilot-v61.js` and history-basis behavior. Compare coverage and preserve regression cases before any port/merge. PR #164 is a broad 67-file open/draft branch, **410 ahead / zero behind main** at this snapshot, with overlapping source and tests and project documents. Review carefully rather than add another parallel implementation.
- Cross-session docs in PR #163 are still open/draft/unmerged, 14 commits ahead/zero behind main at this snapshot. On PR #164 branch the Day 3 numerical hardening is already committed, including ten regression cases. Never rebuild or re-run the exact old implementation work as a fresh task.
- Exact-head CI observation before this register update: PR #164 head `74956630a727b4ef3c20063dc5407d1ef89ef8ac`: 14 checks returned, 3 successful, no failures, 11 queued/in progress; importantly `fail-closed-regressions` completed **successfully**. PR #163 head `3712d9dcd7878be6296542d81db98e060ba3e1eb`: 12 checks, 3 successful and 9 pending. Passing that one Day 3 test does not prove the entire head is green; newly created documentation commit requires fresh CI.
- PRs #157, #160, #161, #162 had 12/12 successful exact-head checks when queried, but all remain open and unmerged. #157/#160/#161 each diverged from main by 1 behind; #162 was 9 ahead/zero behind. Passing synthetic CI does not establish actual source authenticity, release readiness or deployment.
- **Next nonduplicate tasks:** (1) allow/check current PR #164 complete exact-head CI, especially cancelled/queued external `capture` provenance; (2) inspect overlaps of #157 vs #164 and #153 vs #154 before any integration; (3) verify original CODAL issuer evidence and independently executed TSE Client modes for correct `وساخت` insCode `25514780181345713`. Keep Day 3 `BLOCKED_EXTERNAL_EVIDENCE` and all trading/entry flags false until externally attested. No merge, deploy, trading, holdings write, or historical-price mutation was performed by this audit.

## 2026-11-11 — Day 3 bounded engineering closure / external-attestation handoff
- **Evidence-backed engineering outcome:** On PR #164 head `74956630a727b4ef3c20063dc5407d1ef89ef8ac`, the `fail-closed-regressions` job completed successfully, including the ten numerical safety regression cases and *actual committed* 500-session `وساخت` reconstruction; its job log states `RECONCILED 500 raw sessions`, `DAY3_ACCEPTED False`, output SHA-256 `d29a8b8e0793e558e0bd93d6d7be61b784052b5f22e80102a5d3ec2ae19a372e`, artifact ID `13834517748` at https://github.com/Raminhashemi1/sahamban/actions/runs/42974334436/artifacts/13834517748 . This verifies bounded deterministic computation and artifact generation, **not** an authenticated raw-price basis.
- On that same exact pre-documentation head, GitHub check-runs showed **13 successful of 14**, zero failed, with the independent provider `capture` check still in progress at observation. No result of that check is assumed. This documentation update creates a different head; rerun/check exact-head CI as needed. The `MASTER-PLAN.md` entry was corrected to distinguish the separate `وساخت` 500/15 capture from the earlier misattributed `فولاد` 500/23 bundle.
- **Milestone decision:** Treat the *bounded Day 3 pilot numerical calculation, security regression and artifact-production work* as COMPLETE / TESTED. Do not repeat or rebuild that work. This is **not** full Day 3 financial release acceptance: issuer-original CODAL action records, independently executed provider/library `adjustPrices=0/1/2` data, full-history coverage and trusted source verification remain `BLOCKED_EXTERNAL_EVIDENCE`. Keep `day3FinalAccepted=false`, `historyBasisAuthenticated=false`, `entryEligible=false` and `tradingSignalsEnabled=false`.
- Historical brokerage discrepancy of 3 IRR is already **nonblocking for pilot arithmetic** under DEC-006; do not re-investigate it without new materially relevant evidence. The absence of itemized settlement means it is not financially attested.
- **No additional Day 3 arithmetic tasks should be invented.** The next productive engineering milestone is the existing *Day 4* scope (mobile UX, accessibility, security and subscription), starting with a duplicate-work inventory of existing v84–v128 and subscription/security code. Keep outstanding financial attestation as an independent release gate, not as an excuse to block unrelated safe development. No merge, deployment, order, trade or holdings mutation was performed.

## 2026-11-11 — Day 3 blocker fix, no repeated CI network probe
- Verified exact-head PR #164 `55e1c4ed0839d6ffda17f22c076a4f86d7c3c50f`: **13/14 GitHub checks successful**, no recorded failures, `capture` still in progress at that observation. Logs for `fail-closed-regressions` confirm **10/10 Python tests passed**, real committed `وساخت` 500-row bounded reconstruction succeeded, `DAY3_ACCEPTED False`. Do not rerun or rebuild completed arithmetic.
- Located a concrete workflow loop: `.github/workflows/day3-vesakht-evidence-probe.yml` automatically retriggered a network-dependent, historically unreachable TSETMC probe with each PR update. Fixed on PR #164 at commit `0a5f5f0ae35597b3cb1936771bd5adc57fd1257c`: **manual workflow_dispatch only**, explicitly designated connectivity diagnostic. Core numerical tests and existing capture/validation tools unaffected. This is not a claim that external TSETMC connectivity was fixed.
- Sought original TSETMC `وساخت` daily and adjustments endpoints: both inaccessible through web retrieval, so no new raw provider bytes. Secondary market pages corroborate two adjustment/dividend observations, including 30 IRR (1403) and 80 IRR (1404), but **are not issuer-original CODAL evidence**. A published issuer-decision republication links an original CODAL download; opening it failed in this environment. See updated `DAY3-VASAKHT-SOURCE-RECONCILIATION-20261110.md` for sources, limitations, and exact scope.
- Work classification: bounded numerical and safety calculations **verified done**; external provenance and full price-basis verification **BLOCKED_EXTERNAL_EVIDENCE**. No fabricated 0/1/2 retrieval or issuer authentication, no acceptance flag update, no merge/deploy/trade/holdings mutation. The next step is actual primary CODAL access and independently obtained instrument-bound 0/1/2 outputs, not more duplicate local calculations. Fresh documentation commits require their own CI checks.

## 2026-11-11 — Focused Day 3 multi-route evidence repair (no acceptance shortcut)
- Tried current TSETMC original/mirror full-history URL and adjustment URL, primary CODAL search/download URL and secondary market datasets. Original TSETMC/CODAL payloads were inaccessible from current web/network tools. Third-party documentation reports outside-Iran geo-blocking in 2026, but this is not direct proof of every failure. Secondary issuer-dividend and capital-adjustment listings support 30/80 IRR observations and older capital increase **only as corroboration**. No genuine 0/1/2 library outputs or issuer-original bytes retrieved. Exact source links and scope recorded in `DAY3-VASAKHT-SOURCE-RECONCILIATION-20261110.md`.
- Selected safe *existing* capture path instead of rewriting arithmetic: modified `tsetmc-browser-evidence-capture.html` to request all available history (`Top=0`, not adjustment mode), allow 8 MiB / 45 seconds, check unrounded original 17-digit `insCode` JSON lexemes, and explicitly deny full-history or provider-authentication inference. Commit `2dab006544708cbfca9f61b822f007abd34cd271`.
- **Fixed newly discovered integration blocker:** existing byte integrity verifier and CLI would reject the new unbounded capture due to legacy 1 MiB limit and unsupported manifest scope. Verifier commit `02f0e0783f052c87ed24b168a7320d719d5abb18` and CLI commit `1cb49d366023d1e56a884ed9bd816874b4a8a2ce` now support the exact new scope with 8 MiB daily bound, retain old constraints for old inputs, and still fail closed. Regression commits `d95fb5852d7d8646f2b3d1ae6ef0f6e0fe6c71fc`, `53a1e01d5891ddb1a0e50eeceba92685d5c4252f` cover large synthetic response and review CLI. New tests submitted; **do not presume CI green on new commits**.
- Prior exact-head `55e1c4ed0839d6ffda17f22c076a4f86d7c3c50f`: 13/14 successful, `capture` still in progress; numerical suite 10/10 successful. The `capture` job was already changed to manual-only for new heads; new heads should show 13 instead of 14 automated checks.
- External blocker **remains real**: independent CODAL original disclosures, actually executed mode 0/1/2 library series, full original TSETMC raw history captured on reachable network and trusted independent attestation. No permission to claim Day 3 accepted or switch on trading. No further 500-row recomputation, trading, merge or deploy. Do not move project scope beyond Day 3.

## 2026-11-11 — Exact Day 3 blocker elimination plan / independent exchange alternative
- Rechecked the most recent prior heads: PR #164 `975eafe5030565c0a746d7213e4d1e6a84bf5aa8` **13/13 CI success**; PR #163 `d85363ebf714fe410d1a3fc9b55ef17352b43726` **12/12 CI success**. No duplicate calculator or test rerun needed. Subsequent docs commits create new heads and require independent CI check.
- Found a new separate exchange-gateway source documented in public technical references: `https://webgw.tse.ir/InstrumentProvider/api/v1/History/Archive/fa?InstrumentId=IRO1SAKH0007`. This uses **ISIN** and supplies daily history, potentially allowing comparison against `cdn.tsetmc.com` `insCode=25514780181345713` history; gateway is reported geo-restricted and its direct URL could not be fetched here. No provider bytes, authenticated histories or three-mode outputs were obtained. Documented technical source https://github.com/BabakEslami/tse-market-data/blob/main/ENDPOINTS.md .
- Corrected a stale trust-boundary statement: `day3-trusted-evidence-boundary-v1.cjs` already has a fail-closed signature/digest verification skeleton and regression tests, but `TRUSTED_REVIEWER_KEYS` is deliberately empty; independent reviewer/issuer/source verification and approved public-key enrollment/sign-off are the remaining *operational trust* steps, not building the same verifier from scratch.
- Original CODAL searches/documents (including correct issuer `LetterSerial`, **not** `TracingNo`) are required; CODAL access from this environment failed and third-party CODAL guidance reports IP restrictions. No third-party republication is primary attestation. If real legacy `tse-client` 0/1/2 outputs cannot be obtained, changing to issuer-attested deterministic reconstruction would be a **different evidence protocol requiring explicit user approval**, never an implied acceptance.
- Updated `DAY2-HISTORY-BASIS-EVIDENCE-GATES.md` and `DAY3-VASAKHT-SOURCE-RECONCILIATION-20261110.md` with ordered source/issuer/modes/reviewer exit criteria, external dependencies and safety invariants. No new production code, trading, merge, deployment or holdings change. Day 3 remains blocked on actual external provenance; avoid all discussion or implementation of later-day scope.

## 2026-11-11 — Focused Day 3 decision and security fix (DEC-007)
- Verified preceding exact heads: PR #164 `6ee86686eb6fed964e6a419d39df6a3f5b23f720` had 13/13 passed checks; PR #163 `d5fd0ddfdf0bab71743d95802e1a503dd7fea02e` had 12/12 passed. New commits will produce new heads requiring fresh CI.
- Fixed a critical latent trust-boundary issue in existing `day3-trusted-evidence-boundary-v1.cjs`: an independently signed price-basis review, if one existed, could previously set `entryEligible=true` without the separate portfolio/decision prerequisites. It now remains false even for future valid signatures. Code `009f08e133d42e28eb95409f701d82535c3422cb`, regression `50c80b8aa43c885739846afe120cdb8a685746a5`, automatic Smoke CI wiring `3a302e5b7a8e009ecae7d9f98319e394b847967f`.
- User explicitly allowed practical subject/protocol adjustments to overcome Day 3 blocker. DEC-007 creates a **review-only derived-mode alternative** to repeatedly invoking a broken legacy `tse-client`: original raw market bytes + issuer-original CODAL events + provenance / independent exchange cross-check + deterministic already implemented adjusted-series calculation clearly labeled `DERIVED_FOR_REVIEW`. This removes library uptime as a prerequisite to *numerical pilot review*, but derived series cannot masquerade as genuine three library captures or independently signed accepted history; all financial release and trading gates remain false. See `DECISIONS.md` and `DAY2-HISTORY-BASIS-EVIDENCE-GATES.md`.
- **Remaining physically missing:** reachable trusted capture of issuer-origin CODAL documents and original full market history (plus exchange cross-source corroboration), independent verified reviewer key/signature; no proof of complete financial Day 3 acceptance. No merging, deployment, sending orders, holdings mutation, or production signals.

## 2026-11-11 — Network-probe root-cause repair and exact remaining prerequisite
- Re-checked before code change: PR #164 head `8c236d5f2fdf60d6784de7ece2ce813a5663ca14` had **13/13 exact-head successful checks**, PR #163 head `dcc6ca9cc265b99ff4d4c43c525bc1a69922b508` **12/12 successful**. The source acquisition bottleneck is external reachability/provenance, **not failing unit/CI code**.
- Public technical reference https://github.com/amirziveh/tsetmc-skill/blob/master/SKILL.md documents both a browser-like User-Agent requirement and July 2026 reported HTTP 303→403 blocking from outside Iran. The existing opt-in GitHub read-only probe was using its own non-browser User-Agent, introducing a separate avoidable cause of empty responses.
- Corrected `.github/workflows/day3-vesakht-evidence-probe.yml` in PR #164 commit `aa3d6fbe375f06011c18fc1ce75d813944888204`: browser-compatible User-Agent, exact per-row raw JSON instrument ID checks before scientific-number rounding, Gregorian date checking, non-finite/boolean/nonpositive daily-price rejection, and early stop on HTTP 401/403/404/429 rather than waste repeated attempts. This remains **manual-only `workflow_dispatch`** and retains `sourceAuthenticated=false`, `day3FinalAccepted=false`. No new original TSETMC/CODAL response was obtained; a GitHub runner may still be geographically blocked.
- **Single best next external dependency** is a trusted environment that can access original TSETMC and original CODAL: collect public original files for `وساخت` `25514780181345713` through existing `tsetmc-browser-evidence-capture.html` (or the existing read-only PR #162 Node CLI if browser CORS blocks), together with exact issuer-original CODAL source files, timestamp, URL and digest. Then run existing `scripts/review-day3-original-capture.cjs`, recheck independent ISIN-keyed history source and primary actions, and only then independent review/signature. Do not request brokerage account data or another 500-row reconstruction. Keep all trading/acceptance gates closed. No merge, deploy or order.

## 2026-11-11 — Exact original CODAL links recovered and opt-in byte downloader implemented
- Found a **specific original CODAL PDF** hyperlink for 1403 `وساخت` DPS 30 IRR: original decision https://codal.ir/Reports/Decision.aspx?LetterSerial=5Wo3QKfOOObOOOKbPJKdmPwLDPfg%3D%3D&ct=0&ft=-1&let=21&rt=2 and original file https://codal.ir/DownloadFile.aspx?ft=1005&hs=5Wo3QKfOOObOOOKbPJKdmPwLDPfg%3D%3D&let=21 (linked from https://t.me/s/Codal360_ir?before=279201, tracking number 1304830). Also reconfirmed corrected 1404 `وساخت` 80 IRR original CODAL file https://www.codal.ir/DownloadFile.aspx?hs=ABPH8LdAUBh4bbE5xTOOObOOO9tA%3d%3d&ft=1005&let=20 from https://t.me/s/NoavaranCodal/390591 . These are **original-source addresses discovered**, not captured or authenticated original bytes.
- Added `scripts/day3_fetch_original_codal.py` commit `c0f8eaee08ea0d1051fdea208a07aac40b283795`: opt-in HTTPS-only restricted original-address downloader; saves source bytes in local private directory, computes SHA256 and UTC manifest, rejects obvious block/error pages and unsafe redirects, and leaves all issuer/source/basis/trading gates false. Run **only on a trusted network that reaches CODAL**: `python3 scripts/day3_fetch_original_codal.py ./private-codal-evidence`. Added tests `tests/test_day3_fetch_original_codal.py` commit `3c05a8a1596a5ac72d49fba890f3f804b14cbeaa`, CI Smoke wired `08571916a16a37e731011ace7f60ff5d0c6087a4`. At prior exact head `08571916`, Smoke passed, 11/13 jobs completed success, Browser and WebKit still running. See `DAY3-VASAKHT-SOURCE-RECONCILIATION-20261110.md` for sources and controls.
- Attempted original TSETMC, alternate exchange gateway and CODAL original URL directly through public retrieval and local HTTPS client, all failed from this execution environment. No fresh original PDF, full source price history, reliable 0/1/2 outputs or independent reviewed signature was obtained. Never claim acquisition based solely on locating exact hyperlinks.
- Best nonduplicative completion route remains: on a trusted reachable network, obtain **both exact original CODAL files** with fixed-source script and use already existing `tsetmc-browser-evidence-capture.html` (or PR #162 read-only collector) for complete original `وساخت` prices/adjustments, independently check 30/80 dates/events, cross-validate official exchange archive where accessible, then signed reviewer validation. Do not re-implement the 500-session calculator or relax financial gates; no merge/trade/deploy performed.

## 2026-11-11 — Executed Chrome TLS source paths; external network block isolated
- Executed live original source probe on GitHub Actions, not just a mock: https://github.com/Raminhashemi1/sahamban/actions/runs/42981592291/job/130393037172 ; used `curl_cffi==0.14.0`, verified HTTPS and Chrome TLS impersonation. **No original provider payload succeeded.** TSETMC raw history, TSETMC adjustments, official ISIN exchange archive and CODAL 30 original PDF all produced 15s TCP/HTTP connection timeouts; CODAL 80 original link at `www.codal.ir` failed DNS resolution. Source file hashes cannot be asserted. Manifest-only GitHub artifact ID `13838146102`: https://github.com/Raminhashemi1/sahamban/actions/runs/42981592291/artifacts/13838146102 . The job's workflow success is **not** a financial evidence success.
- Code `scripts/day3_chrome_source_probe.py` (commit `9ceed17d1b70e56f742579146ace89f22fec60df`) checked five actual URLs and retained any authentic-looking raw candidate bytes with SHA and false attestation flags. Workflow initially at `e78d1acf832ae9b27546187ea3c5d99f8971e80a`.
- **Changed plan based on evidence:** repeated GitHub-hosted attempts are not productive. Commit `a80419a41c379de69cf42e34a8c352c227290acd` makes workflow `.github/workflows/day3-chrome-tls-source-probe.yml` manual-only; `workflow_dispatch trusted_iran_runner=true` targets isolated `[self-hosted,linux,x64,iran-evidence]` runner with Python and curl_cffi preinstalled. It also permits false for the existing hosted diagnostic. It DOES NOT create or guarantee a runner or source access; maintainers must supply and vet a trusted network and runner, or use existing offline capture path. No new authorizations for entry/trade, no merge/deploy or holdings changes.
- Blocker remains physical original-source access and independent issuer/reviewer attestation, not arithmetic or a CI calculation. All previous pilot math and security tests remain done; do not repeat. Full Day 3 acceptance remains false.
