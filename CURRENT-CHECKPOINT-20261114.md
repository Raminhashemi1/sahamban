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
