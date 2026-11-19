package ir.sahamban.pilot

/**
 * Native orchestration for one manually renewed store-specific time-plan purchase.
 * The UI must call this only after explicit user intent; server settlement is authoritative.
 */
class BillingV2PurchaseFlow(
    private val api: BillingV2ApiClient,
    private val storeBilling: BillingV2Coordinator,
    private val skuByPlan: Map<String, String>,
    private val expectedPackageName: String
) {
    init {
        require(skuByPlan.keys == setOf("SAHAMBAN_PRO_30D", "SAHAMBAN_PRO_60D", "SAHAMBAN_PRO_90D", "SAHAMBAN_PRO_180D", "SAHAMBAN_PRO_365D"))
        require(skuByPlan.values.size == skuByPlan.values.toSet().size)
    }
    sealed interface Outcome {
        data class Active(val access: BillingV2ApiClient.Access, val consumptionPending: Boolean = false) : Outcome
        data class EntitlementRestored(val entitlement: BillingV2ApiClient.Entitlement) : Outcome
        data object Cancelled : Outcome
        data class Failed(val reason: String) : Outcome
    }

    fun purchase(planId: String, callback: (Outcome) -> Unit) {
        val sku = skuByPlan[planId]
        if (sku == null || !sku.matches(Regex("^[A-Za-z0-9._-]{1,100}$"))) {
            callback(Outcome.Failed("PLAN_NOT_CONFIGURED"))
            return
        }
        // Establish the Bazaar connection before creating an order; otherwise a
        // disconnected client leaves an avoidable orphan CREATED order on the server.
        storeBilling.connect { connected ->
            if (!connected) {
                callback(Outcome.Failed("BAZAAR_CONNECTION_FAILED"))
                return@connect
            }
            api.createOrder(planId) { orderResult ->
                when (orderResult) {
                    is BillingV2ApiClient.Result.Failure ->
                        callback(Outcome.Failed(orderResult.code))
                    is BillingV2ApiClient.Result.Success -> {
                        val order = orderResult.value
                        storeBilling.buy(sku, order.id) { purchaseResult ->
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
                                    api.verifyPurchase(order.id, sku, evidence.purchaseToken,
                                        evidence.originalJson, evidence.dataSignature) { verification ->
                                        when (verification) {
                                            is BillingV2ApiClient.Result.Success ->
                                                storeBilling.consumeAfterSettlement(evidence.purchaseToken) { consumed ->
                                                    callback(Outcome.Active(verification.value, consumptionPending = !consumed))
                                                }
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
    }

    fun restore(callback: (List<Outcome>) -> Unit) {
        // Establish the store connection before reading inventory. Durable account
        // entitlement is still fetched from the server, including already-consumed items.
        bazaar.connect { connected ->
            if (!connected) {
                callback(listOf(Outcome.Failed("BAZAAR_CONNECTION_FAILED")))
                return@connect
            }
            storeBilling.loadPlanDetails(skuByPlan.values.toList()) { productDetails ->
            if (productDetails == null) {
                callback(listOf(Outcome.Failed("STORE_PRODUCTS_UNAVAILABLE")))
                return@loadPlanDetails
            }
            api.refreshEntitlement { entitlementResult ->
            val durable = when (entitlementResult) {
                is BillingV2ApiClient.Result.Success ->
                    if (entitlementResult.value.proEnabled)
                        Outcome.EntitlementRestored(entitlementResult.value)
                    else null
                is BillingV2ApiClient.Result.Failure ->
                    Outcome.Failed("ENTITLEMENT_UNAVAILABLE")
            }
            storeBilling.restore { purchases ->
                if (purchases == null) {
                    callback(listOfNotNull(durable) + Outcome.Failed("RESTORE_UNAVAILABLE"))
                    return@restore
                }
                if (purchases.isEmpty()) {
                    callback(listOfNotNull(durable))
                    return@restore
                }
                val results = java.util.Collections.synchronizedList(mutableListOf<Outcome>())
                var remaining = purchases.size
                fun completeOne() {
                    val done = synchronized(results) {
                        remaining--
                        remaining == 0
                    }
                    if (done) callback(listOfNotNull(durable) + results.toList())
                }
                purchases.forEach { evidence ->
                    val sku = skuByPlan.entries.firstOrNull { it.value == evidence.planSku }?.value
                    if (sku == null || evidence.packageName != expectedPackageName ||
                        !evidence.orderId.matches(Regex("^ord_[a-f0-9]{32}$"))) {
                        results.add(Outcome.Failed("RESTORE_EVIDENCE_MISMATCH"))
                        completeOne()
                    } else {
                        api.verifyPurchase(evidence.orderId, sku, evidence.purchaseToken,
                            evidence.originalJson, evidence.dataSignature) { verification ->
                            when (verification) {
                                is BillingV2ApiClient.Result.Success ->
                                    bazaar.consumeAfterSettlement(evidence.purchaseToken) { consumed ->
                                        results.add(Outcome.Active(verification.value, consumptionPending = !consumed))
                                        completeOne()
                                    }
                                is BillingV2ApiClient.Result.Failure -> {
                                    results.add(Outcome.Failed(verification.code))
                                    completeOne()
                                }
                            }
                        }
                    }
                }
            }
            }
            }
        }
    }
}
