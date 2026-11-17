package ir.sahamban.pilot;

import android.app.Activity;
import androidx.activity.ComponentActivity;

/**
 * Store-specific billing boundary. Success returns untrusted receipt evidence;
 * entitlement is granted only after trusted backend verification.
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
    void connect(Activity activity, ConnectionListener listener);
    void purchase(ComponentActivity activity, String productId, String serverOrderPayload,
                   PurchaseListener listener);
    void close();
}
