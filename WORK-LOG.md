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
