package ir.sahmino.subscription

class CoordinatorBillingBridgeActions(
    private val coordinator: SubscriptionPurchaseCoordinator
) : SahminoBillingBridgeActions {
    override suspend fun getAvailability(): Map<String, Any?> =
        coordinator.availability()

    override suspend fun getEntitlement(): Map<String, Any?> =
        coordinator.entitlement()

    override suspend fun purchase(planId: String): Map<String, Any?> =
        coordinator.purchase(planId)

    override suspend fun restore(): Map<String, Any?> =
        coordinator.restore()
}
