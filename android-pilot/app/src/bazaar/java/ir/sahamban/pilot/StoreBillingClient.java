package ir.sahamban.pilot;

import android.app.Activity;
import androidx.activity.ComponentActivity;
import ir.cafebazaar.poolakey.Connection;
import ir.cafebazaar.poolakey.Payment;
import ir.cafebazaar.poolakey.config.PaymentConfiguration;
import ir.cafebazaar.poolakey.config.SecurityCheck;
import ir.cafebazaar.poolakey.request.PurchaseRequest;
import ir.cafebazaar.poolakey.entity.PurchaseInfo;
import kotlin.Unit;

/** Cafe Bazaar Poolakey adapter. It returns evidence only; it never unlocks Pro. */
public final class StoreBillingClient implements MarketplaceBillingClient {
    private Payment payment;
    private Connection connection;

    @Override
    public void connect(Activity activity, ConnectionListener listener) {
        if (!(activity instanceof ComponentActivity)) {
            listener.onFailure("BAZAAR_REQUIRES_COMPONENT_ACTIVITY");
            return;
        }
        if (BuildConfig.BAZAAR_PUBLIC_KEY == null || BuildConfig.BAZAAR_PUBLIC_KEY.trim().isEmpty()) {
            listener.onFailure("BAZAAR_PUBLIC_KEY_NOT_CONFIGURED");
            return;
        }
        try {
            PaymentConfiguration config = new PaymentConfiguration(
                new SecurityCheck.Enable(BuildConfig.BAZAAR_PUBLIC_KEY));
            payment = new Payment(activity, config);
            connection = payment.connect(callback -> {
                callback.connectionSucceed(() -> {
                    listener.onConnected();
                    return Unit.INSTANCE;
                });
                callback.connectionFailed(error -> {
                    listener.onFailure("BAZAAR_CONNECTION_FAILED");
                    return Unit.INSTANCE;
                });
                callback.disconnected(() -> {
                    listener.onFailure("BAZAAR_DISCONNECTED");
                    return Unit.INSTANCE;
                });
                return Unit.INSTANCE;
            });
        } catch (RuntimeException error) {
            listener.onFailure("BAZAAR_INITIALIZATION_FAILED");
        }
    }

    @Override
    public void purchase(ComponentActivity activity, String productId, String serverOrderPayload,
                         PurchaseListener listener) {
        if (payment == null || connection == null) {
            listener.onFailure("BAZAAR_NOT_CONNECTED");
            return;
        }
        if (productId == null || productId.trim().isEmpty() ||
            serverOrderPayload == null || serverOrderPayload.trim().isEmpty()) {
            listener.onFailure("PRODUCT_OR_SERVER_ORDER_MISSING");
            return;
        }
        // These are non-renewing prepaid in-app products, not store subscriptions.
        payment.purchaseProduct(activity.getActivityResultRegistry(),
            new PurchaseRequest(productId, serverOrderPayload, null), callback -> {
                callback.purchaseSucceed(info -> {
                    listener.onPurchased(new PurchaseReceipt(
                        "CAFEBAZAAR", info.getProductId(), info.getPurchaseToken(),
                        info.getOriginalJson(), info.getDataSignature(), info.getPayload(),
                        info.getPurchaseTime(), info));
                    return Unit.INSTANCE;
                });
                callback.purchaseCanceled(() -> {
                    listener.onCancelled();
                    return Unit.INSTANCE;
                });
                callback.purchaseFailed(error -> {
                    listener.onFailure("BAZAAR_PURCHASE_FAILED");
                    return Unit.INSTANCE;
                });
                callback.failedToBeginFlow(error -> {
                    listener.onFailure("BAZAAR_PURCHASE_FLOW_NOT_STARTED");
                    return Unit.INSTANCE;
                });
                return Unit.INSTANCE;
            });
    }

    @Override
    public void consume(PurchaseReceipt receipt, ConsumptionListener listener) {
        if (payment == null || connection == null) {
            listener.onFailure("BAZAAR_NOT_CONNECTED");
            return;
        }
        if (receipt == null || !"CAFEBAZAAR".equals(receipt.provider) ||
            receipt.purchaseToken == null || receipt.purchaseToken.trim().isEmpty()) {
            listener.onFailure("INVALID_BAZAAR_RECEIPT");
            return;
        }
        // Invoke only after backend settlement; subscriptions must never be consumed.
        payment.consumeProduct(receipt.purchaseToken, callback -> {
            callback.consumeSucceed(() -> {
                listener.onConsumed();
                return Unit.INSTANCE;
            });
            callback.consumeFailed(error -> {
                listener.onFailure("BAZAAR_CONSUME_FAILED");
                return Unit.INSTANCE;
            });
            return Unit.INSTANCE;
        });
    }

    @Override
    public void close() {
        if (connection != null) {
            connection.disconnect();
            connection = null;
        }
        payment = null;
    }
}
