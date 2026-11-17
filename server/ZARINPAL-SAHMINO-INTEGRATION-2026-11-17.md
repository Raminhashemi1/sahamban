# اتصال زرین‌پال سهمینو — مرحله اول

وضعیت: آداپتور سروری و آزمون واحد ثبت شده؛ هنوز به Worker وصل یا فعال نشده است.

## انتخاب ارائه‌دهنده
زرین‌پال به‌عنوان مسیر اول پرداخت وب انتخاب شد. این انتخاب به معنی صدور پذیرندگی یا تأیید فعالیت توسط ارائه‌دهنده نیست.

## اجزای ثبت‌شده
- `server/zarinpal-gateway.cjs`: آداپتور REST نسخه v4 برای ایجاد درخواست و verify.
- `tests/zarinpal-gateway.test.cjs`: آزمون‌های ساخت درخواست، مبلغ ریالی، callback امن، پاسخ verify و رد verify تکراری.
- `server/d1-sahmino-subscription-v2.sql`: جدول `sahmino_payment_intents` برای نگاشت یکتای authority به سفارش.

## رفتار امنیتی
- مبلغ فقط از سفارش سرور و کاتالوگ مصوب خوانده می‌شود (IRR؛ ۱۵۰٬۰۰۰ تومان = ۱٬۵۰۰٬۰۰۰ ریال).
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

## اتصال ثبت‌شده در شاخه توسعه
- `POST /api/v1/me/prepaid-checkout`: فقط با نشست OTP معتبر، Origin مجاز و CSRF token سفارش را با مبلغ سرور می‌سازد و درخواست زرین‌پال می‌فرستد.
- `GET /api/v1/payments/zarinpal/callback`: authority را فقط از جدول intent می‌خواند، مبلغ و پلن را از سفارش D1 می‌گیرد، verify سرور به سرور را انجام می‌دهد و فقط کد 100 را به settlement می‌دهد.
- Settlement به جدول‌های v2 سهمینو متصل است و اعتبار را با اضافه‌کردن روزهای پلن به بیشینه تاریخ فعلی/امروز به‌روزرسانی می‌کند.
- callback صرفاً redirect کاربر نیست؛ redirect بدون verify هرگز اشتراک را فعال نمی‌کند.
- خطای ایجاد درخواست یا انصراف از پرداخت، سفارش معلق را لغو می‌کند.
- رابط پنل اکنون دکمه سفارش را به مسیر checkout متصل می‌کند.

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

## گام‌های باقی‌مانده برای تست Sandbox
1. Provision کردن Worker خصوصی و D1 آزمایشی و اعمال `server/d1-sahmino-subscription-v2.sql`.
2. افزودن Merchant ID آزمایشی با secret binding و تنظیم callback URL.
3. اجرای CI و رفع هر خطا.
4. ورود OTP، ایجاد سفارش پنج پلن، انتقال به Sandbox، callback، verify و کنترل افزایش دقیق روزهای اعتبار.
5. تست callback تکراری، callback جعلی، مبلغ نامنطبق، پرداخت لغوشده و اختلال شبکه.

تا پایان این مراحل checkout باید خاموش بماند؛ در حال حاضر هیچ پذیرنده یا Merchant ID به مخزن متصل نشده است.
