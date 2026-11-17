package ir.sahamban.pilot;

import android.app.Activity;
import androidx.activity.ComponentActivity;

/**
 * Store-specific billing boundary. Purchase callbacks return untrusted receipt
 * evidence only. The backend must verify and persist the payment before access
 * is granted or a consumable SKU is consumed.
 */
public interface MarketplaceBillingClient {
    interface ConnectionListener {
        void onConnected();
        void onFailure(String reason);
    }
    interface PurchaseListener {
        void onPurchased(PurchaseReceipt receipt);
        void onCancelled();
        void onFailure(String reason);
    }
    interface ConsumptionListener {
        void onConsumed();
        void onFailure(String reason);
    }
    void connect(Activity activity, ConnectionListener listener);
    void purchase(ComponentActivity activity, String productId, String serverOrderPayload,
                   PurchaseListener listener);

    /**
     * Call only after the trusted backend confirms settlement and entitlement.
     * The five Sahmino plans are prepaid, manually renewed one-time products.
     */
    void consume(PurchaseReceipt receipt, ConsumptionListener listener);
    void close();
}
