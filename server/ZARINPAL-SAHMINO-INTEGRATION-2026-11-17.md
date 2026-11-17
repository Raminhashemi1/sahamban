# اتصال زرین‌پال سهمینو — مرحله اول

وضعیت در HEAD فعلی: آداپتور سروری و آزمون‌های واحد موجود است؛ مسیرهای checkout و callback هنوز در Worker پیاده‌سازی نشده‌اند و پرداخت خاموش است.

## انتخاب ارائه‌دهنده
زرین‌پال به‌عنوان مسیر اول پرداخت وب انتخاب شد. این انتخاب به معنی صدور پذیرندگی یا تأیید فعالیت توسط ارائه‌دهنده نیست.

## اجزای ثبت‌شده
- `server/zarinpal-gateway.cjs`: آداپتور REST نسخه v4 برای ایجاد درخواست و verify.
- `tests/zarinpal-gateway.test.cjs`: آزمون‌های ساخت درخواست، مبلغ ریالی، پاسخ verify، رد verify تکراری و انتخاب endpointهای Sandbox/Production.
- Commit `e35b9777`: رفع استفاده از متغیر تعریف‌نشده `urls` و اتصال request/verify به endpointهای انتخاب‌شده توسط `ZARINPAL_SANDBOX`.
- GitHub Actions run `44140921167`: آزمون اشتراک پس از این اصلاح با موفقیت کامل شد.
- `server/d1-sahmino-subscription-v2.sql`: جدول `sahmino_payment_intents` برای نگاشت یکتای authority به سفارش.

## رفتار امنیتی
- واحد مبلغ در آداپتور فقط `IRR` است؛ هیچ تبدیل ریال/تومان در مسیر اشتراک انجام نمی‌شود.
- کلید پذیرنده فقط در secret binding سرور قرار می‌گیرد؛ هرگز در PWA یا مخزن ذخیره نشود.
- تنها پاسخ verify با کد 100 و مبلغ منطبق قابل تبدیل به رسید تأییدشده است.
- کد 101 (قبلاً verify شده) به‌عنوان پرداخت جدید پذیرفته نمی‌شود.
- redirect کاربر به‌تنهایی موفقیت پرداخت نیست.
- فعال‌سازی اشتراک باید فقط از طریق `settleVerifiedPrepaidPayment` و تراکنش D1 انجام شود.
- هیچ endpoint پرداختی به Worker وصل نشده و checkout خاموش است.

## نیاز مالک برای تکمیل اتصال sandbox
1. ثبت‌نام و احراز هویت پذیرنده در زرین‌پال.
2. دریافت Merchant ID آزمایشی/واقعی از پنل زرین‌پال؛ مقدار را در چت یا GitHub نفرستید.
3. اعلام اینکه حساب زرین‌پال و دامنه/سایت معرفی‌شده برای فعالیت سهمینو تأیید شده‌اند.
4. پس از آماده‌شدن Worker خصوصی، Merchant ID را فقط با secret binding امن در محیط sandbox ثبت کنید.

## وضعیت واقعی اتصال در HEAD فعلی
- در `server/worker-api.mjs` فقط مسیرهای مشاهده سفارش، ایجاد سفارش معلق و مشاهده وضعیت اشتراک وجود دارند.
- مسیر `POST /api/v1/me/prepaid-checkout` در Worker تعریف نشده است.
- مسیر `GET /api/v1/payments/zarinpal/callback` در Worker تعریف نشده است.
- جدول `sahmino_payment_intents` در schema وجود دارد، اما صرف وجود جدول به معنی ایجاد/ثبت intent در زمان checkout نیست.
- `settleVerifiedPrepaidPayment` یک primitive تسویه مستقل است؛ در Worker به callback زرین‌پال متصل نشده است.
- پنل حساب فعلاً سفارش معلق را می‌سازد و URL پرداخت دریافت یا کاربر را به درگاه هدایت نمی‌کند.
- بنابراین هیچ پرداختی از مسیر وب قابل انجام نیست و سفارش معلق نباید Pro را فعال کند.

## متغیرهای محیطی لازم در Worker خصوصی
- `ZARINPAL_ENABLED=false` تا پایان تست Sandbox
- `ZARINPAL_SANDBOX=true` برای endpointهای sandbox؛ در محیط production فقط پس از تأیید پذیرنده false شود
- `ZARINPAL_MERCHANT_ID` فقط با secret binding
- `ZARINPAL_CALLBACK_URL` نشانی HTTPS دقیق Worker برای callback
- `PREPAID_ORDERS_ENABLED=false` تا اجرای migration و تست D1
- `SAHMINO_OTP_ENABLED=true` و bindingهای OTP فقط در محیط تست خصوصی
- `PWA_ORIGIN` دقیقاً `https://raminhashemi1.github.io`

نمونه تنظیم secret (پس از ساخت Worker و فقط در محیط خصوصی):
`npx wrangler secret put ZARINPAL_MERCHANT_ID`

## گام‌های باقی‌مانده برای تکمیل اتصال Sandbox
1. پیاده‌سازی مسیر checkout در Worker با احراز نشست OTP، Origin مجاز، CSRF، ساخت/بازیابی سفارش معلق و درج یکتای payment intent.
2. پیاده‌سازی callback عمومی و محدود به authority؛ خواندن intent و سفارش از D1 و verify سمت سرور.
3. فراخوانی settlement فقط پس از verify تازه با کد 100 و مبلغ منطبق؛ رسیدگی امن به callback تکراری و وضعیت‌های ناموفق.
4. افزودن آزمون‌های Worker برای origin/CSRF، سفارش متعلق به کاربر، authority ناشناخته، مبلغ نادرست، callback تکراری، verify=101، لغو و اختلال شبکه.
5. Provision کردن Worker خصوصی و D1 آزمایشی با مجوز مالک، اجرای migration، ثبت Merchant ID فقط با secret binding و تست واقعی sandbox.

تا پایان این مراحل checkout باید خاموش بماند؛ در حال حاضر هیچ پذیرنده یا Merchant ID به مخزن متصل نشده است.
