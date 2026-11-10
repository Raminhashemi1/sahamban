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
