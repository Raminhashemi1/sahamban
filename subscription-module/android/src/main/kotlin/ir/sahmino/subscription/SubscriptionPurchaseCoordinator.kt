package ir.sahmino.subscription

/**
 * Host-provided backend contract. Implement with the production Worker URL and
 * the app's real commercial session token provider.
 */
interface BillingBackendClient {
    suspend fun createOrder(planId: String): BillingServerOrder
    suspend fun verifyPurchase(orderId: String, purchase: StorePurchase): BillingSettlement
    suspend fun getEntitlement(): BillingEntitlement
}

data class BillingServerOrder(
    val orderId: String,
    val planId: String,
    val productId: String,
    val amountIrr: Long,
    val store: String
)

data class BillingSettlement(
    val paid: Boolean,
    val expiresAt: String?,
    val alreadySettled: Boolean = false
)

data class BillingEntitlement(
    val active: Boolean,
    val expiresAt: String?
)

/**
 * Coordinates order -> native store -> server verification -> entitlement ->
 * consume. A purchase is never consumed before the server says it is PAID.
 */
class SubscriptionPurchaseCoordinator(
    private val storeName: String,
    private val storeProvider: StoreBillingProvider,
    private val backend: BillingBackendClient
) {
    suspend fun availability(): Map<String, Any?> {
        val connection = storeProvider.connect()
        return mapOf(
            "available" to connection.connected,
            "store" to storeName,
            "error" to connection.diagnosticCode
        )
    }

    suspend fun entitlement(): Map<String, Any?> {
        val value = backend.getEntitlement()
        return mapOf("active" to value.active, "expiresAt" to value.expiresAt)
    }

    suspend fun purchase(planId: String): Map<String, Any?> {
        val order = backend.createOrder(planId)
        require(order.store == storeName) { "ORDER_STORE_MISMATCH" }

        val storePurchase = try {
            storeProvider.purchase(order.productId, order.orderId)
        } catch (error: Throwable) {
            if (error.message == "PURCHASE_CANCELLED" ||
                error.message == "USER_CANCELED" ||
                error.message == "IABHELPER_USER_CANCELLED") {
                return mapOf("status" to "CANCELLED")
            }
            throw error
        }
        val settlement = backend.verifyPurchase(order.orderId, storePurchase)
        if (!settlement.paid) {
            return mapOf("status" to "PENDING_VERIFICATION")
        }

        return try {
            storeProvider.consume(storePurchase.purchaseToken)
            mapOf(
                "status" to "PURCHASED_AND_SETTLED",
                "expiresAt" to settlement.expiresAt
            )
        } catch (_: Throwable) {
            mapOf(
                "status" to "SETTLED_CONSUMPTION_PENDING",
                "expiresAt" to settlement.expiresAt
            )
        }
    }

    suspend fun restore(): Map<String, Any?> {
        val owned = storeProvider.queryOwnedPurchases()
        var settled = 0
        var consumptionPending = 0
        for (purchase in owned) {
            val orderId = purchase.opaqueOrderReference
            if (orderId.isBlank()) continue
            val result = try { backend.verifyPurchase(orderId, purchase) }
                catch (_: Throwable) { continue }
            if (!result.paid) continue
            settled += 1
            try { storeProvider.consume(purchase.purchaseToken) }
            catch (_: Throwable) { consumptionPending += 1 }
        }
        val current = backend.getEntitlement()
        return mapOf(
            "settledPurchases" to settled,
            "consumptionPending" to consumptionPending,
            "active" to current.active,
            "expiresAt" to current.expiresAt
        )
    }

    fun disconnect() = storeProvider.disconnect()
}
