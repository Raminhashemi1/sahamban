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


## 2026-11-10 — Second same-session mobile quote observation; publication lag remains

- User supplied a second screenshot from the same published read-only TSETMC mobile diagnostic. Screenshot reports exact public symbol **فولاد**, market date **20261110**, official-endpoint close **4,810 IRR**, last-trade time **10:44:57 Tehran**, status **FRESH**. The previous screenshot showed 10:37:12 and the same reported close. These are TWO independent-in-time user-visible UI observations, **not** independent source attestation; do not treat the status alone as verification of quote price basis or adjusted history.
- Crucially, **20261110 history is still absent** from the separate daily endpoint in the second screenshot. Latest returned record dates: 20261109 / 20261108 / 20261107. The exact report remains `FRESH_QUOTE_HISTORY_PENDING`. Today's quote freshness is observed; full daily-history matching is NOT established. No data rewrite, inference that the missing daily row equals 4,810, capital adjustment or trading signal is permitted.
- GitHub pre-documentation PR #164 head `6527b01cdbf4eabd96a6cd3b4166c08a2717301d` was rechecked and **11/11 GitHub Actions workflows completed SUCCESS** (Smoke run https://github.com/Raminhashemi1/sahamban/actions/runs/42773690799 ; WebKit https://github.com/Raminhashemi1/sahamban/actions/runs/42773690797 ); this is synthetic/software CI and cannot close provider/fee evidence. New documentation commits require independent exact-SHA CI.
- Repeat-mobile-test is **not** the next immediate task. Avoid asking the user to test again until the 20261110 daily record is known to be published; fresh quote connectivity has already been observed. Exact daily-history raw payload and three-mode source attestation remain missing, and a de-identified brokerage fee receipt is also missing. Day 3 continues `IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE`, not COMPLETE.
- No new code, PR merge, deployment, trade or holdings edit. Next single actionable dependency: raw provider daily/history evidence with SHA-256 and independently corroborated row date from a reachable trusted environment, using existing PR #162 capture path where applicable.


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


## 2026-11-10 — Day 3 final acceptance review (not certified complete)

**Reviewed exact branch head:** `b4985aa19a66e188e67823bbb98a1f6f324c6c08` on Draft/open/unmerged PR #164. Re-read all six canonical project memory documents and the Day 3 execution report. No repeated coding or merging. Verified the new `tsetmc-capture-integrity-review-v1.test.cjs` step was completed **SUCCESS** in the Smoke job of run [42775890276](https://github.com/Raminhashemi1/sahamban/actions/runs/42775890276). On latest exact-head snapshot **5 workflows completed SUCCESS and 6 remained in progress** (including the overall Smoke workflow). Hence the full 11-workflow result for this SHA was **NOT FINAL**; any new documentation commit will have its own CI.

**Acceptance matrix (facts vs external prerequisites):**
1. Existing read-only share/right order-cost/round-trip/risk-sized computation and browser integration: **IMPLEMENTED, SOFTWARE-TESTED**. Live broker execution/accounting not asserted.
2. De-identified receipt-comparison adapter `trade-cost-receipt-review-v1.cjs`: **IMPLEMENTED, TESTED**. Actual broker receipt/discount/rounding reconciliation: **NOT PERFORMED**, because no redacted transaction values have been supplied.
3. Public market quote on user's Android browser: **FIELD OBSERVED FRESH** twice on 20261110 for فولاد / 4,810 IRR at 10:37:12 and 10:44:57 Tehran. Independent daily-history comparison: **PENDING** on both observations. This is a device-visible quote, not an original byte-level market-history capture.
4. PR #162 raw response collector: **ALREADY EXISTS in independent unmerged PR**, not duplicated here. New offline byte/JSON/manifest verifier `tsetmc-capture-integrity-review-v1.cjs`: **IMPLEMENTED, DEDICATED TEST STEP SUCCESS** on base SHA; no real original captures available.
5. Independently sourced three adjustment-mode histories (0/1/2), verified source identity and a documented current-date history record: **NOT VERIFIED**. PR #161 adapter and PR #160 classifier are review-only independent PRs and cannot authenticate provenance or permit signals.
6. GitHub-hosted source connectivity: **UNVERIFIED_NETWORK** in preserved smoke artifacts; direct public URL request through the external browsing environment also returned inaccessible. Neither demonstrates TSETMC is globally offline; the phone result demonstrates a network-path difference.

**Final decision:** The original MASTER-PLAN's Day 3 cannot responsibly be marked `COMPLETE` because real-history/adjustment authenticity and brokerage fee reconciliation are mandatory acceptance evidence. Set `DAY3=IMPLEMENTED_SOFTWARE__BLOCKED_EXTERNAL_EVIDENCE`, maintain `UNKNOWN_NOT_ATTESTED`, no entry/sell signals and no merge, deployment, order or holdings modification. **Do not re-run the phone's same FRESH test as a substitute**. Require only: (a) original trusted-network PR #162 raw JSON files + their SHA-256 manifest after the daily row becomes available; (b) authenticated mode 0/1/2 source-bound records; (c) de-identified actual broker receipt figures. After those arrive, use the already-existing verifiers and record exact numerical deltas before final sign-off. The user was not asked to repeat earlier completed tasks.
