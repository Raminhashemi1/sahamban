package ir.sahamban.pilot;

import java.lang.reflect.Method;
import ir.myket.billingclient.util.Purchase;

/**
 * Extracts the signed store receipt without trusting client-side fields as proof.
 * Myket Billing SDK versions expose receipt accessors on Purchase; reflection
 * keeps this bridge compile-compatible while failing closed if the SDK contract
 * is absent or changes. The server must verify originalJson + signature itself.
 */
public final class SahminoPurchaseEvidence {
    public final String sku;
    public final int purchaseState;
    public final String developerPayload;
    public final String originalJson;
    public final String signature;
    public final String purchaseToken;

    private SahminoPurchaseEvidence(String sku, int state, String payload,
            String originalJson, String signature, String purchaseToken) {
        this.sku = sku;
        this.purchaseState = state;
        this.developerPayload = payload;
        this.originalJson = originalJson;
        this.signature = signature;
        this.purchaseToken = purchaseToken;
    }

    public static SahminoPurchaseEvidence from(Purchase purchase) {
        if (purchase == null) return null;
        try {
            String sku = purchase.getSku();
            int state = purchase.getPurchaseState();
            String payload = purchase.getDeveloperPayload();
            String json = readString(purchase, "getOriginalJson", 16_384, true);
            String signature = readString(purchase, "getSignature", 8_192, true);
            String token = readString(purchase, "getToken", 4_096, false);
            if (sku == null || sku.isEmpty() || sku.length() > 128 || state != 0
                    || json == null || signature == null) return null;
            return new SahminoPurchaseEvidence(sku, state, payload, json, signature, token);
        } catch (ReflectiveOperationException | RuntimeException ex) {
            return null;
        }
    }

    private static String readString(Purchase purchase, String methodName,
            int maxLength, boolean required) throws ReflectiveOperationException {
        Method method = purchase.getClass().getMethod(methodName);
        Object value = method.invoke(purchase);
        if (!(value instanceof String)) return required ? null : "";
        String text = ((String) value).trim();
        if (text.isEmpty() || text.length() > maxLength) return required ? null : "";
        return text;
    }
}
