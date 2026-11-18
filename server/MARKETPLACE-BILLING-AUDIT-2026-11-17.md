# ممیزی معماری پرداخت سهمینو — اصلاحیه Bazaar-only و Subscription API

تاریخ بازبینی: ۲۰۲۶-۱۱-۱۸  
شاخه کاری: `feat/android-subscription-preview-20261115`

## تصمیم دامنه

تنها کانال پرداخت مورد پشتیبانی سهمینو **کافه‌بازار** است. مایکت، گوگل‌پلی و وب‌سایت/درگاه مستقیم خارج از دامنه‌اند. هرگونه افزودن مجدد نیازمند تصمیم صریح و جدید مالک است.

پیش‌نمایش پنج پلن و کاتالوگ مصوب حفظ می‌شوند:
- ۳۰ روز: ۱٬۵۰۰٬۰۰۰ ریال
- ۶۰ روز: ۲٬۸۵۰٬۰۰۰ ریال
- ۹۰ روز: ۴٬۰۵۰٬۰۰۰ ریال
- ۱۸۰ روز: ۷٬۶۵۰٬۰۰۰ ریال
- ۳۶۵ روز: ۱۴٬۶۰۰٬۰۰۰ ریال

## اصلاح معماری SDK

این پنج محصول در مسیر Poolakey باید به‌عنوان Subscription SKU پیاده‌سازی شوند، نه خرید یک‌باره consumable:

| عملیات | API صحیح Poolakey |
|---|---|
| دریافت جزئیات SKU | `getSubscriptionSkuDetails` |
| شروع خرید | `subscribeProduct` |
| بازیابی فهرست اشتراک‌ها | `getSubscribedProducts` |
| استعلام یک اشتراک | `querySubscribeProduct` |
| مصرف خرید | **ممنوع**؛ `consumeProduct` برای Subscription نیست |

مستندات رسمی Poolakey صریحاً میان `purchaseProduct` و `subscribeProduct` و نیز میان `getPurchasedProducts` و `getSubscribedProducts` تفکیک می‌کند. همچنین `consumeProduct` برای خرید محصول است و اشتراک‌ها قابل consume نیستند.

## اعتبارسنجی سمت سرور و تاریخ انقضا

سرور باید پس از دریافت token و شواهد خرید، از CafeBazaar Developer API استفاده کند. endpoint اعتبارسنجی اشتراک در API v2 به شکل زیر مستند شده است:

`GET /devapi/v2/api/applications/{packageName}/subscriptions/{subscriptionId}/purchases/{purchaseToken}/?access_token={accessToken}`

- OAuth client secret و refresh token فقط در Secretهای محیط Worker نگهداری شوند؛ هرگز در APK، GitHub یا چت قرار نگیرند.
- شناسه حساب از نشست احراز هویت‌شده سرور گرفته شود، نه از body کلاینت.
- package name، SKU، purchase token، order payload، وضعیت خرید، شناسه تراکنش و عدم replay باید بررسی شوند.
- تاریخ پایان اعتبار از فیلد `validUntilTimestampMsec` پاسخ تأییدشده Bazaar استخراج و ذخیره شود.
- `plan.days` برای تعریف کاتالوگ و کنترل پلن است؛ نباید مبنای محاسبه تاریخ انقضای واقعی یک Subscription تأییدشده باشد.
- اگر پاسخ بازار منقضی، ناقص، نامعتبر یا غیرقابل دسترسی باشد، اشتراک فعال نشود.
- خرید مجدد نباید تاریخ اعتبار موجود را کوتاه کند؛ ledger و entitlement باید در یک تراکنش اتمیک ثبت شوند.
- سفارش PENDING و callback کلاینت به‌تنهایی هیچ دسترسی Pro ایجاد نمی‌کنند.

## تمدید

پیش‌فرض سهمینو تمدید دستی است. مستندات فنی عمومی Poolakey وجود API خرید/استعلام Subscription را نشان می‌دهد؛ اما رفتار دقیق محصول/پنل Bazaar برای خاموش‌کردن تمدید خودکار به‌صورت پیش‌فرض، رضایت opt-in و لغو بدون از دست رفتن دوره پرداخت‌شده باید در پنل ناشر و API رسمی تأیید شود. تا زمان احراز این قرارداد، UI نباید وعده تمدید خودکار بدهد و هیچ درخواست تمدیدی نباید بدون رضایت صریح ارسال شود.

## وضعیت کد پس از اصلاحات این مرحله

- Gradle فقط flavor کافه‌بازار را نگه می‌دارد.
- مخزن Maven مایکت و کلید مایکت از پیکربندی Android حذف شده‌اند.
- کلاس‌های Android مربوط به مایکت و تست‌های وابسته حذف شده‌اند.
- Workflow اندروید فقط flavor بازار را compile-check می‌کند.
- پنج پلن موجود و قیمت‌های ریالی آن‌ها دست‌نخورده باقی مانده‌اند.
- primitive تسویه سرور اکنون `validUntilTimestampMsec` تأییدشده را می‌پذیرد و دیگر با `plan.days` تاریخ پایان را محاسبه نمی‌کند.
- این تغییر هنوز به معنی وجود endpoint واقعی Bazaar verifier یا فعال بودن پرداخت نیست. این اتصال باید در مرحله بعد به Worker متصل و با sandbox آزمایش شود.

## منابع فنی

- Poolakey official repository: https://github.com/cafebazaar/Poolakey
- Poolakey subscription API: https://github.com/cafebazaar/Poolakey/wiki/4.-Subscribing-a-Product
- Poolakey API reference: https://github.com/cafebazaar/Poolakey/blob/master/_autodocs/api-reference/payment.md
- CafeBazaar Developer API sample — `ValidateSubscription` and OAuth token refresh: https://github.com/Geeksltd/CafeBazaar.DeveloperApi/blob/main/CafeBazaarDeveloperService.cs

## دروازه انتشار

پرداخت همچنان خاموش است. پیش از فعال‌سازی باید adapter واقعی Poolakey، اتصال سفارش به payload، verifier سمت سرور Bazaar، restore، انقضا، لغو/تمدید، refund/revoke، تست replay و تست روی گوشی واقعی تکمیل شوند. هیچ merge به `main` یا deployment بدون تأیید جداگانه مالک انجام نشود.
