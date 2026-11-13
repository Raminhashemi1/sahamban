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
- [x] Diagnosed and fixed `prospective-signal-ledger.test.cjs` failure and subsequent `fixed-rule-evaluator` + audit export failures; exact-head Smoke green at `5dbccc48`.
- [x] 11/11 workflows successful on exact **code head** `5dbccc48846354592cee756798f67da24a3b0ca6` (documentation commits afterward require rechecking exact newest head).
- [x] Verified synthetic fail-closed integration paths v129→v133, holdout/audit/UI through Smoke and Chromium on code head `5dbccc48`; source-authenticated production validation remains a separate gate.
- [ ] Obtain and retain real TSETMC responses for modes 0, 1, 2 and the daily-history endpoint, with capture time, exact instrument, endpoint/mode, raw artifact digest and documented source provenance.
- [ ] Independently cross-check representative real corporate actions (effective date, capital/share-count continuity, cash dividend/ex-date, units and ratios) against primary records.
- [ ] Implement a trusted evidence-verification boundary that binds approval to instrument, date coverage, exact dataset digest, mode and reviewer record; a plain caller-supplied string is insufficient.
- [ ] Re-run negative/replay/tamper tests and WebKit/mobile acceptance on the final exact head.
- [ ] User reviews and explicitly approves any PR readiness/merge action. Until then PR #164 remains Draft.

Do not mark Day 2 complete until every mandatory item is either completed with evidence or explicitly descoped by the user.

## 9. Next action — do only this first

**Historical instruction (completed on code SHA `5dbccc48`): Diagnose the Smoke CI failure.**

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


#### 2026-11-09 — Day 2 software closeout, accurate carryover to Day 3
- Three newly recorded fixes: `23bb57ffe93e7d949d348360f295f90fe3b756ad` (prospective ledger fixtures and new unattested regression); `959f69926d068740bb6defcd403187880f7d92fd` (fixed-rule-evaluator tests and unattested regression); `5dbccc48846354592cee756798f67da24a3b0ca6` (decision-plan accepts blocked diagnostic codes for safe audit export).
- GitHub Actions **11/11 SUCCESS at code SHA `5dbccc48846354592cee756798f67da24a3b0ca6`**. Smoke/browser: https://github.com/Raminhashemi1/sahamban/actions/runs/42684555862 ; WebKit mobile: https://github.com/Raminhashemi1/sahamban/actions/runs/42684555936 ; portfolio mobile: https://github.com/Raminhashemi1/sahamban/actions/runs/42684555869 . Recheck live exact-head after subsequent docs changes.
- User requested ending Day 2 work and continuing the remaining development tomorrow. The **software integration and regression test stage** is closed out. The *independent real-data verification and release authorization* gates remain open and have NOT been waived. No PR merge, deployment, trading or holdings modification occurred.
- Aligned to original master plan: Day 3 = real market data testing, buy/sell calculation checks and major bug fixes. First task tomorrow is independent capture and provenance validation for TSETMC adjustment modes 0/1/2 and the daily close basis, without unlocking financial signals.
- The earlier section 9 Smoke diagnosis instructions are historical and are superseded by the latest HANDOFF.md. The final technical code commit green status must not be attributed to later documentation SHAs without new verification.


#### 2026-11-10 — Day 3 opened; market connectivity and transaction math
- Day 3 master-plan objective is active: real exchange data tests, buy/sell calculations, major bug fixes.
- Latest historic TSETMC live-monitor artifact run `42670042240` (2026-11-09 18:00Z) and PR smoke live probe artifact run `42685215334` (2026-11-09 19:38Z) both show `UNVERIFIED_NETWORK / UND_ERR_CONNECT_TIMEOUT` to CDN. After-close run `42624494977` shows both CDN and web gateway timeouts. This does not prove TSETMC is down or the user's device cannot connect.
- Added `trade-cost-v1.js`, a read-only fee-ceiling estimator for ordinary shares/rights with component caps, buy settlement, sale proceeds, round-trip P/L and fee-aware risk/budget sizing. Integrated into the main calculator and service-worker cache. Added 7 pure Node tests and a Chromium UI test to smoke workflow.
- Local pure tests: 7/7 passed. Exact PR CI for latest SHA still pending; do not mark CI passed until observed.
- Fee rates used: buy 0.3712%, sell 0.88% including 0.5% sale tax; component ceilings based on a brokerage page citing edition 49, not a directly fetched regulator circular. Treat as upper-bound estimate pending official circular and actual broker-receipt reconciliation. No ETF rate, slippage or liquidity model.
- Remaining day-three blockers: obtain fresh live TSETMC samples from reachable network, authenticate three distinct 0/1/2 adjustment series and their provenance, reconcile fees/rounding with official schedule and broker receipts. No trading signals or orders enabled.


#### 2026-11-10 — fresh handoff readback and exact-SHA connectivity artifact
- Starting head `278d8df64a1dfcb6cb416acf8b18167f91a67556`; PR #164 open/draft, not merged. Six canonical memory files read. The latest Day 3 handoff supersedes old section 9 historical Smoke-diagnosis instructions.
- Exact `278d8df64a1dfcb6cb416acf8b18167f91a67556` workflow-run check: 10/11 success with WebKit proxy still running at last check; Smoke run https://github.com/Raminhashemi1/sahamban/actions/runs/42769444261 success; quote-basis https://github.com/Raminhashemi1/sahamban/actions/runs/42769444315 success; WebKit https://github.com/Raminhashemi1/sahamban/actions/runs/42769444354 in_progress.
- Smoke artifact ID 13741265949, `live-market-v111.json`, checked 2026-11-10T06:35:25.340Z: `UNVERIFIED_NETWORK` / `UND_ERR_CONNECT_TIMEOUT` to `https://cdn.tsetmc.com/api` for فولاد. No real provider attestation and no proof of network behavior on the user's device.
- No code edit, merge, deploy, order or user holdings mutation. Documentation checkpoint commits must be checked separately for their own CI.
- **Next single task:** obtain actual read-only provider sample/provenance from reachable network; until then no mode 0/1/2 attestation or trading signal.


#### 2026-11-10 — no-duplicate Day 3 continuation
- Starting SHA `55a313f3184dfcd1c5f7e8432631206aa9a7b2c0`, PR #164 open/draft. All six canonical memory files read, current Day 3 scope retained. User supplied screenshots from previous work and instructed that completed tasks must not be repeated.
- GitHub Actions exact start-head `55a313f3184dfcd1c5f7e8432631206aa9a7b2c0`: 11/11 SUCCESS, including Smoke https://github.com/Raminhashemi1/sahamban/actions/runs/42770118086 and WebKit https://github.com/Raminhashemi1/sahamban/actions/runs/42770118142 . Documentation commits after this SHA need separate CI checking.
- Reviewed existing independent PR #162 bounded raw-response collector with SHA-256 manifest and PR #161 library-level three-mode adapter; neither merged, copied nor rewritten. Existing Day 3 fee calculator not repeated.
- Added `DAY3-REAL-DATA-EXECUTION.md` to state documented read-only evidence capture steps, unresolved provenance and safety gates. No actual authenticated response obtained. Previous local DNS failure reported without retained command output must not be upgraded to a newly run test claim.
- No code change, merge, deploy, trade, signal enablement or holdings mutation. Only documentation updated.
- Next single task: first check for previously retained authentic provider artifacts; if none, use existing PR #162 collector on a trusted reachable network and review immutable raw data, without implying 0/1/2 financial attestation.


#### 2026-11-10 — Day 3 evidence-limited completion attempt
- Resumed from `a324e62c37b1057d3023b2f2f41fbf69df4b71c6` (PR #164 open/draft/unmerged). Re-read canonical memory, master plan, prior Day 3 code progress, and PR #163 progress register to prevent duplicated implementation.
- CI on the starting SHA: 9/11 succeeded; Smoke run 42770635860 and 100-holding 42770635916 still in progress at last poll; WebKit run 42770636075 success. No claim of complete exact-head CI for new documentation commits.
- Exact Smoke artifact 13741517462 shows `UNVERIFIED_NETWORK / UND_ERR_CONNECT_TIMEOUT` at 2026-11-10T06:46:28.663Z for فولاد on GitHub runner. Independent local DNS queries at 06:48:23Z (cdn.tsetmc.com) and 06:48:28Z (www.tsetmc.com) failed with `gaierror(-3)`. These environment failures do not prove provider downtime and yield no authenticated provider bytes.
- Verified in external third-party technical documentation: CDN daily-list Top is record count, distinct from tse-client library getPrices adjustPrices 0/1/2. Still no provider-authenticated three series. Existing PR #162 collector and PR #161 adapter not rewritten/merged.
- No available real brokerage settlement receipt for rounding/discount validation. Existing read-only `trade-cost-v1.js` stays an estimate, not confirmed execution accounting.
- Day 3 remains IN_PROGRESS (external-evidence blocked), rather than falsely complete. Detailed log in `DAY3-REAL-DATA-EXECUTION.md`. No merge/deploy/order/trade/holdings edits or signal activation.
- Next single task: capture raw TSETMC responses plus digest on a reachable trusted device through already-existing PR #162, then independent 0/1/2 review and de-identified broker receipt comparison.


#### 2026-11-10 — exact-head CI completion and same-head live artifact
- Baseline PR164 head `80b2039596c9c2b5166842f2456b77f8efba092f`, OPEN/DRAFT/unmerged. 11/11 GitHub Actions workflow runs SUCCESS for **that exact SHA**, including Smoke run https://github.com/Raminhashemi1/sahamban/actions/runs/42771220222 and WebKit https://github.com/Raminhashemi1/sahamban/actions/runs/42771220085 . New documentation-only commits do **not** inherit these results.
- Directly opened artifact `13741204786` (`live-market-v111.json`) from same Smoke run: checked 2026-11-10T06:51:18.043Z, `UNVERIFIED_NETWORK / UND_ERR_CONNECT_TIMEOUT` for public فولاد TSETMC CDN request. Browsing the public URL also yielded inaccessible, not a valid provider payload.
- No previously unseen real-provider response or broker receipt established; independent source authenticity/adjustment modes and fee rounding remain unverified. Kept current Day 3 IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE. Existing #161/#162 helpers and trade-cost engine were not duplicated.
- No code change, merge, deploy, trade or financial signal activation. Next task only: authentic read-only PR #162 capture on a reachable trusted network, retain exact raw bytes and SHA-256 manifest.


#### 2026-11-10 — targeted Day 3 collector/fee risk assessment
- Base head `d3ba4a41379359ed25f21e593d692e43fc2dbf25`, PR164 open/draft/unmerged. Exact-base CI last seen 10 successes, quote-basis still in progress at https://github.com/Raminhashemi1/sahamban/actions/runs/42771834142; Smoke/WebKit succeeded.
- PR162 collector still unmerged and already present. Its 1 MiB per-response cap may be exceeded by فولاد's long daily series (third-party July 2026 sample ~1.56 MB). Do not bypass cap/truncate history or claim real capture. Detailed source/limitations documented in `DAY3-REAL-DATA-EXECUTION.md`.
- Conflicting non-primary fee publications on TSE versus IFB purchase totals were identified. Existing `trade-cost-v1.js` kept unchanged, upper-bound estimate; official circular and actual receipt needed before asserting market-specific accuracy.
- No live authenticated provider data or real brokerage receipt obtained. Day 3 remains IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE. No merge/deploy/financial signals/trade/holding changes.
- Next single task: existing PR162 collector on a trusted reachable network with independently verified insCode and bounded response; retain raw bytes and SHA-256 manifest.


## 2026-11-10 — network-path reconciliation and newest live probe

- Current PR #164 base before this documentation update: `d2e395943b62d6d9a4364728abd41caf08d825ae`, OPEN/DRAFT/unmerged. Exact-head CI latest: 8 SUCCESS, 3 IN_PROGRESS (Smoke `42772645101`, WebKit `42772645129`, 20-holding `42772644394`). No result may be transferred to the documentation commits that follow.
- Downloaded latest exact-head Smoke artifact `13742616389`, `live-market-v111.json`: `checked_at=2026-11-10T07:03:55.438Z`, `UNVERIFIED_NETWORK`, `UND_ERR_CONNECT_TIMEOUT` for CDN, symbol فولاد. No response price/history obtained by GitHub runner.
- Ran a fresh read-only probe from this ChatGPT execution container: `socket.getaddrinfo('cdn.tsetmc.com',443)` and HTTPS GET both failed with local `gaierror(-3), Temporary failure in name resolution`. This is specific to this container, not proof of provider outage.
- Important correction/reconciliation of earlier shorthand: separate PR #137 diagnostic `42396816602` observed DNS success (three IPv4 addresses) on GitHub runner but TCP 443 timeout and HTTPS `UND_ERR_CONNECT_TIMEOUT`; another prior local container probe got DNS failure. Different execution networks have different failure points. Never describe this as global TSETMC DNS failure/outage.
- PR #137 also records the user's earlier physical Android-browser screenshot: public فولاد endpoint, quote/history connection and same-history match succeeded, reported close 4,410 IRR and market date 20261107; freshness was explicitly `UNVERIFIED_OUTSIDE_SESSION`. This is valuable network-specific field evidence but it is historical, user-device/browser evidence, not a retained original raw API payload, not a current-session quote, and not source-authenticated history. The same page is available at https://raminhashemi1.github.io/sahamban/market-connectivity-test.html. The next field check is only necessary if current-session freshness is a required acceptance item; it does not replace PR162 raw capture.
- Public community docs report the CDN may geo-block non-Iranian IPs (HTTP 303/403) and describe the endpoint contracts; this is third-party evidence only, not official SLA. Sources: https://github.com/amirziveh/tsetmc-skill/blob/master/SKILL.md and https://github.com/solitraderbusiness/tsetmc-mcp/blob/main/docs/endpoints.md .
- Existing PR162 collector is not a three-mode history fetcher; PR163 register explicitly says it only captures daily-list and adjustment-list, while three TSE Client modes and transport-bound response provenance remain unimplemented. Do not conflate successful same-provider chart/history match with independent basis attestation.
- No code/plan/PR state change. Day 3 remains IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE. No merge, deployment, signals, orders or holdings access. Next single dependency: user-provided trusted-network raw capture/manifest from PR162 or authorized equivalent; keep all gates closed.


## 2026-11-10 — user-device live quote field evidence (screenshot)

- User supplied a fresh screenshot of the published mobile connectivity diagnostic. The visible report states: TSETMC connection and today's quote retrieval **successful**; last-trade freshness **FRESH** at Tehran time **10:37:12**; instrument **فولاد**; reported closing price **4,810 IRR**; market date **20261110**.
- The same report explicitly shows independent history check **pending publication** with status `FRESH_QUOTE_HISTORY_PENDING`. It says today's 20261110 history row is not yet published and the latest available history dates are 20261109, 20261108 and 20261107. The page explains this is a possible publication delay, not a connection failure or complete price confirmation.
- Evidence classification: user-provided screenshot of a browser diagnostic, not raw API bytes, not a SHA-256 capture, not independent source authentication, and not proof of any historical adjustment mode. It closes the previously open **mobile-network current quote connectivity/freshness observation** for this captured moment only. It does not close the historical basis/three-mode gate, broker-fee receipt gate, or prove freshness beyond the displayed timestamp.
- This is a newer observation than the older PR #137 phone note (20261107 / 4,410 IRR); preserve both as distinct dated observations, do not overwrite historical record.
- Next action: no need to repeat the connectivity test immediately. Re-run the history comparison once the 20261110 row is published, then separately obtain PR162 raw JSON + SHA-256 manifest and independent three-mode evidence. Keep history basis `UNKNOWN_NOT_ATTESTED`, signals disabled and Day 3 open pending remaining external evidence. No code/plan/PR state/portfolio changes.


## 2026-11-10 — Day 3 closeout acceleration: fee schedule and current quote

### Newly resolved / strengthened evidence
- User's 2026-11-10 mobile diagnostic screenshot closes the **live quote connectivity and freshness observation** for that device/time: فولاد, market date `20261110`, displayed close `4,810 IRR`, last-trade time Tehran `10:37:12`, status `FRESH`. It explicitly reports `FRESH_QUOTE_HISTORY_PENDING`; today's daily history row had not yet published, with 20261109/08/07 as latest. This is not an API raw capture or historical-adjustment proof.
- Rechecked current fee schedule source: broker-published edition 49 (1405/04/27), last reviewed 1405/06/10, explicitly says ordinary share/right BUY and SELL ceiling schedule is the same for TSE and IFB: https://idbr.ir/fees . Existing `trade-cost-v1.js` rates sum to BUY 0.3712% and SELL 0.88% (including 0.5% sale tax); current tests assert 100m IRR purchase fees 371,200 and sale fees 880,000. Therefore earlier public-source claim of a lower IFB buy rate is not strong enough to override this current edition-49 source; retain one common conservative ceiling schedule as already implemented. Do not change code based on older/conflicting secondary explainers.
- Official-board circular record for the 1404/07/12 fee-service amendment: https://hoghogh.ai/circulars/c-26ee4556 . It includes several specific market/ETF/concert-market provisions; it is not, by itself, the complete 1405 edition-49 ordinary-share component table. Do not overstate primary-source validation.
- TSETMC endpoint references reconfirm `GetClosingPriceDailyList/{insCode}/{Top}` uses `Top=0` for all history and `GetPriceAdjustList/{insCode}` returns adjustment events; these are third-party reverse-engineered docs, not a guarantee of three adjustment modes: https://github.com/amirziveh/tsetmc-skill/blob/master/references/api-endpoints.md . The library's three `adjustPrices=0/1/2` modes remain a separate client-level contract.

### Remaining hard blockers (cannot be fabricated)
1. A raw provider response + SHA-256 manifest captured on the user's accessible network. Public CDN request from this execution environment remains inaccessible; exact-head runner Smoke remains `UNVERIFIED_NETWORK` in its prior run.
2. The 20261110 history row was explicitly pending in the user's screenshot. Recompare only after it is published; do not repeat current quote test now.
3. Independent 0/1/2 historical series with transport/source provenance; current collector PR162 only captures daily list + adjustment list, not those three modes.
4. De-identified executed broker receipt (or authoritative per-execution statement) to reconcile actual rounding, broker discount and charged fee. Published ceiling schedule is not a receipt.

**Status:** software calculations and synthetic CI acceptance are complete; live quote path has user-device field evidence; full Day 3 is still `IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE` because history provenance and actual fee reconciliation are missing. No code change, no repeat implementation, no PR merge/deploy/order/holdings mutation, no plan change. Next single action: once the 20261110 daily history row appears, collect raw daily + adjustment responses from user's reachable device and preserve exact bytes + SHA-256 manifest; then run the already documented 0/1/2 comparison. Broker receipt review follows separately.


## 2026-11-10 — Implemented de-identified brokerage receipt comparison (Day 3)

- Starting PR #164 head: `88b52440ddb5bc230d51b1dbe392c060d09b99f3` (OPEN / DRAFT / not merged). Re-read all six required memory docs and inspected the existing trade-cost calculator + tests, PR #162 provider collector and active Smoke CI. Starting-head CI was 7 successes with four runs still in progress at last inspection; do not claim green for this start SHA.
- Checked GitHub code search for existing receipt-reconciliation helper; no matching specific module was found. **Did not rebuild** `trade-cost-v1.js`.
- Added `trade-cost-receipt-review-v1.cjs` as a local-only, read-only numerical review adapter calling the existing `calculateOrderCosts`. Accepts only explicitly whitelisted de-identified fields: market (TSE/IFB), side, quantity, priceRial, grossRial, feesRial, settlementRial and instrumentType; rejects unknown fields and unsupported types. Checks gross = qty × price, settlement arithmetic and actual fees against the existing schedule's estimated ceiling. Flags mismatches, below-/above-estimate cases and always returns `brokerReceiptAuthenticated:false`, `feeScheduleOfficiallyVerified:false`, `tradeEligible:false`, `tradingSignalsEnabled:false`. Match is numerically consistent **but not financial attestation**.
- Added `tests/trade-cost-receipt-review-v1.test.cjs` with 8 focused tests (exact numeric match, discount case, above-ceiling, sale-tax arithmetic, mismatched totals, unsupported/personal data, unsafe/invalid numerics, no mutation). Local Node 22 test run 8/8 PASS using a representative local copy of the existing published fee schedule; exact repository CI is the authoritative regression test with the real module.
- Included the new Node test in `.github/workflows/smoke-tests.yml`. Commits: module `f69d96bdbf860c3fa2619244ee4845ee8222386e`, tests `dfe49f0de6248027b38aa914227b12b1828c4928`, workflow `dff1c0e6c1668deaa2ee87ff2b6d99b89dd6173a`. The exact-head GitHub Actions workflows were queued/in progress at first observation; do not claim CI green before an observed conclusion.
- No personal receipt data was supplied; no real broker amounts were compared yet. Latest physical-phone screenshot still shows `FRESH` quote with `FRESH_QUOTE_HISTORY_PENDING` for 20261110. Historical basis, three distinct live adjustment series and TSETMC raw bytes/SHA-256 remain not verified. Do not declare Day 3 complete.
- No merger, deployment, order, payment, user holdings mutation, signal activation or master plan changes. **Next single action:** review exact-head Smoke regression and (when available) a de-identified real brokerage receipt through the existing adapter, while continuing independent raw historical source evidence separately.


## 2026-11-10 — Day 3: saved TSETMC evidence byte-integrity review implemented

- Starting active head `236a0abbf0d312d221f269b1f7d22389c6cb67b0`, PR #164 OPEN/DRAFT/unmerged. Six canonical memory docs reread; found existing PR #162 collector (separate unmerged PR) and existing receipt review module. GitHub exact starting-head workflow CI later reached **11/11 SUCCESS**, including Smoke; this success belongs to that SHA only.
- Added an **offline review-only verifier** `tsetmc-capture-integrity-review-v1.cjs` for the exact existing PR #162 capture manifest + two raw JSON buffers. It checks: fixed TSETMC URLs; exact `insCode` and UTC timestamp bound to expected file names; SHA-256, byte size and UTF-8 fidelity; expected daily/adjustment JSON envelopes and row counts; Gregorian dates, duplicate daily dates and positive numeric closes; explicitly false attestation, eligibility and trading flags. Returns only byte/schema consistency with `sourceAuthenticated:false` and `historyPriceBasisVerified:false`; **no provider authentication, daily-row freshness verification, three adjustment-mode fetching, or trading permission**.
- Added `tests/tsetmc-capture-integrity-review-v1.test.cjs` (9 synthetic/regression tests) and the test invocation to Smoke CI, without duplicating the PR #162 collector or modifying market/financial production flows. Important hardening: checks manifest timestamp type before parsing and compares exact saved filenames with the manifest UTC timestamp. Implementation commits: `2a39315771d1c24251e6ea86ab278f39fc530d5c` (module), `2a231b0c85a0357285be52b71005528044bea2ca` (tests), `8df7e1ab225cf3fffd2b8f0146f5546e2a794573` (CI), `57ae1e312265ded2c188ddb4d5f6e866970e7374` and `2e3563dcf0ae1d4d25592a555b43e59c15865508` (hardening/test).
- On CI for intermediate `8df7e1ab225cf3fffd2b8f0146f5546e2a794573`, the dedicated test step **completed SUCCESS** as observed in Smoke job `42775655447`; the full workflow was still in progress when read. The later hardened code head `2e3563dcf0ae1d4d25592a555b43e59c15865508` requires its own CI verification. Do not inherit success from the prior head.
- User's twice-observed physical phone live quote stays `FRESH` with `FRESH_QUOTE_HISTORY_PENDING` (20261110 date, فولاد, 4,810 IRR). No authentic raw provider capture or independent 0/1/2 history series have been obtained; no brokerage fee receipt was provided. Therefore Day 3 is **IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE**, NOT COMPLETE, irrespective of software-test successes. Reuse PR162 collector on a trusted reachable network once its daily row is published; review resulting original files with verifier. Receipt review uses existing `trade-cost-receipt-review-v1.cjs` when de-identified actual figures are available.
- No merge, deploy, order, holdings access/change, history mutation or signal activation. No change to approved five-day MASTER-PLAN or DECISIONS.
- **Single next step:** verify exact latest CI and acquire original TSETMC raw files + SHA-256 manifest from a trusted accessible network for independently reviewed evidence; do not require more screenshots of current quote.


## 2026-11-10 — Day 3 targeted code hardening (no duplicate implementation)

- At session start PR #164 head was `6917a7c1ecf62a047af90ecbc117ee2edc90bd64`, OPEN/DRAFT/not merged. Six canonical memory documents were re-read. Start-head CI 9/11 successful and two still running (Smoke and WebKit) at initial inspection. The dedicated integrity and receipt-review test *steps* were confirmed completed successfully in the Smoke job. Do not claim the overall workflow or any subsequent SHA green unless directly observed.
- Audited existing `tsetmc-capture-integrity-review-v1.cjs` (not a new collector): it used to coerce numeric `manifest.insCode` to a string and did not validate `contentType` recorded by existing PR #162's collector. Hardened this to require a literal numeric **string** instrument ID and recorded canonical `application/json` MIME, rejecting HTML/JavaScript/missing case data. Added a focused synthetic regression test. Code `98abf36a3cfbba497dcfe45ca84635b4b95072b6`; test `34a68a478ba224955cc4983ea706577d2dee1334`.
- Audited existing `trade-cost-receipt-review-v1.cjs`: plain-record check previously permitted accessor properties, symbol-keyed fields and inherited objects. Rejected all of these before reading user-provided values; tests ensure an injected throwing getter never runs. Code `09a4290ca96f2c41b585484fecba75126611dc11`; test `3afc54c5e87663f3af62a01bb29a79b1305cd06e`.
- Changes are confined to the review-only modules and their tests; existing calculators, TSETMC capture PR #162, adapter PR #161, master plan, stored market history, portfolio data and financial gates are unchanged. No merge, deployment, live trade, signal activation or holdings mutation.
- At test-head `3afc54c5e87663f3af62a01bb29a79b1305cd06e`, GitHub Actions had started and were still pending; no complete exact-head CI success claim. The live market original raw files + independent source/mode evidence and an actual redacted brokerage receipt have not been supplied.
- Status remains `DAY3=SOFTWARE_IMPLEMENTED_WITH_NEW_HARDENING; FINAL_ACCEPTANCE=BLOCKED_EXTERNAL_EVIDENCE`. Next: confirm exact-head CI and obtain trusted original capture + three source-bound modes and de-identified actual fee receipt. No repeat of the user's already-successful phone freshness check.



## 2026-11-10 — CI regression repaired after Day 3 hardening
- Resumed from PR #164 head `f07ac5a641fe56aa08d7ac99dcd09d7688c44e34` and reread all six canonical memory documents. The hardened modules introduced new GitHub CI run `42776839881` at SHA `3afc54c5e87663f3af62a01bb29a79b1305cd06e` with a **real Smoke failure**: the existing identity/account data rejection test expected the substring `unexpected field`, but a newly hardened validator emitted `unexpected or accessor field`. Exact source: [failed Smoke job logs](https://github.com/Raminhashemi1/sahamban/actions/runs/42776839881).
- Fixed **only** the error-message contract in existing `trade-cost-receipt-review-v1.cjs` to `unexpected field or accessor: only own de-identified data fields are permitted` (commit `49d1d2aa50c6d11e609480bf6beedabe9d00d508`), retaining strict rejection of getters, symbol keys, custom prototypes and unexpected personal fields. No relaxation of validation, no change to financial calculations or source gates.
- At repaired exact-code SHA `49d1d2aa50c6d11e609480bf6beedabe9d00d508` in Smoke workflow [42777094143](https://github.com/Raminhashemi1/sahamban/actions/runs/42777094143), BOTH dedicated steps `tests/trade-cost-receipt-review-v1.test.cjs` and `tests/tsetmc-capture-integrity-review-v1.test.cjs` completed **SUCCESS**, as verified in job steps. The entire 11-workflow CI was still IN_PROGRESS at the latest poll; a new docs head triggers new checks and cannot inherit that conclusion.
- Existing PR #162 source CLI was directly read: it writes UTF-8 raw `daily` + `adjustments` files and a manifest with fields `status`, `insCode`, `collectedAt`, `host`, `files`, negative authorization flags. The integrity verifier matches this structure and checks exact timestamp/filenames, content type and hashes on real bytes when later supplied. No capture from actual TSETMC and no broker settlement receipt were available.
- Day 3 remains `SOFTWARE_IMPLEMENTED__EXTERNAL_EVIDENCE_REQUIRED`; neither these CI tests nor smartphone quote screenshot prove independent historical basis or actual brokerage settlement. PR164 remains Draft/unmerged. No merge/deployment/trade/order/signals/holdings modifications. **Next task:** collect original source-bound history + three modes and de-identified brokerage receipt in a trusted reachable environment, then run the already-implemented checks. Do not repeat the successful phone quote test.


## 2026-11-10 — Cross-session GitHub reconciliation (no scope change)
- Reopened the durable handoff and original five-day `MASTER-PLAN.md` before work. Verified `main` at `48853697ae7df9e20b75dffdb1d957d9563ca9a2`; PR #163 documentation register remains OPEN/DRAFT at `45364ce3f9ee68f502b5a7b12bf60c01a9526871`, distinct from and older than the active Day 3 handoff in PR #164. PR #164 remained OPEN/DRAFT/unmerged at inspected SHA `9b2006228add09eb868568674d5c1c2ef67f03b1` (https://github.com/Raminhashemi1/sahamban/pull/164).
- Inspected current PR and commit history, changed-file scope, reviews and exact SHA CI. Latest code commit `9b2006228add09eb868568674d5c1c2ef67f03b1` repairs ONLY the existing `tests/tsetmc-single-day-integrity-review-v1.test.cjs` fixture: restores the source URL and replaces a malformed regex assertion with a literal substring assertion. No new market evidence or production capability is inferred. PR #164 has 0 submitted reviews at inspection; its change list already includes Day 2 provenance gates and Day 3 review-only code, so these must not be reimplemented.
- Exact SHA `9b2006228add09eb868568674d5c1c2ef67f03b1`: 10/11 PR-triggered GitHub Actions workflows SUCCESS, 1 (broker safe amounts v124) IN_PROGRESS, 0 completed failures at last observation. This status applies only to that SHA, NOT to subsequent documentation commits; recheck CI for any newer head before claiming a green matrix.
- Preserved the already verified bounded original فولاد capture (500 daily rows ending 20261109, 23 adjustment records and matching raw-byte hashes), the real وساخت buy/debit numerical review, and the prior mobile single-day capture UI and integrity test. Do not ask for prior originals again. The 20261110 official daily row, independently attested price modes 0/1/2, full history completeness, provider authentication and itemized broker fee evidence remain unverified. No Day 3 final acceptance, merge, deployment, live trading, payments, signal activation or holdings changes.
- Exact continuation point: finish verifying the current SHA's pending broker-safe-amounts workflow; investigate only if it fails. Thereafter await genuinely new provider-bound same-day and three-mode evidence, using existing capture/review implementations rather than creating duplicates. The original five-day plan, Day 3 classification and release gates remain unchanged. This entry documents an audit/CI reconciliation only; no functional code was altered in this session.


## 2026-11-10 — GitHub continuation audit
- Reconciled live repository state against the durable handoff and roadmap. Active branch `feat/day2-history-basis-gates-20261109`; PR #164 head `6c893960ed3fe8d0360490ca25f14c5bf9076266`, OPEN / DRAFT / unmerged. Main remains `48853697ae7df9e20b75dffdb1d957d9563ca9a2`.
- Reviewed the new Day 3 audit/CLI and focused tests statically. They compose the existing raw-capture integrity and receipt arithmetic validators; they do not authenticate TSETMC or certify adjustment basis. No code or tests were run in this session.
- Exact-head CI at the poll: 6/12 success, 6/12 in progress, 0 completed failures. Pending: broker-amount-boundaries, smoke, browser, webkit-mobile, mocked-market-browser, synthetic-20-holdings. No green-matrix claim.
- No new authenticated market bytes, distinct 0/1/2 source-bound series, full-history proof or itemized broker receipt. Existing reviewed 500-row/23-event capture and prior transaction arithmetic remain preserved. Day 3 remains IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE.
- No merge, deployment, trade, order, payment, holdings mutation/access or signal activation. Approved five-day plan unchanged.
- **Next:** poll exact-head CI; if green, process only new external evidence through the existing review path.


## 2026-11-10 — تلاش برای رفع دو مانع روز سوم به درخواست کاربر (بدون پذیرش نهایی)
- کاربر صریحاً خواست دو مانع رفع و روز سوم بسته شود. وضعیت شاخه و مسیرهای جایگزین بررسی شدند؛ هیچ collector، محاسبه‌گر، اعتبارسنج یا آزمون قبلی دوباره‌سازی نشد.
- PR #164 در آغاز OPEN/DRAFT/ادغام‌نشده و سر آن `6bbe9c09ea146958445b083ea219ae12830841d8` بود. CI دقیق همین SHA در آخرین استعلام **۱۲/۱۲ در صف اجرا** بود؛ صفر تکمیل‌شده، صفر شکست و صفر موفقیت نهایی. بنابراین CI سبز نیست. لینک‌ها: Smoke/Browser https://github.com/Raminhashemi1/sahamban/actions/runs/42814931267 ؛ WebKit https://github.com/Raminhashemi1/sahamban/actions/runs/42814937332 ؛ مرز مبالغ کارگزاری https://github.com/Raminhashemi1/sahamban/actions/runs/42814931241 .
- مسیر جایگزین TSETMC از README عمومی `m-ahmadi/tse-client` پیدا شد: اجرای bundle مرورگر `https://cdn.jsdelivr.net/npm/tse-client/dist/tse.bundle.min.js` روی مرورگری که به TSETMC دسترسی دارد و فراخوانی `tse.getPrices(['فولاد'], {adjustPrices:0|1|2, getAdjustInfo:true, cache:false, startDate:'20010321', daysWithoutTrade:true, mergeSimilarSymbols:false})`. صفحه آزمون upstream خروجی تعدیل‌شده داخلی را با محاسبه مستقل از قیمت خام و رویدادهای تعدیل مقایسه می‌کند. این مسیر جایگزینِ runner غیرقابل‌دسترسی است، اما در این نشست روی دستگاه کاربر اجرا نشده و هیچ payload تازه‌ای تحویل نشد. خروجی حالت‌های ۱/۲ محاسبه داخلی کتابخانه است، نه سه endpoint مستقل یا گواه مستقل اصالت منبع. باید mode-0 خام، رویدادها، خروجی‌های ۱/۲، نسخه کتابخانه، نماد/InsCode، زمان UTC و digest ذخیره و با adapter/classifier موجود PR161 و محاسبه دستی مستقل تطبیق داده شوند. منابع: https://github.com/m-ahmadi/tse-client/blob/master/README.md ؛ https://github.com/m-ahmadi/tse-client/blob/master/test/browser/adjust-info.htm .
- دریافت مستقیم endpointهای تاریخچه از هر دو میزبان `cdn.tsetmc.com` و `cdn10.tsetmc.com` در این محیط ناموفق/غیرقابل‌دسترسی بود؛ payload HTTP یا SHA-256 تازه‌ای به دست نیامد. بسته قبلی ۵۰۰ ردیف/۲۳ رویداد همچنان تنها capture خام حفظ‌شده است و اثبات پوشش کامل تاریخچه یا رکورد تازه روز جاری نیست.
- بازبینی کارمزد: صفحه IDBR اجزای خرید ۰٫۳۰۴٪، ۰٫۰۲۵۶٪، ۰٫۰۰۹۶٪، ۰٫۰۰۸٪ و ۰٫۰۲۴٪ (جمع ۰٫۳۷۱۲٪) را به‌عنوان سقف و با ارجاع به ویرایش ۴۹ مورخ ۱۴۰۵/۰۴/۲۷ اعلام می‌کند؛ به‌روزرسانی صفحه ۱۴۰۵/۰۶/۱۰ است. برای مبلغ ناخالص ۴۱٬۵۵۳٬۳۷۶ ریال، حاصل بدون گردکردن اجزا به‌ترتیب ۱۲۶٬۳۲۲٫۲۶۳۰۴، ۱۰٬۶۳۷٫۶۶۴۲۵۶، ۳٬۹۸۹٫۱۲۴۰۹۶، ۳٬۳۲۴٫۲۷۰۰۸ و ۹٬۹۷۲٫۸۱۰۲۴ ریال است. گردکردن تک‌تک اجزا به نزدیک‌ترین ریال: ۱۲۶٬۳۲۲ + ۱۰٬۶۳۸ + ۳٬۹۸۹ + ۳٬۳۲۴ + ۹٬۹۷۳ = **۱۵۴٬۲۴۶ ریال**؛ محاسبه تجمیعی ۰٫۳۷۱۲٪ نیز ۱۵۴٬۲۴۶٫۱۳۱۷۱۲ و پس از گردکردن ۱۵۴٬۲۴۶ ریال است. پس گردکردن تجمیعی در برابر جزءبه‌جزء اختلاف بدهکار ۱۵۴٬۲۴۳ را توضیح نمی‌دهد؛ ۳ ریال همچنان بی‌توضیح است. نرخ سقف، تخفیف اختصاصی یا گردکردن واقعی کارگزار را اثبات نمی‌کند. نام کارگزاری در رابط کاربری جای رسید جزءبه‌جزء را نمی‌گیرد. هیچ ضریب ساختگی یا اصلاح اجباری به محاسبه‌گر افزوده نشد. منبع: https://idbr.ir/fees .
- نتیجه: هیچ‌یک از دو مانع با شواهد کافی رفع نشده است: payload تازه و منشأ مستقل تعدیل در دست نیست؛ اجزای معتبر و جزءبه‌جزء کارمزد نیز موجود نیست. روز سوم باید **IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE** بماند. بستن آن در این وضعیت جعل شواهد خواهد بود. هیچ سیگنال، بازنویسی قیمت، merge، deploy، معامله، سفارش، پرداخت یا تغییر سبد انجام نشد.
- **وابستگی بیرونی واحد:** اجرای مسیر capture مرورگر موجود روی دستگاه/شبکه مطمئنِ دارای دسترسی TSETMC و ارائه bundle خام + manifest؛ همچنین ارائه تفکیک امن و بدون شناسه شخصی اجزای واقعی کارمزد و قواعد گردکردن. بدون این دو، پذیرش روز سوم مجاز نیست.


## 2026-11-10 — Immediate follow-up reconciliation
Latest exact PR heads and CI were rechecked. PR164 `d6c69d820f5e58a325474774f2d8ff3e8bad87e0`: 3/12 success, 4/12 running, 5/12 queued. PR161 `7d71adbc9cd7836d3679eca2400d286ce0f328ce`: 12/12 success. PR162 `c0d15857fc3a353da17f3845202b664aedb62d11`: 11/12 success and smoke failure in the v162 live-evidence/CLI test step; exact failure cause not yet established. PR162 changed files are collector + tests + workflow, not a new provider capture artifact. Missing user-supplied mode-0 raw payload/events/mode-1/2 outputs and redacted itemized fee statement remain the two external blockers. No code changes or operational financial actions. Day 3 remains blocked.


## 2026-11-10 — PR162 failure root cause and patch
Fetched the complete failed smoke-job log. The collector correctly returned the daily duplicate-key error because the test fixture supplied the adjustment duplicate-key body to the daily endpoint. Corrected the test fixture on the PR162 owning branch only (commit `3cc42ee88ff3c2434dfa04b43e010df4475bdda4`); production collector logic unchanged. CI for corrected PR162 head is queued. PR161 remains 12/12 success. PR164 docs-only head has 12 checks queued. No actual TSETMC capture or itemized fee statement is present; Day 3 remains blocked on external evidence.


## 2026-11-10 — Corrected PR #162 CI started; current exact-head status
- PR #162 corrected test-fixture commit `3cc42ee88ff3c2434dfa04b43e010df4475bdda4` is on its proper owning branch `feat/tsetmc-bounded-live-evidence-20261109`. At latest poll, 11 checks were visible for this exact SHA: 4 SUCCESS, 2 IN_PROGRESS, 5 QUEUED; the smoke check was queued, so the corrected assertion has not yet been confirmed green.
- PR #164 latest documentation-only head `b3135e111d3ca08c8d8bfe4adf81d5d136899a6a`, OPEN/DRAFT; all 12 exact-head checks are QUEUED. Do not treat prior-head results as applying to this SHA.
- PR #161 remains 12/12 successful at its unchanged head `7d71adbc9cd7836d3679eca2400d286ce0f328ce`.
- The fixture correction does not produce any real provider response. Still missing: instrument-bound raw TSETMC mode-0 capture, adjustment event data and mode-1/2 outputs with provenance/hashes; and a redacted itemized broker settlement for the actual 3 IRR difference. Day 3 remains IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE.
- No tests were manually rerun, no production collector code changed, and no merge/deploy/order/trade/payment/holdings mutation/signal activation occurred.


## 2026-11-10 — Autonomous continuation snapshot
- User requested minimum-intervention handling. Follow-up was run immediately; no further user action is needed for public repo/CI monitoring.
- Exact current PR #164 head `c6b0ac90252f567f6e743fb3a1cacc87e0e7bb4a`, OPEN/DRAFT, base `48853697ae7df9e20b75dffdb1d957d9563ca9a2`: 12/12 checks QUEUED at last poll. No exact-head result yet.
- PR #162 head `3cc42ee88ff3c2434dfa04b43e010df4475bdda4`, OPEN: 8 SUCCESS, 3 IN_PROGRESS, 1 QUEUED, zero completed failures. This is after the endpoint-specific test fixture correction; corrected smoke is still queued, so do not declare it green.
- PR #161 head `7d71adbc9cd7836d3679eca2400d286ce0f328ce`, OPEN: 12/12 SUCCESS.
- Public fee page for broker confirms ceiling components 0.304%, 0.0256%, 0.0096%, 0.008%, 0.024%, total 0.3712%; it explicitly describes the schedule as ceilings. This still cannot prove the actual broker debit or explain the 3 IRR variance. Source: https://idbr.ir/fees .
- Public TSETMC documentation identifies symbol search endpoint `/api/Instrument/GetInstrumentSearch/{Query}` and daily history endpoint `/api/ClosingPrice/GetClosingPriceDailyList/{InsCode}/0`. Public API fetch was inaccessible from this runtime, so no real response bytes/hash or adjustment evidence was obtained. The PR162 collector is bounded and read-only, but its output explicitly remains unauthenticated/manual-review only.
- Remaining evidence is narrowly defined: (1) user-network capture of raw daily history + adjustment list and three-mode output/provenance for the instrument; (2) redacted itemized settlement showing actual fee lines for the 3 IRR variance. Account identifiers, credentials and personal data must not be shared.
- No code/test execution, merge, deploy, trade, order, payment, holdings mutation or signal activation. Day 3 remains IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE.


## 2026-11-10 13:52 Europe/Berlin — Exact-head CI audit
- PR #164 is OPEN/DRAFT, not merged. Exact head before this documentation update: `490e8bdb523eed7eb5a6460518a959f51d1eee2c`; all 12/12 GitHub check-runs were COMPLETED/SUCCESS (diagnostic-safety, indicators, mocked-market-browser, risk-engine, synthetic-100-holdings, portfolio-pilot, browser, webkit-mobile, smoke, broker-amount-boundaries, synthetic-20-holdings, inventory). See https://github.com/Raminhashemi1/sahamban/pull/164 . This documentation write advances the branch SHA, so the prior green checks must NOT be attributed to the new SHA; check exact final head again after documentation writes.
- PR #162 unchanged head `3cc42ee88ff3c2434dfa04b43e010df4475bdda4`: 12/12 COMPLETED/SUCCESS; OPEN, unmerged. PR #161 unchanged head `7d71adbc9cd7836d3679eca2400d286ce0f328ce`: 12/12 COMPLETED/SUCCESS; OPEN, unmerged.
- No new independently authenticated live TSETMC raw history/adjustment/three-mode provenance was available. No new real itemized broker settlement receipt was supplied. Published fee ceilings do not authenticate actual fee debit or 3-IRR discrepancy; do not change numerical rules without evidence.
- Acceptance status: `BLOCKED_EXTERNAL_EVIDENCE`, not day-three accepted. Only next action: obtain minimally redacted real TSETMC source/adjustment evidence and an itemized actual broker trade settlement receipt (retain date, instrument, gross amount, individual fee components, rounding and final debit; redact name, account, customer IDs and credentials). No trading or production actions.


## 2026-11-10 14:09 Europe/Berlin — CI and external-evidence checkpoint
- PR #164: OPEN/DRAFT, not merged. Exact inspected head `ec608407aa35f9dd1abf8722d96c86aa811400da`: all 12/12 check runs COMPLETED/SUCCESS and all 11/11 matching-head workflow runs COMPLETED/SUCCESS. Check names: mocked-market-browser, inventory, indicators, webkit-mobile, synthetic-20-holdings, smoke, diagnostic-safety, risk-engine, browser, synthetic-100-holdings, portfolio-pilot, broker-amount-boundaries. These results apply ONLY to this inspected SHA; documentation writes after this checkpoint create a new head and MUST NOT inherit these CI results.
- PR #162: OPEN, not merged; unchanged head `3cc42ee88ff3c2434dfa04b43e010df4475bdda4`: 12/12 check runs SUCCESS; 11/11 workflow runs SUCCESS.
- PR #161: OPEN, not merged; unchanged head `7d71adbc9cd7836d3679eca2400d286ce0f328ce`: 12/12 check runs SUCCESS; 11/11 workflow runs SUCCESS.
- No newly authenticated reproducible live TSETMC history, adjustment-event, or TSE Client three-mode evidence was obtained. Existing fixed-URL bounded collector is only an unauthenticated capture, not proof of issuer/source, price basis, or corporate actions. No historical price mutation or trading enablement.
- The official fee schedule is a ceiling schedule, not a transaction settlement statement. The 3 IRR discrepancy is unresolved without an actual itemized broker trade settlement; no numeric correction is justified.
- Minimum external evidence: (a) actual raw TSETMC history and adjustment response for the same instrument with instrument code, capture timestamp, source URL, SHA-256 and reproducible three-mode TSE Client output; (b) redacted itemized trade confirmation with gross consideration, fee components, rounding and net debit for the affected trade. No credentials, identity or account numbers.
- Status: `BLOCKED_EXTERNAL_EVIDENCE`. Only next action: obtain and validate the two external evidence bundles; after this documentation-only update, also verify all checks for the NEW exact head before acceptance. No merge/deploy/orders/trades/payments/portfolio changes/signal activation.


## 2026-11-10 15:20 Europe/Berlin — evidence-gated status checkpoint
- PR #164 OPEN/DRAFT/unmerged, observed pre-documentation head `881d3e89bb3214b719062d88a70325a951e16265`: exactly 12/12 check runs completed SUCCESS and 11/11 head_sha-matched pull-request workflow runs completed SUCCESS. Checks: inventory, webkit-mobile, broker-amount-boundaries, synthetic-20-holdings, mocked-market-browser, portfolio-pilot, indicators, browser, risk-engine, synthetic-100-holdings, smoke, diagnostic-safety. The documentation commits below change head; **do not transfer this CI result to a new SHA**.
- PR #162 OPEN/unmerged, head `3cc42ee88ff3c2434dfa04b43e010df4475bdda4`: 12/12 checks and 11/11 workflows SUCCESS. PR #161 OPEN/unmerged, head `7d71adbc9cd7836d3679eca2400d286ce0f328ce`: 12/12 checks and 11/11 workflows SUCCESS. No support PR head change detected relative to previous checkpoint.
- Public TSETMC collection remains limited to read-only bounded endpoint capture; neither public response shape nor the existing synthetic fixtures proves historical adjustment basis, issuer authentication or capital-action reconciliation. No newly independently validated raw three-mode source evidence is available in this checkpoint.
- 3 IRR fee discrepancy unresolved: ceiling schedule cannot establish actual itemized broker settlement. No undocumented numerical correction.
- Minimum outside evidence: (1) raw, date-stamped TSETMC daily price and adjustment event responses plus three-mode price outputs for the same instrument with instrument code, provenance/URL, hashes or original files; (2) redacted actual broker trade settlement receipt with gross trade amount, itemized fee lines, rounding and final debited amount. No account credentials or personal identifiers.
- Day 3 status: `BLOCKED_EXTERNAL_EVIDENCE`. Single next action: obtain those two evidence packages and validate against existing checks, then verify CI against whatever exact head SHA is current. No merge, deploy, order, payment, holdings change, signal enablement or expensive tests performed.


## 2026-11-10 16:47 Europe/Berlin — exact-SHA evidence checkpoint
- PR #164 OPEN/DRAFT, unmerged. **Pre-documentation head** `48d0314861d8829314956fd690c7be7a2ee13c6b`: 12/12 GitHub check runs COMPLETED/SUCCESS (smoke, browser, diagnostic-safety, portfolio-pilot, inventory, webkit-mobile, mocked-market-browser, risk-engine, broker-amount-boundaries, synthetic-100-holdings, synthetic-20-holdings, indicators), and 11/11 matching-`head_sha` pull_request workflow runs COMPLETED/SUCCESS, all first attempts. Legacy combined commit status API returned PENDING despite the successful checks; report the APIs separately. Documentation commits after this snapshot create a NEW SHA; never assign these green results to the new head.
- PR #162 OPEN/unmerged, unchanged head `3cc42ee88ff3c2434dfa04b43e010df4475bdda4`: 12/12 exact-head checks SUCCESS; 11/11 exact-head workflows SUCCESS. PR #161 OPEN/unmerged, unchanged head `7d71adbc9cd7836d3679eca2400d286ce0f328ce`: 12/12 checks SUCCESS; 11/11 workflows SUCCESS. No head changes from preceding checkpoint.
- No new authenticated, reproducible TSETMC history/adjustment or TSE Client mode-0/1/2 evidence obtained. PR #162 bounded capture and PR #161 adapter tests are not provider provenance or corporate-action verification. No unverified data was used to modify historical prices.
- User clarified their actual broker is **Mofid**, not Ideal Koosha; prior fee example/ceiling from another broker MUST NOT be attributed to the user's account. The 3-IRR difference remains an unverified project example until the affected broker/trade is established. Never equate a published maximum fee with actual settlement or change numeric logic without an authentic itemized receipt.
- Minimum external evidence: (A) same-instrument raw daily and adjustment responses, instrument identifier, URLs, capture time, SHA-256 and mode-0/1/2 TSE Client outputs; (B) only if the disputed 3-IRR transaction actually belongs to a real account, its redacted broker settlement statement with date, symbol, gross amount, itemized actual fees, rounding and final debit. Redact names, customer IDs, account numbers and credentials. Do not assume a matching transaction exists at Mofid.
- Day 3 remains `BLOCKED_EXTERNAL_EVIDENCE`. **Single next action:** obtain and authenticate the minimal external evidence bundle before any acceptance; exact-new-head CI must also be rechecked. No manual tests, merge, deploy, orders, trades, payments, holdings changes or signals.


## 2026-11-10 — User-approved immaterial 3-IRR variance disposition (DEC-006)
- User explicitly authorized not pursuing the 3 IRR discrepancy if immaterial, and suggested a *possible* EasyTrader defect. This is a **scope/prioritization decision only**, not evidence that a software bug, discount, rounding policy or broker error occurred.
- The user-provided Mofid/EasyTrader screenshots show the real buy of **وساخت** on **1405/07/04**: 21,136 shares at 1,966 IRR, gross 41,553,376 IRR and debit 41,707,619 IRR; inferred total cost 154,243 IRR. The existing 0.3712%-ceiling estimate is 154,246 IRR, leaving 3 IRR unallocated. Screenshots show gross and debit, **not an itemized settlement**. Do not upload screenshots containing the user's identity/account/portfolio to this public repository.
- Decision: classify this **specific 3 IRR observation** as `FEE_VARIANCE_DE_MINIMIS_ACCEPTED_FOR_PILOT_ARITHMETIC`, severity LOW, **non-blocking for continued Day 3 engineering/pilot cost-model evaluation**, with unresolved root cause and a possible platform/fee-schedule difference NOT CONFIRMED. No numerical fudge factor, broker rounding claim, or pricing engine change. Do not extrapolate tolerance to larger discrepancies, different instruments/brokers, regulatory tariff verification, account reconciliation or production financial compliance. De-identified actual line-item receipts would still be required to claim fee schedule/settlement attestation.
- Remaining **independent** blocking evidence for Day 3 final acceptance and any price-derived signals: TSETMC same-instrument original raw history + adjustment events with source, captured time and hashes, reproducible documented modes 0/1/2 and independent event/basis review; full history / specific same-day row claims must not exceed evidence. Preserve `UNKNOWN_NOT_ATTESTED` and fail-closed behavior.
- PR164 OPEN/DRAFT pre-documentation head `00cd7b93cfed02c6e859bd39d37f9ecdda86198c`: exact 12/12 GitHub check runs SUCCESS at the observed time. PR162 `3cc42ee88ff3c2434dfa04b43e010df4475bdda4`: 12/12 SUCCESS. PR161 `7d71adbc9cd7836d3679eca2400d286ce0f328ce`: 12/12 SUCCESS. Documentation commits below create new head SHA; re-check exact new head CI rather than inheriting these results.
- No merge, deploy, order, trade, payment, holdings mutation, history rewrite or signal activation. Day 3 remains `IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE (TSETMC)`. **Single next task:** acquire and verify independently traceable TSETMC original response + event/mode evidence with existing review tools; no further requests to user for itemized 3 IRR fee receipt as a prerequisite to proceeding with Day 3 pilot arithmetic.


## 2026-11-10 — وضعیت پیگیری مجدد (آخرین مشاهده)
- PR #164 همچنان OPEN / DRAFT / UNMERGED است؛ head دقیق فعلی: `cbe03643eeca81a89c1ab4ba1c83298625fbb4cd`. تمام 11 اجرای GitHub Actions که برای همین SHA برگشت داده شد، `completed / success` هستند (11/11؛ صفر شکست و صفر در انتظار). این وضعیت فقط CI همین SHA را توصیف می‌کند؛ معیارهای شواهد بیرونی روز سوم را تأمین نمی‌کند.
- PR پشتیبان #161 همچنان OPEN / غیر Draft / UNMERGED با head `7d71adbc9cd7836d3679eca2400d286ce0f328ce` و 11/11 اجرای workflow موفق روی همان head است. PR پشتیبان #162 همچنان OPEN / غیر Draft / UNMERGED با head `3cc42ee88ff3c2434dfa04b43e010df4475bdda4` و 11/11 اجرای workflow موفق روی همان head است. هیچ‌یک ادغام نشده و CI آن‌ها جای CI یا شواهد داده PR #164 را نمی‌گیرد.
- پنج سند پروژه در شاخه PR #164 نگهداری می‌شوند؛ مسیرهای ریشه در default branch لزوماً موجود نیستند. این یادداشت فقط روی شاخه مستندشده PR اعمال می‌شود.
- بازبینی مجدد، مدرک جدیدی از payload خام TSETMC، پاسخ HTTP قابل هش، InsCode احرازشده، سه خروجی قابل بازتولید TSE Client برای `adjustPrices=0/1/2` یا سند اولیه و مستقل رویدادهای شرکتی به دست نداد. مستندات TSE Client مسیر اجرای مرورگری را توصیف می‌کنند، اما خروجی محلی/خام اجرا نشده و تحویل نشده است؛ بنابراین این مستندات به‌تنهایی داده واقعی وساخت یا مبنای تعدیل را اثبات نمی‌کنند.
- اختلاف ۳ ریالی طبق تصمیم کاربر برای محاسبات آزمایشی پایلوت غیرمسدودکننده باقی می‌ماند؛ هیچ مبلغ یا نرخ واقعی تسویه استنتاج یا اصلاح نشد.
- وضعیت پذیرش روز سوم: `IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE`. CI سبز است، اما شرط شواهد واقعی مستقل برقرار نیست. هیچ merge، deploy، سفارش، معامله، پرداخت، تغییر سبد، بازنویسی قیمت یا فعال‌سازی سیگنال انجام نشد.
- تنها اقدام بعدی: اجرای مسیر capture مرورگر موجود با TSE Client روی دستگاه/شبکه‌ای که به TSETMC دسترسی دارد و ارائه manifest و payload خامِ قابل هش برای همان InsCode؛ سپس اجرای validatorهای موجود PR #162 و adapter/classifier موجود PR #161. بدون این artifact بیرونی، اقدام فنی دیگری در این محیط نمی‌تواند مانع را صادقانه ببندد.


## 2026-11-10 — بررسی فایل‌های واقعی تحویلی TSETMC (17:05:17Z)
- سه فایل کاربر دریافت و بازبینی شدند: manifest، daily و adjustments برای InsCode متنی `46348559193224090`. SHA-256 بایت‌های فایل‌ها با مقادیر manifest دقیقاً برابر است: daily `e30557b58db4f3216ad3b7fdf77bc65175337dabc243e84316bee2a19806aa5a` (159392 بایت، 500 ردیف)؛ adjustments `29d25461c61306fc716e44dedb0e98200cf1159de4f17eeb18667741df6263ae` (3173 بایت، 23 ردیف). اندازه‌ها، تعداد ردیف‌ها، JSON، شناسه متنی روزانه، شناسه عددی adjustments پس از parse، تاریخ‌های معتبر، نبود تاریخ تکراری، مرتب‌سازی نزولی و مثبت‌بودن pClosing در daily بررسی شد.
- دامنه capture صراحتاً `BOUNDED_DAILY_TOP_500` است، نه کل تاریخچه. روزانه 500 ردیف از 2024-10-15 تا 2026-11-10 دارد؛ 123 ردیف `zTotTran=0` دارند. 23 رویداد adjustment از 2009-06-23 تا 2026-08-03 ثبت شده‌اند، اما فقط دو تاریخ آن‌ها در پنجره 500 ردیفی daily حضور دارد: 2025-08-04 و 2026-08-03.
- manifest خودش `sourceAuthenticated=false`, `priceBasisVerified=false`, `capitalActionsVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false` را اعلام می‌کند. بنابراین تطبیق SHA فقط یکپارچگی بایت با manifest را ثابت می‌کند؛ اصالت مستقل منبع، کامل‌بودن تاریخچه، طبقه‌بندی رویدادهای شرکتی یا مبنای تعدیل را ثابت نمی‌کند.
- این تحویل شامل سه capture مستقل TSE Client برای `adjustPrices=0/1/2` نیست. endpoint روزانه فقط `/GetClosingPriceDailyList/{insCode}/500` است؛ عدد 500 سقف تعداد ردیف است، نه حالت تعدیل. خروجی‌های سه‌حالته و سند مستقل corporate actions هنوز احراز نشده‌اند.
- ممیزی روز سوم طبق منطق موجود `day3-real-evidence-audit-v1.cjs` در بهترین حالت `REAL_DATA_REVIEW_PARTIAL` است: capture bytes با manifest سازگار، اما `fullHistoryCaptured=false`, `historyBasisAuthenticated=false`, `threeModesVerified=false`, `day3FinalAccepted=false`. رسید تفکیکی واقعی کارگزاری نیز ارائه نشده؛ اختلاف ۳ ریالی طبق تصمیم کاربر همچنان خارج از دامنه پیگیری است و هیچ عدد کارمزدی اصلاح نشد.
- نتیجه: داده واقعی اولیه اکنون موجود و از نظر byte-integrity قابل بررسی است؛ با این حال پذیرش نهایی روز سوم همچنان `BLOCKED_EXTERNAL_EVIDENCE` است. تنها اقدام بعدی: ارائه سه خروجی مستقل TSE Client با حالت‌های 0/1/2 و مدرک مستقل رویدادهای سرمایه‌ای/سود نقدی برای همین InsCode، به‌همراه شواهد منبع قابل بازتولید. تا آن زمان سیگنال و ورود معاملاتی غیرفعال می‌مانند.
- هیچ تست پرهزینه یا تکراری، merge، deploy، سفارش، معامله، پرداخت، تغییر سبد یا فعال‌سازی سیگنال انجام نشد.


## 2026-11-10 — CRITICAL symbol-identity correction and Day 4 readiness boundary
- Independent published TSETMC-related references identify `insCode=46348559193224090` as **فولاد (فولاد مبارکه اصفهان)**, NOT **وساخت**: https://github.com/amirziveh/tsetmc-skill/blob/master/SKILL.md and https://github.com/mohsenebrahimyir/codal-tsetmc/blob/master/docs_src/tsetmc.qmd (also https://github.com/semnan-university-ai/tsetmc-dataset/blob/master/tsetmc.php). Earlier notes describing those 500 daily + 23 adjustment records as «وساخت» were **incorrect in instrument attribution**. The checks on captured bytes/manifest remain intact, but the evidence is at most a **فولاد** pilot capture. Do not use or label these raw files as وساخت evidence, do not transfer their prices/events, and do not silently rewrite the original capture. Independently resolve وساخت's own insCode before requesting that symbol's history.
- The original captured manifest explicitly has `sourceAuthenticated=false`, `priceBasisVerified=false`, `capitalActionsVerified=false`; URL and SHA-256 agreement are not independent origin attestation. Existing 500 row bounded capture cannot prove full history. The adjustment records have null corporateTypeCode and do not establish dividend vs capital-increase classification.
- Original TSE Client examples clarify library `getPrices(...,{adjustPrices:0|1|2})`, and show raw vs adjusted comparisons and offline adjustment logic; sources: https://github.com/m-ahmadi/tse-client/blob/master/README.md and https://github.com/m-ahmadi/tse-client/blob/master/test/browser/adjust-info.htm . This is a REPRODUCIBLE DOCUMENTED METHOD, not execution evidence or provider-signed attestation. Do not equate API `GetClosingPriceDailyList/{insCode}/{Top}` row count with adjustment mode.
- **CI pre-write**: PR #164 HEAD `b852439a73d507d674f17b582c1fd45a207fbef5` had 11 of 11 returned pull-request GitHub Actions workflow runs `completed/success`. Supporting PR #161 head `7d71adbc9cd7836d3679eca2400d286ce0f328ce` and #162 head `3cc42ee88ff3c2434dfa04b43e010df4475bdda4` each had 11/11 success; all PRs remained open/unmerged and #164 draft. This CI result does NOT apply automatically to the new documentation commit SHA. Verify current exact head again.
- **Day 3 formal acceptance remains BLOCKED_EXTERNAL_EVIDENCE**: actual 0/1/2 responses for correctly identified intended instrument, independent corporate-action issuer/Codal evidence, and the specified brokerage settlement/receipt attestation are not available. The user considers the historical 3-IRR fee difference immaterial for pilot arithmetic, but that waiver neither proves actual settlement nor changes the documented full acceptance gate. No numerical adjustment or asserted tariff reconciliation.
- **Next single action:** obtain trusted exact instrument identification and read-only raw three-mode output (+ version/UTC/time/digests) for **وساخت** on a network where it works, alongside independently reviewable Codal issuer filings; only then run existing validators and recheck full acceptance criteria. Tomorrow's Day 4 UI/mobile/security work can be prepared independently of this gate, but no complete Day 3 certification, financial signal, order, merge, or deploy is authorised by preparation alone.


## 2026-11-13 — Day 4 inventory-only continuation on PR #164 (latest GitHub check)
- Read the six continuity/plan/decision/log files from the requested branch and checked recent PRs, branch commits, and the exact current head `2bd7fa8dbf058a6db67d0d570fc6d868c87273f5` (before this documentation commit). PR #164 is OPEN, **non-DRAFT**, unmerged. This live status supersedes older Draft assertions; it is **not** merge approval. `main` at inspection: `a5c10548904ee0e1cd80169729071d0bb390f606`.
- **Exact-head CI:** 14/14 GitHub check runs completed/success, 13/13 matching-head pull-request workflow runs completed/success, including Smoke, WebKit, bounded numerical and cross-symbol reconciliation. Those observations are pre-documentation only; recheck CI on the new commit.
- New audit document: [DAY4-BASELINE-DUPLICATE-INVENTORY-20261113.md](DAY4-BASELINE-DUPLICATE-INVENTORY-20261113.md). Existing mobile/RTL, keyboard/axe accessibility, PWA/local-backup, security and server-only subscription modules/tests are inventoried rather than rebuilt. Separate **draft PR #166**, branch `feta`, already implements debug-only Android SAF backup and tracks Issue #167; GitHub records limited synthetic on-device PASS for local and risk save/readback. Other physical negative paths and real PWA integration remain unverified. No code from PR #166 was copied, merged or deployed.
- Under DEC-008 the Day 3 **bounded engineering** milestone remains closed; the last Ghشہداب/غشهداب adjustment discrepancy is a quarantined source-basis anomaly, not certified financial history. All financial/entry/signal gates remain false. No new original provider/CODAL attestation, real transaction or sensitive user artifact was obtained or uploaded.
- **Work completed here:** source/PR/CI inventory and documentation checkpoint only; no tests rerun, no production code/plan change, no GitHub PR-status mutation, merge, deploy, orders, payments, portfolios or signals.
- **Single next dependency:** continue pending synthetic physical negative-path checks on existing PR #166 / Issue #167; never duplicate its Android implementation in PR #164. PR #164 exact new-head checks must be read independently before any further completion claim.


## 2026-11-13 — Verified green exact-head CI and durable new-chat prompt
- Before writing: PR #164 on `faab9bdff591f4c22c0a3141dbb3dc0e455249ec` had **14/14 successful check runs** and **13/13 successful exact-head PR workflow runs**. PR #166 / `feta` on `1ec03b178dfb24e723866fee41aaa9b97820c4ff` had **12/12 successful checks** and **11/11 successful workflows**. Both unmerged, PR #166 Draft, Issue #167 OPEN. These are **pre-documentation heads**; do not copy their CI verdict onto a new SHA.
- Created [NEW-CHAT-START.md](NEW-CHAT-START.md) as a fixed copy/paste cross-chat bootstrap; the six-file order and **live GitHub first** procedure are explicit. This is intentionally not an automatic capacity alarm: ChatGPT has no reliable context-remaining trigger or background notifier for the current page.
- Existing two physical Samsung S23 FE synthetic save/readback PASS results were *read from PR #166 documentation*, **not re-run**. Physical Cancel, offline, Persian TalkBack, real PWA restore and publication are still unverified/blocked. Existing Android runbook already describes tests; no duplicate launcher, bridge, file parser, app version, or test logic created. Proceed only with evidence-based next field test.
- Scope unchanged: DEC-008 bounded Day 3 engineering remains complete; original-source financial attestation and entry/trading gates stay false. No code execution beyond live CI inspection; no merge, deploy, trading, money, holdings or sensitive files. Only safe documentation changes. After this commit, recheck exact-new-head CI.

## 2026-11-13 — Cross-branch owner priority: no screen-reader work in current scope
- Owner explicitly removed **dedicated TalkBack/VoiceOver screen-reader feature work and device testing** from the **current** Sahamban delivery plan; keep only as an **unscheduled possible future update if users ask**. This supersedes any earlier text in this document assigning TalkBack as the next field gate.
- This is not an assertion of screen-reader PASS or compliance: `SCREEN_READER_SCOPE=CURRENT_RELEASE_OUT_OF_SCOPE_BY_OWNER`, `TALKBACK_PHYSICAL_RESULT=NOT_TESTED`. Preserve existing UI labels, security and automated browser regressions; no destructive code removal or alteration to the original high-level five-day plan. External store/legal obligations remain to be assessed before publication and may not be waived by project preference.
- Actual Android test evidence and the decision are recorded on the separate **`feta` / draft PR #166** in [commit `10bb147`](https://github.com/Raminhashemi1/sahamban/commit/10bb147873ccafd9a4bf688a62270d2e5d2634e3). Physical synthetic local/risk, cancellation no-false-PASS and user-attested synthetic offline roundtrip are already recorded; do not repeat. Real served PWA backup↔Android integration remains unverified and needs a controlled, explicitly authorized environment.
- **New handoff directive:** read the latest `feta` branch/PR #166 and Issue #167 before resuming any Android work; **do not ask for TalkBack/VoiceOver testing, schedule it or build it** in the current cycle. Next non-accessibility task is a review-only assessment of the actual PWA↔Android asset/deployment mismatch, not an unauthorized deployment. No merge, `main`/Pages change, payment, orders, holdings mutation or release approval.

## 2026-11-13 — Android SAF import fix and new physical import-only gate (separate PR #166)
- Continue Android work **only** on the existing separate `feta` / PR #166 branch; do not duplicate its implementation in PR #164. Exact current tested branch SHA: `09a221177da68096affbb7e8d3986b4977dc5c05`. PR #166 remains OPEN/Draft/unmerged; Issue #167 OPEN.
- Found and fixed a real restore-path mismatch: MainActivity had `setAllowContentAccess(false)` while passing Android SAF file URIs into the PWA file input. It now enables content URI reads for the user-selected JSON flow only, retains `setAllowFileAccess(false)`, requests `application/json`, requires transient `FLAG_GRANT_READ_URI_PERMISSION`, rejects multi-selection and applies pure-Java `BackupImportPolicy` to accept only valid-authority `content://` URIs. No persistent grant, storage permission, generic JS bridge or broader filesystem access.
- New isolated debug build v0.3.5-pilot (versionCode 8, package `ir.sahamban.pilot.restore`) built and audited successfully: [workflow 43422281160](https://github.com/Raminhashemi1/sahamban/actions/runs/43422281160), [artifact 14034203394](https://github.com/Raminhashemi1/sahamban/actions/runs/43422281160/artifacts/14034203394). Install beside older `.retest`; do not uninstall older pilot, Chrome or PWA. APK SHA-256 `2e619ef3c73fffb6f8e6f175fabf573c43df6bb57fe71196fc826ce89b0f26e5`.
- On exact PR #166 SHA `09a221177da68096affbb7e8d3986b4977dc5c05`, **13/13 check runs and 12/12 matching-head workflows passed**. This is CI/build evidence only, not physical acceptance.
- **Next action requiring owner/device:** install the new artifact and perform only the documented import-only test with previously saved synthetic `test-offline-1.json` (or another synthetic fixture). Never choose a real portfolio file. Report only PASS/FAIL and Android/WebView version; do not upload the JSON. This checks SAF file selection/read/restore in the public-main PWA. It does **not** test the unmerged native export helper because public `main` still lacks that helper. Full real PWA↔Android export/restore remains UNVERIFIED; no public deploy or merge authorized.
- TalkBack/VoiceOver remains outside current scope by owner direction; do not ask or schedule. Original five-day roadmap unchanged; no main Pages change, financial source change, trade, order, payment, portfolio mutation, signal activation or release.

## 2026-11-13 — Android test screenshot triage: secondary launcher opened
- User screenshot shows title `آزمون محلی خروجی و بازیابی فایل`, which is the debug-only bundled `BackupSelfTestActivity` / `backup-self-test.html` fixture, not the public PWA. This is the same local synthetic SAF test screen as before; it is not evidence of a new PWA import test or APK regression. New PWA import physical result remains NOT TESTED.
- Debug APK has two launcher icons: normal `سهام‌بان` = `MainActivity` -> published HTTPS PWA; secondary `سهام‌بان - آزمون پشتیبان ساختگی (نصب مستقل)` = offline synthetic file test. User opened the secondary one.
- Next user step: exit to Home/app drawer and launch **only the normal «سهام‌بان» icon**. Ask them to send a screenshot of the main PWA screen before selecting a file. The normal PWA loads the published site and may need internet; offline fixture is separate.
- Do not instruct them to reuse `test-offline-1.json` from the bundled fixture in the PWA import flow: that fixture is nonce-bound and has a different schema. First identify which PWA import control they are using and prepare a matching synthetic PWA-format file. No real portfolio file.
- Documentation and memory updated in `feta` commit `e860a64b29b9e6ad990f0d2cd7146b71ce7a67a7`; PR #166 remains OPEN/Draft, no code/public deployment/merge or release change. `REAL_PWA_BACKUP_UNVERIFIED` and `MARKET_RELEASE_BLOCKED` unchanged.

## 2026-11-13 — Main WebView blank-screen report
- User launched the correct normal `سهام‌بان` app icon but it shows a white page. Code check on `feta`: MainActivity loads `https://raminhashemi1.github.io/sahamban/` and the manifest has INTERNET permission. This main PWA shell needs a working network for initial remote load; the offline `آزمون محلی خروجی و بازیابی فایل` is a separate debug fixture.
- Airplane mode had been confirmed ON during the earlier local fixture test. This is a plausible cause of the white screen but remains unconfirmed. Immediate user action: turn airplane mode OFF, enable Wi-Fi or mobile data, reopen normal `سهام‌بان`, wait ~20 seconds. Do not uninstall, clear app/Chrome data or select backup files.
- If still blank with connectivity, check whether the published URL opens in Chrome on the same phone and request screenshot; then inspect WebView error/TLS callbacks and add visible load diagnostics before broader code changes. No PWA restore test has happened yet.
- Detailed code-grounded note and README troubleshooting recorded in `feta` commit `34fffd35c628b252f95ecd8089625cb720cc5ac1`. PR #166 remains Draft/open. No code, public deployment, merge, release or roadmap changes. `REAL_PWA_BACKUP_UNVERIFIED`, `MARKET_RELEASE_BLOCKED`.

## 2026-11-13 — Chrome also stalls at mid-load on the public PWA URL
- User reports the main Android app is blank and the same public PWA URL in Chrome on that phone also stops around halfway through the browser loading bar, leaving a white page. This is not a WebView-only symptom. Physical PWA restore test has not begun.
- Public `main` SHA checked: `a5c10548904ee0e1cd80169729071d0bb390f606`. GitHub Pages build/deploy workflow `43296600208` passed; public-main browser/smoke workflow `43296602122` passed; public asset inventory `43296601790` passed **84/84 first-party assets over HTTPS** (`PASS_PUBLIC_REFERENCE_ASSETS`). These CI checks ran from GitHub Actions on 2026-11-12; they do not certify this user's phone/network and the browser suite serves a local checkout.
- Next isolation step: ask whether `https://example.com` loads in Chrome on the same phone/network. If not, investigate device network/VPN/DNS; if yes, investigate PWA runtime on the live public site. No speculative code change yet.
- Preserve browser/app storage and existing APK; do not uninstall, clear data or select backup files. No code, Pages deployment, merge, release, financial data or roadmap change. `REAL_PWA_BACKUP_UNVERIFIED`, `MARKET_RELEASE_BLOCKED`.

### Follow-up: general HTTPS connectivity confirmed; isolate lightweight install page — 2026-11-13
- User confirms `https://example.com` opens in the same Chrome session/network. General connectivity is therefore working; this makes a broad network outage less likely, but does not rule out a GitHub Pages path/runtime/cache issue.
- Next low-risk diagnostic: open `https://raminhashemi1.github.io/sahamban/install.html`. This is a lightweight standalone installation guide with one small inline script, unlike the main `index.html` which loads the full app script stack. If it renders, investigate the main page's startup scripts / service-worker state; if it is also blank, investigate delivery or browser cache for this origin.
- Keep all app/browser data and existing APK intact. Do not uninstall, clear storage/cache, select backups, change source code or redeploy until this isolation result is known. No data or code changed.

## 2026-11-13 — Review-only PWA ↔ Android preflight after Chrome connectivity check

- User confirms `https://example.com` opens in Chrome on the same phone/network. Broad connectivity failure is less likely; the Sahamban origin/runtime or service-worker path remains unisolated until the standalone `install.html` check is returned.
- Reviewed exact public `main` SHA `a5c10548904ee0e1cd80169729071d0bb390f606` against exact `feta` / PR #166 head `7aa6098935328137ff9675e384f57af3896400d0`. Public `main/index.html` does **not** load `native-backup-export-v1.js`; public `main/sw.js` remains cache `sahamban-static-v150-13` and does not precache that helper. This is why the existing public Android launcher cannot yet exercise the new native-export bridge.
- On `feta`, `index.html` loads `native-backup-export-v1.js?v=1.0` before `app.js`; `sw.js` cache `sahamban-static-v150-14` includes it; both the local-backup UI and portfolio-backup UI delegate export to the helper. Android's bridge is restricted to the exact HTTPS origin, trusted `/sahamban` path, top-level page, two allowlisted JSON filenames/schemas and 256 KiB; it uses SAF and exact-byte readback. Import is limited to one user-selected `content://` JSON URI with a transient read grant; `file://` remains disabled.
- Existing tests already cover the PWA local-backup UI with a mocked native bridge, client request correlation/timeout/fail-closed behavior, Java origin/content policy, exact-byte verifier and synthetic SAF fixture. Do not duplicate these tests. They do **not** prove a physical live-PWA export/restore or the current public deployment.
- Exact PR #166 head `7aa6098935328137ff9675e384f57af3896400d0`: **13/13 check runs PASS**; Android debug build run [43426682550](https://github.com/Raminhashemi1/sahamban/actions/runs/43426682550) succeeded. PR #166 remains OPEN/Draft; Issue #167 remains OPEN. Main SHA and Pages deployment unchanged.
- Next single user-side isolation step: open `https://raminhashemi1.github.io/sahamban/install.html` in the same Chrome. It is a small standalone HTML page and does not load the main app script stack, though it registers the existing service worker after page load. If visible, report that; if blank, send a screenshot. Preserve all app/browser data; do not uninstall, clear storage/cache, select backups, merge, deploy or change product code before this result.
- No product code, user data, main deployment, roadmap or release state changed. `REAL_PWA_BACKUP_UNVERIFIED`; `MARKET_RELEASE_BLOCKED`.


## 2026-11-13 — live continuation audit (documentation-only)
- Re-read NEW-CHAT-START.md and the six required project memory/plan/decision/log documents on this branch; reviewed DAY4-BASELINE-DUPLICATE-INVENTORY-20261113.md.
- Live refs at audit: PR #164 branch `feat/day2-history-basis-gates-20261109` HEAD `4f8eb71dde58d723da706a9f71c23cff9e8f0df6`; PR #164 OPEN, non-Draft, unmerged. Exact SHA CI: 14/14 check runs success and 13/13 matching PR workflow runs success. These results belong only to this pre-checkpoint SHA.
- Public `main` remains `a5c10548904ee0e1cd80169729071d0bb390f606`. Separate Android PR #166 branch `feta` HEAD at audit `dfff2e21f13979ff7a204080982f5a29dcaab88c`; PR #166 OPEN/Draft/unmerged; exact SHA 12/12 checks and 11/11 matching PR workflow runs success. Issue #167 OPEN.
- Android review confirms the existing integration mismatch: public main does not load/precache `native-backup-export-v1.js`, while the separate feta branch does. No code/tests rerun, no Android feature duplicated, no physical result inferred from CI.
- Original five-day plan unchanged. DEC-008 remains bounded Day 3 engineering only; `day3FinalAccepted=false`, `historyBasisAuthenticated=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`. `REAL_PWA_BACKUP_UNVERIFIED`; `MARKET_RELEASE_BLOCKED`.
- No source code, user data, APK, public Pages, PR state, financial data, holdings, orders, payments, signals, merge or deployment changed. This is a documentation-only audit; this commit's CI must be checked independently.
- **Single next dependency:** user-side open `https://raminhashemi1.github.io/sahamban/install.html` in the same Chrome session and report visible/blank. Preserve app/browser storage; do not uninstall, clear data/cache or select backup files. No code change/redeploy until this result is known.


## 2026-11-13 — superseding live CI/status correction
This entry supersedes the immediately preceding live-audit entry's stale pre-checkpoint SHA references; no source/test state changed.
- Correct live PR #164 HEAD at audit: `0fa3dc31591450c689ad59ef27f316949fc068b8`, OPEN/non-Draft/unmerged. Its exact-head PR workflow set contains 13 runs: **11 success, 2 in progress** (Smoke and WebKit). The connector exposed no check-run records for this SHA; do not claim a check-run total or final-green status.
- Correct live PR #166 HEAD: `73e01124f1227cb5ccfb07bd3c599a9923b1b510`, OPEN/Draft/unmerged. Its exact-head PR workflow set contains 11 runs: **8 success, 3 in progress** (WebKit, Smoke, 100-holding synthetic lifecycle). No failure was reported at poll time; CI is still IN_PROGRESS.
- Public `main` remains `a5c10548904ee0e1cd80169729071d0bb390f606`; Issue #167 remains OPEN. PR #164 and PR #166 are separate branches; no cherry-pick or code transfer.
- Existing Android preflight conclusion unchanged: `main` lacks the native backup helper and service-worker precache; `feta` contains them. Live PWA↔Android integration is UNVERIFIED. Existing synthetic local/risk/offline and cancellation observations are not repeated; screen-reader work remains out of current scope, NOT_TESTED.
- The single outstanding user-side diagnostic is still opening `https://raminhashemi1.github.io/sahamban/install.html` in the same phone's Chrome session and reporting visible/blank. No device result is present yet. Preserve app/browser data; no uninstall, cache/storage clearing, backup selection, code change or deployment before that result.
- No tests were rerun and no product code changed in this audit. Original five-day plan unchanged; financial gates remain `day3FinalAccepted=false`, `historyBasisAuthenticated=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`. `REAL_PWA_BACKUP_UNVERIFIED`, `MARKET_RELEASE_BLOCKED`.
- No merge, deploy, publication, signing, trade, order, payment, signal activation, holdings mutation or sensitive data upload.


## 2026-11-13 — Normal Android app UI visible on real phone; cross-branch checkpoint
- New owner-provided screenshot/message: normal «سهام‌بان» Android launcher opened and displayed all sections (not the offline synthetic backup-test launcher). `ANDROID_NORMAL_LAUNCHER_UI=PASS_USER_ATTESTED_CURRENT_SESSION`. Earlier blank-screen observations remain historical; no root cause or durable recurrence guarantee is asserted.
- Branch separation preserved: Android acceptance entry committed on `feta` as `f1d49d772cb64dc1a3207214b2485b8fdacc28db` in `ANDROID-TEST-ACCEPTANCE-2026-11-12.md`. No Android code was copied into PR #164.
- Pre-documentation GitHub audit: working branch `c90bd2febec4f08dbd4771501fa263adba19738d` (PR #164 OPEN/non-Draft/unmerged) had 14/14 exact-head checks SUCCESS and 13/13 workflows SUCCESS; Android `feta` `ec128b5c84ce5e99c2e001e8dff07383f8fe46c5` (PR #166 OPEN/Draft/unmerged) had 12/12 checks SUCCESS and 11/11 workflows SUCCESS; Issue #167 OPEN; public `main` `a5c10548904ee0e1cd80169729071d0bb390f606`. Recheck CI for each new documentation SHA rather than inheriting historical green.
- **Remaining one device-dependent gate:** real PWA backup/import integration is `UNVERIFIED`. First verify exact PWA backup/import UI and synthetic fixture schema; do not reuse nonce-bound self-test JSON or select actual personal portfolio files. No file selection/restore or destructive storage change authorized by this screenshot. Dedicated screen-reader tests stay out of current scope per owner.
- No new automated tests run; only evidence documentation changed. `REAL_PWA_BACKUP_UNVERIFIED`, `MARKET_RELEASE_BLOCKED`, `day3FinalAccepted=false`, `historyBasisAuthenticated=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`. Original five-day plan unchanged; no merge, deploy, store release, financial order, holdings mutation or payment.


## 2026-11-13 — Day 4 continuation: exact PWA import-format review, no physical restore
- Starting live SHAs, checked before this documentation: work branch `29886cc1211b48df240ce543c12752c1e357f86e` (PR #164 OPEN/non-Draft/unmerged) **14/14 exact-SHA check runs and 13/13 workflows success**; Android `feta` `f1d49d772cb64dc1a3207214b2485b8fdacc28db` (PR #166 OPEN/Draft/unmerged) **12/12 checks and 11/11 workflows success**. Issue #167 OPEN, published main `a5c10548904ee0e1cd80169729071d0bb390f606`. Subsequent documentation commit(s) require their own exact-head CI check.
- New non-duplicate **read-only code audit** in `feta` (preflight documented in commit `0a8f1f3941a0c2ab372dcb94ec3b46d56e28af17`): local PWA restore `sb148File`/`sb148Restore` expects `format=sahamban-local-backup`, `schema=1` with allowlisted stringified per-key `items`; it applies writes to existing browser storage only after explicit confirmation and attempts rollback if needed. Portfolio `portfolioBackupFile`/`portfolioBackupApply` expects `format=sahamban-portfolio`, `version=1|2` plus validated fields; Apply fills page fields and persistence needs separate Save. Both enforce a 256-KiB import cap. The debug nonce-bound offline JSON is NOT proven compatible with either importer; don't use `test-offline-1.json` for real PWA restore.
- Public `main/index.html` includes both import controls, but does NOT reference `native-backup-export-v1.js` added only in unmerged `feta`. Main Android launcher loads the public root. Hence user-confirmed full UI only demonstrates visible startup; `REAL_PWA_BACKUP_UNVERIFIED` and `MARKET_RELEASE_BLOCKED` stay. No synthetic or physical test repeated and no portfolio/storage data touched.
- **Single next field step:** in the normal Android app locate «پشتیبان محلی تنظیمات و سبدهای سهام‌بان», confirm the file selection control and initially disabled Restore button are visible, and report their visibility (without choosing any file or revealing private holdings). Controlled synthetic import must be explicitly approved before changing localStorage. No screen-reader work in present scope, no merge/deploy/publication/financial operations. Five-day original plan and all fail-closed financial flags unchanged.


## 2026-11-13 — continued Day 4 boundary gate (independent exact-SHA limited execution)
- Starting work branch/PR #164 head `ab00cdfb9277cc95e697446b0fa69cf02e696f7b` was verified OPEN/non-Draft/unmerged. Exact-head `fetch_commit_workflow_runs` returned **0 PR runs** and `get_commit_combined_status` **0 status records**; GitHub CI of the new test remains `UNVERIFIED`, not PASS or FAIL.
- Read `index.html`, `sw.js`, `tests/day4-public-subscription-boundary.test.cjs`, and four `server/` payment/auth modules **directly at the immutable SHA**. Independently executed the new boundary conditions in JavaScript against fetched source: 57 first-party HTML script declarations, 85 service-worker asset declarations, 4 server modules, and the 9 import-pattern adversarial fixture strings. Public asset names/path guards, prohibited browser context in server modules, verified provider event guards and parametrized auth query checks, and 6 forbidden/3 permitted import patterns all passed in this **narrow source-assertion execution** (zero failed assertions).
- This did **not** fetch/run every referenced JS file again, and is **not** execution of the entire Node test file, Smoke suite, browser CI, PSP, or real app workflow. Prior 57/57 source inventory is preserved without repetition. Attempted `git ls-remote` from local Node v22.16.0 container, but `github.com` could not resolve; no checkout/full Node result was claimed. Connector has no workflow_dispatch action. Existing `tests/day4-public-subscription-boundary.test.cjs` remains wired exactly once in `.github/workflows/smoke-tests.yml`; no new product/test code change warranted by this inspection.
- PR #166 Android remains separate OPEN/Draft at `42a0ae602a158d4c04ab67f9a1801fe8637c1ec7`, with prior exact-SHA 11/11 successful PR workflows; Issue #167 remains OPEN. Device-native saved callback and full PWA restore remain UNVERIFIED; do not duplicate existing Samsung synthetic Save/preview steps.
- **Single next gate:** obtain the actual GitHub Actions Smoke run/check for **the final updated PR #164 head SHA** and inspect whether `node --test tests/day4-public-subscription-boundary.test.cjs` executed. If none is available, leave full CI UNVERIFIED; do not fabricate green status or rerun old device tests. Any further documentation commit changes HEAD, so recheck that exact new SHA.
- Five-day plan unchanged; `DAY4_FULL_ACCEPTANCE=false`, `REAL_PWA_BACKUP_UNVERIFIED`, `MARKET_RELEASE_BLOCKED`, `day3FinalAccepted=false`, `historyBasisAuthenticated=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`. No merge, deploy, publication, real holdings, stored backup restore, payment, trade, order, signal enablement or asset mutation.


## 2026-11-13 — Day 4 non-duplicate regression coverage: service-worker-only script
- Rechecked live PR #164 from prior HEAD `510ca5d78afacbaa67458e6c937489f8850f5d09`: OPEN/non-Draft/unmerged. PR #166 stays separately OPEN/Draft on `feta` at `42a0ae602a158d4c04ab67f9a1801fe8637c1ec7`; Issue #167 OPEN. Prior exact-head CI for PR #164 returned zero PR workflows and zero combined statuses, so full CI remained UNVERIFIED.
- Found a **specific nonduplicate test-coverage gap** in `tests/day4-public-subscription-boundary.test.cjs`: its content-import scan read only `index.html` script sources (57), while the current Service Worker lists **one additional first-party JS file** `portfolio-pilot-v51.js` not directly loaded by index. The existing first test checked SW asset *paths* but did **not** scan this JS file's imports.
- Narrow test-only fix committed at `3e6063b44d7f2530629bd92da7c4e92d904c33f6`: the second test now derives `cachedScripts=workerAssets.filter(asset=>asset.endsWith('.js'))` and scans the deduplicated union of HTML scripts plus SW JS, preserving existing filename validation, file-presence assertion and forbidden `SERVER_MODULE_IMPORT` matcher. This expands source import-coverage from **57 to 58 unique JS files** without altering any public PWA file, production backend, SW cache, user data or Android code.
- Independent exact-commit source recheck verified new loop present and fetched `portfolio-pilot-v51.js` (31,269 source characters), which has **zero** direct forbidden `SERVER_MODULE_IMPORT` pattern matches. 57 HTML scripts + 1 SW-only JS = 58 union members; source-focused check PASS. This is **not** a full Node test, CI job, penetration test or PWA/runtime acceptance. Local `git ls-remote` could not resolve `github.com`; no full checkout or complete Node test execution claimed.
- Exact code SHA `3e6063b...` GitHub PR workflow query returned **0 runs**, combined status returned **0 records**. `DAY4_PUBLIC_BUNDLE_IMPORT_SCOPE=58_OF_58_DECLARED_JS_PATHS_COVERED_IN_TEST_SOURCE`; `DAY4_BOUNDARY_TEST_FULL_CI=UNVERIFIED`. Do not inherit green from past commits.
- **Only next gate:** obtain a GitHub Actions Smoke execution for the *latest documentation-final PR #164 SHA*, inspect the actual `node --test tests/day4-public-subscription-boundary.test.cjs` step and its result; if not available, keep CI UNVERIFIED. Do not rerun prior Android Save/preview, change `feta`, introduce live payment, or move roadmap milestones.
- All fixed restrictions remain: original five-day plan unchanged; `DAY4_FULL_ACCEPTANCE=false`, `REAL_PWA_BACKUP_UNVERIFIED`, `MARKET_RELEASE_BLOCKED`, `day3FinalAccepted=false`, `historyBasisAuthenticated=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`. No merge, deploy, market publication, billing, trade, order, real holdings mutation or signal enabling.


## 2026-11-13 — independent CI discovered in existing Draft PR #168 (do not duplicate)
- This session revalidated live PR #164 HEAD `a8e348b27675ab67ee7d5781792bb5ec7ecad139` (OPEN/non-Draft/unmerged): its exact-SHA PR workflow lookup returned **0** runs and combined commit statuses returned **0** records; therefore CI for the **current extended 58-script test** remains `UNVERIFIED`.
- Discovered previously existing, independent Draft [PR #168](https://github.com/Raminhashemi1/sahamban/pull/168), `test/day4-subscription-boundary-isolated-20261113` targeting main, SHA `45426f4b923fa1c56f31b1f135b87db9b9405e93`. Exact-head PR workflow query returned **11/11 completed SUCCESS**; [Smoke run #43482222334](https://github.com/Raminhashemi1/sahamban/actions/runs/43482222334) contains completed/success `smoke` job #132081329845. Inspecting its actual step list confirmed **`Run node --test tests/day4-public-subscription-boundary.test.cjs`: completed/success**. This proves the baseline standalone Node test really ran in GitHub CI on **PR #168's SHA**; do not request duplicate execution of that identical baseline.
- Compared the two immutable test blobs: PR #168 SHA has blob `76ba5dcd6419fcc675ba17f50e79b11a1e6d9a87` (3,689 chars), while current PR #164 has blob `20795d5c6d2b0f74eec9d09656ecbfd1e09cc456` (3,944 chars). Both contain the same four test categories and adversarial fixtures; PR #164 additionally scans the deduplicated `index.html` + Service Worker JavaScript set, covering 58 current first-party JS paths rather than just 57 HTML script paths. The extra SW-only `portfolio-pilot-v51.js` was read directly at an immutable work SHA, with no prohibited direct `SERVER_MODULE_IMPORT` pattern. **PR #168's green CI cannot be transferred to the 58-script revision.**
- Verified PR #166 `feta` remains OPEN/Draft/unmerged at `42a0ae602a158d4c04ab67f9a1801fe8637c1ec7`; Issue #167 OPEN. Existing limited Samsung synthetic Save/preview are not repeated. No user data, live Android Restore or new APK, paid access, real payment, trade, order, merge, deploy or market publication.
- **Corrected evidence labels:** `DAY4_SUBSCRIPTION_BOUNDARY_BASELINE_CI=PASS_PR168_SHA_45426f4`; `DAY4_SUBSCRIPTION_BOUNDARY_58_SCRIPT_EXTENSION_CI=UNVERIFIED_PR164_SHA`; `DAY4_FULL_ACCEPTANCE=false`; `REAL_PWA_BACKUP_UNVERIFIED`; `MARKET_RELEASE_BLOCKED`. The five-day plan and `day3FinalAccepted=false`, `historyBasisAuthenticated=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false` remain unchanged.
- **Single next remaining technical dependency:** obtain an exact-HEAD GitHub Actions Smoke run of the current PR #164 after this documentation checkpoint and verify the 58-script extension's `node --test` step. GitHub connector exposes reads/reruns but no workflow_dispatch action; no fake run is claimed. Separate mobile/financial acceptance gates still require evidence and any release needs owner's explicit authorization.


## 2026-11-13 — evening closure of the isolated 58-script public/server boundary CI
- Confirmed in live GitHub that separate existing [Draft PR #168](https://github.com/Raminhashemi1/sahamban/pull/168) at SHA `f92503d99d896f46379972e3556407659319fba1` produced **11/11 matching-head PR workflows completed SUCCESS**, including [Smoke #43493422852](https://github.com/Raminhashemi1/sahamban/actions/runs/43493422852). The Smoke job `132120202364` and browser job `132120201846` succeeded. GitHub's individual step records explicitly show `node --test tests/day4-public-subscription-boundary.test.cjs` completed SUCCESS; this is the updated **58-script** test, not the older 57-script PR #168 baseline.
- Definitive narrow milestone: `DAY4_SUBSCRIPTION_PUBLIC_SERVER_BOUNDARY_REGRESSION=PASS_EXACT_SHA_f92503d`. The earlier `UNVERIFIED` label for this specific isolated test is superseded, but the latest **PR #164 work head itself** still has no matched workflow records, so do not claim all PR #164 CI green. Green applies only to the exact PR #168 SHA.
- Evidence and the precise successor action were committed to `DAY4-ISOLATED-58-SCRIPT-CI-HANDOFF-20261113.md` on PR #168. Work branch and Android branch were not merged or deployed. Android `feta` PR #166 remains OPEN/Draft and Issue #167 OPEN; already recorded Samsung synthetic Save/preview is not re-run.
- `DAY4_FULL_ACCEPTANCE=false`, `REAL_PWA_BACKUP_UNVERIFIED`, `MARKET_RELEASE_BLOCKED`, plus `day3FinalAccepted=false`, `historyBasisAuthenticated=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`. Original five-day plan unchanged; no payment, trade, signal enablement, holdings mutation, merge, Pages deploy, APK or publication.
- **One next action:** await separately authorized, non-destructive synthetic Android acceptance evidence for the still-unverified end-to-end PWA restore in existing PR #166; do not redo the now-green isolated subscription boundary test or previously completed physical Save/preview. Never request real portfolio backup or clear user storage.
