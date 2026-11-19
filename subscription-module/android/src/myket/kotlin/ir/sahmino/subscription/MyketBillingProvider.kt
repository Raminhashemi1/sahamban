package ir.sahmino.subscription

import android.app.Activity
import ir.myket.billingclient.IabHelper
import ir.myket.billingclient.util.Inventory
import ir.myket.billingclient.util.Purchase
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Myket IAB v3 adapter using the official Myket Billing Client SDK 2.2.
 * Purchase signatures are re-verified by the Worker before any entitlement
 * is granted. The public key here is used by the SDK's local integrity check.
 */
class MyketBillingProvider(
    private val activity: Activity,
    private val publicKeyBase64: String,
    private val productSkus: List<String>
) : StoreBillingProvider {
    private var helper: IabHelper? = null
    private var connected = false

    override suspend fun connect(): BillingConnection =
        suspendCancellableCoroutine { continuation ->
            try {
                val billing = IabHelper(activity, publicKeyBase64)
                billing.enableDebugLogging(false, "SahminoBilling")
                helper = billing
                billing.startSetup { result ->
                    connected = result.isSuccess
                    if (continuation.isActive) {
                        continuation.resume(
                            BillingConnection(
                                connected = result.isSuccess,
                                diagnosticCode = if (result.isSuccess) null else "MYKET_SETUP_FAILED"
                            )
                        )
                    }
                }
                continuation.invokeOnCancellation { disconnect() }
            } catch (error: Throwable) {
                connected = false
                if (continuation.isActive) continuation.resume(
                    BillingConnection(false, error.javaClass.simpleName)
                )
            }
        }

    override suspend fun loadProducts(skus: List<String>): List<StoreProduct> =
        queryInventory(skus, includeSkuDetails = true).let { inventory ->
            skus.mapNotNull { sku ->
                val details = inventory.getSkuDetails(sku) ?: return@mapNotNull null
                StoreProduct(
                    sku = details.sku,
                    localizedPrice = details.price,
                    title = details.title,
                    description = details.description ?: ""
                )
            }
        }

    override suspend fun purchase(sku: String, opaqueOrderReference: String): StorePurchase =
        suspendCancellableCoroutine { continuation ->
            val billing = requireReady()
            billing.launchPurchaseFlow(
                activity,
                sku,
                IabHelper.OnIabPurchaseFinishedListener { result, purchase ->
                    if (!continuation.isActive) return@OnIabPurchaseFinishedListener
                    if (!result.isSuccess || purchase == null) {
                        continuation.resumeWithException(
                            IllegalStateException(if (result.isFailure) "MYKET_PURCHASE_FAILED" else "MYKET_EMPTY_PURCHASE")
                        )
                    } else if (purchase.purchaseState != 0) {
                        continuation.resumeWithException(IllegalStateException("PURCHASE_NOT_COMPLETED"))
                    } else if (purchase.developerPayload != opaqueOrderReference) {
                        continuation.resumeWithException(IllegalStateException("ORDER_REFERENCE_MISMATCH"))
                    } else {
                        continuation.resume(purchase.toStorePurchase())
                    }
                },
                opaqueOrderReference
            )
        }

    override suspend fun queryOwnedPurchases(): List<StorePurchase> {
        val inventory = queryInventory(productSkus, includeSkuDetails = false)
        return productSkus.mapNotNull { sku ->
            inventory.getPurchase(sku)
                ?.takeIf { it.purchaseState == 0 }
                ?.toStorePurchase()
        }
    }

    override suspend fun consume(purchaseToken: String) {
        val inventory = queryInventory(productSkus, includeSkuDetails = false)
        val purchase = productSkus.asSequence()
            .mapNotNull { inventory.getPurchase(it) }
            .firstOrNull { it.token == purchaseToken }
            ?: throw IllegalStateException("MYKET_PURCHASE_NOT_FOUND_FOR_CONSUME")

        suspendCancellableCoroutine<Unit> { continuation ->
            requireReady().consumeAsync(
                purchase,
                IabHelper.OnConsumeFinishedListener { _, result ->
                    if (!continuation.isActive) return@OnConsumeFinishedListener
                    if (result.isSuccess) continuation.resume(Unit)
                    else continuation.resumeWithException(IllegalStateException("MYKET_CONSUME_FAILED"))
                }
            )
        }
    }

    override fun disconnect() {
        connected = false
        helper?.dispose()
        helper = null
    }

    private fun requireReady(): IabHelper {
        if (!connected) throw IllegalStateException("MYKET_BILLING_NOT_CONNECTED")
        return helper ?: throw IllegalStateException("MYKET_BILLING_NOT_INITIALIZED")
    }

    private suspend fun queryInventory(
        skus: List<String>,
        includeSkuDetails: Boolean
    ): Inventory = suspendCancellableCoroutine { continuation ->
        requireReady().queryInventoryAsync(
            includeSkuDetails,
            skus,
            IabHelper.QueryInventoryFinishedListener { result, inventory ->
                if (!continuation.isActive) return@QueryInventoryFinishedListener
                if (result.isSuccess && inventory != null) continuation.resume(inventory)
                else continuation.resumeWithException(IllegalStateException("MYKET_INVENTORY_QUERY_FAILED"))
            }
        )
    }

    private fun Purchase.toStorePurchase() = StorePurchase(
        sku = sku,
        storeOrderId = orderId,
        purchaseToken = token,
        packageName = packageName,
        purchaseTimeEpochMillis = purchaseTime,
        opaqueOrderReference = developerPayload ?: "",
        rawSignedData = originalJson,
        signature = signature
    )
}
