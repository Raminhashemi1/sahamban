# نقطهٔ ادامهٔ کار — PR #187

آخرین به‌روزرسانی: 2026-11-20

## هدف این فایل
این سند برای انتقال گفتگو و ادامهٔ کار در صفحه/گفتگوی جدید است. پیش از هر اقدام، این فایل و وضعیت زندهٔ PR را دوباره بررسی کنید تا از تکرار کار یا فرض اشتباه دربارهٔ شاخه جلوگیری شود.

## مخزن و وضعیت GitHub
- مخزن: `Raminhashemi1/sahamban`
- PR: [#187 — Billing V2: manual Cafe Bazaar time plans (30/60/90/180/365 days)](https://github.com/Raminhashemi1/sahamban/pull/187)
- وضعیت هنگام تهیهٔ این فایل: OPEN و DRAFT؛ هنوز Merge نشده است.
- شاخهٔ PR (head): `codex/reengineering-audit`
- شاخهٔ مقصد (base): `main`
- SHA شاخهٔ PR هنگام تهیهٔ این فایل: `2a1c0c30f16db3a1101f0c40735c9559032358d7`
- آخرین متادیتای دریافت‌شده: 231 commit، 54 فایل، 1,512 افزودن و 1,726 حذف.
- GitHub CLI قبلاً با موفقیت احراز هویت شده و حساب نمایش‌داده‌شده `Raminhashemi1` بوده است.

## تصمیم‌های قطعی محصول
- فقط کافه‌بازار و جریان پرداخت درون‌برنامه‌ای اندروید (Poolakey) در محدوده است.
- تمدید دستی است؛ هر تمدید نیازمند خرید جدید و صریح کاربر است. تمدید خودکار/برداشت خودکار ممنوع است.
- پنج محصول یک‌بارهٔ consumable با مدت ثابت 30، 60، 90، 180 و 365 روز تعریف شده‌اند؛ این‌ها محصول Subscription خودکار نیستند.
- واحد قیمت IRR (ریال) است، نه تومان:
  - 30 روز: 1,500,000
  - 60 روز: 2,850,000
  - 90 روز: 4,050,000
  - 180 روز: 7,650,000
  - 365 روز: 14,600,000
- خرید زودهنگام باید به زمان انقضای فعلی اضافه شود و روزهای باقی‌مانده را از بین نبرد.
- انتخاب Provider باید از سفارش ذخیره‌شده و سمت سرور تعیین شود، نه از پارامتر قابل‌کنترل کلاینت.
- Checkout و پرداخت زنده باید تا تکمیل تنظیمات و تست پذیرش خاموش بماند.

## آنچه از PR و تصاویر ترمینال تأیید شده
- شرح PR، پیاده‌سازی Billing V2 را شامل کاتالوگ پنج‌پلنی، اعتبارسنجی خرید Bazaar، اتصال سفارش/توکن/محصول، تسویهٔ D1، idempotency، تمدید از paid-until، مصرف خرید در Android فقط پس از تسویهٔ سرور، بازیابی entitlement و حالت MANUAL توصیف می‌کند.
- PR فایل‌های قدیمی prepaid/subscription را حذف کرده و تست‌های جدید Billing V2 اضافه کرده است.
- در خروجی فایل‌های PR که کاربر ارسال کرد، نمونه‌های زیر دیده شدند:
  - حذف: `server/prepaid-account-overview.cjs`, `server/prepaid-account-overview.mjs`, `server/prepaid-orders-api.cjs`, `server/prepaid-orders-api.mjs`, `server/prepaid-plans.cjs`, `server/prepaid-settlement.cjs`, `server/subscription-entitlements.cjs`, `server/subscription-orders.cjs`
  - افزودن تست: `tests/billing-v2-bazaar.test.mjs`, `tests/billing-v2-catalog.test.cjs`, `tests/billing-v2-d1.integration.test.cjs`, `tests/billing-v2-feature-gate.test.cjs`, `tests/billing-v2-settlement.test.cjs`, `tests/billing-v2.test.cjs`
  - تغییر: `tests/worker-api.test.cjs`, `tests/worker-local-runtime.cjs`
- در تصویر ترمینال، `gh pr checks 187` گزارش داد: 13 successful، صفر failing، صفر pending و صفر cancelled. این نتیجه مربوط به زمان همان تصویر است؛ پس از commit این فایل باید دوباره وضعیت checkها بررسی شود.
- خروجی `gh pr view 187 --json files` با موفقیت اجرا شد.
- تلاش برای قالب jq و Go template به‌علت کوتیشن/escape در PowerShell خطا داد؛ دستور سادهٔ JSON کار کرد. برای جلوگیری از اتلاف وقت، فعلاً از این دو قالب پیچیده استفاده نکنید.
- در یک تصویر قدیمی‌تر، شاخهٔ محلی `integration/sahmino-billing-v2-dual-store` تمیز و همگام با origin بود؛ اما PR #187 روی `codex/reengineering-audit` است. این دو را یکی فرض نکنید. قبل از هر کار محلی، `git status --short --branch` و `git branch --show-current` اجرا شود.

## موارد باز و موانع انتشار که در شرح PR ثبت شده‌اند
1. تأیید applicationId/package name نهایی اندروید که در Bazaar ثبت می‌شود.
2. ساخت پنج محصول consumable در پیشخوان Pishkhan (نه Subscription) و ثبت Product IDهای واقعی و نگاشت آن‌ها.
3. تنظیم امن کلید عمومی RSA و OAuth/refresh token بازار به‌عنوان Worker secrets؛ هرگز secret را در چت، فایل مخزن یا commit قرار ندهید.
4. تکمیل اتصال هویت/session احراز‌شدهٔ واقعی برای صفحهٔ خرید Native.
5. بازبینی و اعمال schema مربوط به Billing V2 D1 فقط در محیط موردنظر و پس از بررسی migration history.
6. اتصال UI فارسی قیمت/پلن و پل امن Native به app shell.
7. تأیید CI روی آخرین SHA پس از تغییرات.
8. تست روی دستگاه واقعی: خرید Bazaar، تسویه، consume، retry، خرید مجدد، refund/revocation و account recovery.
9. قرارداد رسمی و تست‌شدهٔ اعلان refund/revocation از سمت Bazaar و رفتار امن در برابر replay.
10. اثبات integration واقعی با Cloudflare D1؛ تست SQLite/mock به‌تنهایی تست زندهٔ D1 محسوب نمی‌شود.

## ریسک اصلی که باید در ادامه بررسی شود
حذف مسیرها و تست‌های قدیمی prepaid/subscription فقط وقتی قابل قبول است که تمام قابلیت‌های لازم در مسیر Billing V2 جایگزین شده و پوشش تستی آن‌ها حفظ شده باشد. به‌خصوص سفارش، entitlement/access، تسویه، بازیابی، refund/reversal، امنیت هویت و feature gate را تطبیق دهید. موفق بودن CI به‌تنهایی جایگزینی کامل رفتارهای قبلی را ثابت نمی‌کند.

## گام بعدی پیشنهادی — فقط بررسی، بدون تغییر کد
1. وضعیت زندهٔ PR و SHA را دوباره بخوانید؛ commit این فایل ممکن است SHA و checkها را تغییر دهد.
2. فهرست کامل فایل‌های تغییرکرده و diff فایل‌های حساس را بررسی کنید.
3. یک ماتریس «رفتار قدیمی ← پیاده‌سازی Billing V2 ← تست جایگزین» بسازید.
4. تا وقتی این ماتریس و موانع انتشار حل نشده‌اند، PR را Draft نگه دارید و Merge/Deploy/فعال‌سازی پرداخت انجام ندهید.

## دستورات امن برای شروع جلسهٔ بعد
```powershell
cd C:\Users\Msi\sahamban
git status --short --branch
git branch --show-current
gh pr view 187 --json title,state,isDraft,headRefName,baseRefName,url
gh pr checks 187
gh pr view 187 --json files
```

اگر Git در مسیر بالا نبود، ابتدا مسیر واقعی مخزن را پیدا کنید؛ از اجرای دستورات در `C:\Users\Msi` که مخزن Git نیست خودداری کنید.

## قاعدهٔ ایمنی
هیچ Merge، Deploy، migration روی دیتابیس زنده، تغییر Worker secret، فعال‌سازی checkout یا پرداخت واقعی بدون بررسی صریح و تأیید مالک انجام نشود.
