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
- آخرین SHA شاخهٔ PR پس از ثبت سند انتقال: `7881506b92b0523102c0fc47acecfa1d5d579ecc`
- آخرین متادیتای دریافت‌شده: 232 commit، 55 فایل، 1,590 افزودن و 1,726 حذف.
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


## بازبینی تکمیلی پس از انتقال (2026-11-20)
- وضعیت زنده PR دوباره خوانده شد: OPEN، DRAFT، هنوز Merge نشده؛ `mergeable=true` در پاسخ فعلی GitHub. آخرین head SHA همان `7881506b92b0523102c0fc47acecfa1d5d579ecc` است.
- فایل همین سند با موفقیت از شاخه PR بازخوانی شد.
- Workflow مربوط به `Sahamban free pilot Worker build verification` برای این SHA با run شماره `44695100988` موفق بود. Job `offline-worker-bundle` و مراحل تست امنیت Worker، bundle بدون deploy، اعمال schema روی D1 محلی ایزوله، بررسی جدول‌های Billing V2 و اجرای HTTP lifecycle محلی همگی موفق گزارش شدند. این تست، Cloudflare D1 زنده یا خرید واقعی Bazaar را اثبات نمی‌کند.
- فایل‌های واقعی بررسی‌شده: `server/billing/README.md`, `schema.sql`, `settlement.cjs`, `bazaar.mjs`, `orders.cjs`, `server/worker-api.mjs`, `BillingV2ApiClient.kt`, `BillingV2Coordinator.kt`, `BillingV2PurchaseFlow.kt`, `MainActivity.java`, `app/build.gradle`, `AndroidManifest.xml`, `BAZAAR_RELEASE_CHECKLIST.md` و `UI-COPY.fa.md`.
- مانع قطعی اتصال به اپ: `MainActivity.java` خودش را test-only WebView shell معرفی می‌کند و تصریح می‌کند JavaScript bridge یا identity injection ندارد؛ همچنین Billing V2 coordinator به جریان اپ متصل نشده است.
- تنظیمات Android فعلی موقت‌اند: `applicationId='ir.sahamban.pilot'`, `SAHAMBAN_WORKER_BASE_URL=""`, `SAHAMBAN_BAZAAR_PURCHASES_ENABLED=false`. بنابراین این APK تنظیمات نهایی انتشار یا checkout فعال ندارد.
- `BillingV2PurchaseFlow.kt` و `BillingV2ApiClient.kt` پیاده‌سازی شده‌اند، اما API client به bearer token از بیرون نیاز دارد و منبع session احراز هویت‌شدهٔ واقعی هنوز به آن متصل نشده است.
- `server/billing/schema.sql` فقط در CI روی D1 محلی ایزوله اعمال شده؛ روی D1 تولیدی/واقعی اعمال نشده است.
- مسیر Worker بررسی‌شده شامل ایجاد سفارش، verify و entitlement است؛ مسیر کامل refund/reversal هنوز در Worker API دیده نشده و باید جداگانه بررسی/پیاده‌سازی شود.
- در `settlement.cjs` مقدار ستون `bazaar_product_id` با `planId` پر می‌شود، نه SKU واقعی Bazaar. این مورد باید پیش از انتشار اصلاح شود یا نام/معنای ستون به‌صورت مستند روشن شود؛ نگاشت SKU واقعی باید در رکورد سفارش قابل ردیابی بماند.
- هنوز هیچ تغییری در کد، schema زنده یا تنظیمات Worker اعمال نشده است؛ این مرحله صرفاً خواندن و بازبینی بوده است.

## اولویت دقیق ادامه
1. شناسایی package/applicationId واقعی اپ سهمینو که در کافه‌بازار ثبت شده است؛ شناسهٔ موقت `ir.sahamban.pilot` را برای انتشار استفاده نکنید.
2. شناسایی سازوکار واقعی login/session سهمینو و منبع معتبر صدور bearer token؛ هرگز token را در WebView JavaScript یا فایل ثابت APK قرار ندهید.
3. طراحی و پیاده‌سازی پل امن Native↔PWA بر اساس origin مجاز و پیام‌های محدود، بدون افشای token به JavaScript.
4. اتصال صفحهٔ پلن‌های موجود به مسیر Native purchase flow و Worker، همراه با جلوگیری از سفارش تکراری و بررسی وضعیت پس از timeout.
5. اصلاح ثبت SKU واقعی در settlement و اضافه‌کردن تست رگرسیون.
6. طراحی و پیاده‌سازی refund/reversal با مستندات رسمی Bazaar و سیاست دسترسی در برگشت وجه.
7. تست integration روی Cloudflare D1 محیط staging و سپس دستگاه واقعی Bazaar؛ تا قبل از تکمیل موارد فوق checkout خاموش بماند.

## اطلاعاتی که فقط مالک باید فراهم کند
- applicationId نهایی ثبت‌شده در پنل Bazaar.
- دسترسی/توضیح سازوکار احراز هویت تولیدی سهمینو (نام سامانه یا endpoint/session contract؛ نه رمز، refresh token یا secret).
- پنج Product ID واقعی Bazaar پس از ایجاد محصولات در Pishkhan.
- تأیید اینکه محیط Cloudflare D1 مورد استفاده برای staging کدام است؛ پیش از اجرای migration باید وضعیت schema آن خوانده شود.
