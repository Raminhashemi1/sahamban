# سهام‌بان — وضعیت اجرایی جاری

> **Snapshot، نه حقیقت قطعی آینده.** قبل از شروع هر چت باید GitHub زنده بررسی شود و این سند به‌روز گردد.
> برای جزئیات و تاریخچه به [PROJECT-CONTINUITY.md](PROJECT-CONTINUITY.md) مراجعه کنید.

- مخزن: https://github.com/Raminhashemi1/sahamban
- PR فعال: https://github.com/Raminhashemi1/sahamban/pull/164
- شاخه: `feat/day2-history-basis-gates-20261109`
- آخرین SHA دارای تأیید کامل CI در پایان کار فنی روز دوم: `5dbccc48846354592cee756798f67da24a3b0ca6`؛ **۱۱/۱۱ موفق**. Commitهای مستندسازی بعدی SHA جدید می‌سازند و نیازمند بررسی مجدد هستند.
- وضعیت PR در آخرین مشاهده: **OPEN / DRAFT / NOT MERGED**.
- وضعیت برنامه: **روز سوم در حال انجام است.** روز دوم از نظر نرم‌افزاری جمع‌بندی شد؛ اعتبارسنجی داده واقعی و تأیید مبنای تاریخچه همچنان باز است.

## هدف مرجع فعال روز سوم

روز سوم: **آزمایش داده واقعی بورس، محاسبات خرید و فروش و رفع خطاهای مهم**. آخرین اتصال واقعی TSETMC از runner در 2026-11-10 هنوز بررسی تازه نشده؛ آخرین artifacts قابل‌دسترسی در 2026-11-09 وضعیت `UNVERIFIED_NETWORK` با `UND_ERR_CONNECT_TIMEOUT` برای CDN و WebGW ثبت کرده‌اند. این خطا دسترسی دستگاه کاربر را ثابت نمی‌کند.

- محاسبه‌گر هزینه خرید/فروش و تعیین حجم با کارمزد سقفی برای سهام/حق‌تقدم اضافه شده؛ تست محلی Node: 7/7 موفق. CI دقیق آخرین SHA هنوز باید تأیید شود.
- نرخ‌های مرجع: خرید 0.3712%، فروش 0.88% شامل مالیات 0.5%، با سقف جداگانه اجزای کارمزد؛ منبع بررسی‌شده کارگزاری ایده‌آل کوشا (ویرایش 49، تاریخ بررسی 1405/06/10)، نه ابلاغیه مستقیم رسمی. گردکردن و تخفیف کارگزار نیازمند تطبیق با رسید واقعی است.
- محاسبه‌گر فقط تخمین سقف است؛ برای سهام/حق‌تقدم. ETF، لغزش قیمت، نقدشوندگی و اجرای سفارش پوشش داده نشده‌اند. هیچ سفارش یا تغییری در دارایی انجام نمی‌دهد.


## سابقه روز دوم

هدف روز دوم در برنامه اصلی، تکمیل اتصالات موتور تحلیل، رتبه‌بندی و دستیار تصمیم‌گیری بود. مرحله نرم‌افزاری/آزمون مصنوعی روی SHA `5dbccc48` جمع‌بندی شد؛ احراز واقعی مبنای قیمت هنوز یک گیت مالی باز است.

## ماتریس پیشرفت

| آیتم | وضعیت | شواهد/محدودیت |
| --- | --- | --- |
| انتقال وضعیت ناشناخته مبنای قیمت | IMPLEMENTED | PR164 |
| محافظ fail-closed در مسیرهای تحلیل/تصمیم | IMPLEMENTED | PR164؛ موفقیت روی آخرین head مجدداً بررسی شود |
| نمایش تشخیصی SMA/RSI/MACD | IMPLEMENTED | تأیید مستقل مبنای قیمت نیست |
| مستند معیارهای تأیید سه‌حالته | DOCUMENTED | [DAY2-HISTORY-BASIS-EVIDENCE-GATES.md](DAY2-HISTORY-BASIS-EVIDENCE-GATES.md) |
| آزمون کامل روی آخرین Commit فنی | TESTED | SHA `5dbccc48`، تمام ۱۱ workflow موفق؛ Smoke: https://github.com/Raminhashemi1/sahamban/actions/runs/42684555862 ؛ WebKit: https://github.com/Raminhashemi1/sahamban/actions/runs/42684555936 |
| اتصال ایمن v129→v133 | TESTED_ON_SYNTHETIC_FIXTURES | تست‌های core، ranking، sample، audit و UI در Smoke/Browser موفق؛ تأیید مالی واقعی همچنان باز است |
| دریافت مستقل داده واقعی سه حالت TSETMC | NOT_VERIFIED | هر دو مسیر CDN/WebGW در runner ناموفق. پارامتر انتهایی `GetClosingPriceDailyList/{insCode}/0` طبق راهنمای فنی غیررسمی، تعداد رکورد است نه نوع تعدیل؛ سند مستقل هنوز لازم است |
| مرز اعتماد شواهد تاریخچه | NOT_IMPLEMENTED | مقدار رشته‌ای `INDEPENDENTLY_ATTESTED` کافی نیست |
| محاسبه‌گر کارمزد/حجم | IMPLEMENTED_CI_REVIEW | `trade-cost-v1.js`, اتصال صفحه و تست Chromium؛ Smoke در SHA `34b627f6` موفق؛ تأیید نهایی CI آخرین SHA و تطبیق رسید کارگزاری هنوز لازم است |
| ادغام/انتشار/سفارش | NOT_DONE | بدون اجازه مجاز نیست |

## نوبت بعد

**ادامه روز سوم:** ابتدا CI روی آخرین SHA و نتیجه probe زنده را بررسی کن؛ سپس دسترسی TSETMC از دستگاه/شبکه کاربر را از runner جداگانه تشخیص بده، داده 0/1/2 را فقط با منبع واقعی و artifact مستقل مقایسه کن و کارمزدهای واقعی را با رسید کارگزاری تطبیق بده. تا احراز مستقل، صدور سیگنال معاملاتی ممنوع است.

وضعیت‌ها را فقط با ارجاع به SHA و اجرای CI به‌روز کنید. برای تحویل عملیاتی جاری [HANDOFF.md](HANDOFF.md) را بخوانید.

## بررسی زنده نشست 2026-11-10 (پس از شروع روز سوم)

- PR #164 همچنان OPEN / DRAFT / NOT MERGED است. SHA پیش از ثبت این یادداشت‌ها: `278d8df64a1dfcb6cb416acf8b18167f91a67556`.
- CI همان SHA در آخرین استعلام: **۱۰ از ۱۱ workflow موفق**؛ Smoke موفق: https://github.com/Raminhashemi1/sahamban/actions/runs/42769444261 ؛ quote-basis موفق: https://github.com/Raminhashemi1/sahamban/actions/runs/42769444315 ؛ WebKit هنوز `in_progress`: https://github.com/Raminhashemi1/sahamban/actions/runs/42769444354 . هیچ ادعای ۱۱/۱۱ برای این SHA ثبت نشده است.
- artifact واقعی همان Smoke با شناسه `13741265949` و نام `live-market-v111.json` خوانده شد: زمان `2026-11-10T06:35:25.340Z`، نماد `فولاد`، میزبان `https://cdn.tsetmc.com/api`، `UNVERIFIED_NETWORK` و `UND_ERR_CONNECT_TIMEOUT`. نتیجه فقط به runner مربوط است؛ داده تعدیل‌شده یا شاهد تأیید منبع به‌دست نیامد.
- این ثبت صرفاً مستنداتی است؛ SHA جدید مستندات به نتیجه CI فوق ارث نمی‌برد. تطبیق کارمزد با رسید واقعی نیز هنوز انجام نشده است.
- **تنها قدم بعدی:** دریافت نمونه واقعی فقط-خواندنی با زمان، پاسخ، digest و مستندات منشأ/معنای endpoint از شبکه‌ای که دسترسی دارد؛ تا تأیید مستقل، تاریخچه `UNKNOWN_NOT_ATTESTED` و سیگنال‌ها مسدود بمانند.

## تکمیل بررسی روز سوم — 2026-11-10
- CI روی SHA مبنای نشست `55a313f3184dfcd1c5f7e8432631206aa9a7b2c0` پس از تکمیل، **۱۱/۱۱ موفق** شد؛ Smoke: https://github.com/Raminhashemi1/sahamban/actions/runs/42770118086 ؛ WebKit: https://github.com/Raminhashemi1/sahamban/actions/runs/42770118142 . این نتیجه به Commitهای مستنداتی جدید منتقل نمی‌شود.
- کارهای قبلی تکرار نشده‌اند: ابزار دریافت پاسخ خام و SHA-256 در PR #162 و مبدل سه‌حالته در PR #161 موجود و جداگانه‌اند؛ محاسبه‌گر هزینه معامله قبلاً ساخته شده است.
- دستور کاربر: تصاویر کارهای انجام‌شده صفحه قبل را سابقه اجرای قبلی بدان؛ پیش از افزودن هر کد/تست، وجود آن را در GitHub بررسی کن. سند `DAY3-REAL-DATA-EXECUTION.md` صرفاً روش ادامه و محدودیت اعتبار داده را مشخص می‌کند.
- داده واقعی تأییدشده و رسید واقعی کارگزاری همچنان در شواهد بررسی‌شده موجود نیست. تنها قدم بعدی: نخست جست‌وجوی artifact واقعی پیشین؛ در صورت نبود، اجرای collector موجود PR #162 روی شبکه دارای دسترسی، بدون Merge یا سیگنال.

## ارزیابی تازه روز سوم — 2026-11-10
- SHA آغاز بررسی: `a324e62c37b1057d3023b2f2f41fbf69df4b71c6`، PR164 هنوز OPEN/DRAFT/NOT MERGED. در آخرین استعلام **۹ موفق / ۲ در حال اجرا** از ۱۱ workflow؛ Smoke https://github.com/Raminhashemi1/sahamban/actions/runs/42770635860 و 100-holding https://github.com/Raminhashemi1/sahamban/actions/runs/42770635916 هنوز تکمیل نشده بودند. نتیجه CI روی SHAهای مستنداتی جدید جداست.
- artifact شماره 13741517462 روی همان Smoke: در 2026-11-10T06:46:28.663Z وضعیت `UNVERIFIED_NETWORK / UND_ERR_CONNECT_TIMEOUT`؛ هیچ داده معتبر دریافتی ثبت نشد.
- آزمون اجرایی مستقل `getaddrinfo` در محیط حاضر برای CDN و www.tsetmc.com در 06:48:23 و 06:48:28 UTC با `gaierror(-3)` (DNS) ناموفق بود؛ اثبات قطعی قطعی‌بودن سامانه نیست.
- محاسبه‌گر خرید/فروش و تست‌ها موجودند، اما رسید واقعی کارگزاری برای تطبیق اجزای کارمزد/گردکردن وجود ندارد؛ منشأ سه سری تعدیل نیز تأیید نشده. **روز سوم هنوز COMPLETE نیست.** شرح: `DAY3-REAL-DATA-EXECUTION.md`.
- تنها کار بعدی: با collector موجود PR162 از دستگاه مطمئن و دارای دسترسی، پاسخ خام و manifest را دریافت و مستقل بررسی کن؛ بدون سیگنال یا سفارش.

## تکمیل استعلام CI و Artifact — 2026-11-10
- **SHA مبنای بررسی:** `80b2039596c9c2b5166842f2456b77f8efba092f`؛ هر **۱۱/۱۱ workflow موفق و تکمیل‌شده**؛ Smoke: https://github.com/Raminhashemi1/sahamban/actions/runs/42771220222 ؛ WebKit: https://github.com/Raminhashemi1/sahamban/actions/runs/42771220085 . این نتیجه به SHAهای بعدی منتقل نمی‌شود.
- **Artifact همان SHA:** `13741204786` / `live-market-v111.json` با `checked_at=2026-11-10T06:51:18.043Z` و `UNVERIFIED_NETWORK / UND_ERR_CONNECT_TIMEOUT` برای `https://cdn.tsetmc.com/api`، نماد فولاد. پاسخ خام قیمت دریافت نشده و تأیید مستقل همچنان باز است.
- وضعیت روز سوم: **IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE**؛ بخش نرم‌افزاری با CI تأیید شده اما داده واقعی/سه حالت تعدیل و رسید کارگزاری هنوز تأیید نشده‌اند. تغییری در کد، برنامه، دارایی یا وضعیت PR انجام نشده.
- **یک کار بعدی:** اجرای collector موجود PR162 روی شبکه مطمئنِ در دسترس و ارزیابی مستقل خروجی خام و manifest.

## بررسی ریسک تکمیلی روز سوم — 2026-11-10
- SHA مبنای بررسی `d3ba4a41379359ed25f21e593d692e43fc2dbf25`، ۱۰ workflow موفق / ۱ در حال اجرا (quote-basis: https://github.com/Raminhashemi1/sahamban/actions/runs/42771834142)؛ این نتیجه متعلق به SHA قبل از Commitهای مستنداتی جاری است.
- ابزار **موجود** PR162 برای هر پاسخ سقف ۱ MiB دارد؛ گزارش فنی مستقلِ غیررسمی برای تاریخچه کامل فولاد حجمی حدود ۱٫۵۶ MB آورده و بنابراین احتمال شکست ظرفیت حتی با رفع شبکه وجود دارد. هیچ پاسخ زنده‌ای برای اثبات حجم فعلی نداریم. جزئیات در `DAY3-REAL-DATA-EXECUTION.md` ثبت شد.
- درباره نرخ خرید فرابورس اختلاف میان منابع منتشرشده وجود دارد؛ تا دیدن جدول رسمی و رسید واقعی، نرخ‌های محاسبه‌گر تنها تخمین سقف‌اند و تغییر بدون شاهد انجام نشد.
- روز سوم همچنان **IN_PROGRESS / BLOCKED_EXTERNAL_EVIDENCE** است؛ قدم بعدی تنها دریافت شواهد خام فقط‌خواندنی با collector موجود از شبکه در دسترس و insCode بررسی‌شده.


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
