# نقطهٔ کنترل ادامهٔ پروژه سهام‌بان — 2026-11-14

این سند خلاصهٔ مرجع برای شروع گفتگوی تازه است. جزئیات و تاریخچهٔ کامل در اسناد پایین‌تر باقی می‌مانند؛ برای ادامه لازم نیست کل گفتگو کپی شود.

## محل کار و آخرین وضعیت GitHub
- مخزن: Raminhashemi1/sahamban
- شاخهٔ کاری: feat/day2-history-basis-gates-20261109
- PR اصلی: #164، باز، non-Draft، ادغام‌نشده.
- آخرین SHA ثبت‌شده در این checkpoint: 214a2ef6f24e053c1988c98976f988b80b97f53f.
- برای همین SHA، استعلام workflow runs و commit statuses هر دو خالی بود؛ CI تأیید نشده، نه PASS و نه FAIL. نتایج CI مربوط به SHAهای قبلی را به این SHA تعمیم نده.
- PR #162 نیز باز و مستقل است؛ با #164 ادغام یا جایگزین نشود مگر با بررسی/مجوز جداگانه.
- main، انتشار عمومی، merge و deploy در این مرحله انجام نشده‌اند.

## کارهای ثبت‌شده تا این مرحله
1. بازبینی فقط‌خواندنی بستهٔ شواهد موجود وساخت؛ دادهٔ تازه‌ای از شبکه دریافت نشد و از کاربر درخواست ارسال مجدد نشد.
2. تاریخچهٔ روزانهٔ ثبت‌شده: 500 ردیف، شناسهٔ دقیق 25514780181345713، بازهٔ 2024-10-15 تا 2026-11-10، بدون تاریخ تکراری.
3. فایل تعدیلات ثبت‌شده: 15 ردیف، اما شناسهٔ دقیق قابل مشاهده در هر ردیف 25514780181345710 است؛ با شناسهٔ تاریخچه/مانیفست (...713) اختلاف دارد.
4. اعتبارسنج موجود tsetmc-capture-integrity-review-v1.cjs شناسهٔ خام هر دو پاسخ را دقیقاً با شناسهٔ مانیفست مقایسه می‌کند؛ بر مبنای محتوای قابل مشاهده، فایل تعدیلات باید با RAW_INSTRUMENT_ID_MISMATCH_ADJUSTMENTS رد شود. این رفتار fail-closed باید حفظ شود.
5. هیچ crosswalk رسمی/معتبر که رابطهٔ دو شناسه را ثابت کند پیدا نشد. منابع ثالث فقط راهنمای فنی/ثانویه‌اند و این مغایرت را حل نمی‌کنند.
6. گزارش مستقل مغایرت ایجاد شد: evidence/day3/vasakht-instrument-identity-discrepancy-20261114.md.
7. خلاصهٔ این وضعیت در PROJECT-STATE.md، WORK-LOG.md و HANDOFF.md نیز ثبت شد.
8. فایل‌های خام، مانیفست، قیمت‌ها و منطق اعتبارسنجی تغییر نکردند. هیچ محاسبهٔ جدیدی برای تطبیق تعدیلات انجام نشد.

## وضعیت گیت‌ها
- FIN-05=BLOCKED_INSTRUMENT_ID_CROSSWALK
- sourceAuthenticated=false
- historyPriceBasisVerified=false
- capitalActionsVerified=false
- threeModesVerified=false
- historyBasisAuthenticated=false
- entryEligible=false
- tradingSignalsEnabled=false
- day3FinalAccepted=false
- هیچ مجوز معامله، سفارش، پرداخت، تغییر دارایی، merge یا deploy وجود ندارد.

## تنها قدم بعدی
یک رکورد هویت رسمی/معتبر از TSETMC یا capture تازه و قابل بازبینی لازم است که دقیقاً توضیح دهد چرا درخواست با 25514780181345713، ردیف‌های تعدیل با 25514780181345710 برمی‌گرداند و آیا این دو شناسه به یک ابزار تعلق دارند. اصل پاسخ، URL دقیق، زمان UTC، نوع محتوا و SHA-256 باید حفظ شود. تا آن زمان 15 رویداد تعدیل به تاریخچهٔ 500 ردیفی متصل نشوند.

پس از رفع هویت: اجرای مجدد اعتبارسنج موجود و سپس بازبینی تطبیق رویدادها. سراغ بازسازی قیمت، تولید حالت‌های تعدیل مصنوعی، تکرار تست‌های قبلی یا تغییر verifier نرو.

## اسناد مرجع برای جلسهٔ بعد
1. CURRENT-CHECKPOINT-20261114.md (همین فایل)
2. HANDOFF.md
3. PROJECT-STATE.md
4. MASTER-PLAN.md و DECISIONS.md فقط برای قواعد/دامنهٔ تصمیم‌ها
5. evidence/day3/vasakht-instrument-identity-discrepancy-20261114.md
6. در صورت نیاز به روش اعتبارسنجی: tsetmc-capture-integrity-review-v1.cjs

## دستور شروع گفتگوی تازه
«پروژه سهام‌بان را از GitHub ادامه بده. اول CURRENT-CHECKPOINT-20261114.md و HANDOFF.md را از شاخهٔ feat/day2-history-basis-gates-20261109 بخوان، سپس PR #164 و CI دقیق آخرین SHA را بررسی کن. از وضعیت ثبت‌شده ادامه بده؛ کارهای قبلی را تکرار نکن. فقط یک قدم بعدی غیرتکراری را دنبال کن و هیچ merge، deploy، معامله یا تغییر دادهٔ مالی بدون اجازه انجام نده.»
## افزودهٔ 2026-11-14 — اصلاح تفسیر تطبیق ۱۵ رویداد
- مانیفست، درخواست تعدیلات را از URL شامل شناسهٔ `25514780181345713` ثبت کرده و SHA-256 پاسخ ۱۵ ردیفی را `9363ac67e70d2b86c398d46b4d33dc4e623df35132bef8b0417e7087be6c5cdd` اعلام می‌کند.
- شناسهٔ قابل مشاهده در ردیف‌های فایل تعدیلات `25514780181345710` است. بنابراین درخواست با ...713 به‌تنهایی ثابت نمی‌کند ردیف‌های پاسخ متعلق به همان شناسه‌اند.
- گزارش 2026-11-11 که 14/15 تطبیق عددیِ قیمت پیشارویداد را ثبت کرده، فقط یک تشخیص عددی تاریخی باقی می‌ماند؛ گزارش، crosswalk شناسهٔ ردیفی را مستند نکرده است. تفسیر رویدادها به‌عنوان اقدامات شرکتی وساخت تا حل هویت `PROVISIONAL_IDENTITY_UNRESOLVED` است.
- اصلاحیه در گزارش مغایرت و سه سند PROJECT-STATE / WORK-LOG / HANDOFF ثبت شد. هیچ داده خام، قیمت، مانیفست یا verifier تغییر نکرد.
- شواهد عمومی فقط ثانویه/مهندسی معکوس‌اند؛ endpoint جست‌وجو و identity رسمی از محیط فعلی قابل دسترسی نبود. جست‌وجوی عمومی نیز crosswalk معتبر برای ...710 پیدا نکرد.
- برای PR #164، SHA `da33732a134cd3622401b6411f236da11db19506`، query مستقیم Actions runs با `head_sha` تعداد 0 و combined commit statuses نیز خالی برگرداند. Workflowهای PR مرتبطی که در لیست شاخه دیده شدند، روی SHA قدیمی `5191daae74d70c0d892cc6af080b70def083f801` اجرا شده‌اند؛ به SHA فعلی تعمیم داده نشوند.
- PR #166 و Issue #167 همچنان مسیر مستقل Android هستند؛ دو PASS محدود فایل مصنوعی روی گوشی ثبت شده‌اند، اما یکپارچگی PWA واقعی هنوز اثبات نشده. TalkBack/VoiceOver بنا به تصمیم مالک خارج از دامنه چرخه فعلی است. هیچ کار تکراری Android در PR #164 انجام نشود.
- **تنها قدم بعدی:** گرفتن رکورد هویت معتبر/اصلی که دو شناسه را به هم پیوند دهد، یا capture مجدد endpoint تعدیلات همراه با raw bytes، URL، UTC، content-type و SHA-256. تا آن زمان اتصال ۱۵ رویداد به ۵۰۰ ردیف ممنوع و FIN-05 مسدود است.
- وضعیت مالی همچنان بسته: `sourceAuthenticated=false`, `historyPriceBasisVerified=false`, `capitalActionsVerified=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`, `day3FinalAccepted=false`.
## افزودهٔ FIN-06 — پژوهش شناسهٔ تعدیلات و وضعیت زندهٔ شاخه‌ها
- پژوهش عمومی ثانویه تأیید می‌کند API جست‌وجوی TSETMC فیلدهای primary `insCode` و کدهای قدیمی/مرتبط `insCode2/3/4` دارد؛ اما هیچ منبعی معنای `priceAdjust[].insCode` را در پاسخ `GetPriceAdjustList` یا رابطهٔ ...710 و ...713 را توضیح نمی‌دهد. دیتاست ثالث وساخت را با ...713 ثبت کرده و هیچ crosswalk برای ...710 ندارد.
- endpointهای مستقیم CDN برای جست‌وجو/هویت دو کد/تعدیلات در این محیط قابل دسترسی نبودند؛ هیچ پاسخ تازه‌ای دریافت یا capture نشد. این محدودیت محیط است، نه ادعای ازکارافتادگی سرویس. GitHub connector نیز ابزار dispatch workflow ندارد.
- FIN-06=`BLOCKED_NEEDS_PROVIDER_IDENTITY_RESPONSE`. تنها مدرک لازم: پاسخ provider-origin برای جست‌وجوی وساخت و identity هر دو کد یا capture تازهٔ تعدیلات با raw bytes، URL، UTC، HTTP status، content-type و SHA-256.
- گزارش پژوهش: `evidence/day3/FIN-06-adjustment-id-crosswalk-research-20261114.md`. گزارش 14/15 تطبیق عددی قبلی صرفاً diagnostic است و تعلق ردیف‌ها به وساخت را ثابت نمی‌کند.
- وضعیت Android جدا: PR #166 head `7b1f881dc2e99c2d421cfb6027a75cbff0f45a50`، 12/12 check-run موفق و 11/11 workflow موفق؛ PR همچنان Draft/Open و Issue #167 باز. این نتایج جایگزین پذیرش واقعی PWA backup/restore نیستند.
- هیچ داده خام یا قیمت ویرایش نشد. گیت‌های مالی همچنان false. PR #164 ادغام نشده؛ آخرین SHA هر بار باید زنده استعلام شود.
## افزودهٔ FIN-07 — ممیزی verifier موجود
- ممیزی فقط‌خواندنی `tsetmc-capture-integrity-review-v1.cjs` نشان داد شناسه‌های خام JSON را پیش از parse عددی با شناسه مانیفست دقیقاً مقایسه می‌کند؛ برای مانیفست ...713 و ردیف‌های تعدیل ...710، نتیجه مورد انتظار `RAW_INSTRUMENT_ID_MISMATCH_ADJUSTMENTS` است.
- تست موجود، mismatch ردیف روزانه و تعدیلات را حتی با SHA مجدداً محاسبه‌شده رد می‌کند و precision شناسه‌های ۱۷ رقمی را هم می‌آزماید؛ بنابراین تست تکراری یا تغییر کد اضافه نشد. `CAPTURED_FOR_MANUAL_REVIEW` در collector صرفاً ضبط bytes است، نه تأیید مالی.
- Workflow `smoke-tests.yml` اجرای این تست را دارد؛ ولی PR #164 head قبلی `c35e73f...` هیچ check-run/workflow/status نداشت. PR #162 head `3cc42ee...` 12/12 check و 11/11 workflow موفق دارد، اما این نتیجه متعلق به PR #162 است و به PR #164 منتقل نمی‌شود.
- گزارش: `evidence/day3/FIN-07-adjustment-id-fail-closed-verifier-audit-20261114.md`. نتیجه: `PASS_STATIC_FAIL_CLOSED_REVIEW / EXACT_HEAD_CI_UNVERIFIED`. FIN-05/06 همچنان به‌علت نبود پاسخ هویت provider مسدود است.
- وضعیت زنده cross-lane: PR #166 head `7b1f881...`، 12/12 check و 11/11 workflow موفق؛ PR باز و Draft. Issue #167 باز. آزمون واقعی یکپارچه PWA↔Android هنوز اثبات نشده؛ این مسیر در کار مالی فعلاً متوقف می‌ماند.