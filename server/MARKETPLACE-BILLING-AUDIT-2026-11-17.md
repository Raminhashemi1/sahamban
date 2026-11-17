# گزارش ممیزی عمیق اتصال پرداخت سهمینو — ۲۰۲۶-۱۱-۱۷

## نتیجه اجرایی

**پرداخت واقعی هنوز آماده فعال‌سازی نیست.** این ممیزی کد شاخه را بررسی کرده است؛ هیچ دسترسی به پنل ناشر مایکت/کافه‌بازار، دستگاه تست واردشده به حساب فروشگاه، کلیدهای اختصاصی سهمینو یا محیط Worker/D1 تولیدی در اختیار این بررسی نبوده است. بنابراین آزمون تراکنش واقعی یا تأیید تنظیمات پنل انجام نشده است.

## ۱) SDK اندروید فروشگاه‌ها

### مایکت
- وابستگی `ir.myket:billing:2.2` و Maven رسمی `https://maven.myket.ir` در پروژه ثبت شده است.
- `SahminoStoreBillingManager.java` فقط در flavor مایکت قرار دارد و اتصال، استعلام موجودی و قیمت، و استخراج رسید امضاشده را پیاده‌سازی می‌کند.
- با این حال `SubscriptionPreviewActivity` هیچ دکمه خرید فعالی ندارد و callback مربوط به `onSignedPurchaseEvidence` را به مسیر سرور وصل نمی‌کند. متد `purchase` در Manager عملاً از UI فراخوانی نمی‌شود.
- payload فعلی Manager یک مقدار تصادفی محلی است؛ با شناسه سفارش معلقی که سرور ساخته تطبیق داده نمی‌شود. برای جلوگیری از اتصال رسید به حساب اشتباه، باید ابتدا سفارش از سرور ایجاد و شناسه آن در developerPayload قرار گیرد.
- کلاس `SahminoPurchaseEvidence` فیلدهای originalJson و signature را استخراج می‌کند، اما استخراج رسید به معنی اعتبارسنجی آن نیست.

### کافه‌بازار
- وابستگی Poolakey در Gradle وجود دارد، اما در flavor بازار فقط صفحه پیش‌نمایش ساخته شده است.
- هیچ کلاس اجرایی Poolakey، اتصال `Payment`، استعلام SKU، خرید `purchaseProduct`، بازیابی خرید یا `consumeProduct` در flavor بازار وجود ندارد.
- صفحه بازار صراحتاً می‌گوید Poolakey هنوز وصل نشده است.
- بنابراین بند اول برای مایکت «نیمه‌پیاده‌سازی» و برای بازار «پیاده‌سازی‌نشده» است؛ صرف وجود dependency به معنی اتصال SDK نیست.

## ۲) اعتبارسنجی رسید سمت سرور

- `server/prepaid-settlement.cjs` فقط یک primitive تسویه عمومی است و تابع `verifyAtProvider` را از فراخواننده می‌گیرد؛ این تابع به‌تنهایی به هیچ فروشگاهی وصل نیست.
- در `server/worker-api.mjs` هیچ endpoint دریافت رسید، اعتبارسنجی مایکت/بازار، یا اجرای settlement وجود ندارد.
- مسیرهای موجود `/api/v1/me/prepaid-orders` فقط سفارش معلق می‌سازند/می‌خوانند و پاسخ آن‌ها `checkoutEnabled:false` و `proEnabled:false` است.
- Worker در مستندات پروژه prototype و مستقرنشده معرفی شده است؛ فایل نمونه Wrangler نیز شناسه D1 واقعی ندارد.
- پس در حال حاضر حتی رسیدی که اپ دریافت کند، راه امن و قابل‌دسترسی برای ارسال و تأیید و ثبت اتمیک entitlement ندارد.

## ۳) کلیدها و شناسه‌های فروشگاهی

- `android-pilot/app/build.gradle` کلیدهای `BAZAAR_IAB_PUBLIC_KEY` و `MYKET_IAB_PUBLIC_KEY` را از Gradle properties می‌خواند؛ در `android-pilot/gradle.properties` فعلی فقط تنظیمات عمومی Gradle وجود دارد و هیچ‌کدام از دو کلید تنظیم نشده‌اند.
- کاتالوگ اندروید شناسه‌های `sahmino_pro_30d` تا `sahmino_pro_365d` را placeholder معرفی می‌کند؛ کد یا مستندی وجود ندارد که اثبات کند این SKUها در پنل هر دو فروشگاه ایجاد و فعال شده‌اند.
- package name فعلی `ir.manahesab.sahmino` در Gradle است، اما تطبیق آن با برنامه ثبت‌شده در هر دو پنل قابل اثبات نیست.
- کلید عمومی RSA محرمانه نیست، اما باید دقیقاً از پنل همان برنامه/همان فروشگاه گرفته شود؛ کلید نمونه یا کلید برنامه دیگر قابل استفاده نیست.
- برای بازار، مستند Poolakey دو روش را می‌شناسد: بررسی محلی با کلید RSA یا غیرفعال‌کردن آن فقط در صورت استفاده از REST API بازار. مستند رسمی REST بازار مسیر OAuth و endpoint اعتبارسنجی خرید را نشان می‌دهد؛ بنابراین client secret و refresh token باید فقط در Secretهای Worker ذخیره شوند.
- برای مایکت، SDK رسمی نمونه تأیید امضای RSA روی originalJson را با SHA1withRSA انجام می‌دهد و توصیه می‌کند originalJson/signature سمت سرور بررسی شوند. مستند عمومی بررسی‌شده قرارداد کامل API سمت سرور برای وضعیت refund/revoke را روشن نکرد؛ این مورد باید از مستندات/پشتیبانی پنل مایکت تأیید شود.

## شواهد رسمی/فنی بررسی‌شده

- Myket Android Billing SDK: https://github.com/myketstore/billing-sample-android
- Myket Developer API repository (این API برای login/update/storage است و نباید با receipt verifier اشتباه شود): https://github.com/myketstore/myket-developer-api
- Bazaar Poolakey: https://github.com/cafebazaar/Poolakey
- Poolakey connection/security: https://github.com/cafebazaar/Poolakey/wiki/2.-Construction-and-Connection
- Poolakey product purchase: https://github.com/cafebazaar/Poolakey/wiki/3.-Purchasing-a-Product
- Poolakey consume/query: https://github.com/cafebazaar/Poolakey/wiki/5.-Consume-a-Purchased-Product
- Bazaar Developer API example (OAuth + validate purchase): https://github.com/Geeksltd/CafeBazaar.DeveloperApi/blob/main/CafeBazaarDeveloperService.cs

## معماری لازم برای تکمیل امن

1. هر دو flavor باید از SDK همان فروشگاه استفاده کنند؛ هیچ انتخاب دستی کانال پرداخت داخل اپ وجود نداشته باشد.
2. اپ با نشست احراز هویت‌شده ابتدا `POST /api/v1/me/prepaid-orders` را صدا بزند و شناسه سفارش سرور را به عنوان payload به SDK بدهد.
3. اپ فقط شناسه محصول، شناسه سفارش، توکن/رسید و داده امضاشده را به endpoint رسید بفرستد؛ قیمت/مدت از کلاینت پذیرفته نشود.
4. سرور مالکیت سفارش را با نشست کاربر تطبیق دهد، سپس برای Bazaar از REST API رسمی و برای Myket از اعتبارسنجی رسمی/امضای RSA طبق قرارداد تأییدشده استفاده کند.
5. سرور packageName، SKU، purchaseState، payload/order binding، زمان، قیمت/واحد محصول پنل، شناسه تراکنش و عدم replay را بررسی کند.
6. settlement و entitlement در D1 با ledger یکتا و اتمیک ثبت شوند. فقط بعد از commit موفق سرور، اپ محصول consumable را در فروشگاه consume کند؛ در شکست شبکه، امکان reconcile بدون از دست رفتن رسید باقی بماند.
7. برای refund/revoke، مسیر notification/polling رسمی هر مارکت یا رویه reconciliation تأییدشده لازم است؛ صرف امضای رسید اولیه وضعیت دائمی دسترسی را اثبات نمی‌کند.

## مواردی که بدون مالک قابل تکمیل نیستند

این موارد را نمی‌توان با تغییر کد یا حدس‌زدن تولید کرد:
- کلید عمومی RSA مخصوص برنامه سهمینو در پنل مایکت.
- کلید عمومی RSA مخصوص برنامه سهمینو در پنل کافه‌بازار.
- تأیید package name و ایجاد/فعال‌سازی پنج SKU واقعی در هر دو پنل، با قیمت‌های دقیق ریالی مصوب.
- اعتبارنامه سرور بازار (OAuth client ID، client secret و refresh token) و مجوز API اعتبارسنجی؛ این‌ها باید مستقیماً به‌صورت Cloudflare Worker Secrets تنظیم شوند، نه در GitHub یا چت.
- مستند یا تأیید رسمی مایکت برای وضعیت refund/revoke و قرارداد اعتبارسنجی سمت سرور.
- دسترسی به محیط آزمایشی فروشگاه و دستگاهی که حساب تست مایکت/بازار روی آن وارد شده باشد.

## دروازه انتشار

تا زمانی که build هر دو flavor، خرید موفق، لغو، شکست، بازیابی پس از نصب مجدد، رسید تکراری، انقضا، refund/revoke و consume پس از commit سرور روی دستگاه آزمایش نشده‌اند، پرداخت باید خاموش بماند.

## وضعیت آزمون موجود

Commit `7e42937298b6b3c6ef32542a4a6ac1a3991e9af2` آزمون workflow پنج‌پلن سرور را سبز کرده است. این آزمون‌ها کاتالوگ/منطق دامنه را پوشش می‌دهند؛ آزمون SDK اندروید یا تراکنش فروشگاهی واقعی نیستند.
