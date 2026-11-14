# نقطهٔ کنترل ادامهٔ پروژه سهام‌بان — 2026-11-14 (اصلاح‌شده)

این سند مرجع ادامهٔ کار است و یافتهٔ اشتباه قبلی دربارهٔ شناسهٔ تعدیلات را صریحاً پس می‌گیرد.

## وضعیت شاخه‌ها و PRها
- مخزن: `Raminhashemi1/sahamban`
- شاخهٔ کاری قدیمی: `feat/day2-history-basis-gates-20261109`
- PR #164: باز، non-Draft، ادغام‌نشده و از نظر GitHub `mergeable=false / dirty`. در مقایسه با `main` فعلی، 624 commit جلو و 168 commit عقب است. گزارش‌ها و checkpoint این شاخه اصلاح شده‌اند؛ SHA و CI دقیق آن را در هر ادامه زنده استعلام کن. آن را merge نکن و تاریخچه‌اش را بی‌اجازه بازنویسی نکن.
- PR #169: کاندیدای یکپارچه‌سازی تمیز و مستقل، Draft و ادغام‌نشده؛ بر مبنای همان SHA فعلی `main` یعنی `a5c10548904ee0e1cd80169729071d0bb390f606`، `mergeable=true / clean`.
- HEAD فعلی PR #169: `abf725933519901bd70bfea1667b2031884d7c52`.
- CI دقیق HEAD در PR #169: **14/14 Check Runs SUCCESS و 13/13 Workflow Runs SUCCESS**. اجرای Smoke شامل گام `node --test tests/tsetmc-capture-integrity-review-v1.test.cjs) است و با موفقیت تمام شده؛ تست تازهٔ بررسی فایل‌های واقعی هم در همان گام اجرا شده است.
- PR #168: Draft مستقل برای مرز پرداخت/اشتراک؛ PR #166: مسیر Android مستقل، Draft؛ Issue #167 باز. موفقیت CI اندروید یا PR #169، پذیرش واقعی PWA backup/restore را ثابت نمی‌کند.
- `main` تغییر نکرده؛ هیچ PR ادغام نشده، هیچ deploy/release انجام نشده است.

## اصلاح قطعی یافتهٔ شناسهٔ تعدیلات
ادعای قبلی که فایل تعدیلات ۱۵ ردیفی دارای شناسهٔ `25514780181345710` است، اشتباه بود و پس گرفته می‌شود.

فایل‌های دقیق در هر دو شاخهٔ PR #164 و #169 دوباره بازبینی شدند:
- مانیفست: `insCode=25514780181345713`.
- تاریخچهٔ روزانه: 500 ردیف، شناسهٔ قابل مشاهدهٔ هر ردیف `25514780181345713`.
- تعدیلات: 15 ردیف، شناسهٔ خام JSON در تمام ردیف‌ها `25514780181345713`.
- فایل تعدیلات در هر دو شاخه Git blob SHA یکسان دارد: `341d031b7693efacab02d6b602887498efa7674d`.
- مانیفست برای فایل تعدیلات SHA-256 برابر `9363ac67e70d2b86c398d46b4d33dc4e623df35132bef8b0417e7087be6c5cdd)، اندازه 2,076 بایت و 15 ردیف ثبت می‌کند.
- بنابراین `FIN-05=NO_COMMITTED_ROW_ID_MISMATCH`. هیچ crosswalk بین ...710 و ...713 برای توضیح این فایل‌ها لازم نیست. گزارش‌ها و یادداشت‌های قدیمی که خلاف این را گفته‌اند اصلاح شده‌اند و کامنت تصحیح در PRهای #164 و #169 درج شده است.

## تست واقعی artifact
- در PR #169، commit `abf725933519901bd70bfea1667b2031884d7c52` یک regression test اضافه کرد که مانیفست، فایل روزانهٔ واقعی و فایل تعدیلات واقعی commit‌شده را می‌خواند و با verifier موجود بررسی می‌کند.
- تست انتظار دارد `RAW_BYTES_MATCH_MANIFEST_FOR_REVIEW)، شمار ردیف‌های 500 و 15، و تمام پرچم‌های مالی/اعتبارسنجی false باشند.
- این تست در Smoke دقیق همان HEAD اجرا شد و موفق بود؛ 14/14 check و 13/13 workflow نیز موفق‌اند.
- نتیجه فقط سازگاری artifactهای ذخیره‌شده (بایت/هش/ساختار/شناسهٔ ردیف‌ها) را تأیید می‌کند؛ احراز اصالت منبع زندهٔ TSETMC یا اعتبار مبنای تعدیل را ثابت نمی‌کند.

## وضعیت مالی و داده
- `sourceAuthenticated=false`
- `historyPriceBasisVerified=false`
- `capitalActionsVerified=false`
- `threeModesVerified=false`
- `entryEligible=false`
- `tradingSignalsEnabled=false`
- `day3FinalAccepted=false`
- مقایسهٔ عددی 14/15 رویداد مورخ 2026-11-11 همچنان تشخیص عددی/تاریخی است؛ نه احراز اصالت منبع، نه اثبات کامل بودن اقدامات شرکتی و نه مجوز معامله.
- گزارش‌های اصلاح‌شده: `evidence/day3/vasakht-instrument-identity-discrepancy-20261114.md`, `evidence/day3/FIN-06-adjustment-id-crosswalk-research-20261114.md`, `evidence/day3/FIN-07-adjustment-id-fail-closed-verifier-audit-20261114.md`.
- هیچ قیمت، فایل خام، مانیفست، ردیف تعدیل، دارایی یا قانون verifier تغییر نکرده است.

## قدم بعدی
1. PR #169 را به‌عنوان مسیر ادغام فنی تمیز نگه دار؛ Draft بماند تا مالک صریحاً بررسی و اجازه دهد. آن را خودکار merge نکن.
2. برای گیت مالی، به‌جای دنبال کردن اختلاف شناسه‌ای که در artifactهای ذخیره‌شده وجود ندارد، روی احراز مستقل منبع TSETMC و اثبات مبنای تاریخی تعدیلات/کامل بودن capital actions کار کن. شبکه/دادهٔ provider-origin معتبر لازم است؛ منابع ثالث مهندسی معکوس به‌تنهایی کافی نیستند.
3. هیچ سیگنال، سفارش، معامله، پرداخت، تغییر holdings، انتشار یا deploy انجام نشود.

## اسناد مرجع
- `PROJECT-STATE.md`
- `HANDOFF.md`
- `MASTER-PLAN.md` و `DECISIONS.md`
- سه گزارش اصلاح‌شدهٔ بالا
- PR #169 و تست دقیق artifact در HEAD یادشده

«پروژه سهام‌بان را از PR #169 ادامه بده؛ وضعیت CI دقیق HEAD را دوباره استعلام کن. PR #164 را merge یا rebase نکن. گیت‌های احراز منبع و مبنای قیمت تاریخی همچنان بسته‌اند. هیچ اقدام مالی یا انتشار بدون اجازه انجام نده.»


## آخرین بازبینی پس از اصلاح
- PR #164 هنوز OPEN/non-Draft و `mergeable=false`; exact-head check-runs و workflow-runs روی آخرین SHA آن صفر بود. نتیجه CI مربوط به PR #169 را به #164 تعمیم نده.
- PR #169 هنوز OPEN/Draft و `mergeable=true`; HEAD `abf725933519901bd70bfea1667b2031884d7c52`، 14/14 checks و 13/13 workflows موفق.
- PR #169 smoke step برای تست واقعی artifact `tests/tsetmc-capture-integrity-review-v1.test.cjs` SUCCESS است. تمام trust/financial flags در خروجی verifier false می‌مانند.


## جزئیات اجرای تست واقعی artifact
- لاگ واقعی GitHub Actions برای PR #169، Smoke run `43576639513`، job `132392187965` بررسی شد. تست `tests/tsetmc-capture-integrity-review-v1.test.cjs` شامل **21 PASS و صفر FAIL** بود.
- تست جدید `verifies the exact committed Vesakht raw captures against their manifest without granting financial trust` صریحاً در لاگ `ok 21` ثبت شده است.
- این PASS فقط سازگاری artifact ذخیره‌شده را تأیید می‌کند؛ احراز provider یا مبنای تعدیل نیست. همهٔ گیت‌های مالی همچنان false هستند.


## 2026-11-14 — live GitHub recheck and cross-lane handoff (supersedes stale counts above)

### Exact active-branch state
- Re-read all six memory documents, `NEW-CHAT-START.md`, and `DAY4-BASELINE-DUPLICATE-INVENTORY-20261113.md` from this branch; Android acceptance/runbook/memory records were separately re-read from `feta`.
- Current PR #164 HEAD before this documentation update: `5a40d9c3cb6446517415565193f93880e58ee271` (commit message: `docs: add exact artifact test log result to checkpoint`). Its latest commit changes only `CURRENT-CHECKPOINT-20261114.md`; no product code or tests changed in that commit.
- Live compare against `main` `a5c10548904ee0e1cd80169729071d0bb390f606`: PR #164 branch is `diverged`, **633 commits ahead / 168 behind**, with 102 changed files; PR is OPEN, non-Draft, unmerged, `mergeable=false`. This supersedes the earlier 624-ahead count. Do not merge, rebase, force-push or transfer work without explicit approval.
- Exact current PR #164 SHA `5a40d9c...`: combined status empty, **0 Check Runs**, **0 PR workflow runs**. Classify exact-head CI as `UNVERIFIED_NO_CHECK_EVIDENCE`, not PASS or FAIL. The connector has no workflow-dispatch action; there is no existing run to rerun. Do not manufacture a run or attach historical green CI to this SHA.
- Public `main` remains `a5c10548904ee0e1cd80169729071d0bb390f606`; no merge or deployment occurred.

### Current clean integration candidate
- PR #169 remains OPEN/Draft/unmerged, `mergeable=true`, clean against the current main SHA; HEAD `abf725933519901bd70bfea1667b2031884d7c52`, 6 commits ahead and 0 behind, 100 changed files.
- Exact HEAD CI rechecked live: **14/14 Check Runs SUCCESS and 13/13 PR workflow runs SUCCESS**. Smoke job `43576639513` completed successfully; its step `node --test tests/tsetmc-capture-integrity-review-v1.test.cjs` completed SUCCESS. The committed-artifact test's recorded output is 21 PASS / 0 FAIL.
- This only proves the committed raw capture artifacts match the manifest and strict review-only verifier. It does not authenticate TSETMC origin, historical adjustment basis, corporate-action completeness, or financial readiness. PR #169 stays Draft pending owner review; do not merge.

### Android PR #166 / Issue #167 — separate branch, no duplicated work
- PR #166 remains OPEN/Draft/unmerged on `feta`, exact HEAD `7b1f881dc2e99c2d421cfb6027a75cbff0f45a50`; exact-head **12/12 Check Runs SUCCESS and 11/11 PR workflow runs SUCCESS**. The latest commit is documentation-only and records green CI plus bridge audit.
- Issue #167 remains OPEN. The current Android acceptance log records owner-confirmed presence of `sahamban-local-backup-v1.json` after the PWA local-backup UI reported one section. This is only UI success + file-presence evidence; it is **not** independent native `saved` callback/hash proof, confirmation of all expected backup keys, or a restore result.
- Existing synthetic local/risk SAF roundtrips, cancellation no-false-PASS, and offline fixture evidence must not be repeated. Dedicated TalkBack/VoiceOver work is out of current owner-defined scope and must not be requested. Latest Android source review found and fixed ambiguous trusted-navigation path traversal on `feta` (code SHA `310291d...`); its regression is included in the current green PR #166 CI. Native export path static re-audit found no new concrete defect.
- `REAL_PWA_BACKUP_UNVERIFIED`, `PHYSICAL_DEVICE_FULL_ACCEPTANCE_UNVERIFIED`, `MARKET_RELEASE_BLOCKED` remain. Do not ask for the same export, select/preview the same backup again, access backup bytes, restore real data, install another APK, clear app/browser data, merge or deploy. Any new physical gate or observability code requires a narrowly scoped explicit authorization.

### Financial and roadmap invariants
- `sourceAuthenticated=false`, `historyPriceBasisVerified=false`, `capitalActionsVerified=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`, `day3FinalAccepted=false`.
- FIN-05 correction stands: all 15 committed adjustment rows match `insCode=25514780181345713`; no committed row-ID mismatch exists. Do not revive the withdrawn `...710` assertion. Provider-origin authentication and independent historical basis/capital-action completeness remain open.
- Original five-day `MASTER-PLAN.md` is unchanged. Day 3 bounded engineering completion is not financial acceptance. No signal, trade, order, payment, holdings mutation, merge, deploy or publication.

### Next continuation point
1. Keep PR #164 as the requested audit/work branch, but do not add duplicate product changes to its 633-ahead/168-behind history.
2. Treat PR #169 as the clean technical candidate only; retain Draft status until the owner reviews and explicitly authorizes any merge.
3. The remaining financial prerequisite is new, independently authenticated provider-origin evidence for TSETMC history/adjustment basis and complete capital actions. Secondary reverse-engineered references or green CI are insufficient. Do not rerun already completed artifact-verifier tests.
4. Android remains separate on `feta`; its next work is review-only release/branch reconciliation unless a specific new defect or separately authorized synthetic physical test is supplied.

This entry is a documentation-only live audit. No product source, test, raw capture, financial value, APK, phone state, personal file, portfolio or public deployment was changed. Exact-head CI for the documentation commit created by this entry must be checked independently and must not be inferred from PR #169 or #166.
