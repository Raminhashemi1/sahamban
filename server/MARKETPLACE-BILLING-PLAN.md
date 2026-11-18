# معماری پرداخت اشتراک سهمینو — فقط کافه‌بازار

تاریخ بازبینی: ۲۰۲۶-۱۱-۱۸  
وضعیت: معماری در حال تکمیل؛ پرداخت خاموش است.

## دامنه قطعی

- تنها فروشگاه پرداخت: کافه‌بازار.
- مایکت، گوگل‌پلی و وب‌سایت/درگاه مستقیم در پروژه پرداخت سهمینو وجود ندارند.
- هیچ gateway selector در UI وجود ندارد.
- صفحه پیش‌نمایش پنج پلن موجود حفظ می‌شود؛ بازسازی UI خارج از محدوده است.

## کاتالوگ مصوب

| Plan ID | اعتبار اسمی | مبلغ نهایی |
|---|---:|---:|
| SAHMINO_PRO_30D | ۳۰ روز | ۱٬۵۰۰٬۰۰۰ ریال |
| SAHMINO_PRO_60D | ۶۰ روز | ۲٬۸۵۰٬۰۰۰ ریال |
| SAHMINO_PRO_90D | ۹۰ روز | ۴٬۰۵۰٬۰۰۰ ریال |
| SAHMINO_PRO_180D | ۱۸۰ روز | ۷٬۶۵۰٬۰۰۰ ریال |
| SAHMINO_PRO_365D | ۳۶۵ روز | ۱۴٬۶۰۰٬۰۰۰ ریال |

این قیمت‌ها نهایی هستند و تخفیف اضافه یا تبدیل ریال/تومان ندارند. کاتالوگ سرور منبع حقیقت است.

## قرارداد صحیح Poolakey برای Subscription

| عملیات | متد |
|---|---|
| دریافت جزئیات محصول اشتراک | `getSubscriptionSkuDetails` |
| آغاز خرید اشتراک | `subscribeProduct` |
| بازیابی اشتراک‌های کاربر | `getSubscribedProducts` |
| استعلام یک اشتراک | `querySubscribeProduct` |
| Consume | برای Subscription ممنوع؛ هرگز `consumeProduct` را صدا نزنید |

استفاده از `getInAppSkuDetails`، `purchaseProduct` یا `getPurchasedProducts` برای این پلن‌های Subscription معماری اشتباه است.

## جریان موردنیاز خرید

1. نشست معتبر کاربر در PWA/اپ بررسی شود.
2. کلاینت با `POST /api/v1/me/prepaid-orders` فقط `planId` را ارسال کند؛ مبلغ و مدت از سرور خوانده شوند.
3. سرور یک سفارش PENDING با شناسه یکتا، حساب مالک، پلن و قیمت ریالی ایجاد کند.
4. شناسه سفارش سرور به‌عنوان `payload` در `PurchaseRequest` به `subscribeProduct` داده شود.
5. پس از موفقیت callback، اپ فقط purchaseToken، packageName، productId، orderId/payload و شواهد امضاشده را به endpoint سرور بفرستد.
6. Worker مالکیت سفارش و تطبیق payload را با نشست کاربر بررسی کند.
7. Worker از CafeBazaar Developer API، با OAuth محرمانه سمت سرور، endpoint `ValidateSubscription` را فراخوانی کند.
8. تنها پاسخ معتبر Bazaar می‌تواند به تسویه برسد؛ callback کلاینت، قیمت ارسالی کلاینت یا inventory محلی مدرک پرداخت نیست.
9. event ledger، سفارش و entitlement در D1 اتمیک ثبت شوند.
10. هیچ consume پس از تسویه وجود ندارد؛ Subscription قابل consume نیست.
11. restore از `getSubscribedProducts` فقط برای کشف شواهد خرید است؛ فعال‌سازی نهایی با استعلام مجدد سرور انجام می‌شود.

## تاریخ انقضا

پاسخ اعتبارسنجی Subscription بازار شامل زمان اعتبار اشتراک است. Worker باید مقدار `validUntilTimestampMsec` را به UTC تبدیل و به‌عنوان تاریخ پایان تأییدشده ذخیره کند. محاسبه `paid_until = now + plan.days` برای خرید تأییدشده Subscription ممنوع است.

در صورت وجود اعتبار قبلی دیرتر از تاریخ پاسخ جدید، entitlement نباید کوتاه شود. پاسخ منقضی/نامعتبر/ناقص یا خطای شبکه به معنی عدم فعال‌سازی است.

## تمدید و لغو

- تمدید دستی پیش‌فرض است.
- تمدید خودکار فقط با رضایت صریح و در صورت پشتیبانی اثبات‌شده Bazaar.
- روش و زمان لغو باید روشن باشد.
- لغو تمدید نباید تاریخ پایان دوره پرداخت‌شده را عقب ببرد.
- تا وقتی رفتار دقیق opt-in و cancellation در پنل/API Bazaar تأیید نشده، UI نباید تمدید خودکار را فعال یا وعده دهد.

## وضعیت پیاده‌سازی

- پنج پلن و قیمت ریالی در سرور، D1 و پیش‌نمایش موجودند.
- Gradle اکنون فقط flavor بازار را تعریف می‌کند؛ کد/وابستگی مایکت حذف شده است.
- primitive تسویه اکنون تاریخ پایان تأییدشده Bazaar را می‌پذیرد و روزهای پلن را برای محاسبه انقضا جمع نمی‌کند.
- verifier OAuth/ValidateSubscription و route احراز‌شده Worker پیاده‌سازی شده‌اند؛ هنوز feature flag خاموش است و باید روی D1 آزمایشی و sandbox تست شود.
- آداپتر Poolakey مبتنی بر متدهای Subscription، دریافت SKU و restore پیاده‌سازی شده؛ اتصال endpoint سفارش و receipt به Worker هنوز باقی است.
- آزمون sandbox و گوشی واقعی انجام نشده است.
- پرداخت و فعال‌سازی همچنان خاموش‌اند.

## منابع

- https://github.com/cafebazaar/Poolakey
- https://github.com/cafebazaar/Poolakey/wiki/4.-Subscribing-a-Product
- https://github.com/Geeksltd/CafeBazaar.DeveloperApi/blob/main/CafeBazaarDeveloperService.cs

## ترتیب مرحله‌های بعدی

1. تکمیل و آزمون adapter Poolakey با APIهای Subscription.
2. تکمیل endpoint احراز‌شده دریافت receipt و اتصال به Bazaar OAuth/ValidateSubscription.
3. اتصال نتیجه `validUntilTimestampMsec` به تسویه D1 و بازیابی.
4. تعیین دقیق سیاست تمدید دستی/اختیاری و لغو بر اساس قابلیت واقعی Bazaar.
5. آزمون خطا، تکرار، restore، refund/revoke و تست روی گوشی واقعی.

هیچ تغییری به `main` منتقل نشود و هیچ پرداختی بدون تأیید صریح مالک فعال نشود.
