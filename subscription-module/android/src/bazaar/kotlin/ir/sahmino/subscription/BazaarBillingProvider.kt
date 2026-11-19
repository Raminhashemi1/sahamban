package ir.sahmino.subscription

import androidx.activity.result.ActivityResultRegistry
import android.content.Context
import ir.cafebazaar.poolakey.Payment
import ir.cafebazaar.poolakey.Connection
import ir.cafebazaar.poolakey.config.PaymentConfiguration
import ir.cafebazaar.poolakey.config.SecurityCheck
import ir.cafebazaar.poolakey.entity.PurchaseInfo
import ir.cafebazaar.poolakey.entity.PurchaseState
import ir.cafebazaar.poolakey.request.PurchaseRequest
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Bazaar adapter. Local Poolakey signature checks are disabled intentionally:
 * the server validates every purchase with the Bazaar Developer API v2.
 */
class BazaarBillingProvider(
    context: Context,
    private val activityResultRegistry: ActivityResultRegistry
) : StoreBillingProvider {
    private val payment = Payment(
        context.applicationContext,
        PaymentConfiguration(localSecurityCheck = SecurityCheck.Disable)
    )
    private var connection: Connection? = null

    override suspend fun connect(): BillingConnection =
        suspendCancellableCoroutine { continuation ->
            connection = payment.connect {
                connectionSucceed {
                    if (continuation.isActive) continuation.resume(BillingConnection(true))
                }
                connectionFailed { error ->
                    if (continuation.isActive) continuation.resume(
                        BillingConnection(false, error.javaClass.simpleName)
                    )
                }
                disconnected {
                    connection = null
                }
            }
            continuation.invokeOnCancellation { connection?.disconnect(); connection = null }
        }

    override suspend fun loadProducts(skus: List<String>): List<StoreProduct> =
        suspendCancellableCoroutine { continuation ->
            payment.getInAppSkuDetails(skus) {
                getSkuDetailsSucceed { details ->
                    if (continuation.isActive) continuation.resume(details.map {
                        StoreProduct(it.sku, it.price, it.title, it.description)
                    })
                }
                getSkuDetailsFailed { error ->
                    if (continuation.isActive) continuation.resumeWithException(error)
                }
            }
        }

    override suspend fun purchase(sku: String, opaqueOrderReference: String): StorePurchase =
        suspendCancellableCoroutine { continuation ->
            payment.purchaseProduct(
                activityResultRegistry,
                PurchaseRequest(productId = sku, payload = opaqueOrderReference)
            ) {
                purchaseSucceed { info ->
                    if (continuation.isActive) {
                        if (info.purchaseState != PurchaseState.PURCHASED) {
                            continuation.resumeWithException(IllegalStateException("PURCHASE_NOT_COMPLETED"))
                        } else {
                            continuation.resume(info.toStorePurchase())
                        }
                    }
                }
                purchaseCanceled {
                    if (continuation.isActive) continuation.resumeWithException(
                        IllegalStateException("PURCHASE_CANCELLED")
                    )
                }
                purchaseFailed { error ->
                    if (continuation.isActive) continuation.resumeWithException(error)
                }
                failedToBeginFlow { error ->
                    if (continuation.isActive) continuation.resumeWithException(error)
                }
            }
        }

    override suspend fun queryOwnedPurchases(): List<StorePurchase> =
        suspendCancellableCoroutine { continuation ->
            payment.getPurchasedProducts {
                querySucceed { purchases ->
                    if (continuation.isActive) continuation.resume(
                        purchases.filter { it.purchaseState == PurchaseState.PURCHASED }
                            .map { it.toStorePurchase() }
                    )
                }
                queryFailed { error ->
                    if (continuation.isActive) continuation.resumeWithException(error)
                }
            }
        }

    override suspend fun consume(purchaseToken: String) =
        suspendCancellableCoroutine<Unit> { continuation ->
            payment.consumeProduct(purchaseToken) {
                consumeSucceed {
                    if (continuation.isActive) continuation.resume(Unit)
                }
                consumeFailed { error ->
                    if (continuation.isActive) continuation.resumeWithException(error)
                }
            }
        }

    override fun disconnect() {
        connection?.disconnect()
        connection = null
    }

    private fun PurchaseInfo.toStorePurchase() = StorePurchase(
        sku = productId,
        storeOrderId = orderId,
        purchaseToken = purchaseToken,
        packageName = packageName,
        purchaseTimeEpochMillis = purchaseTime,
        opaqueOrderReference = payload,
        rawSignedData = originalJson,
        signature = dataSignature
    )
}
