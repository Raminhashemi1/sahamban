package ir.sahamban.pilot

/**
 * Native orchestration for one Bazaar subscription purchase.
 * The UI must call this only after explicit user intent; server settlement is authoritative.
 */
class BillingV2PurchaseFlow(
    private val api: BillingV2ApiClient,
    private val bazaar: BillingV2Coordinator,
    private val skuByPlan: Map<String, String>,
    private val expectedPackageName: String
) {
    sealed interface Outcome {
        data class Active(val access: BillingV2ApiClient.Access) : Outcome
        data object Cancelled : Outcome
        data class Failed(val reason: String) : Outcome
    }

    fun purchase(planId: String, callback: (Outcome) -> Unit) {
        val sku = skuByPlan[planId]
        if (sku == null || !sku.matches(Regex("^[A-Za-z0-9._-]{1,100}$"))) {
            callback(Outcome.Failed("PLAN_NOT_CONFIGURED"))
            return
        }
        api.createOrder(planId) { orderResult ->
            when (orderResult) {
                is BillingV2ApiClient.Result.Failure ->
                    callback(Outcome.Failed(orderResult.code))
                is BillingV2ApiClient.Result.Success -> {
                    val order = orderResult.value
                    bazaar.buy(sku, order.id) { purchaseResult ->
                        when (purchaseResult) {
                            BillingV2Coordinator.PurchaseResult.Cancelled ->
                                callback(Outcome.Cancelled)
                            is BillingV2Coordinator.PurchaseResult.Failure ->
                                callback(Outcome.Failed(purchaseResult.code))
                            is BillingV2Coordinator.PurchaseResult.Success -> {
                                val evidence = purchaseResult.evidence
                                if (evidence.packageName != expectedPackageName ||
                                    evidence.planSku != sku || evidence.orderId != order.id) {
                                    callback(Outcome.Failed("PURCHASE_EVIDENCE_MISMATCH"))
                                    return@buy
                                }
                                api.verifySubscription(order.id, sku, evidence.purchaseToken,
                                    evidence.originalJson, evidence.dataSignature) { verification ->
                                    when (verification) {
                                        is BillingV2ApiClient.Result.Success ->
                                            callback(Outcome.Active(verification.value))
                                        is BillingV2ApiClient.Result.Failure ->
                                            callback(Outcome.Failed(verification.code))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    fun restore(callback: (List<Outcome>) -> Unit) {
        bazaar.restore { purchases ->
            if (purchases == null) {
                callback(listOf(Outcome.Failed("RESTORE_UNAVAILABLE")))
                return@restore
            }
            if (purchases.isEmpty()) {
                callback(emptyList())
                return@restore
            }
            val results = java.util.Collections.synchronizedList(mutableListOf<Outcome>())
            var remaining = purchases.size
            purchases.forEach { evidence ->
                val sku = skuByPlan.entries.firstOrNull { it.value == evidence.planSku }?.value
                if (sku == null || evidence.packageName != expectedPackageName ||
                    evidence.orderId != evidence.payload) {
                    results.add(Outcome.Failed("RESTORE_EVIDENCE_MISMATCH"))
                    synchronized(results) {
                        remaining--
                        if (remaining == 0) callback(results.toList())
                    }
                } else {
                    api.verifySubscription(evidence.payload, sku, evidence.purchaseToken,
                        evidence.originalJson, evidence.dataSignature) { verification ->
                        results.add(when (verification) {
                            is BillingV2ApiClient.Result.Success -> Outcome.Active(verification.value)
                            is BillingV2ApiClient.Result.Failure -> Outcome.Failed(verification.code)
                        })
                        synchronized(results) {
                            remaining--
                            if (remaining == 0) callback(results.toList())
                        }
                    }
                }
            }
        }
    }
}
