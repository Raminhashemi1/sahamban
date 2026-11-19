package ir.sahmino.subscription

/**
 * Provider-neutral contract. Concrete Bazaar and Myket SDK implementations
 * belong in their matching Android source sets.
 */
interface StoreBillingProvider {
    suspend fun connect(): BillingConnection
    suspend fun loadProducts(skus: List<String>): List<StoreProduct>
    suspend fun purchase(sku: String, opaqueOrderReference: String): StorePurchase
    suspend fun queryOwnedPurchases(): List<StorePurchase>
    suspend fun consume(purchaseToken: String)
    fun disconnect()
}

data class BillingConnection(
    val connected: Boolean,
    val diagnosticCode: String? = null
)

data class StoreProduct(
    val sku: String,
    val localizedPrice: String,
    val title: String,
    val description: String
)

data class StorePurchase(
    val sku: String,
    val storeOrderId: String,
    val purchaseToken: String,
    val packageName: String,
    val purchaseTimeEpochMillis: Long,
    val opaqueOrderReference: String,
    val rawSignedData: String?,
    val signature: String?
)
