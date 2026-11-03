# سهام‌بان — جمع‌بندی تحویل و وضعیت انتشار (۳ نوامبر ۲۰۲۶)

## تحویل قابل استفاده
- صفحه نصب PWA: https://raminhashemi1.github.io/sahamban/install.html
- اجرای برنامه: https://raminhashemi1.github.io/sahamban/
- مخزن: https://github.com/Raminhashemi1/sahamban

این محصول PWA است؛ APK امضاشده یا برنامهٔ منتشرشده در App Store نیست.

## شواهد انتشار و CI
در اجرای GitHub Actions با شناسه‌های زیر، نتیجه‌ها success بوده‌اند:
- Pages build/deploy: https://github.com/Raminhashemi1/sahamban/actions/runs/41673459090
- Smoke + Browser: https://github.com/Raminhashemi1/sahamban/actions/runs/41673458811
- WebKit mobile proxy: https://github.com/Raminhashemi1/sahamban/actions/runs/41673458673
- Technical Indicators v50: https://github.com/Raminhashemi1/sahamban/actions/runs/41673459838
- Professional Risk v49: https://github.com/Raminhashemi1/sahamban/actions/runs/41673458774
- 100-holding lifecycle v127: https://github.com/Raminhashemi1/sahamban/actions/runs/41673459102
- 20-holding lifecycle v121: https://github.com/Raminhashemi1/sahamban/actions/runs/41673458684
- Quote-basis/atomicity v122: https://github.com/Raminhashemi1/sahamban/actions/runs/41673458773
- Broker safe amounts v124: https://github.com/Raminhashemi1/sahamban/actions/runs/41673458667
- PWA asset inventory v125: https://github.com/Raminhashemi1/sahamban/actions/runs/41673458679

## قابلیت‌های مستند در نسخه فعلی
- ورود/نگهداری محلی و پشتیبان‌گیری/بازیابی سبد در مرورگر.
- دریافت دستی قیمت پایانی TSETMC؛ دریافت قیمت، تاریخ و نمادها باید اعتبارسنجی شود. دریافت ناقص نباید به‌عنوان قیمت روز کامل نمایش داده شود.
- محاسبه وزن، HHI و سناریوهای افت فرضی در ماژول مدیریت ریسک.
- SMA20، RSI14 و MACD(12,26,9) بر پایه تاریخچهٔ قیمت پایانی معتبر؛ در نبود تاریخچه کافی، عدد ساختگی نباید نمایش داده شود.
- این قابلیت‌ها ابزار توصیفی/تحلیلی‌اند و پیش‌بینی قطعی یا توصیه شخصی خرید/فروش نیستند.

## وضعیت داده زنده
گردش‌کار زمان‌بندی‌شدهٔ فقط‌خواندنی TSETMC v135 در اجرا با شناسه
https://github.com/Raminhashemi1/sahamban/actions/runs/41673458753
با وضعیت `UNVERIFIED_NETWORK` و خطای `UND_ERR_CONNECT_TIMEOUT` روبه‌رو شد. موفقیت خود Workflow فقط صحت اجرای تست و ذخیرهٔ نتیجه را نشان می‌دهد؛ **اتصال زنده، تازگی قیمت یا صحت داده بازار PASS نشده است**.

## اصلاح اعتبارسنجی تاریخ بازار — v127
- مقایسه تاریخ quote با تاریخ محلی دستگاه به منطقه زمانی `Asia/Tehran` منتقل شد تا اختلاف روز در بازه نیمه‌شب UTC باعث تشخیص اشتباه آینده/قدیمی بودن قیمت نشود.
- آزمون‌های رگرسیون برای عبور از نیمه‌شب UTC، روز قبل تهران و رد تاریخ آینده/قدیمی اضافه شد: `tests/market-date-tehran-v127.test.cjs`.
- کلید فایل `app.js` در HTML و Service Worker به `v127.0` تغییر کرد. برای سازگاری با آزمون‌های قبلی، namespace کش ثابت `sahamban-static-v103-0` حفظ شده است.
- آزمون جدید `tests/market-date-tehran-v127.test.cjs` در اجرای [Smoke tests](https://github.com/Raminhashemi1/sahamban/actions/runs/41689744516) موفق شد؛ کل job آزمون‌های Node در همان workflow نیز موفق است.
- build و deploy مربوط به همین commit در [Pages deployment](https://github.com/Raminhashemi1/sahamban/actions/runs/41689743749) موفق شده‌اند.
- آزمون مرورگر Chromium و آزمون WebKit در زمان ثبت این سند هنوز در حال اجرا هستند؛ موفقیت آزمون موبایل فیزیکی از این CI قابل استنتاج نیست.

## موارد پذیرش باز
1. تأیید پایدار منبع داده در ساعات معامله تهران و تطبیق قیمت/تاریخچه با مرجع مستقل.
2. آزمون VoiceOver فارسی روی iPhone فیزیکی.
3. آزمون TalkBack فارسی روی Android فیزیکی.
4. اندازه‌گیری کارایی روی Android کم‌حافظه و iOS واقعی.
5. تأیید کاربر از نصب و اجرای نسخه روی دستگاه خودش.

## نتیجه انتشار
وضعیت محصول: **PWA منتشرشده و قابل نصب؛ پذیرش خودکار CI موفق؛ پذیرش میدانی و تأیید داده زنده باز**.

تا زمانی که موارد باز شواهد قابل تکرار نداشته باشند، نباید محصول را «۱۰۰٪ تکمیل‌شده»، «قیمت زنده تأییدشده» یا «توصیه‌گر معاملاتی آماده اتکا» معرفی کرد.

## حفاظت از اطلاعات
فایل خصوصی پشتیبان کارگزاری کاربر نباید در مخزن عمومی یا artifactهای CI قرار گیرد. آزمون‌های مخزن باید از داده مصنوعی استفاده کنند. هیچ معامله‌ای توسط این برنامه انجام نمی‌شود.
