package ir.sahamban.pilot;

import androidx.activity.ComponentActivity;
import ir.cafebazaar.poolakey.Connection;
import ir.cafebazaar.poolakey.Payment;
import ir.cafebazaar.poolakey.entity.PurchaseInfo;
import ir.cafebazaar.poolakey.config.PaymentConfiguration;
import ir.cafebazaar.poolakey.config.SecurityCheck;
import ir.cafebazaar.poolakey.entity.PurchaseState;
import ir.cafebazaar.poolakey.entity.SkuDetails;
import ir.cafebazaar.poolakey.request.PurchaseRequest;
import java.util.Arrays;
import java.util.List;
import kotlin.Unit;

/** CafeBazaar one-time product bridge; server validation precedes product consumption. */
public final class BazaarBillingManager {
    public interface Listener {
        void onStatus(String message);
        void onCatalogPrice(SahminoBillingCatalog.Plan plan, String price, boolean matches);
        void onPurchaseSucceeded(SahminoBillingCatalog.Plan plan, PurchaseInfo purchase);
        void onOwnedPurchase(SahminoBillingCatalog.Plan plan, PurchaseInfo purchase);
        void onNoOwnedPurchase();
    }

    private final ComponentActivity activity;
    private final Listener listener;
    private final Payment payment;
    private Connection connection;
    private boolean ready;
    private boolean busy;
    private boolean destroyed;
    private final boolean[] priceMatches = new boolean[SahminoBillingCatalog.size()];

    public BazaarBillingManager(ComponentActivity activity, Listener listener) {
        if (activity == null || listener == null) throw new IllegalArgumentException("activity/listener required");
        this.activity = activity;
        this.listener = listener;
        String publicKey = BuildConfig.IAB_PUBLIC_KEY == null ? "" : BuildConfig.IAB_PUBLIC_KEY.trim();
        if (publicKey.length() < 100 || publicKey.contains("PLACEHOLDER")) {
            throw new IllegalStateException("CafeBazaar RSA public key is not configured");
        }
        // Match CafeBazaar's official Poolakey sample: verify the purchase signature locally.
        // The Worker independently verifies the provider receipt before entitlement settlement.
        PaymentConfiguration config = new PaymentConfiguration(SecurityCheck.Enable(publicKey), true);
        this.payment = new Payment(activity, config);
    }

    public void connect() {
        if (destroyed || ready) return;
        status("در حال اتصال به سرویس پرداخت کافه‌بازار…");
        try {
            connection = payment.connect(callback -> {
                callback.connectionSucceed(() -> {
                    if (!destroyed) {
                        ready = true;
                        status("اتصال بازار برقرار شد؛ در حال بررسی قیمت و خریدهای قبلی…");
                        refreshInventory();
                    }
                    return Unit.INSTANCE;
                });
                callback.connectionFailed(error -> {
                    ready = false;
                    status("اتصال به کافه‌بازار ناموفق بود؛ فروشگاه را بررسی کنید.");
                    return Unit.INSTANCE;
                });
                callback.disconnected(() -> {
                    ready = false;
                    status("اتصال بازار قطع شد؛ برای بازیابی دوباره متصل شوید.");
                    return Unit.INSTANCE;
                });
                return Unit.INSTANCE;
            });
        } catch (RuntimeException ex) {
            ready = false;
            status("راه‌اندازی Poolakey با خطا روبه‌رو شد.");
        }
    }

    public void refreshInventory() {
        if (destroyed) return;
        if (!ready) { connect(); return; }
        if (busy) { status("یک عملیات فروشگاهی در حال اجراست."); return; }
        busy = true;
        Arrays.fill(priceMatches, false);
        payment.getInAppSkuDetails(Arrays.asList(SahminoBillingCatalog.productIds()), callback -> {
            callback.getSkuDetailsSucceed(details -> {
                if (destroyed) return Unit.INSTANCE;
                for (int i = 0; i < SahminoBillingCatalog.size(); i++) {
                    SahminoBillingCatalog.Plan plan = SahminoBillingCatalog.at(i);
                    String price = null;
                    for (SkuDetails item : details) {
                        if (plan.productId.equals(item.getSku())) { price = item.getPrice(); break; }
                    }
                    boolean matches = SahminoStorePriceMatcher.matches(price, plan.priceRial);
                    priceMatches[i] = matches;
                    listener.onCatalogPrice(plan, price, matches);
                }
                payment.getPurchasedProducts(query -> {
                    query.querySucceed(purchases -> {
                        if (destroyed) return Unit.INSTANCE;
                        busy = false;
                        boolean found = false;
                        for (PurchaseInfo item : purchases) {
                            if (item.getPurchaseState() != PurchaseState.PURCHASED) continue;
                            SahminoBillingCatalog.Plan plan = SahminoBillingCatalog.byProductId(item.getProductId());
                            if (plan == null) continue;
                            found = true;
                            listener.onOwnedPurchase(plan, item);
                        }
                        if (!found) listener.onNoOwnedPurchase();
                        status("استعلام بازار تمام شد؛ فعال‌سازی فقط پس از تأیید سرور انجام می‌شود.");
                        return Unit.INSTANCE;
                    });
                    query.queryFailed(error -> {
                        busy = false;
                        status("بازیابی خریدهای بازار ناموفق بود.");
                        return Unit.INSTANCE;
                    });
                    return Unit.INSTANCE;
                });
                return Unit.INSTANCE;
            });
            callback.getSkuDetailsFailed(error -> {
                busy = false;
                status("استعلام قیمت محصولات بازار ناموفق بود.");
                return Unit.INSTANCE;
            });
            return Unit.INSTANCE;
        });
    }

    public void purchase(String planId, String serverOrderId) {
        SahminoBillingCatalog.Plan plan = SahminoBillingCatalog.byPlanId(planId);
        if (plan == null) { status("پلن اشتراک معتبر نیست."); return; }
        if (destroyed) return;
        if (serverOrderId == null || !serverOrderId.matches("ord_[a-f0-9]{32}")) {
            status("شناسه سفارش معتبر از سرور دریافت نشده؛ خرید شروع نمی‌شود.");
            return;
        }
        if (!ready) { connect(); status("اتصال بازار آماده نیست؛ پس از اتصال دوباره تلاش کنید."); return; }
        if (busy) { status("لطفاً تا پایان عملیات جاری صبر کنید."); return; }
        int index = indexOf(plan);
        if (index < 0 || !priceMatches[index]) {
            status("قیمت این محصول از بازار تأیید نشده؛ خرید شروع نمی‌شود.");
            refreshInventory();
            return;
        }
        busy = true;
        payment.purchaseProduct(activity.getActivityResultRegistry(),
            new PurchaseRequest(plan.productId, serverOrderId, null), callback -> {
                callback.purchaseFlowBegan(() -> {
                    status("صفحه پرداخت کافه‌بازار باز شد…");
                    return Unit.INSTANCE;
                });
                callback.purchaseSucceed(purchase -> {
                    busy = false;
                    if (purchase != null && plan.productId.equals(purchase.getProductId())
                            && purchase.getPurchaseState() == PurchaseState.PURCHASED
                            && serverOrderId.equals(purchase.getPayload())) {
                        status("خرید بازار دریافت شد؛ در حال تأیید رسید سمت سرور…");
                        listener.onPurchaseSucceeded(plan, purchase);
                    } else {
                        status("اطلاعات خرید با سفارش سرور مطابقت ندارد؛ اشتراک فعال نشد.");
                    }
                    return Unit.INSTANCE;
                });
                callback.purchaseCanceled(() -> {
                    busy = false;
                    status("خرید توسط کاربر لغو شد.");
                    return Unit.INSTANCE;
                });
                callback.purchaseFailed(error -> {
                    busy = false;
                    status("خرید بازار ناموفق بود؛ اگر وجه کسر شده، بازیابی را انجام دهید.");
                    return Unit.INSTANCE;
                });
                callback.failedToBeginFlow(error -> {
                    busy = false;
                    status("شروع صفحه خرید بازار ممکن نشد.");
                    return Unit.INSTANCE;
                });
                return Unit.INSTANCE;
            });
    }

    /** Consume only after the trusted Worker has committed the order and entitlement. */
    public void consumeAfterServerSettlement(PurchaseInfo purchase) {
        if (destroyed || purchase == null) return;
        payment.consumeProduct(purchase.getPurchaseToken(), callback -> {
            callback.consumeSucceed(() -> {
                status("تأیید سرور و مصرف محصول بازار با موفقیت انجام شد.");
                return Unit.INSTANCE;
            });
            callback.consumeFailed(error -> {
                status("اشتراک در سرور ثبت شده؛ مصرف محصول بازار در بازیابی بعدی دوباره تلاش می‌شود.");
                return Unit.INSTANCE;
            });
            return Unit.INSTANCE;
        });
    }

    private int indexOf(SahminoBillingCatalog.Plan plan) {
        for (int i = 0; i < SahminoBillingCatalog.size(); i++)
            if (SahminoBillingCatalog.at(i) == plan) return i;
        return -1;
    }

    private void status(String message) {
        activity.runOnUiThread(() -> { if (!destroyed) listener.onStatus(message); });
    }

    public void close() {
        destroyed = true;
        ready = false;
        if (connection != null) {
            try { connection.disconnect(); } catch (RuntimeException ignored) { }
            connection = null;
        }
    }
}
