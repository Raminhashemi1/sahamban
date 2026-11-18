package ir.sahamban.pilot

import android.content.Context
import androidx.activity.ComponentActivity
import ir.cafebazaar.poolakey.Connection
import ir.cafebazaar.poolakey.ConnectionState
import ir.cafebazaar.poolakey.Payment
import ir.cafebazaar.poolakey.callback.PurchaseQueryCallback
import ir.cafebazaar.poolakey.config.PaymentConfiguration
import ir.cafebazaar.poolakey.config.SecurityCheck
import ir.cafebazaar.poolakey.entity.PurchaseInfo
import ir.cafebazaar.poolakey.entity.PurchaseState
import ir.cafebazaar.poolakey.request.PurchaseRequest

/**
 * Cafe Bazaar-only billing boundary.
 *
 * These plans are one-time fixed-term access passes, not auto-renewing subscriptions.\n * A successful Poolakey callback is purchase evidence, NOT access activation.
 * The server must independently validate the signed Bazaar receipt before granting access.
 */
class SahambanBazaarBillingManager(
    context: Context,
    private val activity: ComponentActivity
) {
    data class Evidence(
        val productId: String,
        val orderId: String,
        val purchaseToken: String,
        val packageName: String,
        val purchaseTime: Long,
        val originalJson: String,
        val dataSignature: String
    )

    sealed interface Result {
        data class Purchased(val evidence: Evidence) : Result
        data object Cancelled : Result
        data class Failed(val reason: String) : Result
    }

    private val payment = Payment(
        context.applicationContext,
        PaymentConfiguration(localSecurityCheck = SecurityCheck.Disable)
    )
    private var connection: Connection? = null

    fun connect(onReady: (Boolean) -> Unit) {
        if (connection?.getState() == ConnectionState.Connected) {
            onReady(true)
            return
        }
        connection = payment.connect {
            connectionSucceed { onReady(true) }
            connectionFailed { onReady(false) }
            disconnected { onReady(false) }
        }
    }

    fun purchaseFixedTermPlan(productId: String, opaqueServerOrderId: String, callback: (Result) -> Unit) {
        require(productId.matches(Regex("^[A-Za-z0-9._-]{1,100}$")))
        require(opaqueServerOrderId.matches(Regex("^ord_[a-f0-9]{32}$")))
        if (connection?.getState() != ConnectionState.Connected) {
            callback(Result.Failed("BAZAAR_NOT_CONNECTED"))
            return
        }
        payment.purchaseProduct(
            registry = activity.activityResultRegistry,
            request = PurchaseRequest(productId = productId, payload = opaqueServerOrderId)
        ) {
            purchaseSucceed { info ->
                val evidence = info.toEvidence()
                if (info.purchaseState != PurchaseState.PURCHASED || evidence == null) {
                    callback(Result.Failed("INVALID_PURCHASE_EVIDENCE"))
                } else {
                    callback(Result.Purchased(evidence))
                }
            }
            purchaseCanceled { callback(Result.Cancelled) }
            purchaseFailed { callback(Result.Failed("PURCHASE_FAILED")) }
            failedToBeginFlow { callback(Result.Failed("PURCHASE_FLOW_NOT_STARTED")) }
        }
    }

    fun restore(onEvidence: (List<Evidence>) -> Unit, onFailure: () -> Unit) {
        if (connection?.getState() != ConnectionState.Connected) {
            onFailure()
            return
        }
        payment.getPurchasedProducts {
            querySucceed { items ->
                onEvidence(items.mapNotNull { it.toEvidence() })
            }
            queryFailed { onFailure() }
        }
    }

    fun disconnect() {
        connection?.disconnect()
        connection = null
    }

    private fun PurchaseInfo.toEvidence(): Evidence? {
        if (purchaseState != PurchaseState.PURCHASED) return null
        if (purchaseToken.isBlank() || orderId.isBlank() || packageName.isBlank() ||
            productId.isBlank() || originalJson.isBlank() || dataSignature.isBlank() ||
            purchaseTime <= 0L) return null
        return Evidence(
            productId = productId,
            orderId = orderId,
            purchaseToken = purchaseToken,
            packageName = packageName,
            purchaseTime = purchaseTime,
            originalJson = originalJson,
            dataSignature = dataSignature
        )
    }
}
