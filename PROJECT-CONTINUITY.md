# SAHAMBAN — Project Continuity Ledger

> **Single source of truth for work across ChatGPT conversations.**
> This file is intentionally independent of chat history. A new chat must read this file and verify the live GitHub state before changing code.
> Last checkpoint recorded: 2026-11-09 (UTC). Update this file in the same work session as every meaningful project change.

## 0. Operating contract — read before doing any work

1. Do not infer the plan from the last chat messages or screenshots alone. Read this ledger first, then inspect the live PR, branch head, recent commits, changed files and CI.
2. Treat GitHub code, commit SHAs, PR metadata and completed workflow runs as evidence. Chat statements are not evidence of implementation or test success.
3. Keep **PLANNED**, **IMPLEMENTED**, **TESTED**, **VERIFIED AGAINST REAL DATA**, and **RELEASED** as separate states. Never promote one state to another without evidence.
4. Do not repeat completed work. Before editing, check whether the task already exists in code/tests/commits.
5. Do not change the agreed scope, reorder milestones, create a new architecture, or start a later day without explicit user approval.
6. Every code change, test addition, documentation decision, blocker, failed test, and next step must be recorded here (or in a linked detailed record) before ending the session. Update the current commit SHA and CI status.
7. For every test claim, record exact commit SHA, workflow/test name, result and run URL. A green result from an older SHA does not validate a newer SHA.
8. Never merge, deploy, publish, trade, mutate user holdings, or enable financial signals unless explicitly authorized.
9. If this ledger conflicts with the live repository, stop and reconcile the discrepancy; live GitHub evidence wins for code/CI state, while the user-approved roadmap wins for scope.
10. End each session by producing a concise handoff from this ledger: what changed, exact SHA, verified results, unresolved blockers, and the single next task.


## 0A. Split project memory files

- [HANDOFF.md](HANDOFF.md): operational entry point for new chats, current blocker and one next action.
- [MASTER-PLAN.md](MASTER-PLAN.md): controlled original five-day scope; missing days explicitly NOT_YET_CONFIRMED.
- [PROJECT-STATE.md](PROJECT-STATE.md): concise status snapshot, not a substitute for checking live GitHub.
- [DECISIONS.md](DECISIONS.md): rationale and approval policy; scope changes require user approval.
- [WORK-LOG.md](WORK-LOG.md): append-only history of implementation and evidence.

This ledger remains the detailed continuity source and must be kept consistent with the split files. All six files currently live on the PR164 branch, not necessarily on main. Any new chat should start at HANDOFF.md and verify exact-head CI before editing.

## 1. Project identity and active workspace

- Project: **سهام‌بان (Sahamban)**
- Repository: https://github.com/Raminhashemi1/sahamban
- Active work branch: `feat/day2-history-basis-gates-20261109`
- Active pull request: [PR #164](https://github.com/Raminhashemi1/sahamban/pull/164)
- PR title: `fix: fail closed on unattested historical price basis`
- PR status at last checkpoint: **OPEN / DRAFT / NOT MERGED**
- Last recorded branch head: `cd7b072b0368f110c445ac0eeff030de8bcc51ab`
- Latest continuity/evidence document: [DAY2-HISTORY-BASIS-EVIDENCE-GATES.md](DAY2-HISTORY-BASIS-EVIDENCE-GATES.md)

**Mandatory preflight in every new chat:** fetch PR #164 and its current head; fetch branch head; fetch recent commits; list workflow runs for that exact SHA; inspect this ledger. Do not assume the SHAs or statuses above are still current.

## 2. User-approved working intent and collaboration rule

The user is executing a multi-day roadmap (a five-day plan was mentioned). Chat switching must not change the agreed roadmap or cause scope drift. The user expects work to continue as if the same project session were open.

The five-day high-level roadmap **has now been recovered from the user's original roadmap screenshot** and recorded in [MASTER-PLAN.md](MASTER-PLAN.md). Day 1: review existing integrations, data validity and unfinished tasks. Day 2: finish missing analysis-engine/ranking/decision-assistant connections. Day 3: real-market-data tests, buy/sell calculations and important bug fixes. Day 4: UI, mobile, security and subscription. Day 5: final tests and pilot-user-ready build. Do not equate the PR164 historical price-basis subtask with the entire Day 2 scope, and do not infer any day's implementation status solely from this roadmap.

## 3. Day 2 — agreed scope (from the user's progress screenshots)

The *master plan's* Day 2 objective is completion of missing integrations across the analysis engine, ranking and decision assistant. The historical TSETMC price-basis and fail-closed work is an important **subtask** of that objective. A separate progress screenshot identified these subtask items:

1. Complete WebKit and mobile acceptance tests.
2. Verify the final connection/integration from v129 to v133.
3. Check the real TSETMC behavior for all three price-adjustment modes.
4. Define what evidence is required for independent verification of prices.
5. Keep the system fail-closed: without independently verified historical price basis, do not issue entry/exit/stop signals, rank affected shares, or run historical/out-of-sample evaluation on that series.

The screenshot reported PR #164 as Draft, with 8/11 workflows complete at that earlier moment and 3 still running. That is a historical screenshot, **not the current CI state**.

## 4. Day 2 — known technical background and safety invariant

- TSETMC daily history path discussed in the project: `GetClosingPriceDailyList/{insCode}/0`, fields `dEven` and `pClosing`.
- Existing ingestion does not itself establish whether this daily series is raw or adjusted.
- Three chart adjustment modes are represented in project work as: `0 = none/raw`, `1 = capital increase + cash dividends`, `2 = capital increase only`.
- A numerical match against a mode is correspondence evidence, not proof of authenticated provider origin or proof of which corporate action caused the ratio.
- Unknown/mixed/ambiguous/insufficient/malformed evidence must remain `UNKNOWN_NOT_ATTESTED`.
- Never double-adjust an already adjusted series.
- Until a trusted independent evidence-verification boundary exists, `INDEPENDENTLY_ATTESTED` supplied as a plain string must not be treated as cryptographic proof. Browser/user-supplied flags must not unlock financial decisions.
- Indicators may remain visible for diagnosis, but they are not actionable trading signals when the basis is unverified.
- This is software/data validation work, not investment advice.

## 5. Relevant PRs and their separate roles

These are separate draft PRs and must not be assumed merged or integrated merely because they exist.

- [PR #156](https://github.com/Raminhashemi1/sahamban/pull/156): idempotent review-only historical price adjustment ledger. Requires explicitly marked raw input and traceable corporate-action factors.
- [PR #157](https://github.com/Raminhashemi1/sahamban/pull/157): label TSETMC daily close history basis as unverified.
- [PR #158](https://github.com/Raminhashemi1/sahamban/pull/158): review-only cross-check of TSETMC price-adjust events against separately reviewed capital actions.
- [PR #159](https://github.com/Raminhashemi1/sahamban/pull/159): compare daily history against explicit chart raw/adjusted modes.
- [PR #160](https://github.com/Raminhashemi1/sahamban/pull/160): distinguish raw, capital-only and capital-plus-dividend modes using normalized series.
- [PR #164](https://github.com/Raminhashemi1/sahamban/pull/164): propagate unknown basis and fail closed across decision/analysis flows; active Day 2 integration branch.

**Important:** PRs #156–#160 are independent review-only drafts according to their recorded descriptions. Do not merge them automatically or assume they provide live authenticated data.

## 6. Work recorded on PR #164 (historical checkpoint; verify current code)

Commits recorded during the 2026-11-09 ChatGPT work session:

- `a2328a5bd79a84077d61feb18a560b5dcac8654a`: changed core `decision-support-v129.js` so un-attested history suppresses actionable code and stop/target/risk-per-share while retaining descriptive indicators.
- `c21aa0c0abf7ff86ed234d3df69d6ececcf2daee`: added regression coverage for direct core analysis with missing/self-asserted basis evidence.
- `2da4254a3c112eda2c47b9f0de2446ada2cb1906`: added regression coverage for preserving blocked status through audit export and decision planning.
- `ec2f16ec1c5292e33daf011d9a5bb11e118e96e8`: added `DAY2-HISTORY-BASIS-EVIDENCE-GATES.md`, defining independent three-mode evidence requirements and release gates.

These commits are recorded as repository changes, not proof that all corresponding tests passed.

## 7. CI checkpoint and unresolved test failure

At commit `2da4254a3c112eda2c47b9f0de2446ada2cb1906`, the 11 reported workflows had 10 successes and 1 failure. The failure was:

- Workflow: **Sahamban smoke tests**
- Run: https://github.com/Raminhashemi1/sahamban/actions/runs/42676272530
- Failed step: `node --test tests/prospective-signal-ledger.test.cjs`

The failed test must be diagnosed from its current logs and reproduced/fixed on the current branch head. Do not assume it is fixed by subsequent documentation changes.

At commit `ec2f16ec1c5292e33daf011d9a5bb11e118e96e8`, all 11 workflows were observed **in progress** at the last query. Their final results were not yet available at checkpoint time. Subsequent commits only added documentation (`PROJECT-CONTINUITY.md` and a README link); the current documentation-only head `cd7b072b0368f110c445ac0eeff030de8bcc51ab` had no workflow runs returned at the latest query. Re-query exact-head CI before making any claim.

Previously observed successful workflows on an earlier SHA included WebKit mobile acceptance proxy, Technical Indicators v50 Safety, PWA asset inventory, Mobile connectivity diagnostic safety, Professional Risk v49 Safety, and other lifecycle/safety checks. These older green runs do not replace exact-head validation.

## 8. Day 2 acceptance checklist

- [x] Core decision engine has a fail-closed path for unverified historical price basis (code change recorded; re-verify current file).
- [x] Regression tests added for direct analysis and audit/plan propagation (test additions recorded; exact-head CI still required).
- [x] Evidence requirements and release gates documented in `DAY2-HISTORY-BASIS-EVIDENCE-GATES.md`.
- [ ] Diagnose and fix `prospective-signal-ledger.test.cjs` failure if it remains on current head.
- [ ] Run all 11 CI workflows successfully on one exact final PR head.
- [ ] Review v129 → v133 integration end-to-end and prove no ranking/holdout/audit/UI path bypasses the guard.
- [ ] Obtain and retain real TSETMC responses for modes 0, 1, 2 and the daily-history endpoint, with capture time, exact instrument, endpoint/mode, raw artifact digest and documented source provenance.
- [ ] Independently cross-check representative real corporate actions (effective date, capital/share-count continuity, cash dividend/ex-date, units and ratios) against primary records.
- [ ] Implement a trusted evidence-verification boundary that binds approval to instrument, date coverage, exact dataset digest, mode and reviewer record; a plain caller-supplied string is insufficient.
- [ ] Re-run negative/replay/tamper tests and WebKit/mobile acceptance on the final exact head.
- [ ] User reviews and explicitly approves any PR readiness/merge action. Until then PR #164 remains Draft.

Do not mark Day 2 complete until every mandatory item is either completed with evidence or explicitly descoped by the user.

## 9. Next action — do only this first

**Diagnose the Smoke CI failure on the current PR head.**

Steps:
1. Fetch the live PR #164 head SHA and current status.
2. Fetch workflow runs for that exact SHA; identify the Smoke run and its job ID.
3. Fetch full failing job logs; isolate the first causal assertion/error (not just the final test summary).
4. Read the relevant test, implementation and schema at that exact branch.
5. Reproduce with the repository's documented Node/test command if an execution environment is available. If not, state that reproduction was not possible; do not claim it.
6. Make the smallest scoped fix, add/update regression coverage, update this ledger, and commit to the same branch.
7. Re-run CI and verify results against the new exact head.

Do not start live TSETMC integration or later roadmap days before this next action is completed unless the user changes priority.

## 10. Required session handoff format

Append a new dated entry below at the end of every work session:

- **Session date:**
- **Branch / PR:**
- **Start head → end head:**
- **Files changed:**
- **Commits:**
- **Tests:** exact SHA + names + result + run links.
- **Not done / blockers:**
- **Next single task:**
- **Scope decisions requiring user approval:**

### Append-only work log

#### 2026-11-09 — continuity system initialized
- Recorded the Day 2 scope from the user's progress screenshots and the PR/CI facts available during the session.
- Added `DAY2-HISTORY-BASIS-EVIDENCE-GATES.md` at commit `ec2f16ec1c5292e33daf011d9a5bb11e118e96e8`.
- Initialized this continuity ledger. No merge or deployment performed.
- Next single task: diagnose the Smoke workflow failure on the current exact PR head.


#### 2026-11-09 — continuity protocol established
- Added `PROJECT-CONTINUITY.md` (commit `27ab1cfa70182e475c3ad0dd4778f989b1bc3b7d`) as the single cross-chat source of truth. It contains the operating contract, Day 2 scope, PR relationships, evidence-vs-status distinctions, CI facts, blockers, next task and mandatory handoff format.
- Linked the continuity ledger from `README.md` (commit `cd7b072b0368f110c445ac0eeff030de8bcc51ab`).
- Current PR #164 head after these documentation commits: `cd7b072b0368f110c445ac0eeff030de8bcc51ab`. PR remains open and Draft. These documentation-only commits did not produce a new workflow run in the latest query; do not infer test success from them.
- No code behavior changed in these two documentation commits. No merge or deployment performed.
- Next single task remains: diagnose the Smoke workflow failure on the current exact PR head, beginning with live workflow status/logs.


#### 2026-11-09 — five-file cross-chat memory implemented
- Created MASTER-PLAN.md, PROJECT-STATE.md, DECISIONS.md, WORK-LOG.md, and HANDOFF.md on branch `feat/day2-history-basis-gates-20261109`.
- Indexed their links in README and this ledger. The complete original five-day roadmap remains missing; no days 1/3/4/5 were invented.
- GitHub CI and current PR head must be rechecked on each new chat; this documentation operation does not claim green CI, financial source authentication, merge, or deployment.
- Next action remains diagnosis of Smoke CI failure before moving to another day-two technical task.


#### 2026-11-09 — canonical five-day roadmap recovered
- User supplied the original five-day plan as a screenshot, subsequently transcribed in `MASTER-PLAN.md` at `ab58e6817148645051a52cc601c0b251301a4ee8`.
- Preserved five-day order. PR164 is identified as a Day 2 subtask rather than a redefinition of the entire day.
- No automatic promotion of day completion, merge or deployment. Exact-head CI and the Smoke failure remain active gates.
