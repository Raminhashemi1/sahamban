package ir.sahamban.pilot;

/**
 * Raw store evidence. This object never grants Pro access by itself.
 * storePurchase is an in-memory SDK object used only for the provider's
 * post-settlement consume call; it must never be serialized or trusted by API.
 */
public final class PurchaseReceipt {
    public final String provider;
    public final String productId;
    public final String purchaseToken;
    public final String originalJson;
    public final String signature;
    public final String developerPayload;
    public final long purchaseTime;
    public final Object storePurchase;

    public PurchaseReceipt(String provider, String productId, String purchaseToken,
                           String originalJson, String signature,
                           String developerPayload, long purchaseTime,
                           Object storePurchase) {
        this.provider = provider;
        this.productId = productId;
        this.purchaseToken = purchaseToken;
        this.originalJson = originalJson;
        this.signature = signature;
        this.developerPayload = developerPayload;
        this.purchaseTime = purchaseTime;
        this.storePurchase = storePurchase;
    }
}
