package ir.sahamban.pilot;

import android.app.Activity;
import androidx.activity.ComponentActivity;
import ir.myket.billingclient.IabHelper;
import ir.myket.billingclient.util.IabResult;
import ir.myket.billingclient.util.Purchase;

/** Myket Billing adapter. A successful store callback is NOT a Pro entitlement. */
public final class StoreBillingClient implements MarketplaceBillingClient {
    private IabHelper helper;

    @Override
    public void connect(Activity activity, ConnectionListener listener) {
        if (BuildConfig.IAB_PUBLIC_KEY == null || BuildConfig.IAB_PUBLIC_KEY.trim().isEmpty()) {
            listener.onFailure("MYKET_PUBLIC_KEY_NOT_CONFIGURED");
            return;
        }
        try {
            helper = new IabHelper(activity, BuildConfig.IAB_PUBLIC_KEY);
            helper.enableDebugLogging(BuildConfig.DEBUG, "SahminoMyketBilling");
            helper.startSetup(result -> {
                if (result != null && result.isSuccess()) {
                    listener.onConnected();
                } else {
                    listener.onFailure("MYKET_CONNECTION_FAILED");
                }
            });
        } catch (RuntimeException error) {
            listener.onFailure("MYKET_INITIALIZATION_FAILED");
        }
    }

    @Override
    public void subscribe(ComponentActivity activity, String productId, String serverOrderPayload,
                         PurchaseListener listener) {
        if (helper == null) {
            listener.onFailure("MYKET_NOT_CONNECTED");
            return;
        }
        if (productId == null || productId.trim().isEmpty() ||
            serverOrderPayload == null || serverOrderPayload.trim().isEmpty()) {
            listener.onFailure("PRODUCT_OR_SERVER_ORDER_MISSING");
            return;
        }
        try {
            // These are non-renewing prepaid in-app products, not store subscriptions.
            if (!helper.subscriptionsSupported()) {
                listener.onFailure("MYKET_SUBSCRIPTIONS_NOT_SUPPORTED");
                return;
            }
            helper.launchSubscriptionPurchaseFlow(activity, productId, (IabResult result, Purchase purchase) -> {
                if (result == null || !result.isSuccess() || purchase == null) {
                    if (result != null && result.getResponse() == IabHelper.BILLING_RESPONSE_RESULT_USER_CANCELED) {
                        listener.onCancelled();
                    } else {
                        listener.onFailure("MYKET_PURCHASE_FAILED");
                    }
                    return;
                }
                listener.onPurchased(new PurchaseReceipt(
                    "MYKET", purchase.getSku(), purchase.getToken(),
                    purchase.getOriginalJson(), purchase.getSignature(),
                    purchase.getDeveloperPayload(), 0L, purchase));
            }, serverOrderPayload);
        } catch (RuntimeException error) {
            listener.onFailure("MYKET_PURCHASE_FLOW_NOT_STARTED");
        }
    }

    @Override
    public void close() {
        if (helper != null) {
            helper.dispose();
            helper = null;
        }
    }
}
