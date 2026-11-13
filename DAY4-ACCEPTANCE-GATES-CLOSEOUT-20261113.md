# روز چهارم — جمع‌بندی معیارهای پذیرش و مانع‌های باقی‌مانده (۲۰۲۶-۱۱-۱۳)

**دامنه ثابت برنامه اصلی:** تکمیل رابط کاربری، تست موبایل و بررسی امنیت و اشتراک. این سند صرفاً شواهد را دسته‌بندی می‌کند و پایان کامل روز چهارم، شروع روز پنجم، Merge، Deploy، عرضه پولی یا معامله را مجاز نمی‌کند.

## مرجع وضعیت دقیق

- شاخه اصلی کار: `feat/day2-history-basis-gates-20261109`، PR #164 باز/غیر Draft/ادغام‌نشده؛ SHA بررسی‌شده `f7e1eb395c523c34ea2920c355d783e988742925` با **۱۴/۱۴ Check و ۱۳/۱۳ Workflow SUCCESS**.
- اندروید: شاخه مستقل `feta`، PR #166 باز/Draft/ادغام‌نشده؛ SHA بررسی‌شده پیش از سند `42a0ae602a158d4c04ab67f9a1801fe8637c1ec7`، **۹/۱۲ Check SUCCESS و ۸/۱۱ Workflow SUCCESS** و مابقی IN_PROGRESS، شکست مشاهده نشده. برای نتیجه سبز قطعی، وضعیت همان SHA دوباره استعلام شود.
- `main` منتشرشده در `a5c10548904ee0e1cd80169729071d0bb390f606` بدون تغییر؛ Issue #167 باز. مدرک جزئی Android در `feta/ANDROID-TEST-ACCEPTANCE-2026-11-12.md` و طرح مستقل `feta/ANDROID-ISOLATED-PWA-ACCEPTANCE-DESIGN-20261113.md`.
- تغییرات مستندسازی پس از این بررسی باید با SHA خودشان ارزیابی شوند؛ موفقیت تاریخی را به HEAD جدید تعمیم ندهید.

## جدول پذیرش بدون تکرار کارها

| حوزه روز چهارم | شواهد معتبر | نتیجه فعلی / مانع |
| --- | --- | --- |
| UI واکنش‌گرا، راهنمای کاربر و کارت‌ها | Chromium/WebKit، کاربر روی Samsung در نسخه مستقل «ایزوله ۲» صفحه اصلی، ماژول‌ها و قسمت پشتیبان محلی را با تصویر تأیید کرد. | **PASS محدود روی Android برای رندر**؛ پذیرش جامع iOS و مصرف منابع/شبکه ضعیف انجام نشده. آزمون اختصاصی صفحه‌خوان طبق خواست کاربر از محدوده فعلی خارج است؛ نباید PASS اعلام شود. |
| پشتیبان و بازیابی | `feta` دارای PWA آفلاین داخل APK جدا و SAF محدود با `BackupFileVerifier.matches` است. کاربر آبی «دانلود پشتیبان محلی» → Android Save را برای `sahamban-synthetic-test-02.json` انجام داد؛ تصویر بازکردن مجدد و پیش‌نمایش یک بخش معتبر است. | **PASS در جریان ذخیره به تأیید کاربر؛ PASS پیش‌نمایش تصویر**. پیام `saved` همان اجرای گوشی مستقلاً ثبت نشده؛ بایت‌خوانی سخت‌گیرانه در کد و تست خودکار هست، ولی **پذیرش فیزیکی همین callback تأییدنشده**. بازیابی داده در گوشی انجام/مجاز نشده؛ `REAL_PWA_BACKUP_UNVERIFIED`. |
| امنیت محلی | `SECURITY.md` داده مرورگر و JSON را **متن ساده و رمزگذاری‌نشده** اعلام می‌کند؛ کنترل کلیدهای مجاز، بررسی قالب/حجم، درخواست تأیید بازیابی و rollback محدود در `local-backup-v148.js` وجود دارد. تست‌های `tests/reliability-security-v149.test.cjs` و `tests/local-backup-v148.test.cjs` در CI هستند. | **ممیزی فنی و تست مصنوعی PASS در دامنه اجراشده**؛ به معنی ممیزی مستقل امنیتی، محرمانگی در گوشی مشترک یا بازیابی فیزیکی PASS نیست. هیچ فایل شخصی نباید آپلود شود. |
| اشتراک / پرداخت | `server/subscription-entitlements.cjs`، `server/subscription-orders.cjs` و `server/manual-subscription-settlement.cjs` قراردادهای fail-closed و تست‌های سمت سرور دارند؛ رویداد پرداخت باید نزد ارائه‌دهنده یا بانک مستقل و سمت سرور تأیید و با یکتایی تراکنش در DB به‌صورت اتمیک ثبت شود. | **منطق آزمایشی سمت سرور موجود؛ اشتراک واقعی BLOCKED**. احراز هویت حساب، DB تولید، PSP/بانک واقعی، پردازش بازگشت وجه، سیاست قانونی/حقوقی، فروش و استقرار مورد تأیید نیستند. پرداخت آزمایشی/واقعی انجام نشود. |
| کنترل‌های مالی و بازار | روز سوم `DAY3_BOUNDED_ENGINEERING_COMPLETE` تحت DEC-008، نه تأیید اصالت تاریخچه/منبع و نه آمادگی معامله؛ پنج گیت مالی بسته مانده‌اند. | `day3FinalAccepted=false`, `historyBasisAuthenticated=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`; `MARKET_RELEASE_BLOCKED`. |

## تصمیم اجرایی

**نتیجه محدود:** `DAY4_ANDROID_SYNTHETIC_PREVIEW_AND_SAVE_FLOW_EVIDENCED`، `DAY4_WEB_AUTOMATION_CI_AVAILABLE`، `DAY4_SECURITY_SUBSCRIPTION_CODE_REVIEWED`.

**نتیجه کامل:** `DAY4_FULL_ACCEPTANCE=false`. پذیرش فیزیکی iOS، فراگیری کامل بازیابی و امنیت مستقل و اشتراک تجاری هنوز مدرک کافی ندارند. اصل برنامه پنج‌روزه تغییر نکند؛ روز پنجم را صرفاً با سبز بودن CI آغاز/تمام‌شده ندانید.

**گام غیرتکراری بعدی:** بدون آزمایش مجدد گوشی، گزارش این مانع‌ها و تفکیک کار واقعاً انجام‌شده را در مدارک handoff نگه دارید. اگر مالک بعداً اجرای APK جدید را جداگانه مجاز کرد، تنها یک نشانگر ماندگارِ غیرحساس `saved/failed/cancelled` در نسخه **ایزوله و ساختگی** می‌تواند برای مشاهده callback در گوشی مفید باشد. تا آن مجوز، ساخت/نصب جدید و بازیابی انجام نشود. هیچ تغییری در سایت عمومی یا `main`، انتقال کد `feta` به PR #164، Merge، Deploy، صدور اشتراک، سیگنال/سفارش و داده مالی انجام نشده است.


## 2026-11-13 — payment-code isolation regression (no PSP or account activity)
- On the main work branch only, added **`tests/day4-public-subscription-boundary.test.cjs`** in commit `5191daae74d70c0d892cc6af080b70def083f801`, then wired its execution into the existing `Sahamban smoke tests` workflow at `.github/workflows/smoke-tests.yml` in commit `7c597dfdfab87d39728c7c37046a8264c7161191`.
- This narrow regression enumerates public HTML script sources and service-worker cached asset declarations, rejects server/payment/entitlement/checkout bundle paths, checks referenced first-party scripts exist, looks for direct imports of server-only modules in those public scripts, and checks the server payment/entitlement/authentication functions preserve their verified-backend-only requirements. It **does not** call a PSP, create an account, grant entitlements, simulate a real bank settlement, or assert that client-side parsing alone proves backend security.
- Historical green CI before these changes: PR #164 `cd831a1522b7f397c12b765c6fc05b55cff41f96` had **14/14 checks and 13/13 workflow runs SUCCESS**. PR #166 / feta `42a0ae602a158d4c04ab67f9a1801fe8637c1ec7` had **12/12 checks and 11/11 workflows SUCCESS**; Issue #167 remains OPEN. The standalone test source SHA `5191daae...` had a successful existing Smoke job when checked, but the **newly wired test only runs on or after `7c597df...`**; obtain an exact-head test/CI result before claiming it passed. GitHub Actions might not have recorded a workflow run yet for the wiring SHA.
- `DAY4_SUBSCRIPTION_PWA_BOUNDARY_TEST=ADDED_CI_PENDING`; `DAY4_FULL_ACCEPTANCE=false`, `MARKET_RELEASE_BLOCKED`. No public `main` or Android `feta` implementation changes, merge, deploy, accounts, bank, payments, holdings, trading, or change to the five-day roadmap.
