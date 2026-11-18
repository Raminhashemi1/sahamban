package ir.sahamban.pilot;

import androidx.activity.ComponentActivity;
import io.reactivex.disposables.Disposable;
import ir.cafebazaar.poolakey.Connection;
import ir.cafebazaar.poolakey.ConnectionState;
import ir.cafebazaar.poolakey.Payment;
import ir.cafebazaar.poolakey.config.PaymentConfiguration;
import ir.cafebazaar.poolakey.config.SecurityCheck;
import ir.cafebazaar.poolakey.entity.PurchaseInfo;
import ir.cafebazaar.poolakey.entity.SkuDetails;
import ir.cafebazaar.poolakey.request.PurchaseRequest;
import ir.cafebazaar.poolakey.rx.PaymentRx;
import java.util.Arrays;
import java.util.List;

/**
 * CafeBazaar-only Poolakey adapter. Uses subscription APIs exclusively.
 * It never consumes a subscription and never grants Pro locally.
 * A caller must create an authenticated server order first and pass its ID
 * as the Poolakey payload before subscribe() is called.
 */
public final class SahminoStoreBillingManager implements AutoCloseable {
    public interface Listener {
        void onStatus(String message);
        void onCatalogPrice(SahminoBillingCatalog.Plan plan, String price, boolean matches);
        void onPurchaseEvidence(SahminoBillingCatalog.Plan plan, SahminoPurchaseEvidence evidence);
        void onRestoredEvidence(SahminoBillingCatalog.Plan plan, SahminoPurchaseEvidence evidence);
    }

    private static final String ORDER_ID = "^ord_[a-f0-9]{32}$";
    private final ComponentActivity activity;
    private final Listener listener;
    private final Payment payment;
    private Disposable connection;
    private boolean connected;
    private boolean closed;

    public SahminoStoreBillingManager(ComponentActivity activity, Listener listener) {
        if (activity == null || listener == null) throw new IllegalArgumentException("activity/listener required");
        this.activity = activity;
        this.listener = listener;
        // Local RSA checking is disabled only because the trusted Worker must
        // verify every purchase through Bazaar Developer API before entitlement.
        this.payment = new Payment(activity, new PaymentConfiguration(SecurityCheck.Disable.INSTANCE, true));
    }

    public void connect() {
        if (closed || connection != null) return;
        listener.onStatus("در حال اتصال به کافه‌بازار…");
        connection = PaymentRx.connect(payment).subscribe(this::onConnection,
            error -> postStatus("اتصال به کافه‌بازار ناموفق بود؛ پرداخت غیرفعال است."));
    }

    private void onConnection(Connection state) {
        boolean nowConnected = state != null && state.getState() instanceof ConnectionState.Connected;
        connected = nowConnected;
        postStatus(nowConnected ? "اتصال کافه‌بازار برقرار شد." : "اتصال کافه‌بازار قطع شد.");
        if (nowConnected) {
            refreshSubscriptionCatalog();
            refreshInventory();
        }
    }

    public void refreshSubscriptionCatalog() {
        if (!connected || closed) return;
        PaymentRx.getSubscriptionSkuDetails(payment, Arrays.asList(SahminoBillingCatalog.productIds()))
            .subscribe(details -> {
                for (SkuDetails detail : details) {
                    SahminoBillingCatalog.Plan plan = SahminoBillingCatalog.byProductId(detail.getSku());
                    if (plan != null) {
                        boolean matches = SahminoStorePriceMatcher.matches(detail.getPrice(), plan.priceRial);
                        activity.runOnUiThread(() -> listener.onCatalogPrice(plan, detail.getPrice(), matches));
                    }
                }
            }, error -> postStatus("دریافت جزئیات اشتراک از بازار ناموفق بود."));
    }

    /** Restore/query is evidence discovery only; the server must re-verify each token. */
    public void refreshInventory() {
        if (!connected || closed) return;
        PaymentRx.getSubscribedProducts(payment).subscribe(purchases -> {
            if (purchases == null || purchases.isEmpty()) {
                postStatus("اشتراک بازیابی‌شده‌ای در حساب بازار پیدا نشد.");
                return;
            }
            for (PurchaseInfo purchase : purchases) {
                SahminoBillingCatalog.Plan plan = SahminoBillingCatalog.byProductId(purchase.getProductId());
                SahminoPurchaseEvidence evidence = SahminoPurchaseEvidence.from(purchase);
                if (plan != null && evidence != null) {
                    activity.runOnUiThread(() -> listener.onRestoredEvidence(plan, evidence));
                }
            }
        }, error -> postStatus("بازیابی اشتراک‌های بازار ناموفق بود."));
    }

    /**
     * Starts only a Bazaar Subscription purchase. The order ID must be created
     * by the authenticated server first; a random/local payload is rejected.
     */
    public boolean subscribe(String planId, String serverOrderId) {
        SahminoBillingCatalog.Plan plan = SahminoBillingCatalog.byPlanId(planId);
        if (!connected || closed || plan == null || serverOrderId == null
                || !serverOrderId.matches(ORDER_ID)) {
            postStatus("سفارش معتبر سرور یا اتصال بازار موجود نیست؛ خرید آغاز نشد.");
            return false;
        }
        PurchaseRequest request = new PurchaseRequest(plan.productId, serverOrderId, null);
        PaymentRx.subscribeProduct(payment, activity.getActivityResultRegistry(), request)
            .subscribe(purchase -> {
                SahminoPurchaseEvidence evidence = SahminoPurchaseEvidence.from(purchase);
                if (evidence == null || !serverOrderId.equals(evidence.payload)
                        || !plan.productId.equals(evidence.productId)) {
                    postStatus("شواهد خرید با سفارش سرور تطبیق ندارد؛ دسترسی فعال نشد.");
                    return;
                }
                activity.runOnUiThread(() -> listener.onPurchaseEvidence(plan, evidence));
            }, error -> postStatus("خرید اشتراک در کافه‌بازار کامل نشد؛ دسترسی فعال نشد."));
        return true;
    }

    private void postStatus(String message) {
        if (activity.isFinishing() || activity.isDestroyed()) return;
        activity.runOnUiThread(() -> listener.onStatus(message));
    }

    @Override
    public void close() {
        closed = true;
        connected = false;
        if (connection != null && !connection.isDisposed()) connection.dispose();
        connection = null;
    }
}
