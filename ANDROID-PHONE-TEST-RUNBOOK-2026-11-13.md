# راهنمای آزمون گوشی واقعی — سهام‌بان، پایلوت Android 0.3.4

**تاریخ تهیه:** ۱۳ نوامبر ۲۰۲۶  
**شاخه:** `feta`  
**وضعیت پذیرش فعلی:** `PHYSICAL_DEVICE_PARTIAL_ACCEPTANCE=PASS_LOCAL_RISK_AND_CANCEL_NO_FALSE_PASS`، `EXACT_APK_VERSION_FROM_SCREENSHOT_UNVERIFIED`، `REAL_PWA_BACKUP_UNVERIFIED`، `MARKET_RELEASE_BLOCKED`

این راهنما فقط برای APK دیباگ آزمایشی با شناسه مستقل `ir.sahamban.pilot.retest` و فایل‌های **ساختگی** است. هیچ‌گاه اطلاعات واقعی سبد، رمز، کد ملی، اطلاعات بانکی یا فایل JSON کاربران را در گزارش GitHub قرار ندهید. صفحه آزمایش دوم هیچ ارتباطی به اطلاعات موجود در Chrome/PWA ندارد.

## پیش از شروع

- برای نصب مستقل، نسخه `0.3.4-pilot` را از [artifact شماره 14013104846](https://github.com/Raminhashemi1/sahamban/actions/runs/43374677852/artifacts/14013104846) دریافت کنید. [اجرای ساخت Android شماره 43374677852](https://github.com/Raminhashemi1/sahamban/actions/runs/43374677852) موفق بوده است؛ این موفقیت **به معنی نصب یا ذخیره موفق روی گوشی نیست**. SHA-256 خود `app-debug.apk` برابر `05a5b4bbe661647dd5c5de2167521651e8f11214a5396cfdbe3110c733319b6a` است. فقط از منبع رسمی GitHub دریافت کنید.
- در گوشی با File Manager، فایل ZIP artifact دانلودی را استخراج کنید؛ `app-debug.apk` را نصب کنید. اگر اجازه نصب از همان برنامه لازم شد، فقط موقتاً برای آن منبع مجاز کنید و بعداً مجوز را ببندید.
- نسخه جدید دارای شناسه جداگانه `ir.sahamban.pilot.retest` است و می‌تواند **کنار** پایلوت قبلی `ir.sahamban.pilot` نصب شود؛ به حذف قبلی نیازی نیست. در لیست برنامه‌ها آیکن «سهام‌بان - آزمون پشتیبان ساختگی (نصب مستقل)» را باز کنید؛ Chrome و نسخه PWA قبلی را حذف یا پاک‌سازی نکنید.
- مدل دستگاه، نسخه Android و نسخه Android System WebView یا Chrome را یادداشت کنید. هیچ شناسه منحصربه‌فرد دستگاه/کاربر لازم نیست.

## آزمون اصلی

۱. آیکن **«سهام‌بان - آزمون پشتیبان ساختگی (نصب مستقل)»** را باز کنید؛ آیکن اصلی سهام‌بان برای این آزمون نیست و هنوز سایت عمومی `main` را باز می‌کند.

۲. روی «ذخیره پشتیبان محلی ساختگی» بزنید. در پنجره انتخاب محل ذخیره، یک پوشه معمولی مثل Downloads را انتخاب کنید. نام پیشنهادی `sahamban-local-backup-v1.json` را نگه دارید. ذخیره را تأیید کنید.

۳. از برنامه Files گوشی، موجودبودن فایل را بررسی کنید. به صفحه آزمایش برگردید، روی «انتخاب فایل JSON ذخیره‌شده» بزنید و **همین فایل تازه** را انتخاب کنید. انتظار: **`PASS`** فقط پس از خواندن دوباره و تطبیق متن فایل؛ پیام «Android saved» به تنهایی PASS نیست.

۴. همین مراحل را برای «ذخیره پشتیبان سبد ریسک ساختگی» با نام `sahamban-portfolio-backup.json` تکرار کنید. انتظار: **`PASS`**.

۵. آزمون لغو: یک ذخیره تازه را آغاز کنید و در انتخابگر Android دکمه بازگشت/Cancel بزنید؛ انتظار: **هیچ `PASS` جدیدی نمایش داده نشود**. اگر پس از لغو فایل قدیمی را از قسمت انتخاب فایل باز کنید، باز هم PASS نباید ظاهر شود.

۶. آزمون فایل قدیمی: یک ذخیره تازه برای همان نوع انجام دهید و بعد به جای فایل جدید، فایل JSON قبلی را انتخاب کنید. nonce هر ذخیره متفاوت است؛ انتظار: **`FAIL`** و نه PASS.

۷. حالت پرواز را روشن کنید و ذخیره و بازخوانی فایل ساختگی را تکرار کنید. صفحه داخلی APK باید بدون دسترسی به اینترنت کار کند. پس از پایان، حالت پرواز را خاموش کنید.

۸. نمایش فارسی، لمس دکمه‌ها، بزرگ‌نمایی فونت و در صورت امکان TalkBack فارسی را بررسی کنید.

## گزارش مختصر (بدون داده حساس)

| آزمون | نتیجه PASS / FAIL / UNVERIFIED | توضیح کوتاه غیرحساس |
| --- | --- | --- |
| اجرای صفحهٔ آزمون ساختگی روی گوشی | **PASS محدود** | Samsung S23 FE؛ اجرای صفحه و دو خروجی PASS مشاهده شد؛ **نسخه دقیق نصب‌شده 0.3.4 در خود تصویر تأیید نشده است** |
| ذخیره پشتیبان محلی | **PASS** | Samsung S23 FE؛ پیام موفق native و سپس PASS نهایی در تصویر کاربر |
| انتخاب و بازخوانی فایل محلی | **PASS** | فایل JSON یکتای همان تلاش؛ تطبیق دقیق متن و nonce در تصویر |
| ذخیره پشتیبان سبد ریسک | **PASS** | Samsung S23 FE؛ فایل ساختگی `test-risk-6.json` و پیام موفق Native |
| انتخاب و بازخوانی فایل سبد ریسک | **PASS** | فایل همان تلاش و پیام سبز تطبیق دقیق در تصویر کاربر |
| لغو ذخیره، بدون PASS | **PASS محدود** | تصویر جدید کاربر: «ذخیره لغو شد. PASS ثبت نشده است.»؛ مشاهده پنجره SAF و نبود فایل روی دیسک از خود تصویر اثبات نمی‌شود |
| فایل قدیمی، بدون PASS اشتباه | UNVERIFIED | |
| آزمون در حالت پرواز | UNVERIFIED | |
| فارسی/فونت/TalkBack | UNVERIFIED | |

**قالب گزارش:** مدل گوشی، Android، WebView/Chrome، شماره نسخه APK و وضعیت هر مورد. در صورت خطا فقط متن خطا/شماره مرحله را بفرستید، نه فایل JSON یا تصویر اطلاعات مالی.

## مرز نتیجه

این آزمون فقط مسیر **JavaScript WebMessage → انتخابگر Android SAF → ذخیره JSON → بازخوانی فایل ساختگی** را می‌سنجد. حتی PASS کامل آن تأیید واردکردن پشتیبان در وب‌اپ اصلی، سازگاری داده مالی واقعی، انتقال داده Chrome/PWA به WebView، دوام ابری فایل یا آمادگی انتشار مارکت نیست. تست انتهابه‌انتهای PWA نیاز به نسخه وب هماهنگ در یک محیط کنترل‌شده دارد؛ **بدون بازبینی و مجوز انتشار، شاخه `main` را تغییر ندهید**.

ثبت نتیجه واقعی پس از آزمون گوشی در `ANDROID-TEST-ACCEPTANCE-2026-11-12.md` و `PROJECT-MEMORY.md` انجام شود. مسئله #167 تا تأیید مستقل باز بماند.


**یادداشت میدانی ۱۳ نوامبر:** هر دو مسیر پشتیبان **محلی** (`test-ramin-5.json`) و **سبد ریسک** (`test-risk-6.json`) با فایل تازه و یکتا روی Samsung S23 FE و پیام سبز PASS تأیید شدند. انتخاب فایل قدیمی/نامرتبط قبلاً FAIL داد. موارد لغو، آفلاین، TalkBack و آزمون E2E نسخه وب واقعی PWA همچنان UNVERIFIED هستند. نتیجه دستگاه به معنی آمادگی انتشار مارکت نیست.


## 2026-11-13 — exact-head CI and physical-negative-path continuation checkpoint
- Live GitHub PR #166 `feta` HEAD before this documentation update: `1ec03b178dfb24e723866fee41aaa9b97820c4ff`, OPEN / Draft / unmerged. **12/12 exact-head check runs and 11/11 matching-head PR workflows completed/success**. Related PR #164 HEAD `e8d4253bbcf76ee01ef2c21a6598a50e3576145c`: **14/14 checks and 13/13 workflows completed/success**, OPEN / non-Draft / unmerged. Do **not** transfer those green results to the new documentation commit; query its own SHA.
- Examined **existing** Java `BackupExportBridge.onActivityResult` cancellation (result != RESULT_OK returns `cancelled`), debug fixture `savedContent=null` reset and terminal `cancelled` message, and already-existing `tests/android-backup-self-test.test.cjs` cancelled/failed case. The **synthetic unit-level fail-closed guard is already present**; no code/tests/Android APK rebuilt or retested here.
- Two real-device **limited** synthetic local + risk file save/exact readback PASS reports for Samsung S23 FE remain preserved from earlier user evidence. Running the fixture implies a test UI ran on the device; **the exact 0.3.4 package/version is not proven by the screenshot alone**. No user-supplied new physical result in this session: Cancel on real SAF picker, offline, TalkBack/RTL, actual PWA restore and publish eligibility remain **UNVERIFIED/BLOCKED**. Previous mismatch/oversize FAILs stay attributed to their own attempts and do not count as new tests.
- **One next device action:** without uninstalling or deleting existing PWA/data, open the installed **synthetic debug test launcher** on Samsung S23 FE, press `ذخیره پشتیبان محلی ساختگی`, then press Android **Back/Cancel** in the save-location picker **without choosing a file**. Record whether picker opened and whether UI shows `ذخیره لغو شد. PASS ثبت نشده است.` (or another exact error) and confirms **no new PASS**. Send only PASS/FAIL and non-sensitive error text; **do not send any JSON, holdings, identifiers, or actual saved file**. A clean CANCEL on physical phone is required to promote this specific field gate; no automatic inference from CI.
- Safety: `REAL_PWA_BACKUP_UNVERIFIED`, `MARKET_RELEASE_BLOCKED`; Issue #167 stays OPEN and PR #166 stays Draft. No main merge, public deployment, app-store publication, order, payment, holdings edit, or sensitive upload. Changes are documentation/status only, and must be logged in current SHA's CI after writing.

## 2026-11-13 — physical Android SAF cancel: no false PASS (user screenshot)
- **Evidence:** user-uploaded screenshot of the already used synthetic debug backup test page. The visible status is **`ذخیره لغو شد. PASS ثبت نشده است.`**; the file selector shows **`فایلی انتخاب نشده است`**. This matches the existing fixture's terminal `cancelled` branch in `backup-self-test.html`; no `PASS` is displayed. This is a **real-device UI observation, not a new automated test**. The screenshot is not committed to the public repository and contains no backup JSON.
- **Narrow field verdict:** `SYNTHETIC_SAF_CANCEL_NO_FALSE_PASS=PASS_OBSERVED` for the reported cancellation attempt, in the same Samsung S23 FE test sequence. The image **does not independently show the Android picker itself, establish the exact APK version, verify the OS/WebView version, or prove no physical file was created**; those specific claims remain `UNVERIFIED`. Earlier synthetic local and risk save+exact readback `PASS` results remain separately established.
- **GitHub pre-documentation checkpoint:** PR #166 `feta` at `051fe3dd5f74595d5da45d21e8ae0d0ef0250f4e`, OPEN / Draft / unmerged; **12/12 exact-head checks success and 11/11 matching-head PR workflows success**, zero failed/pending. These checks are **not** evidence of physical offline/PWA acceptance; this documentation commit will have a different SHA and requires its own exact-head checks.
- **Do not repeat:** The native cancellation code, fixture, and unit test already existed; no application source, APK, tests, physical prior PASS, or market data were changed or rerun.
- **Next single physical test:** With the same synthetic debug launcher on the phone, enable **airplane mode**; generate a **fresh uniquely named synthetic local JSON**, complete save via Android's document picker, select **that exact newly saved file** for readback, and report `PASS`/`FAIL` plus the visible message without sharing file contents. Turn airplane mode off afterward. This determines the offline test gate only; if Android's picker/provider is unavailable offline, report the exact failure rather than claim application success. Do not delete existing files or PWA.
- `REAL_PWA_BACKUP_UNVERIFIED`, `PHYSICAL_DEVICE_FULL_ACCEPTANCE_UNVERIFIED`, `MARKET_RELEASE_BLOCKED`; Issue #167 OPEN and PR #166 Draft. No merge/deploy/production signing/paid service/real portfolio data/order/signal/holdings change.
