package ir.sahamban.pilot

import android.content.Context
import androidx.activity.ComponentActivity
import ir.cafebazaar.poolakey.Connection
import ir.cafebazaar.poolakey.ConnectionState
import ir.cafebazaar.poolakey.Payment
import ir.cafebazaar.poolakey.config.PaymentConfiguration
import ir.cafebazaar.poolakey.config.SecurityCheck
import ir.cafebazaar.poolakey.entity.PurchaseInfo
import ir.cafebazaar.poolakey.entity.PurchaseState
import ir.cafebazaar.poolakey.entity.SkuDetails
import ir.cafebazaar.poolakey.request.PurchaseRequest

/**
 * Cafe Bazaar recurring subscription adapter. Subscriptions are never consumed.
 * It only returns purchase evidence. The trusted server owns verification and access grants.
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
        val packageName: String
    )

    sealed interface PurchaseResult {
        data class Success(val evidence: PurchaseEvidence) : PurchaseResult
        data object Cancelled : PurchaseResult
        data class Failure(val code: String) : PurchaseResult
    }

    private val payment = Payment(
        context.applicationContext,
        PaymentConfiguration(
            localSecurityCheck = SecurityCheck.Enable(rsaPublicKey = BuildConfig.BAZAAR_RSA_PUBLIC_KEY),
            shouldSupportSubscription = true
        )
    )
    private var connection: Connection? = null

    fun connect(callback: (Boolean) -> Unit) {
        if (connection?.getState() == ConnectionState.Connected) {
            callback(true)
            return
        }
        connection = payment.connect {
            connectionSucceed { callback(true) }
            connectionFailed { callback(false) }
            disconnected { callback(false) }
        }
    }

    fun buy(sku: String, orderId: String, callback: (PurchaseResult) -> Unit) {
        require(sku.matches(Regex("^[A-Za-z0-9._-]{1,100}$")))
        require(orderId.matches(Regex("^ord_[a-f0-9]{32}$")))
        if (connection?.getState() != ConnectionState.Connected) {
            callback(PurchaseResult.Failure("BAZAAR_CONNECTION_REQUIRED"))
            return
        }
        payment.subscribeProduct(
            registry = activity.activityResultRegistry,
            request = PurchaseRequest(productId = sku, payload = orderId)
        ) {
            purchaseSucceed { info ->
                val evidence = info.toEvidence()
                if (evidence == null) callback(PurchaseResult.Failure("INVALID_PURCHASE"))
                else callback(PurchaseResult.Success(evidence))
            }
            purchaseCanceled { callback(PurchaseResult.Cancelled) }
            purchaseFailed { callback(PurchaseResult.Failure("PURCHASE_FAILED")) }
            failedToBeginFlow { callback(PurchaseResult.Failure("FLOW_NOT_STARTED")) }
        }
    }

    data class PlanDetails(val sku: String, val localizedBazaarPrice: String,
                           val title: String, val description: String)

    fun loadPlanDetails(skus: List<String>, callback: (List<PlanDetails>?) -> Unit) {
        require(skus.size == 5 && skus.distinct().size == 5 &&
            skus.all { it.matches(Regex("^[A-Za-z0-9._-]{1,100}$")) })
        if (connection?.getState() != ConnectionState.Connected) {
            callback(null)
            return
        }
        payment.getSubscriptionSkuDetails(skus) {
            getSkuDetailsSucceed { details ->
                val mapped = details.map { PlanDetails(it.sku, it.price, it.title, it.description) }
                callback(mapped.takeIf { it.size == 5 && it.map(PlanDetails::sku).toSet() == skus.toSet() })
            }
            getSkuDetailsFailed { callback(null) }
        }
    }

    fun restore(callback: (List<PurchaseEvidence>?) -> Unit) {
        if (connection?.getState() != ConnectionState.Connected) {
            callback(null)
            return
        }
        payment.getSubscribedProducts {
            querySucceed { purchases -> callback(purchases.mapNotNull { it.toEvidence() }) }
            queryFailed { callback(null) }
        }
    }

    fun close() {
        connection?.disconnect()
        connection = null
    }

    private fun PurchaseInfo.toEvidence(): PurchaseEvidence? {
        if (purchaseState != PurchaseState.PURCHASED) return null
        if (purchaseToken.isBlank() || orderId.isBlank() || packageName.isBlank() ||
            productId.isBlank() || payload.isBlank()) return null
        if (!payload.matches(Regex("^ord_[a-f0-9]{32}$"))) return null
        return PurchaseEvidence(productId, payload, orderId, purchaseToken, packageName)
    }
}
