package ir.sahamban.pilot

import android.content.Context
import androidx.activity.ComponentActivity
import ir.myket.billingclient.IabHelper
import ir.myket.billingclient.util.Inventory
import ir.myket.billingclient.util.Purchase as MyketPurchase

/**
 * Myket IAB v3 coordinator for the same five manually renewed time plans.
 * The Worker verifies originalJson/signature and grants access before consume.
 */
class BillingV2Coordinator(
    context: Context,
    private val activity: ComponentActivity
) {
    data class PurchaseEvidence(
        val planSku: String,
        val orderId: String,
        val bazaarOrderId: String,
        val purchaseToken: String,
        val packageName: String,
        val originalJson: String,
        val dataSignature: String
    )

    sealed interface PurchaseResult {
        data class Success(val evidence: PurchaseEvidence) : PurchaseResult
        data object Cancelled : PurchaseResult
        data class Failure(val code: String) : PurchaseResult
    }

    private var helper: IabHelper? = null
    private var connected = false

    fun connect(callback: (Boolean) -> Unit) {
        if (connected && helper != null) {
            callback(true)
            return
        }
        try {
            val billing = IabHelper(activity, BuildConfig.MYKET_PUBLIC_KEY)
            billing.enableDebugLogging(false)
            helper = billing
            billing.startSetup { result ->
                connected = result.isSuccess
                callback(result.isSuccess)
            }
        } catch (_: Throwable) {
            connected = false
            helper = null
            callback(false)
        }
    }

    fun buy(sku: String, orderId: String, callback: (PurchaseResult) -> Unit) {
        require(sku.matches(Regex("^[A-Za-z0-9._-]{1,100}$")))
        require(orderId.matches(Regex("^ord_[a-f0-9]{32}$")))
        val billing = readyOrNull()
        if (billing == null) {
            callback(PurchaseResult.Failure("MYKET_CONNECTION_REQUIRED"))
            return
        }
        try {
            billing.launchPurchaseFlow(
                activity,
                sku,
                IabHelper.OnIabPurchaseFinishedListener { result, purchase ->
                    if (!result.isSuccess || purchase == null) {
                        callback(PurchaseResult.Failure("MYKET_PURCHASE_FAILED"))
                    } else {
                        val evidence = purchase.toEvidence()
                        if (evidence == null || evidence.orderId != orderId) {
                            callback(PurchaseResult.Failure("INVALID_PURCHASE_EVIDENCE"))
                        } else {
                            callback(PurchaseResult.Success(evidence))
                        }
                    }
                },
                orderId
            )
        } catch (_: Throwable) {
            callback(PurchaseResult.Failure("MYKET_PURCHASE_FLOW_FAILED"))
        }
    }

    data class PlanDetails(
        val sku: String,
        val displayPrice: String,
        val title: String,
        val description: String
    )

    fun loadPlanDetails(skus: List<String>, callback: (List<PlanDetails>?) -> Unit) {
        require(skus.size == 5 && skus.distinct().size == 5 &&
            skus.all { it.matches(Regex("^[A-Za-z0-9._-]{1,100}$")) })
        val billing = readyOrNull()
        if (billing == null) {
            callback(null)
            return
        }
        try {
            billing.queryInventoryAsync(
                true,
                skus,
                IabHelper.QueryInventoryFinishedListener { result, inventory ->
                    if (!result.isSuccess || inventory == null) {
                        callback(null)
                    } else {
                        val details = skus.mapNotNull { sku ->
                            val item = inventory.getSkuDetails(sku) ?: return@mapNotNull null
                            if (item.price.isBlank()) return@mapNotNull null
                            PlanDetails(item.sku, item.price, item.title, item.description ?: "")
                        }
                        callback(details.takeIf { it.size == 5 && it.map { p -> p.sku }.toSet() == skus.toSet() })
                    }
                }
            )
        } catch (_: Throwable) {
            callback(null)
        }
    }

    fun restore(callback: (List<PurchaseEvidence>?) -> Unit) {
        val billing = readyOrNull()
        if (billing == null) {
            callback(null)
            return
        }
        try {
            billing.queryInventoryAsync(
                false,
                emptyList(),
                IabHelper.QueryInventoryFinishedListener { result, inventory ->
                    if (!result.isSuccess || inventory == null) callback(null)
                    else callback(inventory.allPurchases.mapNotNull { it.toEvidence() })
                }
            )
        } catch (_: Throwable) {
            callback(null)
        }
    }

    /** Myket consumables are consumed only after the Worker confirms settlement. */
    fun consumeAfterSettlement(purchaseToken: String, callback: (Boolean) -> Unit) {
        require(purchaseToken.length in 8..4096)
        val billing = readyOrNull()
        if (billing == null) {
            callback(false)
            return
        }
        try {
            billing.queryInventoryAsync(
                false,
                emptyList(),
                IabHelper.QueryInventoryFinishedListener { queryResult, inventory ->
                    if (!queryResult.isSuccess || inventory == null) {
                        callback(false)
                        return@QueryInventoryFinishedListener
                    }
                    val purchase = inventory.allPurchases.firstOrNull { it.token == purchaseToken }
                    if (purchase == null) {
                        callback(false)
                        return@QueryInventoryFinishedListener
                    }
                    billing.consumeAsync(
                        purchase,
                        IabHelper.OnConsumeFinishedListener { _, result ->
                            callback(result.isSuccess)
                        }
                    )
                }
            )
        } catch (_: Throwable) {
            callback(false)
        }
    }

    fun close() {
        connected = false
        helper?.dispose()
        helper = null
    }

    private fun readyOrNull(): IabHelper? =
        if (connected) helper else null

    private fun MyketPurchase.toEvidence(): PurchaseEvidence? {
        if (purchaseState != 0 || token.isBlank() || orderId.isBlank() ||
            packageName.isBlank() || sku.isBlank() || originalJson.isBlank() ||
            signature.isBlank() || developerPayload.isNullOrBlank()) return null
        if (!developerPayload.matches(Regex("^ord_[a-f0-9]{32}$"))) return null
        return PurchaseEvidence(
            planSku = sku,
            orderId = developerPayload,
            bazaarOrderId = orderId,
            purchaseToken = token,
            packageName = packageName,
            originalJson = originalJson,
            dataSignature = signature
        )
    }
}
