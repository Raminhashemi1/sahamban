# سهام‌بان — ثبت تصمیم‌ها

این دفتر فقط تصمیم‌های مستند یا دستورهای صریح کاربر را ثبت می‌کند. فرضیات فنی یا برداشت از تصویر را به‌عنوان تصمیم قطعی کاربر جا نزنید.

## DEC-001 — حافظه پروژه خارج از چت

- تاریخ ثبت: 2026-11-09
- مبنا: درخواست صریح کاربر برای جلوگیری از انحراف هنگام تغییر چت
- تصمیم: GitHub محل نگهداری سابقه تصمیم‌ها، کارهای انجام‌شده، برنامه و نقطه تحویل است.
- نتیجه: چت جدید پیش از هر تغییر باید اسناد را بخواند و وضعیت GitHub را با آنها تطبیق دهد.
- محدودیت: پرونده GitHub خودکار با هر مکالمه به‌روزرسانی نمی‌شود؛ باید در همان نشست کاری Commit شود.

## DEC-002 — برنامه اصلی قابل حدس‌زدن نیست

- وضعیت: برنامه کلی پنج‌روزه در تصویر ارسالی کاربر در 2026-11-09 بازیابی و در `MASTER-PLAN.md` ثبت شد.
- تصمیم: برنامه تصویری کاربر مرجع روزهای ۱ تا ۵ است. جزئیات اجرایی اثبات‌نشده همچنان نامشخص می‌مانند و نباید ساخته شوند.
- منبع روز دوم: هدف کلیِ تکمیل اتصالات موتور تحلیل/رتبه‌بندی/دستیار در برنامه اصلی؛ PR164 ریزکار ایمنی همین روز است.
- معیار تغییر: درخواست/تأیید صریح کاربر با ثبت دلیل و تاریخ تغییر.

## DEC-003 — گیت‌های ایمنی قیمت تاریخی

- مبنا: طراحی روز دوم و PR164.
- تصمیم: داده فاقد تأیید مستقل، مجوز صدور سیگنال، حد ضرر، رتبه ورود یا ارزیابی بازده نیست.
- وضعیت: محافظ‌های نرم‌افزاری پیاده شده‌اند؛ احراز منبع واقعی جداگانه و ناتمام است.
- ممنوع: تلقی یک برچسب متنی یا تست مصنوعی به‌عنوان گواه واقعی.

## DEC-004 — حفاظت از انتشار و دارایی

- پیش‌فرض اجرایی: PR164 همچنان Draft؛ بدون اجازه روشن کاربر merge/deploy/order/payment/holdings mutation انجام نشود.
- تأیید تست فقط برای همان commit و اجرا معتبر است.

## روش ثبت تصمیم تازه

شناسه، تاریخ، درخواست‌کننده، تصمیم، علت، گزینه‌های ردشده، اثر بر روز/دامنه، شواهد لینک‌دار، تأیید کاربر (اگر تغییر برنامه است)، و وضعیت اجرا باید اضافه شوند. سوابق قبلی پاک نشوند.


## DEC-005 — بازگردانی نقشه راه مصوب پنج‌روزه

- تاریخ: 2026-11-09
- منبع: تصویر جدول برنامه کلی پنج‌روزه فرستاده‌شده توسط کاربر.
- تصمیم: اهداف و توالی پنج روز دقیقاً مطابق جدول `MASTER-PLAN.md` نگهداری شود.
- علت: جلوگیری از این‌که ادامه یک زیرکار (مانند PR164) با تمام برنامه روز دوم یا جابه‌جایی به روز سوم اشتباه گرفته شود.
- اثر: هدف روز دوم تکمیل اتصالات موتور تحلیل، رتبه‌بندی و دستیار تصمیم‌گیری است؛ موضوع مبنای تاریخچه قیمت جزئی از آن است. متن برنامه کامل شده، ولی وضعیت اجرای هیچ روزی صرفاً به دلیل ثبت سند تغییر نمی‌کند.


## 2026-11-10 — تلاش برای رفع دو مانع روز سوم به درخواست کاربر (بدون پذیرش نهایی)
- کاربر صریحاً خواست دو مانع رفع و روز سوم بسته شود. وضعیت شاخه و مسیرهای جایگزین بررسی شدند؛ هیچ collector، محاسبه‌گر، اعتبارسنج یا آزمون قبلی دوباره‌سازی نشد.
- PR #164 در آغاز OPEN/DRAFT/ادغام‌نشده و سر آن `6bbe9c09ea146958445b083ea219ae12830841d8` بود. CI دقیق همین SHA در آخرین استعلام **۱۲/۱۲ در صف اجرا** بود؛ صفر تکمیل‌شده، صفر شکست و صفر موفقیت نهایی. بنابراین CI سبز نیست. لینک‌ها: Smoke/Browser https://github.com/Raminhashemi1/sahamban/actions/runs/42814931267 ؛ WebKit https://github.com/Raminhashemi1/sahamban/actions/runs/42814937332 ؛ مرز مبالغ کارگزاری https://github.com/Raminhashemi1/sahamban/actions/runs/42814931241 .
- مسیر جایگزین TSETMC از README عمومی `m-ahmadi/tse-client` پیدا شد: اجرای bundle مرورگر `https://cdn.jsdelivr.net/npm/tse-client/dist/tse.bundle.min.js` روی مرورگری که به TSETMC دسترسی دارد و فراخوانی `tse.getPrices(['فولاد'], {adjustPrices:0|1|2, getAdjustInfo:true, cache:false, startDate:'20010321', daysWithoutTrade:true, mergeSimilarSymbols:false})`. صفحه آزمون upstream خروجی تعدیل‌شده داخلی را با محاسبه مستقل از قیمت خام و رویدادهای تعدیل مقایسه می‌کند. این مسیر جایگزینِ runner غیرقابل‌دسترسی است، اما در این نشست روی دستگاه کاربر اجرا نشده و هیچ payload تازه‌ای تحویل نشد. خروجی حالت‌های ۱/۲ محاسبه داخلی کتابخانه است، نه سه endpoint مستقل یا گواه مستقل اصالت منبع. باید mode-0 خام، رویدادها، خروجی‌های ۱/۲، نسخه کتابخانه، نماد/InsCode، زمان UTC و digest ذخیره و با adapter/classifier موجود PR161 و محاسبه دستی مستقل تطبیق داده شوند. منابع: https://github.com/m-ahmadi/tse-client/blob/master/README.md ؛ https://github.com/m-ahmadi/tse-client/blob/master/test/browser/adjust-info.htm .
- دریافت مستقیم endpointهای تاریخچه از هر دو میزبان `cdn.tsetmc.com` و `cdn10.tsetmc.com` در این محیط ناموفق/غیرقابل‌دسترسی بود؛ payload HTTP یا SHA-256 تازه‌ای به دست نیامد. بسته قبلی ۵۰۰ ردیف/۲۳ رویداد همچنان تنها capture خام حفظ‌شده است و اثبات پوشش کامل تاریخچه یا رکورد تازه روز جاری نیست.
- بازبینی کارمزد: صفحه IDBR اجزای خرید ۰٫۳۰۴٪، ۰٫۰۲۵۶٪، ۰٫۰۰۹۶٪، ۰٫۰۰۸٪ و ۰٫۰۲۴٪ (جمع ۰٫۳۷۱۲٪) را به‌عنوان سقف و با ارجاع به ویرایش ۴۹ مورخ ۱۴۰۵/۰۴/۲۷ اعلام می‌کند؛ به‌روزرسانی صفحه ۱۴۰۵/۰۶/۱۰ است. برای مبلغ ناخالص ۴۱٬۵۵۳٬۳۷۶ ریال، حاصل بدون گردکردن اجزا به‌ترتیب ۱۲۶٬۳۲۲٫۲۶۳۰۴، ۱۰٬۶۳۷٫۶۶۴۲۵۶، ۳٬۹۸۹٫۱۲۴۰۹۶، ۳٬۳۲۴٫۲۷۰۰۸ و ۹٬۹۷۲٫۸۱۰۲۴ ریال است. گردکردن تک‌تک اجزا به نزدیک‌ترین ریال: ۱۲۶٬۳۲۲ + ۱۰٬۶۳۸ + ۳٬۹۸۹ + ۳٬۳۲۴ + ۹٬۹۷۳ = **۱۵۴٬۲۴۶ ریال**؛ محاسبه تجمیعی ۰٫۳۷۱۲٪ نیز ۱۵۴٬۲۴۶٫۱۳۱۷۱۲ و پس از گردکردن ۱۵۴٬۲۴۶ ریال است. پس گردکردن تجمیعی در برابر جزءبه‌جزء اختلاف بدهکار ۱۵۴٬۲۴۳ را توضیح نمی‌دهد؛ ۳ ریال همچنان بی‌توضیح است. نرخ سقف، تخفیف اختصاصی یا گردکردن واقعی کارگزار را اثبات نمی‌کند. نام کارگزاری در رابط کاربری جای رسید جزءبه‌جزء را نمی‌گیرد. هیچ ضریب ساختگی یا اصلاح اجباری به محاسبه‌گر افزوده نشد. منبع: https://idbr.ir/fees .
- نتیجه: هیچ‌یک از دو مانع با شواهد کافی رفع نشده است: payload تازه و منشأ مستقل تعدیل در دست نیست؛ اجزای معتبر و جزءبه‌جزء کارمزد نیز موجود نیست. روز سوم باید **IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE** بماند. بستن آن در این وضعیت جعل شواهد خواهد بود. هیچ سیگنال، بازنویسی قیمت، merge، deploy، معامله، سفارش، پرداخت یا تغییر سبد انجام نشد.
- **وابستگی بیرونی واحد:** اجرای مسیر capture مرورگر موجود روی دستگاه/شبکه مطمئنِ دارای دسترسی TSETMC و ارائه bundle خام + manifest؛ همچنین ارائه تفکیک امن و بدون شناسه شخصی اجزای واقعی کارمزد و قواعد گردکردن. بدون این دو، پذیرش روز سوم مجاز نیست.


## 2026-11-10 — User-approved immaterial 3-IRR variance disposition (DEC-006)
- User explicitly authorized not pursuing the 3 IRR discrepancy if immaterial, and suggested a *possible* EasyTrader defect. This is a **scope/prioritization decision only**, not evidence that a software bug, discount, rounding policy or broker error occurred.
- The user-provided Mofid/EasyTrader screenshots show the real buy of **وساخت** on **1405/07/04**: 21,136 shares at 1,966 IRR, gross 41,553,376 IRR and debit 41,707,619 IRR; inferred total cost 154,243 IRR. The existing 0.3712%-ceiling estimate is 154,246 IRR, leaving 3 IRR unallocated. Screenshots show gross and debit, **not an itemized settlement**. Do not upload screenshots containing the user's identity/account/portfolio to this public repository.
- Decision: classify this **specific 3 IRR observation** as `FEE_VARIANCE_DE_MINIMIS_ACCEPTED_FOR_PILOT_ARITHMETIC`, severity LOW, **non-blocking for continued Day 3 engineering/pilot cost-model evaluation**, with unresolved root cause and a possible platform/fee-schedule difference NOT CONFIRMED. No numerical fudge factor, broker rounding claim, or pricing engine change. Do not extrapolate tolerance to larger discrepancies, different instruments/brokers, regulatory tariff verification, account reconciliation or production financial compliance. De-identified actual line-item receipts would still be required to claim fee schedule/settlement attestation.
- Remaining **independent** blocking evidence for Day 3 final acceptance and any price-derived signals: TSETMC same-instrument original raw history + adjustment events with source, captured time and hashes, reproducible documented modes 0/1/2 and independent event/basis review; full history / specific same-day row claims must not exceed evidence. Preserve `UNKNOWN_NOT_ATTESTED` and fail-closed behavior.
- PR164 OPEN/DRAFT pre-documentation head `00cd7b93cfed02c6e859bd39d37f9ecdda86198c`: exact 12/12 GitHub check runs SUCCESS at the observed time. PR162 `3cc42ee88ff3c2434dfa04b43e010df4475bdda4`: 12/12 SUCCESS. PR161 `7d71adbc9cd7836d3679eca2400d286ce0f328ce`: 12/12 SUCCESS. Documentation commits below create new head SHA; re-check exact new head CI rather than inheriting these results.
- No merge, deploy, order, trade, payment, holdings mutation, history rewrite or signal activation. Day 3 remains `IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE (TSETMC)`. **Single next task:** acquire and verify independently traceable TSETMC original response + event/mode evidence with existing review tools; no further requests to user for itemized 3 IRR fee receipt as a prerequisite to proceeding with Day 3 pilot arithmetic.

## 2026-11-11 — DEC-007: conditional alternative adjustment-review protocol, no financial bypass
- **User instruction:** actively resolve the Day 3 blocker and make needed scope/protocol adjustments to reach a result. This permits practical method changes, **not** invented provenance, altered trade receipts, automatic live signals, or false acceptance.
- The preferred evidence route remains three actual `tse-client adjustPrices=0/1/2` outputs, matching independently acquired TSETMC raw history, issuer-original CODAL corporate actions, same-instrument exchange-gateway cross-check, signed independent review and date/digest bounds.
- **Authorized methodological alternative for *review only* if the legacy `tse-client` service is inaccessible:** retain source-original raw price bytes + origin/time/hash and original CODAL action bytes, derive two candidate adjusted histories deterministically via the already reviewed `day3_vesakht_capture_reconcile.py` with exact event factors, compare independent holdings-free exchange archive and discriminating dates, and report modes explicitly as `DERIVED_FOR_REVIEW` instead of genuine executed `tse-client` results. This alternative eliminates unnecessary dependence on a broken library for numerical **pilot analysis**. It **does not** satisfy the existing `threeModesVerified` signature contract, source-authenticated historical basis, trading entry eligibility, or Day 3 full financial acceptance without further explicit review and valid trusted key.
- **Independent reviewer requirement stays:** no public key may be accepted from browser/upload/user payload. Maintain reviewed, pinned key registry and provenance-bound signature; never commit private signing material. `day3-trusted-evidence-boundary-v1.cjs` had a latent successful-signature path setting `entryEligible=true` despite separate entry/trade gates; commit `009f08e133d42e28eb95409f701d82535c3422cb` corrects this to false. Regression added in commit `50c80b8aa43c885739846afe120cdb8a685746a5` and CI wired in commit `3a302e5b7a8e009ecae7d9f98319e394b847967f`.
- **Explicit status distinction:** `DAY3_BOUNDED_NUMERICAL_PILOT_DONE` (prior evidence) vs `DAY3_FINAL_ATTESTED` (**false**), `historyBasisAuthenticated=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`. No release, trade, merge or portfolio mutation. The user's request to finish does not create issuer documents or working trusted network, so independent source verification is still externally blocked.

## DEC-008 — 2026-11-11: user-authorized bounded Day 3 scope, external financial release gate retained
- **Authority:** user explicitly instructed: continue and, if omitting a requirement helps remove the blocker, do so. This permits reducing nonessential *pilot engineering* obligations; it does not authorize fabricating evidence, trading, or removing financial-source safeguards.
- **Decision:** Day 3 has TWO noninterchangeable outcomes:
  1. `DAY3_BOUNDED_ENGINEERING_COMPLETE`: technical completion of original Day 3 task **limited to a 500-session, 15-adjustment-event real-record snapshot of correct «وساخت» `insCode=25514780181345713`**; deterministic price/fee arithmetic, safety/fail-closed behavior, regression tests and reproducible CI. Already evidenced in PR #164, notably `RECONCILED 500 raw sessions`, ten numerical tests successful and same-head 13/13 green checks before this decision. The 3-IRR cost difference remains pilot-only nonblocking per DEC-006. This scope is usable for non-actionable exploratory/engineering diagnostics, not trading or investment recommendations.
  2. `DAY3_FINANCIAL_SOURCE_ATTESTATION_PENDING`: independently authenticated issuer CODAL events, full original market-history scope, exact source-bound adjustment basis, acceptable independent reviewer/key signature and production release of financial signals. No such original records have been successfully obtained from the blocked public endpoints and no trust signature is issued. `day3FinalAccepted=false`, `historyBasisAuthenticated=false`, `threeModesVerified=false`, `entryEligible=false`, `tradingSignalsEnabled=false`.
- **Explicitly waived ONLY for bounded engineering completion**: obtaining a full historical archive beyond the captured 500 rows; live 0/1/2 `tse-client` outputs when its legacy backend is inaccessible; primary CODAL issuer PDF bytes; independent signer enrollment; repeatedly running blocked probes or obtaining itemized fee receipts for the already accepted 3-IRR numerical variance. These remain **mandatory when claiming authenticated historical basis or enabling production financial decisions**, and must not be silently assumed from bounded pilot acceptance.
- **Evidence constraints**: existing bounded source bytes have URL/date/hashes, but HTTPS + manifest do NOT establish independently authenticated origin, source price-adjustment semantics or complete history. Synthetic tests only establish implementation behavior. Bounded pilot completion does NOT make any output investable, trigger account operations, or authorize changing holdings.
- **Execution**: update only Day 3 engineering milestone status in `MASTER-PLAN.md`; do not alter immutable financial history, switch on signals, merge or deploy without separate approval. PR #164 remains Draft. Existing financial trust gates remain fail closed. Continue independent source collection as a separately tracked release prerequisite rather than an endless restart of completed pilot tests.
