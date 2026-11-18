package ir.sahamban.pilot;

import ir.cafebazaar.poolakey.entity.PurchaseInfo;
import ir.cafebazaar.poolakey.entity.PurchaseState;

/** Raw Bazaar subscription evidence. This class does not verify a receipt or grant Pro. */
public final class SahminoPurchaseEvidence {
    public final String orderId;
    public final String purchaseToken;
    public final String payload;
    public final String packageName;
    public final String productId;
    public final String originalJson;
    public final String dataSignature;
    public final long purchaseTime;

    private SahminoPurchaseEvidence(PurchaseInfo purchase) {
        orderId = purchase.getOrderId();
        purchaseToken = purchase.getPurchaseToken();
        payload = purchase.getPayload();
        packageName = purchase.getPackageName();
        productId = purchase.getProductId();
        originalJson = purchase.getOriginalJson();
        dataSignature = purchase.getDataSignature();
        purchaseTime = purchase.getPurchaseTime();
    }

    public static SahminoPurchaseEvidence from(PurchaseInfo purchase) {
        if (purchase == null || purchase.getPurchaseState() != PurchaseState.PURCHASED) return null;
        try {
            if (!valid(purchase.getOrderId(), 256)
                    || !valid(purchase.getPurchaseToken(), 4096)
                    || !valid(purchase.getPayload(), 256)
                    || !valid(purchase.getPackageName(), 255)
                    || !valid(purchase.getProductId(), 128)
                    || !valid(purchase.getOriginalJson(), 16384)
                    || purchase.getPurchaseTime() <= 0) return null;
            String signature = purchase.getDataSignature();
            if (signature != null && signature.length() > 8192) return null;
            return new SahminoPurchaseEvidence(purchase);
        } catch (RuntimeException error) {
            return null;
        }
    }

    private static boolean valid(String value, int max) {
        return value != null && !value.trim().isEmpty() && value.length() <= max;
    }
}
