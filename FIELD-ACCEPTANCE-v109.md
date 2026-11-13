# راهنمای ثبت شواهد پذیرش میدانی سهام‌بان — نسخه ۱۰۹

این سند همراه [پروندهٔ ۱۰۶](https://github.com/Raminhashemi1/sahamban/issues/106) استفاده می‌شود. **موفقیت CI، WebKit لینوکس یا تست مجازی موبایل، جایگزین آزمایش روی سخت‌افزار واقعی یا دادهٔ زندهٔ ساعت معاملات نیست.** تیک‌های پرونده تا زمان وجود مدرک معتبر بسته نمی‌شوند.

## چه چیزی خودکار بررسی می‌شود؟
- `tests/webkit-mobile-v106.cjs`: ۱۰۰ ردیف ساختگی، ۱۵۰۰ فیلد، ۳۲۰/۳۹۰ پیکسل، جست‌وجوی فارسی و زمان‌های تشخیصی.
- `tests/webkit-a11y-proxy-v109.cjs`: نام قابل‌دسترس جست‌وجو، پیام زندهٔ نتیجه، تمرکز Escape، رفتن به محتوا و نقش اعلان آپدیت. **تلفظ فارسی و رفتار VoiceOver/TalkBack را نمی‌آزماید.**
- `tests/live-market-connectivity.cjs`: فقط نماد عمومی «فولاد» را از منبع TSETMC بررسی می‌کند و وضعیت جدا در فایل `test-artifacts/live-market-v109.json` می‌نویسد. `UNVERIFIED_NETWORK` یعنی اتصال CI برقرار نشده؛ **نه موفقیت قیمت و نه اثبات خرابی آن**.
- تست صفحهٔ عمومی [تشخیص اتصال بازار](./market-connectivity-test.html) در Smoke اجرا می‌شود، اما صحت قیمت در ساعات معاملات باید جداگانه تأیید شود.

## آزمون‌های واقعی که برای بستن Issue ۱۰۶ لازم‌اند
1. **Safari روی آیفون فیزیکی:** در [سهام‌بان](https://raminhashemi1.github.io/sahamban/) یک بار شروع سرد و یک بار بازگشت را امتحان کنید؛ نمایش جدول و کارت، جست‌وجوی نماد، لمس، برگشت، آفلاین و اعلان آپدیت را ثبت کنید. از سبد ساختگی استفاده کنید.
2. **Chrome روی اندروید کم‌حافظه:** با سبد ۱۰۰ دارایی ساختگی و شبکهٔ کند، مراحل بالا را تکرار کنید. کرش، هنگ و از دست‌رفتن داده را جدا ثبت کنید. شبیه‌سازی «موبایل» در CI معادل این آزمون نیست.
3. **عملکرد واقعی:** برای هر دستگاه حداقل پنج نمونهٔ بارگذاری سرد و پنج جابه‌جایی جدول/کارت با ۱۰۰ دارایی ثبت کنید؛ میانه، بیشینه، مشخصات دستگاه و وضعیت شبکه را نگه دارید. پیش از اعلام Pass عملکرد، معیار قابل قبول با نمونه‌های مبنا تعیین شود. درصد بهبود بدون baseline گزارش نشود.
4. **صفحه‌خوان فارسی — خارج از دامنه اجرایی فعلی:** آزمون‌های اختصاصی VoiceOver/TalkBack فعلاً طبق تصمیم مالک انجام یا درخواست نمی‌شوند؛ فقط در صورت تقاضای کاربران یا تصمیم جدید برای به‌روزرسانی آینده مطرح شوند. وضعیت قبولی همچنان **NOT_TESTED** است؛ این تغییر به معنای تأیید کامل دسترس‌پذیری یا نادیده‌گرفتن الزامات قانونی/مارکت نیست.
5. **بازار زنده:** **در ساعات معاملات بورس تهران** از صفحهٔ [تشخیص بازار](https://raminhashemi1.github.io/sahamban/market-connectivity-test.html) یک نماد عمومی را بررسی کنید؛ زمان تهران، منبع مرجع، نماد، شناسه، تاریخ معامله، قیمت پایانی به **ریال** و اختلاف با مرجع را ثبت کنید. قطعی شبکه یا دادهٔ مانده را جدا علامت بزنید؛ بدون مدرک، نتیجهٔ قیمت‌ها تأییدشده محسوب نمی‌شود.

## قالب ثبت نتیجه در Issue
| حوزه | دستگاه و نسخه | زمان تهران | تعداد نمونه | نتیجه Pass/Fail/Unverified | مدرک عمومیِ بی‌اطلاعات شخصی | مشکل |
|---|---|---|---|---|---|---|
| iOS Safari | — | — | — | Unverified | — | — |
| Android کم‌حافظه | — | — | — | Unverified | — | — |
| عملکرد واقعی | — | — | ۵+۵ برای هر دستگاه | Unverified | — | — |
| VoiceOver فارسی (آینده) | — | — | — | Out of current scope / Not tested | — | — |
| TalkBack فارسی (آینده) | — | — | — | Out of current scope / Not tested | — | — |
| بازار در معاملات | — | — | — | Unverified | — | — |

**حریم خصوصی:** فایل واقعی سبد، شماره حساب، اطلاعات ورود کارگزاری و فایل‌های دارای نام یا شناسهٔ شخصی را در Issue بارگذاری نکنید. فقط نمونهٔ ساختگی و شواهد پالایش‌شده مجاز است.

## قاعدهٔ تصمیم انتشار
- **آماده طبق CI:** زمانی که گردش‌کارهای مالی، تکنیکال، Smoke، Chromium و WebKit موفق باشند.
- **تأیید مراحل اجرایی فعلی:** فقط پس از عبور مستند آزمون‌های برنامه‌ریزی‌شدهٔ فعلی، رفع خطاهای بحرانی و بازآزمایی؛ صفحه‌خوان به‌صورت جداگانه `NOT_TESTED` می‌ماند. **ادعای تأیید کامل دسترس‌پذیری یا سازگاری با قوانین/مارکت مجاز نیست** تا الزامات و شواهد مستقل تعیین شوند.
- تا قبل از این مرحله، وضعیت Issue ۱۰۶ باز می‌ماند و درصد ۱۰۰٪ اعلام نمی‌شود. محاسبات مالی، NAV، قیمت و نگهداری سبد برای این مستندسازی تغییر نکرده‌اند.

## 2026-11-13 — Owner scope decision: screen-reader support/testing moved to future backlog
- **Explicit owner decision (supersedes prior temporary skip):** dedicated **TalkBack/VoiceOver screen-reader support, Persian speech/reading-order assessment and related manual device testing** are **out of the CURRENT delivery scope**. Do not ask the owner to run them, schedule them as the next step, or spend development time on them now. Reconsider only if users request it or the owner chooses a future release. Keep this as an **unscheduled future option**, not a completed item.
- **Precise classification:** `SCREEN_READER_SCOPE=CURRENT_RELEASE_OUT_OF_SCOPE_BY_OWNER`, `TALKBACK_PHYSICAL_RESULT=NOT_TESTED`, `VOICEOVER_PHYSICAL_RESULT=NOT_TESTED`; neither an automated proxy nor this owner decision implies `PASS`, full WCAG compliance, or validated screen-reader access. Preserve all previous historical observations unmodified.
- **Do not delete functioning app functionality:** TalkBack/VoiceOver belong to Android/iOS, not a standalone Sahamban prediction feature. Existing labels, keyboard support, automated regression/axe checks and broad visual/mobile safeguards must remain intact to avoid unrelated regressions. This is removal of **current feature effort and active manual test tasks**, not a destructive code change.
- **Compliance caveat:** market submission, accessibility legal requirements and any specific store policy have not been independently assessed; this project must not falsely certify accessibility or imply that owner prioritization waives external obligations. Other deployment/payment/financial/recovery gates remain unchanged.
- **Live GitHub baseline before writing:** `feta` PR #166 OPEN/Draft/unmerged at `c1aa61674e226860d2eaf16ba93ea6b61ef6a89a`, with **10/12 checks successful, two in progress (`webkit-mobile`, `browser`)** and **9/11 matching-head workflows success** when inspected. Those checks belong to the pre-documentation SHA; verify the resulting new SHA separately.
- **Next non-accessibility work:** review-only preflight of the already-built **actual PWA ↔ Android WebMessage backup** path, which currently needs matching deployed web assets in a controlled environment. Do not reimplement the synthetic tests, overwrite the public PWA or deploy/merge without authorization. Issue #167 stays OPEN. `REAL_PWA_BACKUP_UNVERIFIED`, `MARKET_RELEASE_BLOCKED`, PR #166 Draft. No orders, payments or real user files.
