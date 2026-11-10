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


## 2026-11-10 — Second same-session mobile quote observation; publication lag remains

- User supplied a second screenshot from the same published read-only TSETMC mobile diagnostic. Screenshot reports exact public symbol **فولاد**, market date **20261110**, official-endpoint close **4,810 IRR**, last-trade time **10:44:57 Tehran**, status **FRESH**. The previous screenshot showed 10:37:12 and the same reported close. These are TWO independent-in-time user-visible UI observations, **not** independent source attestation; do not treat the status alone as verification of quote price basis or adjusted history.
- Crucially, **20261110 history is still absent** from the separate daily endpoint in the second screenshot. Latest returned record dates: 20261109 / 20261108 / 20261107. The exact report remains `FRESH_QUOTE_HISTORY_PENDING`. Today's quote freshness is observed; full daily-history matching is NOT established. No data rewrite, inference that the missing daily row equals 4,810, capital adjustment or trading signal is permitted.
- GitHub pre-documentation PR #164 head `6527b01cdbf4eabd96a6cd3b4166c08a2717301d` was rechecked and **11/11 GitHub Actions workflows completed SUCCESS** (Smoke run https://github.com/Raminhashemi1/sahamban/actions/runs/42773690799 ; WebKit https://github.com/Raminhashemi1/sahamban/actions/runs/42773690797 ); this is synthetic/software CI and cannot close provider/fee evidence. New documentation commits require independent exact-SHA CI.
- Repeat-mobile-test is **not** the next immediate task. Avoid asking the user to test again until the 20261110 daily record is known to be published; fresh quote connectivity has already been observed. Exact daily-history raw payload and three-mode source attestation remain missing, and a de-identified brokerage fee receipt is also missing. Day 3 continues `IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE`, not COMPLETE.
- No new code, PR merge, deployment, trade or holdings edit. Next single actionable dependency: raw provider daily/history evidence with SHA-256 and independently corroborated row date from a reachable trusted environment, using existing PR #162 capture path where applicable.


## 2026-11-10 — Implemented de-identified brokerage receipt comparison (Day 3)

- Starting PR #164 head: `88b52440ddb5bc230d51b1dbe392c060d09b99f3` (OPEN / DRAFT / not merged). Re-read all six required memory docs and inspected the existing trade-cost calculator + tests, PR #162 provider collector and active Smoke CI. Starting-head CI was 7 successes with four runs still in progress at last inspection; do not claim green for this start SHA.
- Checked GitHub code search for existing receipt-reconciliation helper; no matching specific module was found. **Did not rebuild** `trade-cost-v1.js`.
- Added `trade-cost-receipt-review-v1.cjs` as a local-only, read-only numerical review adapter calling the existing `calculateOrderCosts`. Accepts only explicitly whitelisted de-identified fields: market (TSE/IFB), side, quantity, priceRial, grossRial, feesRial, settlementRial and instrumentType; rejects unknown fields and unsupported types. Checks gross = qty × price, settlement arithmetic and actual fees against the existing schedule's estimated ceiling. Flags mismatches, below-/above-estimate cases and always returns `brokerReceiptAuthenticated:false`, `feeScheduleOfficiallyVerified:false`, `tradeEligible:false`, `tradingSignalsEnabled:false`. Match is numerically consistent **but not financial attestation**.
- Added `tests/trade-cost-receipt-review-v1.test.cjs` with 8 focused tests (exact numeric match, discount case, above-ceiling, sale-tax arithmetic, mismatched totals, unsupported/personal data, unsafe/invalid numerics, no mutation). Local Node 22 test run 8/8 PASS using a representative local copy of the existing published fee schedule; exact repository CI is the authoritative regression test with the real module.
- Included the new Node test in `.github/workflows/smoke-tests.yml`. Commits: module `f69d96bdbf860c3fa2619244ee4845ee8222386e`, tests `dfe49f0de6248027b38aa914227b12b1828c4928`, workflow `dff1c0e6c1668deaa2ee87ff2b6d99b89dd6173a`. The exact-head GitHub Actions workflows were queued/in progress at first observation; do not claim CI green before an observed conclusion.
- No personal receipt data was supplied; no real broker amounts were compared yet. Latest physical-phone screenshot still shows `FRESH` quote with `FRESH_QUOTE_HISTORY_PENDING` for 20261110. Historical basis, three distinct live adjustment series and TSETMC raw bytes/SHA-256 remain not verified. Do not declare Day 3 complete.
- No merger, deployment, order, payment, user holdings mutation, signal activation or master plan changes. **Next single action:** review exact-head Smoke regression and (when available) a de-identified real brokerage receipt through the existing adapter, while continuing independent raw historical source evidence separately.


## 2026-11-10 — Day 3: saved TSETMC evidence byte-integrity review implemented

- Starting active head `236a0abbf0d312d221f269b1f7d22389c6cb67b0`, PR #164 OPEN/DRAFT/unmerged. Six canonical memory docs reread; found existing PR #162 collector (separate unmerged PR) and existing receipt review module. GitHub exact starting-head workflow CI later reached **11/11 SUCCESS**, including Smoke; this success belongs to that SHA only.
- Added an **offline review-only verifier** `tsetmc-capture-integrity-review-v1.cjs` for the exact existing PR #162 capture manifest + two raw JSON buffers. It checks: fixed TSETMC URLs; exact `insCode` and UTC timestamp bound to expected file names; SHA-256, byte size and UTF-8 fidelity; expected daily/adjustment JSON envelopes and row counts; Gregorian dates, duplicate daily dates and positive numeric closes; explicitly false attestation, eligibility and trading flags. Returns only byte/schema consistency with `sourceAuthenticated:false` and `historyPriceBasisVerified:false`; **no provider authentication, daily-row freshness verification, three adjustment-mode fetching, or trading permission**.
- Added `tests/tsetmc-capture-integrity-review-v1.test.cjs` (9 synthetic/regression tests) and the test invocation to Smoke CI, without duplicating the PR #162 collector or modifying market/financial production flows. Important hardening: checks manifest timestamp type before parsing and compares exact saved filenames with the manifest UTC timestamp. Implementation commits: `2a39315771d1c24251e6ea86ab278f39fc530d5c` (module), `2a231b0c85a0357285be52b71005528044bea2ca` (tests), `8df7e1ab225cf3fffd2b8f0146f5546e2a794573` (CI), `57ae1e312265ded2c188ddb4d5f6e866970e7374` and `2e3563dcf0ae1d4d25592a555b43e59c15865508` (hardening/test).
- On CI for intermediate `8df7e1ab225cf3fffd2b8f0146f5546e2a794573`, the dedicated test step **completed SUCCESS** as observed in Smoke job `42775655447`; the full workflow was still in progress when read. The later hardened code head `2e3563dcf0ae1d4d25592a555b43e59c15865508` requires its own CI verification. Do not inherit success from the prior head.
- User's twice-observed physical phone live quote stays `FRESH` with `FRESH_QUOTE_HISTORY_PENDING` (20261110 date, فولاد, 4,810 IRR). No authentic raw provider capture or independent 0/1/2 history series have been obtained; no brokerage fee receipt was provided. Therefore Day 3 is **IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE**, NOT COMPLETE, irrespective of software-test successes. Reuse PR162 collector on a trusted reachable network once its daily row is published; review resulting original files with verifier. Receipt review uses existing `trade-cost-receipt-review-v1.cjs` when de-identified actual figures are available.
- No merge, deploy, order, holdings access/change, history mutation or signal activation. No change to approved five-day MASTER-PLAN or DECISIONS.
- **Single next step:** verify exact latest CI and acquire original TSETMC raw files + SHA-256 manifest from a trusted accessible network for independently reviewed evidence; do not require more screenshots of current quote.


## 2026-11-10 — Day 3 final acceptance review (not certified complete)

**Reviewed exact branch head:** `b4985aa19a66e188e67823bbb98a1f6f324c6c08` on Draft/open/unmerged PR #164. Re-read all six canonical project memory documents and the Day 3 execution report. No repeated coding or merging. Verified the new `tsetmc-capture-integrity-review-v1.test.cjs` step was completed **SUCCESS** in the Smoke job of run [42775890276](https://github.com/Raminhashemi1/sahamban/actions/runs/42775890276). On latest exact-head snapshot **5 workflows completed SUCCESS and 6 remained in progress** (including the overall Smoke workflow). Hence the full 11-workflow result for this SHA was **NOT FINAL**; any new documentation commit will have its own CI.

**Acceptance matrix (facts vs external prerequisites):**
1. Existing read-only share/right order-cost/round-trip/risk-sized computation and browser integration: **IMPLEMENTED, SOFTWARE-TESTED**. Live broker execution/accounting not asserted.
2. De-identified receipt-comparison adapter `trade-cost-receipt-review-v1.cjs`: **IMPLEMENTED, TESTED**. Actual broker receipt/discount/rounding reconciliation: **NOT PERFORMED**, because no redacted transaction values have been supplied.
3. Public market quote on user's Android browser: **FIELD OBSERVED FRESH** twice on 20261110 for فولاد / 4,810 IRR at 10:37:12 and 10:44:57 Tehran. Independent daily-history comparison: **PENDING** on both observations. This is a device-visible quote, not an original byte-level market-history capture.
4. PR #162 raw response collector: **ALREADY EXISTS in independent unmerged PR**, not duplicated here. New offline byte/JSON/manifest verifier `tsetmc-capture-integrity-review-v1.cjs`: **IMPLEMENTED, DEDICATED TEST STEP SUCCESS** on base SHA; no real original captures available.
5. Independently sourced three adjustment-mode histories (0/1/2), verified source identity and a documented current-date history record: **NOT VERIFIED**. PR #161 adapter and PR #160 classifier are review-only independent PRs and cannot authenticate provenance or permit signals.
6. GitHub-hosted source connectivity: **UNVERIFIED_NETWORK** in preserved smoke artifacts; direct public URL request through the external browsing environment also returned inaccessible. Neither demonstrates TSETMC is globally offline; the phone result demonstrates a network-path difference.

**Final decision:** The original MASTER-PLAN's Day 3 cannot responsibly be marked `COMPLETE` because real-history/adjustment authenticity and brokerage fee reconciliation are mandatory acceptance evidence. Set `DAY3=IMPLEMENTED_SOFTWARE__BLOCKED_EXTERNAL_EVIDENCE`, maintain `UNKNOWN_NOT_ATTESTED`, no entry/sell signals and no merge, deployment, order or holdings modification. **Do not re-run the phone's same FRESH test as a substitute**. Require only: (a) original trusted-network PR #162 raw JSON files + their SHA-256 manifest after the daily row becomes available; (b) authenticated mode 0/1/2 source-bound records; (c) de-identified actual broker receipt figures. After those arrive, use the already-existing verifiers and record exact numerical deltas before final sign-off. The user was not asked to repeat earlier completed tasks.


## 2026-11-10 — completion request: precise external evidence dependency
- Rechecked PR164 head `8054b3401db1db4c56dfb77e3cc699b505752457` open/draft/unmerged. The exact-head Smoke run `42776268427` contained completed SUCCESS steps `tests/trade-cost-receipt-review-v1.test.cjs` and `tests/tsetmc-capture-integrity-review-v1.test.cjs`; browser job and several other workflows were still in progress at the latest read. Therefore 11/11 green was **not** established on that SHA.
- A direct public TSETMC instrument-search URL was attempted via the browsing service, but it returned **inaccessible**, no raw HTTP provider JSON bytes. Network-path-specific unavailability remains; do not call provider globally offline.
- Completed software work and smartphone `FRESH` observation are already recorded, and no task was duplicated. Critical external acceptance items remain unavailable: original raw TSETMC response files + matching SHA-256 manifest from trusted reachable network; authentic transport-bound 0/1/2 adjustment mode responses; and one de-identified real broker settlement receipt. Existing offline verifiers cannot manufacture these inputs.
- Thus the exact project state is `DAY3=SOFTWARE_IMPLEMENTED; FINAL_ACCEPTANCE=BLOCKED_EXTERNAL_EVIDENCE`. No merge, deploy, order, history rewrite, portfolio mutation or signal activation. Next prerequisite is acquisition of real external files/receipt, not another synthetic test or phone screenshot.


## 2026-11-10 — Day 3 targeted code hardening (no duplicate implementation)

- At session start PR #164 head was `6917a7c1ecf62a047af90ecbc117ee2edc90bd64`, OPEN/DRAFT/not merged. Six canonical memory documents were re-read. Start-head CI 9/11 successful and two still running (Smoke and WebKit) at initial inspection. The dedicated integrity and receipt-review test *steps* were confirmed completed successfully in the Smoke job. Do not claim the overall workflow or any subsequent SHA green unless directly observed.
- Audited existing `tsetmc-capture-integrity-review-v1.cjs` (not a new collector): it used to coerce numeric `manifest.insCode` to a string and did not validate `contentType` recorded by existing PR #162's collector. Hardened this to require a literal numeric **string** instrument ID and recorded canonical `application/json` MIME, rejecting HTML/JavaScript/missing case data. Added a focused synthetic regression test. Code `98abf36a3cfbba497dcfe45ca84635b4b95072b6`; test `34a68a478ba224955cc4983ea706577d2dee1334`.
- Audited existing `trade-cost-receipt-review-v1.cjs`: plain-record check previously permitted accessor properties, symbol-keyed fields and inherited objects. Rejected all of these before reading user-provided values; tests ensure an injected throwing getter never runs. Code `09a4290ca96f2c41b585484fecba75126611dc11`; test `3afc54c5e87663f3af62a01bb29a79b1305cd06e`.
- Changes are confined to the review-only modules and their tests; existing calculators, TSETMC capture PR #162, adapter PR #161, master plan, stored market history, portfolio data and financial gates are unchanged. No merge, deployment, live trade, signal activation or holdings mutation.
- At test-head `3afc54c5e87663f3af62a01bb29a79b1305cd06e`, GitHub Actions had started and were still pending; no complete exact-head CI success claim. The live market original raw files + independent source/mode evidence and an actual redacted brokerage receipt have not been supplied.
- Status remains `DAY3=SOFTWARE_IMPLEMENTED_WITH_NEW_HARDENING; FINAL_ACCEPTANCE=BLOCKED_EXTERNAL_EVIDENCE`. Next: confirm exact-head CI and obtain trusted original capture + three source-bound modes and de-identified actual fee receipt. No repeat of the user's already-successful phone freshness check.



## 2026-11-10 — CI regression repaired after Day 3 hardening
- Resumed from PR #164 head `f07ac5a641fe56aa08d7ac99dcd09d7688c44e34` and reread all six canonical memory documents. The hardened modules introduced new GitHub CI run `42776839881` at SHA `3afc54c5e87663f3af62a01bb29a79b1305cd06e` with a **real Smoke failure**: the existing identity/account data rejection test expected the substring `unexpected field`, but a newly hardened validator emitted `unexpected or accessor field`. Exact source: [failed Smoke job logs](https://github.com/Raminhashemi1/sahamban/actions/runs/42776839881).
- Fixed **only** the error-message contract in existing `trade-cost-receipt-review-v1.cjs` to `unexpected field or accessor: only own de-identified data fields are permitted` (commit `49d1d2aa50c6d11e609480bf6beedabe9d00d508`), retaining strict rejection of getters, symbol keys, custom prototypes and unexpected personal fields. No relaxation of validation, no change to financial calculations or source gates.
- At repaired exact-code SHA `49d1d2aa50c6d11e609480bf6beedabe9d00d508` in Smoke workflow [42777094143](https://github.com/Raminhashemi1/sahamban/actions/runs/42777094143), BOTH dedicated steps `tests/trade-cost-receipt-review-v1.test.cjs` and `tests/tsetmc-capture-integrity-review-v1.test.cjs` completed **SUCCESS**, as verified in job steps. The entire 11-workflow CI was still IN_PROGRESS at the latest poll; a new docs head triggers new checks and cannot inherit that conclusion.
- Existing PR #162 source CLI was directly read: it writes UTF-8 raw `daily` + `adjustments` files and a manifest with fields `status`, `insCode`, `collectedAt`, `host`, `files`, negative authorization flags. The integrity verifier matches this structure and checks exact timestamp/filenames, content type and hashes on real bytes when later supplied. No capture from actual TSETMC and no broker settlement receipt were available.
- Day 3 remains `SOFTWARE_IMPLEMENTED__EXTERNAL_EVIDENCE_REQUIRED`; neither these CI tests nor smartphone quote screenshot prove independent historical basis or actual brokerage settlement. PR164 remains Draft/unmerged. No merge/deployment/trade/order/signals/holdings modifications. **Next task:** collect original source-bound history + three modes and de-identified brokerage receipt in a trusted reachable environment, then run the already-implemented checks. Do not repeat the successful phone quote test.


## 2026-11-10 — CI final poll and hard boundary for Day 3 acceptance
- Exact PR #164 head `dd02e703b5c473618a475c6d6a6fc99959da50db`: **10/11 workflows SUCCESS, 1/11 WebKit mobile acceptance proxy IN_PROGRESS** at run `42777382107`; Smoke `42777382114` SUCCESS. No failures observed in completed workflows. Do not call 11/11 green until WebKit concludes.
- Receipt review and TSETMC raw-byte integrity dedicated tests are included in the successful Smoke run. This closes the software/CI validation gap for these review-only tools, not the live-data evidence gates.
- Reconfirmed published diagnostic's behavior: it reads quote and raw daily endpoint and classifies the current day as `FRESH_QUOTE_HISTORY_PENDING` until the daily row appears. It does not preserve original raw bytes or export the independent 0/1/2 adjusted series. Existing PR #162 collector is separate/unmerged and captures only daily/adjustment responses. Existing PR #161 adapter only normalizes caller-provided 0/1/2 results; it cannot fetch/authenticate them. Do not mark these as verified.
- Final acceptance remains blocked by exactly two evidence bundles: (A) TSETMC raw daily+adjustment bytes and matching SHA-256 manifest, plus independently obtained transport-bound `adjustPrices=0/1/2` series for the same insCode/date window; (B) de-identified real broker execution receipt with gross, fee and settlement numbers. User's two fresh-quote screenshots are already recorded; no further screenshot/re-test of quote is required.
- Fastest safe path is to run the existing PR #162 capture CLI from the user's TSETMC-reachable environment after the day's daily row has appeared, then supply the generated JSON files + manifest; separately supply one redacted broker receipt. Current ChatGPT execution environment cannot reach the provider and no broker receipt is available. This is a real external dependency, not an implementation task we can close by writing more code.
- No source/price-basis attestation, no merge/deploy, no trading signals or orders. Day 3 = software implementation complete, external evidence sign-off pending. Do not alter MASTER-PLAN acceptance criteria or label complete prematurely.



## 2026-11-10 — Last-mile execution attempt (no fabricated acceptance)
- Rechecked all six canonical memory docs and PRs #160–#164. #160 is the offline classifier, #161 only normalizes caller-provided TSE Client three-mode responses (not a fetcher), #162 is the two-endpoint raw collector, #164 remains the main Draft fail-closed PR. No missing collector implementation was hidden in these PRs.
- Public docs reconfirm primary فولاد instrument code `46348559193224090` and the official CDN endpoints, but these are third-party reverse-engineered endpoint references rather than source bytes. Direct web-open of the official CDN instrument-search endpoint, webgw gateway and members chart endpoint all returned inaccessible in this execution environment. Published technical notes describe CDN geo-blocking outside Iran; that is consistent with, but does not prove the cause of, this environment's failure. Do not synthesize a real capture from search snippets or third-party chart history.
- PR #164 exact latest checked SHA `981e45292fedf4d0a3042b6b1169b216fdde0d93`: 8/11 workflows SUCCESS, 3 still IN_PROGRESS at poll (Smoke, WebKit mobile, 100-holding lifecycle). No failures among completed runs. The prior SHA `dd02e703...` had 10/11 SUCCESS and WebKit pending; exact-SHA distinction retained.
- A minimal path for user-reachable TSETMC capture already exists and is not reimplemented: checkout branch/PR #162 code in a Node environment on the network that can reach TSETMC and run `node scripts/collect-tsetmc-evidence-v162.cjs 46348559193224090 ./tsetmc-evidence`. It produces two raw JSON files plus one manifest. This alone still does not produce independent modes 0/1/2; those must be fetched from TSE Client with exact transport-bound requests and then normalized by PR161 and classified by PR160. The execution environment cannot run a user-network command on their device.
- The real executed broker receipt is private financial evidence and is not present in GitHub or this conversation. No truthful automated/public substitute exists. User must provide a redacted receipt or authoritative execution statement; do not infer a broker charge from a tariff ceiling.
- Conclusion: no more synthetic code can close these facts. Day 3 is software-complete / external evidence acceptance blocked. Keep all financial gates closed; no merge/deploy/trade/history mutation. Ask user only for the original raw capture bundle + three-mode payloads and a redacted receipt. Do not ask for another screenshot of the already-tested fresh quote.


## 2026-11-10 — Browser-only Day 3 raw evidence collector prepared
- User explicitly agreed to a simple HTML browser capture alternative to installing Node.js on Windows 10. Added `tsetmc-browser-evidence-capture.html` on PR #164 branch (code commit `19b18f11d3b1944ea8ffa0865ab47060587c7a92`). This is intentionally NOT published to GitHub Pages/main and NOT deployed; a local download/open or an authorized deployment is needed to execute it.
- Fixed public instrument code `46348559193224090` is prefilled but editable. Read-only CORS GETs go only to the two fixed HTTPS CDN paths (daily /0 and price adjustment list); omits credentials, disables redirects/cache, applies 12s shared timeout, streamed 1MiB cap each and <=10k row schema checks. SHA-256 digests are computed on exact Uint8Array raw HTTP response bytes via WebCrypto, no reserialization of price JSON. Three explicit user-click download buttons emit two original JSON blobs plus a metadata/sha256 manifest in the same schema expected by the existing PR #164 verifier. No financial/portfolio data transmitted or changed.
- Browser CORS, WebCrypto secure context and TSETMC access are runtime dependent and NOT tested on the user's device. No success claim or original capture files yet. This does NOT fetch independent tse-client adjustPrices=0/1/2 modes, attest provider origin or verify broker execution fees, and cannot close Day 3 by itself.
- Next: user opens the standalone HTML in their CORS-capable browser (without installing Node), clicks capture, then downloads and sends three generated files; the existing offline verifier checks raw bytes. Browser failures must be reported plainly, with no fallback to synthetic evidence. Broker receipt and independent three modes remain separate pending acceptance gates. PR164 remains draft/unmerged and no deployment/trades/signals authorized.


## 2026-11-10 — Phone evidence: oversized full history, bounded Top=500 remediation
- User ran the dedicated browser capture on their phone. Real screenshot error: **«پاسخ بزرگ‌تر از ۱ مگابایت است؛ ذخیره ناقص ممنوع»**. Browser fetched enough bytes to reach the explicit 1 MiB ceiling; no complete original raw daily response or authenticated manifest was exported. This does not by itself prove the rest of the response or adjustment-list availability. It is **not a CORS failure**, and should not be misdiagnosed as one.
- Implemented a reviewed partial-history capture route instead of silently increasing the 1MiB safety limit or truncating the full `/0` response: updated `tsetmc-browser-evidence-capture.html` to request `GetClosingPriceDailyList/{insCode}/500` with exact raw bytes, unchanged byte cap/timeout and an explicit `captureScope=BOUNDED_DAILY_TOP_500` + `dailyTop=500` in the manifest. Reject >500 daily response rows. Updated `tsetmc-capture-integrity-review-v1.cjs` to strictly accept old `/0` legacy manifest versus separately labeled `/500` scope, return `fullHistoryCaptured=false` for bounded history and keep all authorization flags false. Added two regression tests to existing suite. Commits: HTML `672326ad07da33d7d2d91851b16b63f8bf3ad239`, verifier `dfa955319a65665b0efec26d338c0b173b412a66`, tests `4b81f15d3614729fdd5bbcb6a57f560ac1e0b25c`.
- New exact-head CI started: 3 of 11 workflows had completed SUCCESS, other 8 were in progress at first check; no whole-green claim. No actual bounded response receipt yet. Since main Pages was not deployed, user MUST re-download updated HTML from the PR164 branch rather than reuse old downloaded copy. If browser successfully downloads its two raw files plus manifest, verify them; do not call the sample a full history, attested source, 0/1/2 modes or complete Day 3. No merge/deploy/trading/holdings mutation.


## 2026-11-10 — FIRST USER-SUPPLIED ORIGINAL BOUNDED MARKET CAPTURE VERIFIED
- User uploaded all three original generated artifacts, timestamp `2026-11-10T09:47:49.485Z` (UTC), insCode `46348559193224090` / public فولاد. The actual uploaded bytes were inspected locally, JSON decoded and SHA-256 independently recalculated, not inferred from screenshot or filenames.
- Capture scope: `BOUNDED_DAILY_TOP_500`; direct recorded URL `https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceDailyList/46348559193224090/500`. Daily response **159391 bytes, 500 rows**, SHA-256 **`e9a560b92c08ce855cea58f2cbd9da566b8e782f452a2f79472de3224daa56e4`**, date window `20241014`–`20261109`. All 500 dates are unique, positive numeric closes, matching instrument codes. Daily history **has no `20261110` row** at capture time; latest is 20261109, close **4670 IRR** (20261108 4540; 20261107 4410). This does NOT contradict the user's earlier separate 20261110 fresh quote **4810 IRR**; the daily endpoint had not yet published the same-day row.
- Price-adjustment response recorded URL `https://cdn.tsetmc.com/api/ClosingPrice/GetPriceAdjustList/46348559193224090`: **3173 bytes, 23 rows**, SHA-256 **`29d25461c61306fc716e44dedb0e98200cf1159de4f17eeb18667741df6263ae`**, events `20090623`–`20260803`. Schema valid, instrument ID matches; `corporateTypeCode=null` in the supplied rows, so do not assert specific corporate-action types from this data.
- Both raw SHA-256 values **EXACTLY match user-supplied manifest**; recorded filenames, URLs, sizes, counts, MIME, timestamp and negative authorization flags match the browser capture contract. Python independently reenacted all corresponding Node verifier checks on the mounted original bytes and returned `RAW_BYTES_MATCH_MANIFEST_FOR_REVIEW`. Do not overstate this as a direct run of the repo Node verifier; that Node source could not be downloaded into the local execution container due to network access, but existing Node regression suite was previously run in GitHub CI.
- PR #164 SHA `16d3021ee7978dd0e354df4c38c1cf29d7f0e2d3` exact-head **11/11 GitHub workflows completed SUCCESS**, including Smoke `42793515323` and WebKit `42793515203`. This was confirmed before writing this log (subsequent docs commits trigger new checks; do not attribute full green to new head).
- Final acceptance boundaries: FIRST real raw evidence bundle and its byte integrity are now **VERIFIED FOR REVIEW**; this bounded 500-row history is not a complete archive. Source authentication remains `false` because browser self-reported provenance and HTTPS connection are not independent attestation. The independent adjustment-mode 0/1/2 transport-bound capture + classifier remains outstanding; today's 20261110 daily row is not yet present in supplied history; executed actual broker receipt remains absent. **Do not mark Day 3 COMPLETE, permit actionable signals, merge/deploy or change holdings**. User does NOT need to send these exact three files again.


## 2026-11-10 — Redacted broker order-detail evidence (وساخت)
- User supplied a broker app order-detail screenshot for symbol وساخت. It explicitly shows Buy, status executed, quantity 21,136, executed quantity 21,136 (100%), price 1,966 IRR, order time 1405/07/04 10:35:51, validity روز, and displayed transaction value 41,553,376 IRR.
- Independently recomputed gross notional: 21,136 × 1,966 = 41,553,376 IRR; matches screenshot exactly. This is a useful real executed-order fixture for buy notional and full-fill handling.
- Screenshot does NOT show commission, taxes/levies, total cash debit/settlement, broker receipt number, or a detailed fee breakdown. It is order detail, not a settlement/commission receipt. Do not infer actual fee rates or net debit from the gross notional. Fee acceptance remains open pending statement/settlement detail.
- Personal account identifiers were not transcribed or added to repository. Evidence is user-provided screenshot, not raw broker export. Keep real-money trading/signal gates unchanged.
