# سهام‌بان — دفتر اجرای کار (append-only)

این فایل برای شواهد واقعی کار است، نه شرح اقدامات فرضی. آخرین گزارش فشرده در [PROJECT-STATE.md](PROJECT-STATE.md) و دستور تحویل در [HANDOFF.md](HANDOFF.md) قرار دارد.

## 2026-11-09 — مرور کار ثبت‌شده روز دوم

- PR فعال: https://github.com/Raminhashemi1/sahamban/pull/164
- Commit `a2328a5bd79a84077d61feb18a560b5dcac8654a`: محافظ داخل موتور `analyze` برای قیمت تاریخی تأییدنشده.
- Commit `c21aa0c0abf7ff86ed234d3df69d6ececcf2daee`: تست مسیر مستقیم موتور.
- Commit `2da4254a3c112eda2c47b9f0de2446ada2cb1906`: تست تداوم وضعیت انسداد در برنامه تصمیم و خروجی گزارش.
- Commit `ec2f16ec1c5292e33daf011d9a5bb11e118e96e8`: معیارهای مستند احراز مستقل مبنای قیمت.
- Commit `27ab1cfa70182e475c3ad0dd4778f989b1bc3b7d`: ایجاد سند اولیه تداوم پروژه.
- Commit `cd7b072b0368f110c445ac0eeff030de8bcc51ab`: لینک به سند تداوم در README.
- Commit `fbe078f72a4d337e0a3834c73ea4e208d4a6d59a`: ثبت گزارش توسعه حافظه و تحویل.
- مشاهده: CI برای `fbe078f7` شامل شکست Smoke و موفقیت برخی گردش‌کارها بود؛ نباید به‌عنوان CI سبز کامل گزارش شود.
- شواهد شکست قبلی: https://github.com/Raminhashemi1/sahamban/actions/runs/42676272530 (گام prospective-signal-ledger).
- ادعای تأیید مستقل واقعی TSETMC یا merge/deploy وجود ندارد.

## 2026-11-09 — تفکیک حافظه اجرایی

- اقدام: ایجاد فایل‌های `MASTER-PLAN.md`، `PROJECT-STATE.md`، `DECISIONS.md`، `WORK-LOG.md`، `HANDOFF.md` بر اساس شواهد موجود؛ **نه** بازسازی حدسی برنامه پنج‌روزه.
- اسناد با وضعیت واقعی و PR164 پیوند می‌یابند و پس از ثبت باید head جدید و CI از GitHub خوانده شوند.
- هیچ تغییر کد معاملاتی، ادغام، انتشار یا تغییر دارایی در این اقدام در نظر گرفته نشده است.

## الگوی ورودی بعدی

### YYYY-MM-DD — عنوان
- شروع SHA → پایان SHA:
- PR / شاخه:
- فایل‌های تغییرکرده و هدف:
- تست‌ها (نام، SHA، نتیجه، URL):
- شواهد واقعی / موارد نامشخص:
- تصمیم و تأیید مورد نیاز:
- **فقط یک کار بعدی:**

## 2026-11-09 — cross-session readback rehearsal (same chat; not a new-chat test)

- Read `HANDOFF.md`, `MASTER-PLAN.md`, `PROJECT-STATE.md`, `PROJECT-CONTINUITY.md` from the PR164 branch using a fresh repository fetch, without relying on prior chat explanations.
- Recovered: repo `Raminhashemi1/sahamban`, branch `feat/day2-history-basis-gates-20261109`, Day 2 historical price-basis gates, PR164 Draft, unresolved Smoke CI failure, live three-mode validation not completed, roadmap days 1/3/4/5 not verified.
- Confirmed PR head for this rehearsal: `16a17fc8dc3d3bc327869db43906e39660a9641b`, OPEN / DRAFT / not merged.
- Exact-head CI observed: 9 success, 1 failure (Sahamban smoke tests: https://github.com/Raminhashemi1/sahamban/actions/runs/42682075393), 1 in progress (Portfolio pilot mobile safety: https://github.com/Raminhashemi1/sahamban/actions/runs/42682075237). This observation becomes historical after this log commit; verify new head live.
- Readback checks PASSED in the current chat. **An actual brand-new conversation has not yet been tested**, and its external GitHub access must still be verified.
- No roadmap reconstruction, code changes, merge, deployment or market-data attestation. Next user input required for roadmap completion: the original five-day plan text or a source reference.


## 2026-11-09 — restoration of the original five-day roadmap

- Source: user-supplied screenshot of the original five-day table in the current conversation.
- Day 1: review existing capability connections, data validity and unfinished work.
- Day 2: complete missing connections between analysis engine, ranking and decision assistant.
- Day 3: real market-data tests, buy/sell calculations and high-priority bug fixes.
- Day 4: UI completion, mobile tests, security and subscription review.
- Day 5: final testing and a usable build for pilot users.
- Updated MASTER-PLAN.md at commit `ab58e6817148645051a52cc601c0b251301a4ee8` without changing the order or inferring completion of any day.
- Day 2 historical price-basis safeguards/PR164 are a subtask, not a replacement for the complete day-two objective.
- No code, trades, deployment or merge performed as part of this roadmap restoration.


## 2026-11-09 — Day 2 engineering closeout; handoff to real-data validation

- Branch: `feat/day2-history-basis-gates-20261109`; PR #164 remains Draft, not merged/deployed.
- Starting roadmap/document head: `3e00e33f8bb7e555e061cc10ed1c2ed0ec4935b7`.
- Commit `23bb57ffe93e7d949d348360f295f90fe3b756ad`: repaired prospective-signal-ledger synthetic fixture to supply explicitly attested **synthetic** basis in positive tests, added negative cases for missing/unknown/self-attested basis. No live source status was upgraded.
- Commit `959f69926d068740bb6defcd403187880f7d92fd`: fixed fixed-rule-evaluator test assumptions and added no-action regression for unverified basis.
- Commit `5dbccc48846354592cee756798f67da24a3b0ca6`: core `decisionPlan` safely accepts `DATA_BASIS_UNVERIFIED` reports for `NO_ACTION` and audit export without accidentally enabling review/trade outcomes.
- Root-cause investigation: earlier Smoke failed on prospective ledger because v129 now fails closed for unattested series. Subsequent CI exposed the fixed-rule-evaluator test assumption, then the actual audit-export incompatibility; addressed without bypassing the guard.
- **Exact code SHA CI:** `5dbccc48846354592cee756798f67da24a3b0ca6`, **11/11 GitHub workflows SUCCESS**, zero failed; verified through workflow runs for that exact SHA. Smoke (including Chromium browser): https://github.com/Raminhashemi1/sahamban/actions/runs/42684555862 ; WebKit: https://github.com/Raminhashemi1/sahamban/actions/runs/42684555936 ; mobile: https://github.com/Raminhashemi1/sahamban/actions/runs/42684555869 .
- Day 2 **software integration and regression-test work** is closed out as evidenced above. This does **not** mean independent provider authentication, true three-mode source validation, financial readiness or permission to trade has been attained.
- Mandatory carryover aligned to the original Day 3 master-plan goal (testing real exchange data): independently capture TSETMC mode 0/1/2 with exact provenance and validate action events; implement trusted source-evidence boundary. These are NOT complete; the system must remain fail-closed. Preserve original limitations until separately verified.
- Documentation-only commits after the tested code SHA do not inherit exact-head success automatically. The next chat must check live head/CI again.
- **Next single task:** in a new conversation, read HANDOFF + MASTER-PLAN and live PR/CI, then begin evidence-based real TSETMC three-mode capture/validation; do not infer authenticity from a mere adjustment flag.


## 2026-11-10 — Day 3 started: live-market evidence review and fee-aware calculations

- Confirmed original Day 3 objective from MASTER-PLAN.md: real exchange data tests, buy/sell calculations, important bug fixes.
- Inspected PR #164 current branch history and live-market diagnostics. The latest available live monitor artifact (run 42670042240, 2026-11-09 18:00Z) reports `UNVERIFIED_NETWORK`, `UND_ERR_CONNECT_TIMEOUT` to `https://cdn.tsetmc.com/api`. The PR smoke artifact from run 42685215334 (2026-11-09 19:38Z) reports the same timeout. The after-close artifact run 42624494977 reports both CDN and WebGW `UNVERIFIED_NETWORK` due `UND_ERR_CONNECT_TIMEOUT`. This is runner network failure, not proof of TSETMC outage or user-device failure.
- Added `trade-cost-v1.js`: read-only ceiling estimate for ordinary shares/rights; per-component fees/caps, purchase settlement, sale net proceeds, round-trip P/L and risk-sized quantity respecting purchase budget and after-fee stop-loss risk. No order placement, account access or portfolio mutation.
- Added `tests/trade-cost-v1.test.cjs` with 7 local Node tests covering 100m IRR totals (buy 0.3712%, sell 0.88% incl 0.5% sale tax), component caps, round-trip P/L, loss case, unsafe inputs and risk/budget sizing. Local run: 7/7 PASS.
- Integrated calculator into `index.html` / `app.js`, updated calculator explanation and service-worker cache; added Chromium test `tests/trade-cost-v1-browser.cjs` and included both tests in smoke workflow. CI on latest SHA must confirm before claiming integrated test pass.
- Fee schedule basis: brokerage webpage https://idbr.ir/fees, referencing edition 49 (1405/04/27), last updated 1405/06/10. Not a direct regulator source; values are upper-bound estimates, with rounding/discount treatment still requiring validation against official circular and actual broker receipt. ETF rates not included; slippage/liquidity not modeled.
- **Still open:** fresh real TSETMC fetch; independent provenance and true distinct adjustment modes 0/1/2; broker-specific fee reconciliation; actual execution/market impact tests. No trading signal enabled; no order, merge, deploy or holdings change.
- Next action: check exact-head CI and its live-market artifact; if runner still times out, distinguish user-device access using a read-only diagnostic, then gather verifiable 0/1/2 datasets and match buy/sell calculations against broker statements.

## 2026-11-10 — Day 3 follow-up: browser regression, cache integrity and API semantics

- Fixed stale service-worker cache-generation assertions without weakening the lifecycle logic: `b6cbda491472d24e14e8f94a5b4093142b9984ee` (smoke), `adf9aa2165c70b2ef6a152aa174ad88652be549b` (cache-refresh), `93a1c32ce65d1ec5342ed04936db382e42bff6f8` (reliability/security).
- Browser acceptance originally failed because the position-size calculator module was hidden behind the module router. Adjusted Chromium regression to enter `#positionSizeSectionV87` before clicking: `049c366cbb7a4c04158e6400be8f60892e72caac`. Updated the module guide to describe cost-aware calculations: `34b627f6e2334a847e178d8cad929ff325b85441`.
- Third-party API endpoint references indicate `GetClosingPriceDailyList/{insCode}/{Top}` uses `Top=0` for all history, **not** for adjustment mode zero. Never interpret /0,/1,/2 of that endpoint as three adjustment bases. Corrected the source-evidence checklist in `DAY2-HISTORY-BASIS-EVIDENCE-GATES.md` at `af10f58400c86204dcfed5220f3f906a085ce454`. Provider-official semantics still require verification. References: https://github.com/amirziveh/tsetmc-skill/blob/master/references/api-endpoints.md and https://github.com/solitraderbusiness/tsetmc-mcp/blob/main/docs/endpoints.md.
- Real-data status: GitHub Actions artifacts for both TSETMC CDN and WebGW returned `UND_ERR_CONNECT_TIMEOUT`; no authenticated historical basis or 0/1/2 series recovered and no production signal unlocked.
- CI: Smoke job at SHA `34b627f6e2334a847e178d8cad929ff325b85441` successful; other exact-head workflows should be rechecked. Subsequent documentation commits require new-head checking, and no automatic all-green claim is made here.
- **Next action:** inspect latest CI and, on an environment with legitimate read-only TSETMC access, obtain original provider response snapshots and documented adjustment semantics; then match commission rounding against a real broker record without exposing personal account data.

## 2026-11-10 — Continuation: exact-head CI and live probe evidence

- Start technical/doc head: `278d8df64a1dfcb6cb416acf8b18167f91a67556`; PR #164 OPEN/DRAFT/NOT MERGED; branch `feat/day2-history-basis-gates-20261109`.
- Exact-head CI checked on SHA `278d8df64a1dfcb6cb416acf8b18167f91a67556`: Smoke SUCCESS (https://github.com/Raminhashemi1/sahamban/actions/runs/42769444261), 10 of 11 workflows SUCCESS; WebKit mobile acceptance proxy still IN_PROGRESS (https://github.com/Raminhashemi1/sahamban/actions/runs/42769444354) at last poll. Quote-basis/atomicity SUCCESS (https://github.com/Raminhashemi1/sahamban/actions/runs/42769444315). Combined status API yielded no individual statuses, so workflow-run results are cited directly.
- Downloaded and inspected the exact Smoke run artifact `sahamban-live-market-v111-outcome` (artifact ID `13741265949`), `live-market-v111.json`: `checked_at=2026-11-10T06:35:25.340Z`, `symbol=فولاد`, `source=https://cdn.tsetmc.com/api`, `status=UNVERIFIED_NETWORK`, `network_error_code=UND_ERR_CONNECT_TIMEOUT`. This is a GitHub runner connectivity finding, not proof of provider downtime or client-device network status.
- Confirmed PR #156–#164 are separately open in GitHub search, with PR #164 still Draft; no implied integration of other drafts. The `GetClosingPriceDailyList/{insCode}/{Top}` endpoint must not be mistaken for three adjustment modes.
- Read and reconciled all six mandatory memory documents; the older `PROJECT-CONTINUITY.md` historic section 9 Smoke diagnosis is superseded by the latest HANDOFF. Day 3 remains current, while live basis attestation and broker receipt reconciliation remain unverified.
- No code change, signal activation, order, holdings mutation, merge or deployment. Documentation-only commits produced by this checkpoint do not inherit CI validation from the pre-document head.
- **Next single task:** obtain an authentic, read-only TSETMC provider response and documented source semantics from an accessible network (or a safely redacted user-device diagnostic) and capture timestamp, endpoint, HTTP metadata and digest; keep all financial signals fail-closed.

## 2026-11-10 — Day 3 continuation and duplicate-work guard
- Six memory files and PR #164 were re-read at starting head `55a313f3184dfcd1c5f7e8432631206aa9a7b2c0`; the user also supplied screenshots of already completed work, explicitly requiring no duplication.
- CI on the exact starting head `55a313f3184dfcd1c5f7e8432631206aa9a7b2c0` was rechecked: **11/11 workflow runs SUCCESS**; Smoke https://github.com/Raminhashemi1/sahamban/actions/runs/42770118086 , WebKit https://github.com/Raminhashemi1/sahamban/actions/runs/42770118142 , quote-basis https://github.com/Raminhashemi1/sahamban/actions/runs/42770118346 . Subsequent documentation SHAs are not automatically verified by this result.
- Reviewed existing independent, unmerged PR #162 live TSETMC raw-response/SHA-256 collector and PR #161 three-mode response adapter. Neither was rebuilt, integrated or merged. Existing trade-cost calculator was not reimplemented.
- Created `DAY3-REAL-DATA-EXECUTION.md` on the same branch to record the next reproducible read-only evidence step. Prior reported local DNS failure lacked retained direct command output in this session and is explicitly *not* claimed as a newly verified test. GitHub runner prior artifact independently recorded `UNVERIFIED_NETWORK / UND_ERR_CONNECT_TIMEOUT`; real provider bytes were not obtained.
- Scope invariant: no trade, signal activation, user holdings edit, merge, deploy or change to the five-day master plan. Day 3 remains IN_PROGRESS and provider authentication remains NOT_VERIFIED.
- **Next single task:** use the existing PR #162 collector on a reachable trusted network with an independently identified public `insCode` to capture raw provider bytes and SHA-256 manifest for review, only if not already captured in the screenshots/commits. Check previous artifacts first.

## 2026-11-10 — Day 3 completion attempt, evidence-limited
- Starting PR #164 head: `a324e62c37b1057d3023b2f2f41fbf69df4b71c6`, still OPEN/DRAFT/unmerged. Re-read all six memory documents, PR #163 dependency register, independent PR #161 three-mode adapter, PR #162 bounded read-only collector, and prior Day 3 work to prevent duplication.
- Exact start-head CI observed: 9 successful workflows, 2 still in progress (Smoke https://github.com/Raminhashemi1/sahamban/actions/runs/42770635860 and 100-holding https://github.com/Raminhashemi1/sahamban/actions/runs/42770635916); WebKit https://github.com/Raminhashemi1/sahamban/actions/runs/42770636075 SUCCESS. Later documentation heads require their own checks.
- Downloaded run 42770635860 artifact 13741517462 and inspected raw `live-market-v111.json`: checked 2026-11-10T06:46:28.663Z, `UNVERIFIED_NETWORK / UND_ERR_CONNECT_TIMEOUT` from GitHub runner, no response bytes.
- Executed local Python DNS `socket.getaddrinfo`: at 2026-11-10T06:48:23Z `cdn.tsetmc.com:443` failed `gaierror(-3)`; at 06:48:28Z `www.tsetmc.com:443` failed identically. No successful provider HTTP payload; no source authentication. A separate web URL retrieval was also inaccessible.
- Checked third-party endpoint documentation: CDN `Top=0` is all rows, not adjustment mode; library-level `adjustPrices=0|1|2` is distinct. This resolves no financial authenticity or adjustment basis question.
- Existing fee calculator and tests were not rewritten. No real brokerage receipt was provided or reviewed. **Day 3 cannot be certified COMPLETE**: independent real prices/modes and fee reconciliation require authentic external evidence. Recorded execution details in `DAY3-REAL-DATA-EXECUTION.md`.
- No code functionality, order, signal, holdings, deployment, merge or plan scope changed.
- **Single next task:** obtain read-only raw TSETMC artifacts using existing PR #162 collector from a reachable trusted device; then verify independent three modes and a de-identified broker fee receipt. Keep fail-closed.

## 2026-11-10 — exact-head CI closed, live provenance still blocked
- Verified current PR #164 OPEN/DRAFT/unmerged; starting branch head `80b2039596c9c2b5166842f2456b77f8efba092f`. Re-read all six continuity files and current Day 3 evidence log; no prior implemented code was duplicated.
- GitHub Actions on exact `80b2039596c9c2b5166842f2456b77f8efba092f`: **11/11 workflow runs completed SUCCESS**, 0 failures/pending; Smoke https://github.com/Raminhashemi1/sahamban/actions/runs/42771220222 ; WebKit https://github.com/Raminhashemi1/sahamban/actions/runs/42771220085 ; broker safe amounts https://github.com/Raminhashemi1/sahamban/actions/runs/42771220215 . This supersedes the previous running-status snapshot for this SHA only.
- Downloaded and opened exact Smoke artifact `13741204786` from run `42771220222`: `live-market-v111.json`, checked `2026-11-10T06:51:18.043Z`, `UNVERIFIED_NETWORK`, `UND_ERR_CONNECT_TIMEOUT`, URL base `https://cdn.tsetmc.com/api`, public symbol `فولاد`. No raw market-history series or independent attestation.
- Direct public URL lookup was inaccessible from the browsing tool too; it did not yield a verifiable provider response and is not evidence of TSETMC outage.
- Day 3's historical-basis and broker-receipt verification remain **BLOCKED_EXTERNAL_EVIDENCE** despite green CI; no permission to promote basis status, enable signals or mark full completion. No code changes, orders, deployments, merges or holdings mutations.
- **Single next task:** obtain the already-defined PR #162 collector raw JSON + SHA-256 manifest from a trusted device/network with confirmed instrument code; verify before any three-mode or fee reconciliation.

## 2026-11-10 — Day 3 scoped risk review (no duplicate implementation)
- Starting PR164 head `d3ba4a41379359ed25f21e593d692e43fc2dbf25`: exact-head workflow snapshot **10 success / 1 in_progress** (quote-basis run https://github.com/Raminhashemi1/sahamban/actions/runs/42771834142); Smoke https://github.com/Raminhashemi1/sahamban/actions/runs/42771834116 and WebKit https://github.com/Raminhashemi1/sahamban/actions/runs/42771834139 success. A green result of earlier SHA does not supersede this.
- Continued the documented Day 3 external-evidence gate and reviewed existing PR162 collector, not recreating it: its 1 MiB response limit may reject full history of long-lived instruments; third-party July 2026 example reports فولاد ~1.56 MB. No actual fresh provider bytes retrieved. See `DAY3-REAL-DATA-EXECUTION.md` for source and remediation limits.
- Compared publicly published ordinary-share fee schedules: existing brokerage source claims TSE/IFB parity, while other published schedules say IFB buy rate is lower. Without a primary official circular and de-identified executed trade receipt this is an unresolved rate/classification conflict, **not** authorization to silently change the engine.
- Only documentation amended; no change to trading code, collector PR162, adapter PR161, plan, PR state or holdings. Next single task: trusted-network capture using existing PR162 collector and verified instrument identifier, respecting bounded response size; review original response + digest.
