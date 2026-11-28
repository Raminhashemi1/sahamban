# ممیزی یکپارچه‌سازی کاندید انتشار سهمینو
تاریخ: ۲۸ نوامبر ۲۰۲۶
شاخه بررسی: `release/sahmino-7day-candidate-2026-11-28`
مبنای شاخه: `cc2a5af404bb91d61b4ec03f733662021ab5c729`

## نتیجه اجرایی
شاخه کاندید انتشار از main ساخته شده و ایزوله است. بررسی فایل‌های Billing V2 نشان داد انتقال چند فایل منفرد برای فعال‌کردن Billing امن نیست. زیرساخت فعلی main و مسیر Billing V2 از نظر schema، مدل سفارش، entitlement، احراز هویت و Worker route با هم تفاوت دارند. بنابراین این سند، نقشه انتقال و موانع را ثبت می‌کند؛ هیچ کد اجرایی یا داده تولیدی را تغییر نمی‌دهد.

## تفاوت‌های قطعی مشاهده‌شده

### ۱. مدل داده در main
`server/d1-schema.sql` فعلی شامل مدل قدیمی `SAHAMBAN_PRO_ANNUAL`، جدول‌های `subscription_orders`، `subscription_entitlements` و `payment_event_ledger` است.
در شاخه Billing V2، `server/billing/schema.sql` مدل متفاوتی تعریف می‌کند:
- `billing_orders` با پنج plan ID: 30، 60، 90، 180 و 365 روز
- `billing_access` به‌عنوان ledger دسترسی
- `billing_events` برای ثبت رویدادهای خرید/برگشت
این دو مدل بدون migration و سازگاری API نباید هم‌زمان به‌عنوان منبع حقیقت دسترسی فعال شوند.

### ۲. Worker فعلی در main
`server/worker-api.mjs` در main مسیرهای pilot و prepaid را وارد می‌کند. فایل‌های `server/billing/*` و `server/password-auth.cjs` در main وجود ندارند.
نسخه Billing V2 از Worker، routeهای username/password و cookie session، order creation، verify/settle بازار و مایکت را اضافه می‌کند. جایگزینی کامل Worker می‌تواند proxyهای TSETMC/CODAL و entitlement موجود در main را حذف یا تغییر دهد؛ پس باید تغییرات route به‌صورت ادغام هدفمند انجام شود و همه endpointهای موجود حفظ شوند.

### ۳. زنجیره وابستگی‌های Billing V2
کدهای مرتبط در زنجیره PRهای #187 → #191 → #192 → #208 قرار دارند. #191 شامل backend، Android، migrations، tests و workflows است؛ #192 تغییرات احراز هویت را روی آن اعمال می‌کند؛ #208 اصلاح bootstrap انتشار را روی #192 قرار می‌دهد.
این زنجیره را نمی‌توان به‌صورت چند PR مستقل به main ادغام کرد. شاخه integration نیز نسبت به main واگرا است؛ ادغام کامل شاخه آنی و پرریسک است.

### ۴. Android
در main فایل Gradle فعلی تنها plugin اندروید را اعمال می‌کند؛ شاخه Billing V2 علاوه بر Kotlin plugin، flavorهای Bazaar/Myket، تنظیمات Worker جداگانه، پنج SKU برای هر فروشگاه، public keyها، و gateهای checkout/signing را اضافه می‌کند.
شناسه برنامه `ir.sahmino.app`، minSdk=26 و targetSdk=35 در نسخه بررسی‌شده ثبت شده‌اند. امضای نهایی وابسته به keystore و secrets مالک است. Artifactهای CI unsigned هستند و نباید store-ready معرفی شوند.

## ترتیب امن انتقال

1. **حفظ رفتار main:** Worker routeهای موجود برای TSETMC، CODAL، pilot/prepaid و پاسخ‌های entitlement باید قبل و بعد از ادغام، با آزمون قرارداد مقایسه شوند.
2. **انتقال schema به‌صورت افزایشی:** بررسی تعارض نام/معنای جدول‌ها؛ تعریف migration نسخه‌بندی‌شده برای Billing V2 و احراز هویت؛ اجرای فقط روی D1 محلی/آزمایشی. هیچ migration تولیدی در این مرحله اجرا نشود.
3. **انتقال backend Billing:** catalog، orders، settlement، Bazaar verifier، Myket verifier و routeها به‌صورت یک واحد منسجم، همراه با تست‌های مخصوص.
4. **انتقال auth:** فقط پس از تأیید مالک درباره روش نهایی ورود و حفظ/مهاجرت هویت کاربران موجود. migrationهای 0004/0005 روی داده واقعی بدون برنامه پشتیبان و آزمون مهاجرت اجرا نشوند.
5. **انتقال Android:** flavorها و clientهای Billing فقط پس از تثبیت قرارداد Worker؛ signing secrets خارج از مخزن و تحت کنترل مالک.
6. **اجرای CI و رگرسیون:** تست‌های Billing V2، password auth، Worker API، Android wrapper، و تمام آزمون‌های موجودی که با Worker یا D1 هم‌پوشانی دارند.
7. **ساخت Release Candidate:** فقط از commit همین شاخه پس از عبور از gateها؛ APK unsigned همچنان فقط برای آزمون است.

## موانع نیازمند مالک
- تأیید اینکه نسخه اول در بازار و مایکت با checkout خاموش منتشر شود یا عرضه Pro پولی در همان انتشار مدنظر است. این موضوع روی الزامات SKU، Worker و signing اثر دارد؛ تا زمان تأیید، checkout باید خاموش بماند.
- فراهم‌کردن keystore و secrets از مسیر امن؛ هرگز در Git ثبت نشوند.
- دسترسی به کنسول‌های Bazaar/Myket برای تأیید package و SKUها.
- دسترسی به D1/Cloudflare برای provisioning؛ هیچ استقرار یا migration تولیدی بدون تأیید مالک انجام نشود.
- آزمون نصب و عملکرد روی دستگاه واقعی.

## کارهای انجام‌شده در این مرحله
- شاخه کاندید انتشار از main ایجاد و SHA آن راستی‌آزمایی شد.
- اختلاف schema، Worker، auth، Android flavors و signing gates با فایل‌های واقعی بررسی شد.
- انتقال مستقیم شاخه واگرا و ادغام مستقل prepaid متوقف شد تا معماری واحد و بدون حذف رفتار موجود ساخته شود.

## وضعیت
**آماده‌سازی و ممیزی انجام شده؛ انتقال کد هنوز انجام نشده است.**
این سند تأییدیه آمادگی انتشار یا موفقیت آزمون نیست. گام بعدی، ساخت patch کوچک و قابل آزمون برای حفظ Worker موجود و افزودن لایه Billing V2 به‌صورت افزایشی است.


## شواهد CI روی شاخه کاندید (۲۸ نوامبر ۲۰۲۶)

دو اجرای workflow اندروید روی همین شاخه با موفقیت پایان یافتند:
- [اجرای نهایی با برچسب صحیح artifact](https://github.com/Raminhashemi1/sahamban/actions/runs/46117024510) — نتیجه `success`
- آزمون package identity و host-security: موفق
- آزمون local backup و Android export bridge: موفق
- آزمون Java مربوط به TrustedNavigation: موفق
- ساخت Debug APK: موفق
- SHA-256 فایل APK: `c9816a8e96579546f06188c94f14b2fa39a6151a6fb302e1b33d1faa5bbf9f7d`
- Artifact: `sahmino-android-pilot-debug-TEST-ONLY-NOT-STORE-READY` (ID: `15251479633`)

این فقط build آزمایشی Debug از کد فعلی main است. آزمون کامل ماژول‌های محصول، build نوع Release، امضای فروشگاهی و خرید واقعی Bazaar/Myket را پوشش نمی‌دهد.
