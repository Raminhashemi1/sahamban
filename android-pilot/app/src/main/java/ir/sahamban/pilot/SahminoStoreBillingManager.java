package ir.sahamban.pilot;

import android.app.Activity;
import android.util.Log;
import java.security.SecureRandom;
import java.util.Arrays;
import ir.myket.billingclient.IabHelper;
import ir.myket.billingclient.util.Inventory;
import ir.myket.billingclient.util.Purchase;
import ir.myket.billingclient.util.SkuDetails;

/**
 * Store checkout bridge adapted from the existing TrazYar implementation.
 *
 * IMPORTANT: this class deliberately does NOT grant a subscription. The current
 * SDK contract exposed by the reference project only demonstrates local SDK
 * signature checks and SKU/state/payload access. A server-side store receipt
 * verifier must be wired before any purchase can create entitlement.
 */
public final class SahminoStoreBillingManager {
    public interface Listener {
        void onStatus(String message);
        void onCatalogPrice(SahminoBillingCatalog.Plan plan, String formattedPrice, boolean matches);
        void onPurchaseNeedsServerVerification(SahminoBillingCatalog.Plan plan, Purchase purchase);
        void onOwnedInventoryItem(SahminoBillingCatalog.Plan plan, Purchase purchase);
        void onNoOwnedPurchase();
        default void onSignedPurchaseEvidence(SahminoBillingCatalog.Plan plan, SahminoPurchaseEvidence evidence) { }
        default void onOwnedPurchaseEvidence(SahminoBillingCatalog.Plan plan, SahminoPurchaseEvidence evidence) { }
    }

    private static final String TAG = "SahminoBilling";
    private final Activity activity;
    private final Listener listener;
    private final SecureRandom random = new SecureRandom();
    private IabHelper helper;
    private boolean ready, connecting, busy, destroyed;
    private final boolean[] priceMatches = new boolean[SahminoBillingCatalog.size()];

    public SahminoStoreBillingManager(Activity activity, Listener listener) {
        if (activity == null || listener == null) throw new IllegalArgumentException("activity/listener required");
        this.activity = activity;
        this.listener = listener;
    }

    public void connect() {
        if (destroyed || ready || connecting) return;
        String key = BuildConfig.IAB_PUBLIC_KEY == null ? "" : BuildConfig.IAB_PUBLIC_KEY.trim();
        if (key.length() < 50 || key.contains("PLACEHOLDER")) {
            status("کلید عمومی کانال فروشگاه تنظیم نشده؛ پرداخت غیرفعال است.");
            return;
        }
        try {
            if (helper != null) {
                try { helper.dispose(); } catch (RuntimeException ignored) { }
                helper = null;
            }
            connecting = true;
            helper = new IabHelper(activity, key);
            helper.enableDebugLogging(BuildConfig.DEBUG);
            status("در حال اتصال به فروشگاه…");
            helper.startSetup(result -> onMain(() -> {
                if (destroyed) return;
                connecting = false;
                if (result == null || !result.isSuccess()) {
                    ready = false;
                    status("اتصال به فروشگاه برقرار نشد؛ برنامه فروشگاه و اینترنت را بررسی کنید.");
                    return;
                }
                ready = true;
                status("اتصال به فروشگاه برقرار شد؛ در حال بررسی خریدهای قبلی و قیمت پلن‌ها…");
                refreshInventory();
            }));
        } catch (RuntimeException ex) {
            Log.e(TAG, "Billing setup failed", ex);
            connecting = false;
            ready = false;
            status("راه‌اندازی پرداخت با خطا روبه‌رو شد.");
        }
    }

    public void refreshInventory() {
        if (destroyed) return;
        if (!ready || helper == null) { connect(); return; }
        if (busy) { status("یک عملیات فروشگاهی در حال اجراست."); return; }
        busy = true;
        Arrays.fill(priceMatches, false);
        try {
            helper.queryInventoryAsync(true, Arrays.asList(SahminoBillingCatalog.productIds()),
                (result, inventory) -> onMain(() -> {
                    if (destroyed) return;
                    busy = false;
                    if (result == null || !result.isSuccess() || inventory == null) {
                        status("استعلام فروشگاه ناموفق بود؛ دسترسی قبلی تغییر نمی‌کند.");
                        return;
                    }
                    boolean foundOwned = false;
                    for (int i = 0; i < SahminoBillingCatalog.size(); i++) {
                        SahminoBillingCatalog.Plan plan = SahminoBillingCatalog.at(i);
                        SkuDetails details = inventory.getSkuDetails(plan.productId);
                        String price = details == null ? null : details.getPrice();
                        boolean match = priceMatches(price, plan.priceToman);
                        priceMatches[i] = match;
                        listener.onCatalogPrice(plan, price, match);
                        Purchase owned = inventory.getPurchase(plan.productId);
                        if (owned != null && owned.getPurchaseState() == 0) {
                            foundOwned = true;
                            // Existing purchase is reported, never locally activated.
                            SahminoPurchaseEvidence evidence = SahminoPurchaseEvidence.from(owned);
                            if (evidence != null) listener.onOwnedPurchaseEvidence(plan, evidence);
                            else status("خرید قبلی پیدا شد، اما اطلاعات رسید برای تأیید امن کامل نیست.");
                        }
                    }
                    if (!foundOwned) listener.onNoOwnedPurchase();
                    status("استعلام فروشگاه تمام شد؛ فعال‌سازی اشتراک فقط پس از تأیید سرور انجام می‌شود.");
                }));
        } catch (RuntimeException ex) {
            Log.e(TAG, "Inventory query failed", ex);
            busy = false;
            status("امکان بررسی خریدهای فروشگاه وجود ندارد؛ بعداً دوباره تلاش کنید.");
        }
    }

    public void purchase(String planId) {
        SahminoBillingCatalog.Plan plan = SahminoBillingCatalog.byPlanId(planId);
        if (plan == null) { status("پلن اشتراک معتبر نیست."); return; }
        if (destroyed) return;
        if (!ready || helper == null) {
            connect();
            status("اتصال به فروشگاه آماده نیست؛ پس از اتصال دوباره تلاش کنید.");
            return;
        }
        if (busy) { status("لطفاً تا پایان عملیات جاری صبر کنید."); return; }
        int index = indexOf(plan);
        if (index < 0 || !priceMatches[index]) {
            status("قیمت این محصول از فروشگاه تأیید نشده؛ خرید شروع نمی‌شود.");
            refreshInventory();
            return;
        }
        if (!helper.subscriptionsSupported()) {
            status("این فروشگاه در دستگاه فعلی از خرید اشتراک پشتیبانی نمی‌کند.");
            return;
        }
        busy = true;
        String payload = newPayload();
        status("در حال بازکردن صفحه خرید اشتراک فروشگاه…");
        try {
            helper.launchSubscriptionPurchaseFlow(activity, plan.productId, (result, purchase) -> onMain(() -> {
                if (destroyed) return;
                busy = false;
                if (result != null && result.isSuccess() && purchase != null
                    && plan.productId.equals(purchase.getSku())
                    && purchase.getPurchaseState() == 0
                    && payload.equals(purchase.getDeveloperPayload())) {
                    SahminoPurchaseEvidence evidence = SahminoPurchaseEvidence.from(purchase);
                    if (evidence == null) {
                        status("فروشگاه خرید را برگرداند، اما رسید امضاشده قابل استخراج نیست؛ اشتراک فعال نشد.");
                        return;
                    }
                    status("رسید امضاشده دریافت شد؛ برای تأیید سمت سرور آماده است.");
                    listener.onSignedPurchaseEvidence(plan, evidence);
                } else {
                    status("خرید تکمیل یا تأیید نشد؛ اگر وجهی کسر شده، پس از اتصال دوباره بازیابی را انجام دهید.");
                }
            }), payload);
        } catch (RuntimeException ex) {
            Log.e(TAG, "Purchase flow failed", ex);
            busy = false;
            status("شروع خرید ممکن نشد؛ دوباره تلاش کنید.");
        }
    }

    private boolean priceMatches(String formatted, long expectedToman) {
        if (formatted == null || formatted.trim().isEmpty() || formatted.length() > 120) return false;
        String value = formatted.trim();
        boolean toman = value.contains("تومان");
        boolean rial = value.contains("ریال") || value.contains("ريال");
        if (toman == rial) return false;
        StringBuilder digits = new StringBuilder();
        for (int i = 0; i < value.length(); i++) {
            int digit = Character.digit(value.charAt(i), 10);
            char ch = value.charAt(i);
            if (digit >= 0) digits.append((char)('0' + digit));
            else if (ch == '-' || ch == '+' || ch == '%' || ch == '٪' || ch == '.' || ch == '٫') return false;
        }
        if (digits.length() == 0 || digits.length() > 15) return false;
        try {
            long actual = Long.parseLong(digits.toString());
            return actual == (toman ? expectedToman : Math.multiplyExact(expectedToman, 10L));
        } catch (NumberFormatException | ArithmeticException ex) {
            return false;
        }
    }

    private int indexOf(SahminoBillingCatalog.Plan plan) {
        for (int i = 0; i < SahminoBillingCatalog.size(); i++)
            if (SahminoBillingCatalog.at(i) == plan) return i;
        return -1;
    }

    private String newPayload() {
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        StringBuilder out = new StringBuilder("sahmino-");
        for (byte b : bytes) out.append(String.format(java.util.Locale.ROOT, "%02x", b & 0xff));
        return out.toString();
    }

    private void onMain(Runnable task) { activity.runOnUiThread(task); }
    private void status(String message) { onMain(() -> { if (!destroyed) listener.onStatus(message); }); }

    public void close() {
        destroyed = true;
        ready = false;
        connecting = false;
        if (helper != null) {
            try { helper.dispose(); } catch (RuntimeException ignored) { }
            helper = null;
        }
    }
}
