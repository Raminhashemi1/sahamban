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

## وضعیت داده زنده — آخرین شواهد ۳ نوامبر ۲۰۲۶
- TSETMC v135: [اجرای فقط‌خواندنی](https://github.com/Raminhashemi1/sahamban/actions/runs/41688389175) از نماد عمومی «فولاد» نمونه گرفت، اما artifact با وضعیت `UNVERIFIED_NETWORK` و خطای `UND_ERR_CONNECT_TIMEOUT` ثبت شد.
- CODAL v136: [اجرای فقط‌خواندنی](https://github.com/Raminhashemi1/sahamban/actions/runs/41685986223) برای نماد «ونوین» همین وضعیت شبکه را با خطای `UND_ERR_CONNECT_TIMEOUT` ثبت کرد.
- آزمون parser آفلاین CODAL در همان workflow موفق شد؛ این فقط JSON/XML fixtureها را اعتبارسنجی می‌کند و اتصال واقعی کدال را ثابت نمی‌کند.
- موفقیت workflowها یعنی تشخیص و ثبت کنترل‌شدهٔ خطای شبکه، نه دریافت قیمت یا اطلاعیه واقعی. **هیچ قیمت زنده یا داده کدال در این اجراها تأیید نشده است.**
- صفحه تشخیص مستقیم مرورگر: https://raminhashemi1.github.io/sahamban/market-connectivity-test.html . کاربر می‌تواند آن را روی گوشی/رایانه و شبکه مجاز خودش باز کند و آزمون TSETMC و CODAL را اجرا کند؛ صفحه فقط نمادهای واردشده/عمومی را می‌خواند و به سبد یا فایل کارگزاری دسترسی ندارد.
- REST API جدید TSETMC در اطلاعیه رسمی معرفی شده، اما مستندات فنی آن از محیط CI قابل واکشی نبود؛ تا زمان بررسی قرارداد رسمی و پاسخ واقعی read-only، endpointهای CDN فعلی صرفاً منبع مشاهده‌شده‌اند و نباید «قرارداد رسمی REST جدید» نامیده شوند.


## شواهد آزمون مرورگر روی گوشی — فولاد
- کاربر از اجرای صفحه `market-connectivity-test.html` روی گوشی تصویر نتیجه ارسال کرد.
- در خروجی صفحه، نماد دقیق «فولاد»، قیمت پایانی ۴٬۲۱۰ ریال و تاریخ بازار `20261103` نمایش داده شده و متن ابزار اعلام می‌کند قیمت پایانی با تاریخچه روزانه تطبیق داشته است.
- این شاهد نشان می‌دهد مسیر مرورگر گوشی به TSETMC توانسته قیمت پایانی و تاریخچه را دریافت و با هم تطبیق دهد؛ بنابراین Timeout در runnerهای GitHub را نمی‌توان به همه شبکه‌ها تعمیم داد.
- نتیجه تازگی همچنان `UNVERIFIED_OUTSIDE_SESSION` است؛ تصویر در خارج از ساعت معاملات گرفته شده و زمان آخرین معامله حداکثر ۱۵ دقیقه‌ای در جلسه معاملاتی تأیید نشده است.
- قیمت/تاریخ بالا فقط گزارش نتیجه همان اجرای آزمایش است، نه قیمت لحظه‌ای فعلی یا توصیه سرمایه‌گذاری.
- متن خروجی صفحه اصلاح شد تا سه وضعیت مستقل را روشن نشان دهد: اتصال TSETMC و دریافت داده، تطبیق قیمت با تاریخچه، و تازگی قیمت زنده. آزمون صفحه نیز برای این تفکیک به‌روزرسانی شد.

## اصلاح اعتبارسنجی تاریخ بازار — v127
- مقایسه تاریخ quote با تاریخ محلی دستگاه به منطقه زمانی `Asia/Tehran` منتقل شد تا اختلاف روز در بازه نیمه‌شب UTC باعث تشخیص اشتباه آینده/قدیمی بودن قیمت نشود.
- آزمون‌های رگرسیون برای عبور از نیمه‌شب UTC، روز قبل تهران و رد تاریخ آینده/قدیمی اضافه شد: `tests/market-date-tehran-v127.test.cjs`.
- کلید فایل `app.js` در HTML و Service Worker به `v127.0` تغییر کرد. برای سازگاری با آزمون‌های قبلی، namespace کش ثابت `sahamban-static-v103-0` حفظ شده است.
- آزمون جدید `tests/market-date-tehran-v127.test.cjs` در اجرای [Smoke tests](https://github.com/Raminhashemi1/sahamban/actions/runs/41689744516) موفق شد؛ کل job آزمون‌های Node در همان workflow نیز موفق است.
- build و deploy مربوط به همین commit در [Pages deployment](https://github.com/Raminhashemi1/sahamban/actions/runs/41689743749) موفق شده‌اند.
- آزمون مرورگر Chromium در [Smoke workflow](https://github.com/Raminhashemi1/sahamban/actions/runs/41689744516) موفق شد.
- آزمون خودکار WebKit در [WebKit mobile acceptance proxy](https://github.com/Raminhashemi1/sahamban/actions/runs/41689743934) موفق شد؛ این شبیه‌سازی/پروکسی CI است و جای آزمون روی iPhone یا Android فیزیکی را نمی‌گیرد.

## پایداری آزمون دارایی‌های PWA
- در اجرای public asset audit، یک فایل CSS با HTTP 503 موقت برگشت، در حالی که اجرای بعدی همان asset موفق بود. این مورد به‌عنوان نوسان گذرای CDN ثبت شد، نه خطای قطعی فایل.
- برای آزمون انتشار، retry محدود و فقط یک‌بار برای HTTP 5xx و خطاهای موقت شبکه (نه HTTP 429، برای رعایت rate limit) اضافه شد؛ خطاهای دائمی مانند HTTP 404 بدون retry شکست می‌خورند.
- منطق retry با آزمون‌های مستقل `tests/pwa-asset-retry-v125.test.cjs` پوشش داده شده و به workflow دارایی‌های PWA افزوده شده است. نتیجه CI این commit هنوز باید بررسی شود.

## اعتبارسنجی سخت‌گیرانه‌تر کدال و آزمون آخرین اجرا — ۳ نوامبر ۲۰۲۶
- در `tests/codal-search-quality.cjs` دروازهٔ اعتبار متادیتا افزوده شد: تطبیق دقیق نماد پس از نرمال‌سازی حروف فارسی/عربی، عنوان، شناسه رهگیری مثبت، تاریخ انتشار شمسی و حذف شناسه تکراری.
- همان منطق در صفحه `market-connectivity-test.html` اعمال شد تا نتیجه مرورگر گوشی از نتیجه runner ضعیف‌تر نباشد.
- آزمون‌های Node برای parser، اعتبارسنجی متادیتا و اعتبارسنجی صفحه مرورگر به workflow کدال اضافه شدند. در اجرای [CODAL v136](https://github.com/Raminhashemi1/sahamban/actions/runs/41693291561)، ۱۵ تست آفلاین در سه گروه با نتیجه ۱۵ موفق و صفر ناموفق اجرا شدند؛ خود workflow نیز success است.
- در همان اجرا، درخواست واقعی کدال همچنان `UNVERIFIED_NETWORK` با `UND_ERR_CONNECT_TIMEOUT` بود؛ سبز بودن workflow فقط ثبت کنترل‌شدهٔ این محدودیت و قبولی آزمون‌های آفلاین را نشان می‌دهد.
- آخرین اجرای [TSETMC v135](https://github.com/Raminhashemi1/sahamban/actions/runs/41693434970) نیز `UNVERIFIED_NETWORK` با `UND_ERR_CONNECT_TIMEOUT` ثبت کرد؛ هیچ قیمت زنده‌ای تأیید نشد.
- [Pages deployment](https://github.com/Raminhashemi1/sahamban/actions/runs/41693434234)، smoke tests، آزمون‌های چرخه سبد، ریسک، اندیکاتورها، مبنای قیمت، مبالغ کارگزاری، دارایی‌های PWA و WebKit proxy روی commit مستندات/اعتبارسنجی با نتیجه موفق پایان یافتند.
- این مرحله فقط کیفیت کنترل متادیتا و انتشار صفحه آزمایش را بهتر می‌کند؛ اصل گزارش مالی دریافت نشده و EPS/NAV/نسبت بنیادی یا سیگنال معاملاتی تأیید نشده است.

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
