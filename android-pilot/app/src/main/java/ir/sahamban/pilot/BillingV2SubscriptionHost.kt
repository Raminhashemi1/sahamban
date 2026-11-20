package ir.sahamban.pilot

import android.view.Gravity
import android.view.View
import android.widget.TextView
import androidx.activity.ComponentActivity

/**
 * Composes account entitlement restore independently from marketplace checkout.
 * Missing store identifiers keep purchase disabled but do not hide account access.
 */
class BillingV2SubscriptionHost(
    private val activity: ComponentActivity,
    workerBaseUrl: String
) {
    private val configuredSkuByPlan = mapOf(
        "SAHAMBAN_PRO_30D" to BuildConfig.SAHAMBAN_SKU_PRO_30D,
        "SAHAMBAN_PRO_60D" to BuildConfig.SAHAMBAN_SKU_PRO_60D,
        "SAHAMBAN_PRO_90D" to BuildConfig.SAHAMBAN_SKU_PRO_90D,
        "SAHAMBAN_PRO_180D" to BuildConfig.SAHAMBAN_SKU_PRO_180D,
        "SAHAMBAN_PRO_365D" to BuildConfig.SAHAMBAN_SKU_PRO_365D
    )
    private val expectedPackage = BuildConfig.SAHAMBAN_EXPECTED_PACKAGE_NAME
        .takeIf { it == BuildConfig.APPLICATION_ID &&
            it.matches(Regex("^[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z][A-Za-z0-9_]*)+$")) }
        ?: BuildConfig.APPLICATION_ID
    private val packageUsable = BuildConfig.APPLICATION_ID.matches(
        Regex("^[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z][A-Za-z0-9_]*)+$")
    )
    private val skuMapUsable = configuredSkuByPlan.values.all {
        it.matches(Regex("^[A-Za-z0-9._-]{1,100}$")) && !it.startsWith("REPLACE_")
    } && configuredSkuByPlan.values.toSet().size == 5
    private val skuByPlan = if (skuMapUsable) configuredSkuByPlan else mapOf(
        "SAHAMBAN_PRO_30D" to "UNCONFIGURED_SAHAMBAN_PRO_30D",
        "SAHAMBAN_PRO_60D" to "UNCONFIGURED_SAHAMBAN_PRO_60D",
        "SAHAMBAN_PRO_90D" to "UNCONFIGURED_SAHAMBAN_PRO_90D",
        "SAHAMBAN_PRO_180D" to "UNCONFIGURED_SAHAMBAN_PRO_180D",
        "SAHAMBAN_PRO_365D" to "UNCONFIGURED_SAHAMBAN_PRO_365D"
    )

    private val storeDelegate = lazy { BillingV2Coordinator(activity, activity) }
    private val authDelegate = lazy {
        BillingV2CookieSessionProvider(workerBaseUrl, BuildConfig.SAHAMBAN_PWA_ORIGIN)
    }
    private val apiDelegate = lazy {
        BillingV2ApiClient(workerBaseUrl, authDelegate.value, BuildConfig.BILLING_STORE)
    }

    fun createView(): View {
        if (!packageUsable) {
            return TextView(activity).apply {
                text = "شناسه بسته برنامه معتبر نیست؛ بازیابی اشتراک در این نسخه در دسترس نیست."
                textSize = 16f
                gravity = Gravity.CENTER
                setPadding(32, 32, 32, 32)
                layoutDirection = View.LAYOUT_DIRECTION_RTL
            }
        }
        val flow = BillingV2PurchaseFlow(
            api = apiDelegate.value,
            storeBilling = storeDelegate.value,
            skuByPlan = skuByPlan,
            expectedPackageName = expectedPackage
        )
        return BillingV2SubscriptionView(activity, flow)
    }

    fun close() {
        if (storeDelegate.isInitialized()) storeDelegate.value.close()
        if (apiDelegate.isInitialized()) apiDelegate.value.close()
    }
}
