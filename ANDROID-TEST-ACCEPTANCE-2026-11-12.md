# چک‌لیست پذیرش بسته آزمایشی اندروید سهام‌بان

**وضعیت:** APK آزمایشی ساخته شده؛ پذیرش دستگاه واقعی هنوز انجام نشده است.

## شاهد ساخت

- اجرای موفق Android CI: https://github.com/Raminhashemi1/sahamban/actions/runs/43295718459
- فایل تستی: `sahamban-android-pilot-debug-UNSIGNED-FOR-STORE`
- لینک artifact در خود GitHub: https://github.com/Raminhashemi1/sahamban/actions/runs/43295718459/artifacts/13979347532
- SHA-256 فایل `app-debug.apk` در این اجرا: `112d0ebba6ab7c91ffa11fe96701e4b29596712c6ffc45964d65d6562ddccfad`
- build: Android SDK 35، Gradle 8.11.1، AGP 8.9.2، Java 17؛ ساخت `assembleDebug` و تست origin/path هر دو موفق.
- این APK دارای امضای **debug** و شناسه آزمایشی `ir.sahamban.pilot` است؛ **برای انتشار مارکت، پرداخت، یا داده واقعی کاربران مناسب نیست**.

## خروجی جدید قابل نصب برای آزمون ساختگی v0.3.0 (۱۳ نوامبر ۲۰۲۶)

- GitHub Actions: [اجرای موفق ساخت Android debug شماره 43304736011](https://github.com/Raminhashemi1/sahamban/actions/runs/43304736011) روی commit \`38f0c3fe8df768cd8228286873b92e8b8e17c03c\`؛ \`:app:assembleDebug\` و Java policy test موفق.
- artifact: [شماره 13983985808](https://github.com/Raminhashemi1/sahamban/actions/runs/43304736011/artifacts/13983985808)؛ نام \`sahamban-android-pilot-debug-UNSIGNED-FOR-STORE\`، اعتبار محدود تا ۱۹ نوامبر ۲۰۲۶ بر اساس خروجی GitHub.
- SHA-256 خود فایل \`app-debug.apk\` در خروجی CI: \`8b85aeed12f6dcc835b43726a41838e15d27b402948dbb872723b476827753d0\`. این digest متعلق به APK است، نه فایل ZIP artifact.
- **استفاده:** فایل را از اجرای GitHub دریافت و در گوشی آزمایشی نصب کنید؛ در فهرست برنامه‌ها، آیکن دوم «سهام‌بان - آزمون پشتیبان ساختگی» را باز کنید. در دو مسیر «پشتیبان محلی» و «سبد ریسک»، ذخیره/لغو/بازخوانی فایل JSON را امتحان و PASS/FAIL را ثبت کنید. این صفحه از اینترنت و اطلاعات شخصی استفاده نمی‌کند.
- نتیجه ساخت موفق **به معنی PASS آزمون روی گوشی نیست**. هیچ نتیجه فیزیکی تأییدشده‌ای در زمان نگارش این بند ثبت نشده؛ \`PHYSICAL_DEVICE_UNVERIFIED\`، \`PWA_REAL_BACKUP_UNVERIFIED\` و \`MARKET_RELEASE_BLOCKED\` حفظ شوند.

## روش بررسی بدون اطلاعات خصوصی

۱. فایل artifact را از صفحه اجرای GitHub دریافت، ZIP را باز و APK آزمایشی را روی یک دستگاه اندروید واقعی نصب کنید. پیش از نصب فقط به این منبع رسمی اعتماد کنید؛ فایل APK از پیام‌رسان یا منبع ناشناس دریافت نکنید. نیازی به حذف نسخه PWA موجود نیست.

۲. **فقط یک سبد ساختگی** برای آزمون بسازید. داده‌های قبلی Chrome/PWA **خودکار به WebView منتقل نمی‌شوند**؛ برنامه وب و پوسته اندروید دارای فضای ذخیره‌سازی جداگانه هستند.

۳. نتایج موارد زیر را با PASS/FAIL/UNVERIFIED ثبت کنید:
- نصب و اجرای سرد، صفحه آغاز و نمایش فارسی/RTL
- بازشدن صفحات داخل `/sahamban/` و خروج لینک HTTPS خارجی به مرورگر
- جست‌وجوی نماد و جابه‌جایی نمای سبد ساختگی ۲۰ و ۱۰۰ دارایی
- **پشتیبان‌گیری به فایل و بازیابی از همان فایل**؛ امکان دانلود blob در WebView هنوز تأیید نشده است و احتمالاً نیاز به اصلاح دارد
- کارکرد در شبکه کند، قطع اینترنت، اجرای آفلاین و بازگشت اتصال
- بزرگ‌نمایی فونت، لمس و پیمایش، دکمه بازگشت اندروید و TalkBack فارسی

۴. مدل دستگاه، نسخه Android و Android System WebView، تاریخ و نتیجه هر آزمون را بدون اطلاعات مالی یا هویتی ثبت کنید. Screenshot حاوی سبد/شماره حساب واقعی ارسال نکنید.

## مسیر جدید ذخیره JSON در شاخه feta (آزمایشی؛ بدون تأیید میدانی)

- کد جدید `android-pilot/app/src/main/java/ir/sahamban/pilot/BackupExportBridge.java` از `WebViewCompat.addWebMessageListener` با مبدأ دقیق HTTPS و درخواست فقط از قاب اصلی در مسیر `/sahamban/` استفاده می‌کند. برای ذخیره فایلِ JSON، `ACTION_CREATE_DOCUMENT` اجرا می‌شود تا **کاربر محل فایل را انتخاب کند**؛ دسترسی گسترده فایل/گالری یا `addJavascriptInterface` فعال نمی‌شود. قالب و نام دو فایل مجاز و حجم ۲۵۶ کیلوبایت محدود هستند.
- `native-backup-export-v1.js` برای نسخه مرورگر، دانلود `blob:` را حفظ می‌کند ولی آن را «ذخیره قطعی» اعلام نمی‌کند. برای WebView آزمایشی بدون پشتیبانی WebMessage، خروجی بدون ادعای موفقیت متوقف می‌شود.
- **وابستگی مهم آزمایش:** APK همچنان نشانی نسخه منتشرشده GitHub Pages از `main` را باز می‌کند. برای آزمون عملی مسیر جدید، باید JS/HTML/Service Worker جدید با یکدیگر روی سایت قابل استفاده برای تست منتشر شده باشند؛ تا آن زمان، حتی APK تازه هم لزوماً مسیر جدید را اجرا نمی‌کند.
- موفقیت تست واحد، مرورگر CI، یا ساخت APK به معنی ذخیره فایل، بستن امن stream در همه دستگاه‌ها، پیدا کردن فایل در پوشه انتخاب‌شده، یا بازگردانی سالم نیست. فقط پس از آزمون روی گوشی واقعی با سبد ساختگی، در این سند `PASS` درج شود.
- سناریوهای ضروری: ذخیره پشتیبان محلی و سبد ریسک، بازکردن واقعی هر دو فایل JSON، بازیابی از سیستم انتخاب فایل، رد/لغو محل ذخیره، قطع اتصال و تکرار، WebView فاقد WebMessage، تغییر مسیر/iframe نامعتبر، داده بزرگ‌تر از سقف، و نگهداری نسخه PWA قبلی. **محتوای واقعی هیچ سبدی را به Issue/Actions/GitHub ندهید.**

## آزمون مستقل آفلاین نسخه آزمایشی 0.3.0 در شاخه feta

- **امکان جدید صرفاً در APK دیباگ:** یک آیکن دوم با عنوان «سهام‌بان - آزمون پشتیبان ساختگی» ایجاد شده است. این صفحه از HTML داخلی بسته با `loadDataWithBaseURL` و همان مبدأ HTTPS مجاز اجرا می‌شود، ارتباط شبکه را کاملاً مسدود و DOM storage را غیرفعال می‌کند؛ از سبد واقعی یا حساب کاربر هیچ داده‌ای نمی‌خواند.
- در این صفحه ابتدا «ذخیره پشتیبان محلی ساختگی» را انتخاب و فایل JSON را با انتخابگر اندروید در مسیر دلخواه ذخیره کنید؛ سپس از قسمت «انتخاب فایل JSON ذخیره‌شده»، همان فایل را باز کنید. `PASS` فقط پس از پاسخ موفق ذخیره، خواندن فایل و تطبیق دقیق محتوای همان تلاش نمایش داده می‌شود. یک شناسه تصادفی منحصربه‌فرد در هر نمونه قرار می‌گیرد تا فایل قدیمی به‌اشتباه موفق گزارش نشود.
- همین روند را برای «ذخیره پشتیبان سبد ریسک ساختگی» و همچنین حالت لغو ذخیره/فایل قدیمی تکرار کنید. آزمون در حالت قطع اینترنت هم باید قابل اجرا باشد؛ پاسخ واقعی گوشی و مشخصات Android/WebView ثبت شوند.
- **مرز پذیرش:** حتی اگر این صفحه روی گوشی PASS شود، تنها مسیر **Native WebMessage + Android SAF + بازخوانی فایل ساختگی** اثبات می‌شود؛ نه خروجی/بازیابی داده واقعی PWA، نه اتصال نسخه وب `feta` به سایت منتشرشده، و نه انتشار مارکت. همه این موارد تا مدارک مستقل `UNVERIFIED` هستند.
- این صفحه فقط در **debug source set** قرار دارد و در Release نباید بسته‌بندی شود. فایل JSON و اسکرین‌شات سبد واقعی نباید در GitHub آپلود شود. اگر نسخه آزمایشی قبلی با گواهی debug متفاوت نصب شده باشد، فقط همان پوسته آزمایشی (بدون داده شخصی) ممکن است نیاز به حذف داشته باشد؛ PWA مرورگر حذف نشود.

## سخت‌گیری بازخوانی فایل SAF در نسخه 0.3.1 آزمایشی

- در شاخه `feta`، مسیر Native پس از انتخاب فایل JSON از `openOutputStream(destination, "wt")` استفاده می‌کند تا درخواست بازنویسی و کوتاه‌کردن فایل صریح باشد. طبق مستندات رسمی Android، حالت `"w"` الزاماً فایل قبلی را کوتاه نمی‌کند: https://developer.android.com/reference/android/content/ContentResolver
- پس از **بسته‌شدن موفق خروجی**، محتوا با `ContentResolver.openInputStream(destination)` بازخوانی می‌شود؛ `BackupFileVerifier` باید همه بایت‌های مورد انتظار و انتهای واقعی فایل را مطابقت دهد. اگر فایل قدیمی دنباله داشته باشد، محتوا تغییر کند، خواندن ناممکن شود یا داده ناقص باشد، پاسخ `failed` است و `saved` صادر نمی‌شود.
- آزمون‌های pure Java برای فایل فارسی UTF-8، محتوای دست‌کاری‌شده، فایل ناقص/دارای دنباله، داده حداکثر ۲۵۶ KiB، stream قطع‌شده و provider بی‌پاسخ افزوده شد. GitHub CI باید همه این آزمون‌ها و ساخت APK را روی **SHA مشخص** موفق گزارش کند؛ نتیجه نهایی در حافظه پروژه ثبت می‌شود.
- حتی بازخوانی موفق، دوام بلندمدت داده در سرویس‌دهنده ابری یا موفقیت واقعی بازیابی توسط کاربر را اثبات نمی‌کند. آزمون جداگانه گوشی فیزیکی با فایل کاملاً ساختگی هنوز لازم است. نسخه `0.3.1-pilot` صرفاً debug است.

## ریسک مشخص در خروجی فایل پشتیبان

در `app.js` و `local-backup-v148.js`، دانلود پشتیبان با `Blob`، `URL.createObjectURL` و لینک `a.download` ساخته می‌شود. Android WebView همیشه این نوع `blob:` download را مثل Chrome ذخیره نمی‌کند. بنابراین خروجی گرفتن پشتیبان در APK **حتی با موفقیت build، تا آزمون موفق فایل واقعیِ ساختگی روی دستگاه تأیید نشده است**. در صورت شکست، باید راهکار امن صادرات فایل/اشتراک‌گذاری را در بسته نهایی پیاده‌سازی و مجدداً آزمون کنیم.

## ممنوعیت اعلام آمادگی انتشار

تا قبل از پذیرش واقعی تمامی آزمون‌ها، انتخاب شناسه بسته و گواهی **نهایی متعلق به مالک**، تعیین نحوه به‌روزرسانی، تأیید سیاست هر دو مارکت و تهیه مدارک ناشر، وضعیت عرضه مایکت و کافه‌بازار **BLOCKED** باقی می‌ماند. این بسته WebView است؛ TWA نیست و اثبات پذیرش هر مارکت محسوب نمی‌شود.

## اصلاح سقف فایل سبد و timeout پل Native — ۱۳ نوامبر ۲۰۲۶

- در مسیر بازیابی سبد ریسک `app.js`، محدودیت ورودی قبلی ۳۰٬۰۰۰ بایت با سقف مشترک `SahambanBackupExportClient.MAX_BYTES` یعنی ۲۵۶ KiB جایگزین شد. اعتبارسنجی محتوایی همچنان سقف ۲۵٬۰۰۰ کاراکتر برای `data` و بررسی قالب/مقادیر را حفظ می‌کند. این تغییر از ردکردن بی‌دلیل JSON فارسی UTF-8 که بیش از ۳۰ KB بایت ولی در سقف مجاز است جلوگیری می‌کند.
- برای cache bust، ارجاع `app.js` در `index.html` و `sw.js` از `v=127.1` به `v=127.2` تغییر کرد؛ آزمون‌های وابسته به نسخه نیز همگام شدند.
- `native-backup-export-v1.js` برای Native bridge وجود `removeEventListener` را الزامی می‌کند. اگر پاسخ اندروید تا پنج دقیقه نرسد، وضعیت `timeout` و پیام صریح «ذخیره تأیید نشده» برمی‌گردد و listener پاک می‌شود. این timeout نباید با ذخیره موفق اشتباه شود.
- تست‌های افزوده در `tests/native-backup-export-v1.test.cjs`: payload فارسی UTF-8 بزرگ‌تر از ۳۰ KB و کوچک‌تر از ۲۵۶ KiB، timeout پنج‌دقیقه‌ای، پاک‌شدن listener و رد bridge ناقص.
- خطای CI که پس از cache-bust در تست‌های قدیمی پیدا شد، فقط assertionهای ثابت `app.js?v=127.1` در `tests/technical-indicators-v50.test.cjs` و `tests/cache-refresh-v103.test.cjs` بود؛ هر دو به `v=127.2` همگام شدند. اجرای مستقل Technical Indicators برای commit `3c3323f9` در run `43307721964` با `success` پایان یافت.
- در زمان ثبت این یادداشت، Smoke و Browser روی commit `3c3323f9` در run `43307722017` هنوز در حال اجرا هستند؛ نتیجه نهایی آن‌ها بعداً باید بررسی شود. Android debug CI برای کد Java قبلی در run `43307476823` موفق بود؛ در این فاصله فایل Java اندروید تغییر نکرده، ولی این شاهد جایگزین آزمون وب جدید یا گوشی واقعی نیست.
- کد/تست‌ها روی `feta` و PR #166 draft هستند. هیچ انتشار عمومی/Pages، merge به `main` یا تغییر داده کاربر انجام نشده است. گوشی واقعی و end-to-end با PWA زنده هنوز `UNVERIFIED`.

## نسخه آزمایشی 0.3.2 برای آزمون بازخوانی انتخابگر — ۱۳ نوامبر ۲۰۲۶

- **مسئله کشف‌شده:** در صفحه HTML آزمون آفلاین، `WebSettings.setAllowContentAccess(false)` می‌توانست خواندن URI فایل انتخاب‌شده توسط `<input type="file">` را مسدود کند و `FAIL` نادرست ایجاد کند. تنظیم **فقط** در `android-pilot/app/src/debug/.../BackupSelfTestActivity.java` به `true` تغییر کرد؛ `setAllowFileAccess(false)`، `setBlockNetworkLoads(true)`، DOM storage غیرفعال، CSP محدود و توقف ناوبری همچنان برقرارند. این استثنا به صفحه عمومی PWA و Activity اصلی اضافه نشده است.
- انتخابگر `ACTION_OPEN_DOCUMENT` اکنون `FLAG_GRANT_READ_URI_PERMISSION` می‌خواهد و فقط **یک** URI با scheme `content` را به WebView صفحه آزمایش برمی‌گرداند؛ file URI و انتخاب چندگانه رد می‌شوند.
- کد/تست‌های `tests/android-pilot-wrapper.test.cjs` و چک نسخه در Android CI هماهنگ شدند؛ شناسه debug APK به `ir.sahamban.pilot` با `versionCode=5` و `versionName=0.3.2-pilot` تغییر کرد.
- **شاهد ساخت:** [Android Actions run 43368023049](https://github.com/Raminhashemi1/sahamban/actions/runs/43368023049) روی commit `a7c6218092820908defdf4f32b9ae0d3885d588c` با `completed/success` به پایان رسید؛ بررسی باینری با `aapt`، ساخت debug و آزمون سیاست فایل موفق بود. Artifact [14010887614](https://github.com/Raminhashemi1/sahamban/actions/runs/43368023049/artifacts/14010887614)، انقضای تقریبی ۲۰ نوامبر ۲۰۲۶ طبق GitHub. SHA-256 فایل `app-debug.apk`: `776d8423ee7452dd29fd00f01221ebcec588b4cdc741a5e7809b594122516430`.
- آزمون Smoke/Brower تازه: [run 43368107264](https://github.com/Raminhashemi1/sahamban/actions/runs/43368107264) روی commit `ac5103d7872403ddee670089587e134920659aff`؛ job `smoke` با `success` پایان یافت؛ job `browser` در زمان اولین ثبت هنوز در جریان بود. نسخه شکست‌خورده CI روی commit قدیمی‌تر به‌دلیل انتظار تست قدیمی برای `setAllowContentAccess(false)` بود و پس از هماهنگی تست، Smoke تازه موفق شد. نتیجه Browser باید جداگانه تأیید شود.
- **گام دستگاه:** از [راهنمای فارسی آزمون روی گوشی](https://github.com/Raminhashemi1/sahamban/blob/feta/ANDROID-PHONE-TEST-RUNBOOK-2026-11-13.md) پیروی کنید. آزمایش save/readback دو نوع فایل، Cancel، فایل قدیمی، airplane mode و TalkBack فقط با داده ساختگی باشد. تا این لحظه **هیچ PASS گوشی واقعی** ارائه نشده؛ `PHYSICAL_DEVICE_UNVERIFIED`، `REAL_PWA_BACKUP_UNVERIFIED` و `MARKET_RELEASE_BLOCKED` برقرارند.

## آزمون واقعی ناموفق ذخیره محلی و اصلاح آزمایشی 0.3.3 — ۱۳ نوامبر ۲۰۲۶

- کاربر نصب نسخه آزمایشی را روی گوشی اندرویدی تأیید و دو تصویر از صفحه «آزمون محلی خروجی و بازیابی فایل» فرستاد. متن فارسی نمایش داده شده است؛ در بخش وضعیت، «درخواست ذخیره ارسال شد. محل فایل را در انتخابگر اندروید تعیین کنید» دیده می‌شود. سپس کاربر صریحاً گزارش کرد **«ذخیره پشتیبان محلی کار نمیکنه»**. بنابراین **`LOCAL_SYNTHETIC_SAVE = FAIL / no confirmed file`** و `LOCAL_SYNTHETIC_READBACK = UNVERIFIED` هستند؛ مشخص نیست chooser اصلاً باز شده یا خیر و مدل/نسخه Android هنوز گزارش نشده‌اند. صرف بازشدن صفحه یا `postMessage`، ذخیره واقعی را اثبات نمی‌کند.
- **فرضیه فنی، نه علت اثبات‌شده:** صفحه Debug با `loadDataWithBaseURL(FIXTURE_URL, html, ..., null)` بارگذاری می‌شد. طبق [مستندات رسمی WebView](https://developer.android.com/reference/android/webkit/WebView#loadDataWithBaseURL(java.lang.String,java.lang.String,java.lang.String,java.lang.String,java.lang.String)) مقدار null برای `historyUrl` می‌تواند `about:blank` باشد. `BackupExportPolicy.acceptsSource` علاوه بر origin دقیق، `view.getUrl()` را بررسی می‌کند و در این حالت امکان رد درخواست پیش از بازشدن `ACTION_CREATE_DOCUMENT` وجود دارد. [راهنمای رسمی loadDataWithBaseURL](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content) نیز `historyUrl = baseUrl` را توصیه می‌کند.
- **اصلاح Debug-only:** پارامتر تاریخچه به `FIXTURE_URL` تغییر کرد، بدون دست‌زدن به `BackupExportPolicy` یا نرم‌کردن origin/path. صفحه آزمون پس از ۱۲ ثانیه بدون پاسخ از Android اخطار «هیچ فایل تأیید نشده است» می‌دهد؛ پاسخ ردشده native با requestId خالی نیز به‌صورت خطا نشان داده می‌شود. PASS فقط پس از بازخوانی دقیق فایل ساختگی با nonce تازه ممکن است. آزمون‌های `tests/android-backup-self-test.test.cjs` و `tests/android-pilot-wrapper.test.cjs` برای این مسیر توسعه یافتند.
- **APK جدید:** `0.3.3-pilot` با `versionCode=6` و package آزمایشی `ir.sahamban.pilot`. [Android build #43373754679](https://github.com/Raminhashemi1/sahamban/actions/runs/43373754679) روی commit `b1e297bbca15132ab4dc42d21da2047bd807a251` با `completed/success` تمام شد. [Artifact #14013262469](https://github.com/Raminhashemi1/sahamban/actions/runs/43373754679/artifacts/14013262469) تا `2026-11-20T05:43:15Z` طبق GitHub معتبر است؛ SHA-256 خود `app-debug.apk`: `217d60ff2ea2585562f29c003fe3d16dd4fcae0964b81bba034b9df69d12a716`.
- **آزمون وب/JS:** job Smoke در [run #43373781278](https://github.com/Raminhashemi1/sahamban/actions/runs/43373781278) برای commit `f54d64fdd3e0867dbd393fb7aa74d901c5470186` موفق بود؛ Browser نیز پس از بررسی مجدد `completed/success` شد؛ هر دو job Smoke و Browser موفق‌اند، اما آزمون فیزیکی این نسخه هنوز انجام نشده است.
- **اقدام میدانی بعدی:** کاربر باید ZIP artifact 0.3.3 را استخراج و `app-debug.apk` را روی گوشی نصب کند. اگر به‌روزرسانی به‌دلیل تفاوت امضای debug شکست خورد، **فقط پس از اطمینان از وجودنداشتن داده واقعی در برنامه pilot** نسخه آزمایشی `ir.sahamban.pilot` را حذف و تازه نصب کند؛ Chrome/PWA عمومی و اطلاعات موجود را دست نزند. آیکن آزمون دوم را باز کند، فقط ذخیره فایل محلی ساختگی را بزند و گزارش کند که پنجره انتخاب محل باز شد یا پیام رد/انتظار ظاهر شد. تا حصول PASS واقعی، `PHYSICAL_DEVICE_UNVERIFIED` و `MARKET_RELEASE_BLOCKED` پابرجاست؛ این تغییر تضمین رفع اشکال نیست.
