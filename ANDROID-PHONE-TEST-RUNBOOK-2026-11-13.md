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

**قدم مستقل بعدی برای TalkBack (آزمون دسترس‌پذیری):** در همان صفحه آزمایشی، TalkBack را از تنظیمات دسترس‌پذیری Android فعال کنید. بدون ذخیرهٔ فایل جدید و بدون استفاده از داده واقعی، صرفاً روی دو دکمه «ذخیره پشتیبان محلی ساختگی» و «ذخیره پشتیبان سبد ریسک ساختگی» و کنترل «انتخاب فایل JSON ذخیره‌شده» فوکوس کنید؛ بررسی کنید که برچسب‌های فارسی هر سه واضح و به‌ترتیب قابل فهم خوانده می‌شوند. **PASS فقط با گزارش واقعی گوشی** ثبت شود. پس از آزمون TalkBack را خاموش کنید. بررسی بزرگ‌نمایی فونت و بازیابی واقعی PWA هنوز مستقل و باز است.

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
| آزمون در حالت پرواز | **PASS محدود؛ حالت پرواز با تأیید کاربر** | `test-offline-1.json` با تطبیق دقیق PASS شد؛ کاربر تأیید کرد حالت پرواز در تمام مدت ذخیره و بازخوانی روشن بوده است؛ وضعیت شبکه مستقلاً ابزارسنجی نشده |
| TalkBack فارسی (آزمون روی گوشی) | **DEFERRED_BY_USER / UNVERIFIED** | به درخواست کاربر از ادامه فعلی کنار گذاشته شد؛ نتیجه PASS یا پذیرش محصول نیست |
| بزرگ‌نمایی فونت و سایر تعامل‌های دسترس‌پذیری | UNVERIFIED | آزمون میدانی جداگانه هنوز شواهد ندارد؛ فعلاً درخواست نمی‌شود |

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

## 2026-11-13 — test-offline-1.json exact readback screenshot; network state unverified
- **User-submitted phone screenshot** displays selected filename `test-offline-1.json` and the green fixture message `PASS: فایل JSON همین تلاش از انتخابگر اندروید دوباره خوانده شد و متن آن دقیقاً تطبیق داشت. این فقط آزمون ساختگی است، نه پذیرش پشتیبان واقعی PWA.` This matches the existing debug fixture's success condition: it accepts only a saved-response-correlated, freshly generated synthetic JSON read back with exact content/nonce. Therefore **`SYNTHETIC_LOCAL_FRESH_FILE_READBACK=PASS_OBSERVED` for this named attempt**.
- **Airplane/offline qualification:** The screenshot is cropped below the Android status bar, with no airplane-mode/network-state indicator. The user sent it after an airplane-mode test instruction, but the screenshot **does not itself prove airplane mode was enabled**. Record **`AIRPLANE_MODE_CONFIRMED=UNVERIFIED`** and **`OFFLINE_PHYSICAL_ACCEPTANCE=PENDING_NETWORK_STATE_CONFIRMATION`**, not an unconditional offline PASS. One user confirmation that airplane mode was ON during this exact save-and-readback attempt can close the *synthetic offline roundtrip* gate; do not request another save if that is confirmed.
- **Non-duplication:** The previous fresh local/risk synthetic file readback PASS and physical cancel no-false-PASS are already logged; no rerun, new test case, code fix or APK replacement was needed for this result. The screenshot itself and JSON content are **not** committed to the public repository. The exact APK version is still not independently identifiable from the image.
- **GitHub baseline before this docs commit:** `feta` PR #166 head `557be2aba605509bc64a6e4aa4d6e3a9980c4f15` OPEN/Draft/unmerged; **12/12 checks success and 11/11 workflow runs success** on that exact SHA, no failures or pending. Do not apply this CI verdict to subsequent documentation SHA until checked.
- **Next single question:** Ask whether **airplane mode was actually ON during saving AND reselecting `test-offline-1.json`**. Once answered, append the measured outcome rather than performing the test again. Further Day 4 real-device accessibility/TalkBack and true PWA backup/restore remain independently `UNVERIFIED`; `MARKET_RELEASE_BLOCKED`. Issue #167 stays open, PR #166 stays Draft; no merge, deploy, trades, holdings changes, or live-user data.

## 2026-11-13 — User confirms airplane mode ON for exact offline synthetic roundtrip
- **New field attestation (user statement):** `بله، حالت پرواز گوشی در تمام مدت ذخیره و بازخوانی فایل test-offline-1.json روشن بود.` This explicitly answers the sole network-state uncertainty recorded in the previous checkpoint for the **same existing attempt**, not a newly repeated test.
- **Paired evidence:** the previous user screenshot visibly showed `test-offline-1.json` and the green **exact-content/nonce readback PASS** in the isolated Android debug fixture. The user's subsequent explicit confirmation covers the **entire save + select/readback interval**. Classify `SYNTHETIC_LOCAL_OFFLINE_SAF_ROUNDTRIP=PASS_USER_ATTESTED` and `AIRPLANE_MODE_DURING_ROUNDTRIP=USER_CONFIRMED`. This is **limited real-device self-reported network-state field evidence**, not independent radio/network instrumentation and **not** proof that the real PWA works offline.
- **Live GitHub pre-write:** PR #166 `feta` HEAD `102c2b092718bd4113c007947a705ffaaf6c429b` OPEN, Draft, unmerged; on exactly that SHA **12/12 check runs succeeded, 11/11 matching-head workflow runs succeeded**, no pending/failures. PR #164 remains a separate unmerged branch. Checks for **this documentation commit** must be evaluated separately.
- **No repeat/no implementation:** native SAF, synthetic local/risk save+readback, cancellation no-false-PASS and the same offline `test-offline-1.json` readback were already tested/recorded. This update only resolves their remaining evidence label. No new APK build, production code, regression suite, actual financial data, user backup content or screenshot was uploaded to the public repository.
- **Single next Day 4 field gate — Persian accessibility / TalkBack:** on the same **synthetic debug fixture**, with no real holdings or backup file, enable Android's **TalkBack** under Accessibility (menu labels vary), focus the two synthetic save buttons and the JSON file chooser without activating them, and report whether their Persian labels are **spoken clearly in an understandable order**. It is sufficient to report `PASS`, `FAIL` or `UNVERIFIED` and the affected control; do **not** assert screen-reader accessibility from automated WebKit/axe proxies. TalkBack changes touch gestures; disable it afterwards through the same system accessibility control. Font scaling and actual PWA backup/restore remain separate field gates.
- **Release boundary unchanged:** `REAL_PWA_BACKUP_UNVERIFIED`, `PHYSICAL_DEVICE_FULL_ACCEPTANCE_UNVERIFIED`, `MARKET_RELEASE_BLOCKED`. PR #166 remains Draft; Issue #167 remains open. No merge, main/Pages deploy, app-store publishing, signing, payment, order, signals, or holdings changes.

## 2026-11-13 — User-directed skip: TalkBack field test deferred, not accepted
- **User instruction:** `از این بخش صرف نظر کن` in direct response to the Persian TalkBack device-test request. Interpret as **skip that step for the current execution**, not as evidence it passed, a permanent deletion of the release requirement, or authorization to weaken accessibility/security/market gates.
- **Status:** `TALKBACK_PHYSICAL_FIELD_TEST=DEFERRED_BY_USER / UNVERIFIED`. Do **not** ask for another TalkBack test during this continuation. Unverified font scaling and other accessibility checks remain release/field-acceptance gaps; no code change or claim of WCAG certification.
- **GitHub baseline:** `feta` PR #166 OPEN/Draft/unmerged, head `5afee2c51cc75c6d33acfd476046f0bdbdf54e48`, exact-head **12/12 checks successful** and **11/11 workflow runs successful**; Issue #167 OPEN. The successful automation already covers synthetic WebMessage/SAF handling, not live TalkBack. No test was rerun or relabeled PASS.
- **Proceed without duplication:** the next non-accessibility Day 4 item is a **review-only preflight of real PWA ↔ Android native backup integration**. Existing `android-pilot/README.md` and `MainActivity.java` explicitly say the app launcher loads `https://raminhashemi1.github.io/sahamban/` from public `main`, while the coordinated `native-backup-export-v1.js`, `index.html`, `sw.js` work remains in unmerged `feta`. The isolated offline debug fixture PASS does **not** validate the real served PWA. A controlled environment with the complete matching web assets is needed **only after approval for that environment**; no uncontrolled publishing or changes to public `main`.
- **Preserve boundaries:** `REAL_PWA_BACKUP_UNVERIFIED`, `PHYSICAL_DEVICE_FULL_ACCEPTANCE_UNVERIFIED`, `MARKET_RELEASE_BLOCKED`. Keep PR #166 Draft and Issue #167 OPEN. No merge, deployment, production signing, store submission, payment, trade, use of personal portfolio, data clearing or image upload. This change is documentation-only; check CI again for its new SHA.
