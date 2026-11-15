# سهمینو — ماتریس مقررات و قابلیت خرید اشتراک چهارکاناله
تاریخ 2026-11-15؛ صرفاً پژوهش، بدون تغییر کد یا فعال‌سازی فروش.

## مدل مورد تأیید مالک
فقط پنج مدت ثابت 30، 60، 90، 180 و 365 **روز**. هیچ اشتراک 270 روزه در محصول نیست. نام‌های «ماهانه/سالانه» اگر دقیقاً روز ثابت نیستند نباید باعث وعده اشتباه شوند. قیمت‌ها تعیین نشده‌اند.

## تفکیک رسمی کانال‌ها
| کانال | مستندات و روش | نکته پذیرش |
|---|---|---|
| کافه‌بازار | طبق پاسخ ایمیلی فرستاده‌شده توسط مالک: نمونه 30/60/90/180/365 روزه؛ consumable + مدیریت اعتبار در سرور توسعه‌دهنده | خود ایمیل مجوز انتشار/پرداخت واقعی نیست؛ ادامه با SDK/تأیید backend و purchase consumption بعد از durable grant |
| مایکت | نمونه رسمی `myketstore/billing-sample-android`: in-app consumable و non-consumable، subscription بومی، استعلام خریدهای موجود، کلید عمومی RSA و `launchSubscriptionPurchaseFlow` | هر پنج دوره دقیق در پنل مایکت تأیید نشده‌اند؛ ابتدا امکان دوره بومی و سیاست تمدید، در صورت نیاز fallback مصرفی فقط با مجوز/تأیید کنسول |
| Google Play | Digital services در نسخه Play عموماً Play Billing لازم دارند مگر موارد استثنا؛ subscriptions شامل auto-renew و prepaid بدون تمدید خودکار/top-up است | `acknowledge` لازم؛ for >=1 week within 3 days؛ وضعیت pending نباید دسترسی بدهد. دوره‌های واقعیِ calendar-based (P1M/P2M/...) با 30/60/... روز یکسان فرض نشوند. امکان 30/60/90/180/365 روز دقیق در Console و بازار هدف نیازمند اثبات؛ استفاده از محصولات یک‌باره مدت‌دار نیز مشمول شرایط مستقل است |
| وب‌سایت/PWA | provider مجاز و سرور تأیید پرداخت و ثبت entitlement مستقل | پرداخت وب نباید از نسخه Play بدون رعایت استثناهای مجاز تبلیغ/هدایت شود. مقررات و مجوزهای ایران بررسی شود |

## مهم‌ترین نکته حقوقی Google Play برای بازار اولیه «فقط ایران»
فهرست رسمی پشتیبانی از ثبت developer/merchant در Google Play شامل ایران نیست. این الزاماً گزاره‌ای درباره همه کاربران ایرانی در تمام شرایط نیست، ولی **merchant eligibility، امکان target/availability و Play purchase برای حساب‌های کشور ایران باید پیش از طرح فروش به‌صورت مشروع و مستند احراز شود**. راهکار دورزدن با هویت/کشور جعلی، توصیه یا اجرا نشود. هدف دوکاناله Google Play + وب رسمی همچنان حفظ می‌شود، اما کانال Play برای فروش بازار ایران **BLOCKED / UNVERIFIED** است.

## معماری پیشنهادی (صرفاً طرح)
یک codebase، build flavorهای جدا با configuration غیرقابل تحریف از UI:
`CAFEBAZAAR`, `MYKET`, `GOOGLE_PLAY`, `WEB_DIRECT`.
هر flavor فقط SDK/UI checkout مجاز خود را در خود دارد؛ استفاده از نام installer در runtime به‌تنهایی اثبات منشأ یا اعتبار خرید نیست.

یک backend مشترک `purchase_ledger(channel, provider_purchase_id UNIQUE, account_id, product_id, status)` و `entitlements(account_id, expires_at_utc)`؛ verify از سمت provider و grant اتمیک و idempotent. فرایندهای `consume` مخصوص محصولات مصرفی، `acknowledge` و `top-up` در Google Play و subscription lifecycle مایکت **قابل جایگزینی با یکدیگر نیستند**. کنترل refund/revocation، restore، تغییر حساب، چند دستگاه و loss of network ضروری است. وضعیت اشتراک را همیشه سرور تعیین کند. اعتبار خرید در کانال دیگر و امکان استفاده آن در Play منوط به سیاست هر کانال است؛ از ارائه گزینه خرید بیرونی در build Play بدون اثبات استثنا خودداری شود.

## ثبت وضعیت پنج دوره در هر کانال
| مدت | بازار | مایکت | Google Play | وب |
|---|---|---|---|---|
| 30 روز | نمونه در پاسخ بازار | پشتیبانی مدت دقیق هنوز بررسی نشده | مدت دقیق هنوز تأیید نشده | طراحی قابل انجام؛ provider و قرارداد نیازمند بررسی |
| 60 روز | نمونه در پاسخ بازار | تأییدنشده | تأییدنشده | طراحی قابل انجام؛ provider نیازمند بررسی |
| 90 روز | نمونه در پاسخ بازار | تأییدنشده | تأییدنشده | طراحی قابل انجام؛ provider نیازمند بررسی |
| 180 روز | نمونه در پاسخ بازار | تأییدنشده | تأییدنشده | طراحی قابل انجام؛ provider نیازمند بررسی |
| 365 روز | نمونه در پاسخ بازار | تأییدنشده | تأییدنشده | طراحی قابل انجام؛ provider نیازمند بررسی |

## منابع رسمی بررسی‌شده
- Google Play Payments Policy: https://support.google.com/googleplay/android-developer/answer/10281818
- Google Play subscription policy/disclosures: https://support.google.com/googleplay/android-developer/answer/18265346
- Google Play subscriptions and prepaid/top-ups: https://developer.android.com/google/play/billing/subscriptions
- Google Play lifecycle/acknowledgement: https://developer.android.com/google/play/billing/lifecycle/subscriptions
- Google Play developer/merchant countries: https://support.google.com/googleplay/android-developer/answer/9306917
- Google Play one-time purchases / rent options: https://developer.android.com/google/play/billing/one-time-product-multi-purchase-options-offers
- نمونه رسمی مایکت: https://github.com/myketstore/billing-sample-android/blob/main/README.md
- نمونه رسمی Flutter مایکت: https://github.com/myketstore/billing-sample-flutter/blob/main/README.md

## دروازه‌های خروج
مستندات، رفتار عملی کنسول و دوره‌ها، قرارداد قیمت/تمدید، حساب/مجوز رسمی، تست sandbox، backend و بازبینی حقوقی هر فروشگاه پیش از فروش تأیید شوند. **نتیجه این نوبت: RESEARCHED / NOT IMPLEMENTED / NOT PUBLISHABLE**. نسخه آزمایشی، کد، حساب، دامنه، انتشار و برنامه پنج‌روزه دست نخورده باقی ماند.
