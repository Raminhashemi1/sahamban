# سهام‌بان — دستور تحویل بین چت‌ها

**اول این فایل را بخوان، سپس** [MASTER-PLAN.md](MASTER-PLAN.md)، [PROJECT-STATE.md](PROJECT-STATE.md)، [DECISIONS.md](DECISIONS.md)، [WORK-LOG.md](WORK-LOG.md) و [PROJECT-CONTINUITY.md](PROJECT-CONTINUITY.md) را مطالعه کن. این پرونده‌ها یک حافظه اجرایی قابل ممیزی‌اند، نه قابلیت بازیابی خودکار تمام گفتگوهای قدیمی.

## نقطه تحویل

- پروژه: `Raminhashemi1/sahamban`
- شاخه فعال: `feat/day2-history-basis-gates-20261109`
- PR: https://github.com/Raminhashemi1/sahamban/pull/164 (Draft، بدون مجوز ادغام)
- مرحله: **روز سوم در حال انجام است** — آزمون داده واقعی و محاسبات خرید/فروش. محاسبه‌گر کارمزد/حجم به صفحه متصل شد، اما تأیید نهایی روی head جدید و داده واقعی باقی است.
- SHA آخرین اصلاحات فنی با CI سبز: `5dbccc48846354592cee756798f67da24a3b0ca6`؛ هر **۱۱/۱۱ workflow موفق**، از جمله Smoke، مرورگر و WebKit. Commitهای بعدیِ اسناد این SHA را به‌عنوان head تغییر می‌دهند؛ در هر چت head و CI فعلی را دوباره بررسی کن.
- خطای Smoke پیشین **رفع شد**: تست‌های prospective-signal-ledger و fixed-rule-evaluator با شرط مبنای قیمت هماهنگ شدند؛ تابع `decisionPlan` نیز گزارش `DATA_BASIS_UNVERIFIED` را به‌صورت امن و بدون سیگنال می‌پذیرد. Smoke کامل در SHA `5dbccc48` موفق شد: https://github.com/Raminhashemi1/sahamban/actions/runs/42684555862
- **وضعیت داده زنده:** آخرین artifact branch Smoke (2026-11-09 19:38:22Z) و live monitor/after-close run (2026-11-09) ثبت کرده‌اند `UNVERIFIED_NETWORK` / `UND_ERR_CONNECT_TIMEOUT` برای CDN و WebGW. این فقط مشکل اتصال runner را نشان می‌دهد، نه دستگاه کاربر.
- **کار انجام‌شده روز سوم:** `trade-cost-v1.js` برای تخمین سقف کارمزد خرید/فروش و حجم مبتنی بر بودجه و ریسک اضافه شده؛ تست محلی 7/7 موفق. در index/app و service-worker وصل شده و تست مرورگر در CI تعریف شده است. نرخ‌ها تخمینی و بر اساس صفحه کارگزاری با ارجاع به ویرایش 49 هستند؛ تأیید مستقیم بخشنامه و rounding/discount واقعی هنوز لازم است.
- برنامه کلی پنج‌روزه از تصویر اصلی کاربر بازیابی و در `MASTER-PLAN.md` ثبت شده است؛ هدف فعال روز دوم «تکمیل اتصالات ناقص موتور تحلیل، رتبه‌بندی و دستیار تصمیم‌گیری» است. PR164 فقط یکی از ریزکارهای روز دوم است. روز سوم بدون تکمیل/تأیید روز دوم شروع نشود.

## برنامه ثابت

طبق MASTER-PLAN.md: روز ۱ بررسی اتصال و اعتبار داده، روز ۲ موتور تحلیل/رتبه‌بندی/دستیار، روز ۳ داده واقعی/محاسبات خرید و فروش، روز ۴ رابط کاربری/موبایل/امنیت/اشتراک، روز ۵ آزمون نهایی/کاربران آزمایشی. گزارش‌های PR164 فقط بخشی از روز دوم را پوشش می‌دهند.

## نقطه ادامه بعدی

**یک کار نخست:** CI دقیق آخرین head را بررسی کن و artifact تست زنده TSETMC همان head را بخوان. اگر runner دوباره timeout شد، از کاربر بخواه تست اتصال read-only را روی دستگاه/شبکه خودش اجرا کند یا خروجی را بدهد؛ هرگز timeout را به‌عنوان نبود داده تفسیر نکن. سپس نمونه‌های واقعی سه حالت 0/1/2 و provenance را احراز کن. هم‌زمان با رسید/کارمزد واقعی، تخمین سقفی trade-cost را تطبیق بده.



**فقط یک کار نخست:** ابتدا `MASTER-PLAN.md` و این Handoff و وضعیت PR164/CI روی آخرین SHA را دوباره بخوان؛ سپس بررسی مستقل دریافت داده‌های واقعی و سه حالت قیمت TSETMC را در چارچوب روز سوم آغاز کن. هیچ اقدام معاملاتی، Merge، Deploy یا تغییر دارایی مجاز نیست. نتیجه سه‌حالته صرفاً متناظر‌سازی عددی است و بدون منشأ معتبر نباید به برچسب `INDEPENDENTLY_ATTESTED` تبدیل شود.

## یادداشت عملیاتی روز سوم (2026-11-10)

- ماژول `trade-cost-v1.js` برای برآورد سقف کارمزد خرید/فروش، مالیات فروش، سود/زیان رفت‌وبرگشت و حجم مجاز بعد از هزینه‌ها اضافه شد؛ صرفاً محاسبه و بدون سفارش است.
- آزمون Chromium باید با مسیر `#positionSizeSectionV87` ماژول را باز کند. این مسیر در `tests/trade-cost-v1-browser.cjs` اصلاح شد. تست‌های شماره‌نسخه کش نیز اصلاح شدند.
- نکته حیاتی TSETMC: در `GetClosingPriceDailyList/{insCode}/{Top}` پارامتر `Top` به نظر تعداد رکورد است (0=تمام سوابق)، نه حالت تعدیل. از مسیر /0,/1,/2 نمی‌توان سه نوع تعدیل نتیجه گرفت. [شواهد و هشدار](DAY2-HISTORY-BASIS-EVIDENCE-GATES.md) را بخوان.
- آخرین SHA فنی بررسی‌شده پیش از یادداشت‌ها: `34b627f6e2334a847e178d8cad929ff325b85441`، Smoke job موفق؛ **CI آخرین head مستنداتی باید تازه استعلام شود**.
- مرحله بعد واحد: بررسی live CI و یافتن مسیر مستند و مستقل برای سه حالت تعدیل؛ تا آن زمان status نامشخص و هیچ سیگنال.

## پروتکل اجباری آغاز چت

1. اسناد بالا را از شاخه PR164 دریافت کن. اگر در main نیستند، مستقیم از شاخه بخوان.
2. وضعیت فعلی PR، آخرین SHA، فایل‌های تغییرکرده و CI **برای همان SHA** را بررسی کن.
3. اختلاف سند و مخزن را پیش از اجرای تغییر حل کن؛ برنامه مصوب کاربر بر محدوده مقدم است، GitHub بر ادعاهای اجرای کد/تست مقدم است.
4. در پاسخ ابتدا بگو کجا هستیم، چه چیزی انجام شده، چه چیزی ثابت نشده و **فقط قدم بعدی** چیست.
5. کار انجام‌شده را تکرار نکن؛ هیچ روز بعدی یا معماری تازه‌ای از خودت نساز.
6. برای هر تغییر واقعی، Commit/PR و شواهد تست را ثبت کن و در پایان همین HANDOFF، PROJECT-STATE و WORK-LOG را به‌روزرسانی کن.
7. بدون اجازه صریح کاربر هرگز merge، deploy، معامله، پرداخت یا تغییر دارایی نکن.

## دستور کوتاه قابل کپی در چت جدید

«پروژه سهام‌بان را از GitHub، شاخه `feat/day2-history-basis-gates-20261109` بازیابی کن. ابتدا `HANDOFF.md` و `MASTER-PLAN.md` و `PROJECT-STATE.md` و `DECISIONS.md` و `WORK-LOG.md` و `PROJECT-CONTINUITY.md` را بخوان؛ سپس PR164 و CI آخرین SHA را بررسی کن. بدون تغییر برنامه اصلی و بدون تکرار کار انجام‌شده، فقط از نقطه تحویل ثبت‌شده ادامه بده. هر اقدام را با شواهد در GitHub ثبت کن.»

## قالب پایان نشست

- پایان SHA و لینک:
- تغییرات انجام‌شده:
- شواهد اجرا / CI:
- موارد نامطمئن:
- موارد نیازمند تأیید کاربر:
- فقط یک کار بعدی:

## بررسی زنده نشست 2026-11-10 (پس از شروع روز سوم)

- PR #164 همچنان OPEN / DRAFT / NOT MERGED است. SHA پیش از ثبت این یادداشت‌ها: `278d8df64a1dfcb6cb416acf8b18167f91a67556`.
- CI همان SHA در آخرین استعلام: **۱۰ از ۱۱ workflow موفق**؛ Smoke موفق: https://github.com/Raminhashemi1/sahamban/actions/runs/42769444261 ؛ quote-basis موفق: https://github.com/Raminhashemi1/sahamban/actions/runs/42769444315 ؛ WebKit هنوز `in_progress`: https://github.com/Raminhashemi1/sahamban/actions/runs/42769444354 . هیچ ادعای ۱۱/۱۱ برای این SHA ثبت نشده است.
- artifact واقعی همان Smoke با شناسه `13741265949` و نام `live-market-v111.json` خوانده شد: زمان `2026-11-10T06:35:25.340Z`، نماد `فولاد`، میزبان `https://cdn.tsetmc.com/api`، `UNVERIFIED_NETWORK` و `UND_ERR_CONNECT_TIMEOUT`. نتیجه فقط به runner مربوط است؛ داده تعدیل‌شده یا شاهد تأیید منبع به‌دست نیامد.
- این ثبت صرفاً مستنداتی است؛ SHA جدید مستندات به نتیجه CI فوق ارث نمی‌برد. تطبیق کارمزد با رسید واقعی نیز هنوز انجام نشده است.
- **تنها قدم بعدی:** دریافت نمونه واقعی فقط-خواندنی با زمان، پاسخ، digest و مستندات منشأ/معنای endpoint از شبکه‌ای که دسترسی دارد؛ تا تأیید مستقل، تاریخچه `UNKNOWN_NOT_ATTESTED` و سیگنال‌ها مسدود بمانند.

## آخرین تحویل روز سوم — 2026-11-10 (بدون دوباره‌کاری)
- کاربر تصاویر سوابق کارهای صفحه قبل را ارائه و صریحاً تکرار کار انجام‌شده را منع کرد. PR #161 (مبدل سه‌حالته)، PR #162 (collector خام و هش) و محاسبه‌گر `trade-cost-v1.js` قبلاً موجودند؛ هیچ‌یک بازنویسی یا ادغام نشده‌اند.
- بر SHA آغاز نشست `55a313f3184dfcd1c5f7e8432631206aa9a7b2c0`، هر **۱۱/۱۱ CI موفق** بودند: Smoke https://github.com/Raminhashemi1/sahamban/actions/runs/42770118086 ؛ WebKit https://github.com/Raminhashemi1/sahamban/actions/runs/42770118142 . برای SHA جدید مستندات، دوباره بررسی شود.
- `DAY3-REAL-DATA-EXECUTION.md` فقط روش جمع‌آوری شواهد واقعی و محدودیت‌ها را ثبت می‌کند؛ تست عملی با payload واقعی در این نشست انجام نشده و ادعای DNS مستقلِ بی‌لاگ نیز به عنوان اجرای تازه معتبر نیست.
- **یک کار بعدی:** قبل از هر کد جدید، artifactهای قبلی را برای پاسخ واقعی احرازپذیر بررسی کن؛ اگر موجود نبودند، collector موجود PR #162 را فقط-خواندنی در شبکه معتبر اجرا کن. تا احراز مستقل، همه گیت‌های مالی بسته بمانند.

## تحویل ارزیابی تکمیل روز سوم — 2026-11-10
- SHA مبنای بررسی `a324e62c37b1057d3023b2f2f41fbf69df4b71c6`؛ PR #164 Open/Draft و ادغام‌نشده. هنگام آخرین استعلام ۹/۱۱ workflow موفق، Smoke و 100-holding در حال اجرا؛ نتیجه SHAهای جدید مستندات باید مجدداً بررسی شود.
- artifact واقعی اجرا از Smoke `13741517462`: `UNVERIFIED_NETWORK / UND_ERR_CONNECT_TIMEOUT` در 2026-11-10T06:46:28.663Z. آزمون local DNS برای CDN/www نیز `gaierror(-3)` ثبت کرد، بدون payload منبع.
- کدهای قبلیِ محاسبه‌گر و PRهای 161/162 تکرار/ادغام نشده‌اند. شواهد اصیل سه حالت تعدیل، اعتبار مبنای قیمت و رسید واقعی کارگزاری هنوز موجود نیستند. به همین دلیل تکمیل روز سوم قابل تأیید نیست؛ وضعیت **در حال انجام / BLOCKED_EXTERNAL_EVIDENCE** باقی می‌ماند.
- گزارش مستند اجرای روز سوم: [DAY3-REAL-DATA-EXECUTION.md](DAY3-REAL-DATA-EXECUTION.md).
- **یک قدم بعدی:** خروجی خام و manifest از collector موجود PR162 روی شبکه قابل‌دسترسی و مطمئن؛ سپس بررسی منبع و تطبیق کارمزد با رسید بدون اطلاعات شخصی. تا آن زمان سیگنال‌ها مسدود بمانند؛ هیچ merge، deploy یا معامله مجاز نیست.

## تازه‌ترین نقطه تحویل — 2026-11-10، CI کامل و مانع داده بیرونی
- شاخه `feat/day2-history-basis-gates-20261109`، PR164 OPEN/DRAFT/NOT MERGED. SHA فنی/مستنداتیِ مبنای این بررسی `80b2039596c9c2b5166842f2456b77f8efba092f`، **۱۱/۱۱ workflow SUCCESS**: Smoke https://github.com/Raminhashemi1/sahamban/actions/runs/42771220222 ، WebKit https://github.com/Raminhashemi1/sahamban/actions/runs/42771220085 . در Commitهای مستنداتی بعدی CI جدید لازم است.
- Artifact دریافت و خوانده شد: `13741204786` / `live-market-v111.json`, `2026-11-10T06:51:18.043Z`, `UNVERIFIED_NETWORK / UND_ERR_CONNECT_TIMEOUT` روی GitHub runner. مسیر عمومی مستقیم نیز در ابزار مرور قابل دریافت نبود؛ هیچ پاسخ معتبر تاریخچه/سه حالت تعدیل حاصل نشد.
- روز سوم فقط از نظر نرم‌افزار/آزمون مصنوعی آماده است؛ **به علت شواهد بیرونی ناقص، بسته نشده**. محاسبه‌گر trade-cost، PR161 و PR162 قبلاً وجود دارند و نباید تکرار شوند؛ هیچ merge/deploy/trade/order/holdings edit یا فعال‌سازی سیگنال انجام نشده.
- **تنها قدم بعدی:** روی یک شبکه مطمئن دارای دسترسی، collector موجود PR162 را با insCode واقعاً بررسی‌شده اجرا کرده و پاسخ خام + SHA-256 manifest را برای ممیزی فراهم کن؛ بعد احراز سه حالت و تطبیق رسید واقعی بدون اطلاعات شخصی. تا آن زمان fail-closed.

## افزوده عملیاتی روز سوم — بررسی ظرفیت collector و نرخ بازار (2026-11-10)
- مبنا: `d3ba4a41379359ed25f21e593d692e43fc2dbf25`؛ ۱۰/۱۱ workflow موفق، quote-basis در حال اجرا (https://github.com/Raminhashemi1/sahamban/actions/runs/42771834142). CI Commitهای جدید مستندات باید جداگانه کنترل شود.
- کشف ریسک بدون دوباره‌کاری: collector حاضر در PR162 سقف یک MiB برای هر پاسخ دارد؛ تاریخچه بلند فولاد بنا بر نمونه فنی غیررسمی ممکن است بزرگ‌تر باشد. از کوتاه‌سازی خاموش یا افزایش سقف بدون آزمون پرهیز کن. شواهد واقعی هنوز موجود نیست.
- نرخ خرید فرابورس در منابع عمومی اختلاف دارد؛ محاسبه‌گر فعلی فقط برآورد سقفی است؛ بدون بخشنامه رسمی و رسید واقعی، تغییر نرخ یا اعلام صحت مالی نکن.
- شرح کامل: [DAY3-REAL-DATA-EXECUTION.md](DAY3-REAL-DATA-EXECUTION.md). برنامه اصلی تغییر نکرده، کد تکراری نوشته نشده، Merge/Deploy/Trade انجام نشده.
- **تنها قدم بعدی:** اجرای collector موجود PR162 در شبکه قابل‌دسترسی با insCode احرازشده و حجم پاسخ در محدوده؛ سپس ممیزی raw JSON و manifest SHA-256.


## 2026-11-10 — network-path reconciliation and newest live probe

- Current PR #164 base before this documentation update: `d2e395943b62d6d9a4364728abd41caf08d825ae`, OPEN/DRAFT/unmerged. Exact-head CI latest: 8 SUCCESS, 3 IN_PROGRESS (Smoke `42772645101`, WebKit `42772645129`, 20-holding `42772644394`). No result may be transferred to the documentation commits that follow.
- Downloaded latest exact-head Smoke artifact `13742616389`, `live-market-v111.json`: `checked_at=2026-11-10T07:03:55.438Z`, `UNVERIFIED_NETWORK`, `UND_ERR_CONNECT_TIMEOUT` for CDN, symbol فولاد. No response price/history obtained by GitHub runner.
- Ran a fresh read-only probe from this ChatGPT execution container: `socket.getaddrinfo('cdn.tsetmc.com',443)` and HTTPS GET both failed with local `gaierror(-3), Temporary failure in name resolution`. This is specific to this container, not proof of provider outage.
- Important correction/reconciliation of earlier shorthand: separate PR #137 diagnostic `42396816602` observed DNS success (three IPv4 addresses) on GitHub runner but TCP 443 timeout and HTTPS `UND_ERR_CONNECT_TIMEOUT`; another prior local container probe got DNS failure. Different execution networks have different failure points. Never describe this as global TSETMC DNS failure/outage.
- PR #137 also records the user's earlier physical Android-browser screenshot: public فولاد endpoint, quote/history connection and same-history match succeeded, reported close 4,410 IRR and market date 20261107; freshness was explicitly `UNVERIFIED_OUTSIDE_SESSION`. This is valuable network-specific field evidence but it is historical, user-device/browser evidence, not a retained original raw API payload, not a current-session quote, and not source-authenticated history. The same page is available at https://raminhashemi1.github.io/sahamban/market-connectivity-test.html. The next field check is only necessary if current-session freshness is a required acceptance item; it does not replace PR162 raw capture.
- Public community docs report the CDN may geo-block non-Iranian IPs (HTTP 303/403) and describe the endpoint contracts; this is third-party evidence only, not official SLA. Sources: https://github.com/amirziveh/tsetmc-skill/blob/master/SKILL.md and https://github.com/solitraderbusiness/tsetmc-mcp/blob/main/docs/endpoints.md .
- Existing PR162 collector is not a three-mode history fetcher; PR163 register explicitly says it only captures daily-list and adjustment-list, while three TSE Client modes and transport-bound response provenance remain unimplemented. Do not conflate successful same-provider chart/history match with independent basis attestation.
- No code/plan/PR state change. Day 3 remains IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE. No merge, deployment, signals, orders or holdings access. Next single dependency: user-provided trusted-network raw capture/manifest from PR162 or authorized equivalent; keep all gates closed.


## 2026-11-10 — user-device live quote field evidence (screenshot)

- User supplied a fresh screenshot of the published mobile connectivity diagnostic. The visible report states: TSETMC connection and today's quote retrieval **successful**; last-trade freshness **FRESH** at Tehran time **10:37:12**; instrument **فولاد**; reported closing price **4,810 IRR**; market date **20261110**.
- The same report explicitly shows independent history check **pending publication** with status `FRESH_QUOTE_HISTORY_PENDING`. It says today's 20261110 history row is not yet published and the latest available history dates are 20261109, 20261108 and 20261107. The page explains this is a possible publication delay, not a connection failure or complete price confirmation.
- Evidence classification: user-provided screenshot of a browser diagnostic, not raw API bytes, not a SHA-256 capture, not independent source authentication, and not proof of any historical adjustment mode. It closes the previously open **mobile-network current quote connectivity/freshness observation** for this captured moment only. It does not close the historical basis/three-mode gate, broker-fee receipt gate, or prove freshness beyond the displayed timestamp.
- This is a newer observation than the older PR #137 phone note (20261107 / 4,410 IRR); preserve both as distinct dated observations, do not overwrite historical record.
- Next action: no need to repeat the connectivity test immediately. Re-run the history comparison once the 20261110 row is published, then separately obtain PR162 raw JSON + SHA-256 manifest and independent three-mode evidence. Keep history basis `UNKNOWN_NOT_ATTESTED`, signals disabled and Day 3 open pending remaining external evidence. No code/plan/PR state/portfolio changes.


## 2026-11-10 — Day 3 closeout acceleration: fee schedule and current quote

### Newly resolved / strengthened evidence
- User's 2026-11-10 mobile diagnostic screenshot closes the **live quote connectivity and freshness observation** for that device/time: فولاد, market date `20261110`, displayed close `4,810 IRR`, last-trade time Tehran `10:37:12`, status `FRESH`. It explicitly reports `FRESH_QUOTE_HISTORY_PENDING`; today's daily history row had not yet published, with 20261109/08/07 as latest. This is not an API raw capture or historical-adjustment proof.
- Rechecked current fee schedule source: broker-published edition 49 (1405/04/27), last reviewed 1405/06/10, explicitly says ordinary share/right BUY and SELL ceiling schedule is the same for TSE and IFB: https://idbr.ir/fees . Existing `trade-cost-v1.js` rates sum to BUY 0.3712% and SELL 0.88% (including 0.5% sale tax); current tests assert 100m IRR purchase fees 371,200 and sale fees 880,000. Therefore earlier public-source claim of a lower IFB buy rate is not strong enough to override this current edition-49 source; retain one common conservative ceiling schedule as already implemented. Do not change code based on older/conflicting secondary explainers.
- Official-board circular record for the 1404/07/12 fee-service amendment: https://hoghogh.ai/circulars/c-26ee4556 . It includes several specific market/ETF/concert-market provisions; it is not, by itself, the complete 1405 edition-49 ordinary-share component table. Do not overstate primary-source validation.
- TSETMC endpoint references reconfirm `GetClosingPriceDailyList/{insCode}/{Top}` uses `Top=0` for all history and `GetPriceAdjustList/{insCode}` returns adjustment events; these are third-party reverse-engineered docs, not a guarantee of three adjustment modes: https://github.com/amirziveh/tsetmc-skill/blob/master/references/api-endpoints.md . The library's three `adjustPrices=0/1/2` modes remain a separate client-level contract.

### Remaining hard blockers (cannot be fabricated)
1. A raw provider response + SHA-256 manifest captured on the user's accessible network. Public CDN request from this execution environment remains inaccessible; exact-head runner Smoke remains `UNVERIFIED_NETWORK` in its prior run.
2. The 20261110 history row was explicitly pending in the user's screenshot. Recompare only after it is published; do not repeat current quote test now.
3. Independent 0/1/2 historical series with transport/source provenance; current collector PR162 only captures daily list + adjustment list, not those three modes.
4. De-identified executed broker receipt (or authoritative per-execution statement) to reconcile actual rounding, broker discount and charged fee. Published ceiling schedule is not a receipt.

**Status:** software calculations and synthetic CI acceptance are complete; live quote path has user-device field evidence; full Day 3 is still `IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE` because history provenance and actual fee reconciliation are missing. No code change, no repeat implementation, no PR merge/deploy/order/holdings mutation, no plan change. Next single action: once the 20261110 daily history row appears, collect raw daily + adjustment responses from user's reachable device and preserve exact bytes + SHA-256 manifest; then run the already documented 0/1/2 comparison. Broker receipt review follows separately.
