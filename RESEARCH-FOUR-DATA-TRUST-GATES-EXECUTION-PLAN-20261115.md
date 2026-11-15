# سهام‌بان — برنامه عملیاتی چهار مانع اعتبار داده
**تاریخ:** 2026-11-15  
**وضعیت:** برنامه پژوهشی و فنی برای تصمیم‌گیری؛ بدون تغییر کد، انتشار، برنامه پنج‌روزه یا وضعیت قفل‌های مالی  
**مبنای مستقیم:** `RESEARCH-HISTORY-BASIS-EVIDENCE-CHAIN-AUDIT-20261115.md`، `DAY2-HISTORY-BASIS-EVIDENCE-GATES.md`، `day3-trusted-evidence-boundary-v1.cjs` و اصلاحیه `FIN-06` — فایل‌های واقعی شاخه فعال دوباره خوانده شدند.

## اصل غیرقابل مذاکره
تا زمان تکمیل تمام مدارک معتبر و تأیید مستقل، `historyBasisAuthenticated=false`، `threeModesVerified=false`، `entryEligible=false`، `tradingSignalsEnabled=false` و `day3FinalAccepted=false` باقی بمانند. تست ساختگی، تطابق hash در مخزن، دریافت HTTP بدون سند منشأ، متن `INDEPENDENTLY_ATTESTED` از UI و امضای خودساخته **کافی نیستند**.

## جدول اجرای مرحله‌ای

| کد | مانع / اولویت | کار قابل انجام بدون کاربر | وابستگی بیرونی/نقطه توقف | معیار پذیرش واقعی |
|---|---|---|---|---|
| G1 / P0 | احراز منشأ داده قیمت و نماد | ممیزی `manifest` و فایل‌های موجود، فرم قرارداد شواهد و گزارش دلایل `UNVERIFIED`؛ استفاده از verifier موجود بدون تکرار CI | دسترسی مشروع و قابل راستی‌آزمایی به داده اصلی TSETMC/آرشیو مستقل؛ حقوق استفاده و محیط capture مورد اعتماد | تاریخ و شناسه دقیق، URL و پارامتر، زمان UTC، raw bytes، SHA-256، پاسخ HTTP و منشأ مستقل ثبت، قابل بازرسی و match باشند |
| G2 / P0 | سه مبنای قیمت تاریخی و اقدامات شرکتی | قرارداد alignment و حالت‌های 0/1/2؛ تحلیل تفاوت raw/source/derived، شناسایی اسناد موجود و نقاط ابهام | سه سری *واقعاً متمایز* با مبنای مستند معتبر، پوشش و تاریخ مشترک؛ اصل اطلاعیه‌های ناشر/کدال و تطبیق هر رویداد | 0=raw، 1=capital+dividend، 2=capital-only فقط با سند معنای واقعی؛ تاریخ‌ها، unit، SHA و price basis مطابق، هیچ داده مشتق‌شده‌ای جای original جا زده نشود |
| G3 / P0 | بازبین مستقل، امضا و اعتماد | بررسی قرارداد تابع `attestPriceBasis` و آزمون‌های منفی موجود؛ قالب گزارش امضاشده و مسئولیت‌ها | تعیین بازبین واجد صلاحیت و مستقل، رضایت متولی مخزن برای pin کلید عمومی، برنامه صدور/ابطال | کلید عمومی معتبر و مستقل در code review ثبت شود؛ امضای canonical digest با scope، تاریخ و expiration برای exact dataset تأیید شود؛ کلید خصوصی هرگز وارد repo نشود |
| G4 / P1 | ورود شواهد به موتور تحلیل و منع مسیر دورزدن | نقشه مصرف‌کنندگان `decision-support-v129.js`، `candidate-ranking-v133.js`، `market-sample-v131.js`؛ طرح آزمون جداگانه عدم تغییر دیگر gateها | تکمیل G1–G3 و تأیید تغییر محصول/اجرای تست توسط مالک | وضعیت verified فقط از خروجی مرز اعتماد معتبر برای dataset exact قابل مصرف باشد؛ نتیجه بررسی basis، به تنهایی **هیچ سیگنال، سفارش، ورود یا انتشار** آزاد نکند |

### قالب قرارداد پیشنهادی شاهد — صرفاً طراحی، نه داده واقعی
```text
provider_origin: [official|independent archive|third-party — verified evidence only]
instrument: {symbol, insCode, ISIN_if_proven}
capture: {request_url, documented_parameters, captured_utc, http_status, content_type,
          raw_byte_size, sha256, immutable_artifact_ref}
series: {price_type, unit: IRR, calendar: Gregorian YYYYMMDD,
         from_date, through_date, rows, unique_sessions, gaps, zero_trade_sessions,
         basis_label, provider_semantics_document_ref, sha256}
corporate_actions: [{issuer_original_ref, tracing_no, effective_date,
                     share_ratio, dividend_cash, source_page_or_row, crosscheck_status}]
mode_evidence: [{mode:0|1|2, source_or_derived, documented_definition,
                 raw_artifact_ref, sha256, row_count, first_date, last_date}]
review: {reviewer_identity_id, trusted_key_id, signed_scope, canonical_evidence_digest,
         verified_at, expires_at, signature, revocation_policy}
decision: UNVERIFIED | REJECTED | INDEPENDENTLY_ATTESTED
```
**هشدار:** این قرارداد پیشنهادی نباید با schema اجرایی فعلی یکسان فرض شود. در کد فعلی `attestPriceBasis` فقط فیلدهای مشخصی مثل `evidence.insCode`، `dailySha256`، `modes` و `review` را می‌پذیرد؛ هر توسعه schema نیازمند review و تست جداگانه است. برای اسناد عمومی از قرار دادن داده مالی/شخصی، توکن، کلید خصوصی یا شناسه محرمانه خودداری شود.

## موجودی شواهد و اقدام غیرتکراری
- شواهد ذخیره‌شده برای وساخت `insCode=25514780181345713`: ۵۰۰ قیمت و ۱۵ رویداد تعدیل، manifest با URL و hash. اصلاحیه FIN-06 اختلاف قدیمی `...710` را **پس گرفته است**. از نو crosswalk نسازید.
- سند قبلیِ ۵٬۹۳۵ ردیف `0.json` فقط بررسی ساختار فایل دریافتی از کاربر را گزارش می‌کند؛ **origin/correct basis/full archival coverage** را ثابت نمی‌کند.
- verifier ذخیره‌شده فقط `RAW_BYTES_MATCH_MANIFEST_FOR_REVIEW` / integrity را می‌تواند تأیید کند، نه منشأ شبکه.
- تابع `attestPriceBasis` بالفعل fail-closed و `TRUSTED_REVIEWER_KEYS=Object.freeze({})` خالی است؛ تا ثبت کلید مشروع، `NO_TRUSTED_REVIEWER` نتیجه درست است. پیاده‌سازی مجدد verifier یا تولید کلید ساختگی ممنوع است.
- پارامتر انتهایی `GetClosingPriceDailyList/{insCode}/0` همان `Top` است، **نه adjustPrices mode**؛ به سه سری 0/1/2 کتابخانه‌های دیگر برچسب ساختگی نزنید.
- J1–J6 پذیرش ایزوله تمام شده‌اند. تکرار APK/گوشی/پشتیبان‌ها هیچ شاهد جدیدی برای G1–G3 نمی‌دهد.

## تصمیم‌ها و معیار توقف
1. **همین حالا قابل تکمیل بدون دخالت کاربر:** مستندسازی قرارداد، موجودی و ترتیب وابستگی‌ها، اتصال هر مانع به فایل و تست موجود؛ در این سند انجام شد.
2. **نیازمند دسترسی بیرونی یا اختیار روشن:** دریافت شاهد مستقیم با مجوز، بررسی اصل اطلاعیه‌های ناشر و روش تعدیلات رسمی، بازبین انسانی مستقل و توافق حقوقی استفاده؛ از طرف کاربر **ادعای انجام** نمی‌شود.
3. **نیازمند اجازه جداگانه برای تغییر محصول:** اضافه‌کردن metadata، اتصال API، تغییر معماری تصمیم، CI جدید، نصب APK، استفاده از داده واقعی یا pin کلید مورد اعتماد. تفویض تهیه این برنامه به معنای تأیید آن اقدامات نیست.
4. **PASS همین نوبت:** سند اجرایی و نقشه شواهد کامل و ثبت شد. **BLOCKED/UNVERIFIED:** چهار gate مالی؛ پروژه به وضعیت LIVE_READY / RELEASE_READY ارتقا نیافته است.
5. **پیشنهاد اولین مرحله اجرای بعدی:** قرارداد/مسیر اثبات واقعی G1 و G2 را فقط از داده‌های عمومیِ با مجوز و بدون API key شخصی بررسی کن؛ اگر متادیتا/اصالت کافی نبود، گزارش `UNVERIFIED` تولید کن. هیچ داده تازه‌ای خودکار وارد engine نشود.

## گزارش تغییر
فقط این فایل پژوهشی در شاخه فعال اضافه شد. کد، تست، شیوه تحلیل، شواهد اولیه، برنامه پنج‌روزه، PR #178، APK، حساب، holdings، پرداخت، سیگنال، merge، deploy و release دست‌نخورده باقی ماندند.

## پیگیری پژوهشی 2026-11-15 — نتیجه بررسی مستقیم منابع عمومی G1/G2

### مشاهده مستقیم منابع
- مرجع جامعه‌محور `amirziveh/tsetmc-skill/references/api-endpoints.md` مسیر `GET /ClosingPrice/GetClosingPriceDailyList/{insCode}/{n}` را با `n=0` به معنای تاریخچه درخواستی بدون سقف، فیلدهای `dEven` و `pClosing` معرفی می‌کند؛ `GET /ClosingPrice/GetPriceAdjustList/{insCode}` را *فهرست تعدیلات* می‌خواند. https://github.com/amirziveh/tsetmc-skill/blob/master/references/api-endpoints.md
- کد مستقل جامعه‌محور `5j9/tsetmc/tsetmc/instruments.py` تابع `daily_closing_price(n=0)` را با `n` تعداد روزها و API `GetPriceAdjustList` را جداگانه استفاده می‌کند. این دو منبع قرینه‌ای برای semantics پارامتر Top هستند، ولی **مستند رسمی بورس/قرارداد حقوقی نیستند**: https://github.com/5j9/tsetmc/blob/main/tsetmc/instruments.py
- README پروژه مستقل `m-ahmadi/tse-client` قرارداد `getPrices(...,{adjustPrices:0|1|2})` را تعریف می‌کند: ۰ بدون تعدیل، ۱ افزایش سرمایه + سود نقدی، ۲ افزایش سرمایه؛ `getAdjustInfo` نیز جداست. این‌ها **حالت‌های خروجی یک client** هستند و از مستندات عمومی به‌تنهایی نمی‌توان منشأ ۳ سری مجزای provider-authenticated یا صحت تعدیل را اثبات کرد. https://github.com/m-ahmadi/tse-client (بخش `getPrices`, `AdjustOption`).
- منبع دوم `omiom33/tse-client2` همان قرارداد ۰/۱/۲ را منتشر کرده است؛ تأیید تعریف گزینه نرم‌افزاری، **نه شاهد independent market provenance**: https://github.com/omiom33/tse-client2/blob/master/README.md
- تلاش مستقیم برای بازکردن `https://api.tsetmc.com/docs/` و `https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceDailyList/25514780181345713/1` در ابزار جست‌وجو **موفق نشد**؛ `https://www.codal.ir/` timeout شد. این‌ها `UNVERIFIED_ACCESS_FROM_THIS_TOOL` هستند و به معنی قطعی downtime، خرابی سرویس، نبود داده یا عدم مشروعیت API نیستند. در این نوبت **هیچ capture زنده‌ای تأیید نشده**.

### نتیجه اجرایی جدید
1. **G1: BLOCKED BY PROVIDER ORIGIN** — شواهد داخلی و مستندات جامعه‌محور کافی‌اند که قالب/مسیر تهیه شاهد را بشناسیم؛ اما نه برای احراز HTTPS origin و نه برای استفاده در سیگنال مالی.
2. **G2: SEMANTICS PARTIALLY DOCUMENTED, AUTHENTICATION UNVERIFIED** — تعریف حالت‌های ۰/۱/۲ در خود `tse-client` روشن است. تا منشأ دقیق محاسبه، نسخه و هش خروجی‌ها، صورت‌های مالی/رویدادهای شرکت، هم‌ترازی تاریخ و شواهد رسمی مستقل روشن نشود، نباید آن‌ها را ۳ آرشیو رسمی مستقل بنامیم.
3. **G3/G4: NO CHANGE** — `TRUSTED_REVIEWER_KEYS` خالی می‌ماند و هیچ داده، UI، کلید یا برچسبی اجازهٔ افزایش `entryEligible` یا `tradingSignalsEnabled` ندارد.
4. **اولین وابستگی واقعی برای پیشرفت فنی بیشتر:** دسترسی مجاز و قابل راستی‌آزمایی به سند ارائه‌دهنده و raw-source captures با شواهد مستقل (بدون عبور از محدودیت شبکه)، سپس گزارش بازبین واجد صلاحیت. تا آن هنگام طراحی/ممیزی مستندات **تمام** اما پذیرش G1/G2 **ناتمام** است.

**محدوده دقیق:** فقط این سند تحقیقاتی تغییر کرده است. هیچ درخواست معامله/پرداخت، ورود به حساب یا تغییر کد/CI/برنامه پنج‌روزه انجام نشده است.
