package ir.sahamban.pilot

import android.view.Gravity
import android.view.View
import android.widget.TextView
import androidx.activity.ComponentActivity

/**
 * Composes the existing store adapter, native cookie session and purchase flow.
 * It deliberately fails closed until the owner supplies all real store mappings.
 */
class BillingV2SubscriptionHost(
    private val activity: ComponentActivity,
    workerBaseUrl: String
) {
    private val skuByPlan = mapOf(
        "SAHAMBAN_PRO_30D" to BuildConfig.SAHAMBAN_SKU_PRO_30D,
        "SAHAMBAN_PRO_60D" to BuildConfig.SAHAMBAN_SKU_PRO_60D,
        "SAHAMBAN_PRO_90D" to BuildConfig.SAHAMBAN_SKU_PRO_90D,
        "SAHAMBAN_PRO_180D" to BuildConfig.SAHAMBAN_SKU_PRO_180D,
        "SAHAMBAN_PRO_365D" to BuildConfig.SAHAMBAN_SKU_PRO_365D
    )
    private val expectedPackage = BuildConfig.SAHAMBAN_EXPECTED_PACKAGE_NAME
    private val configured = expectedPackage.matches(Regex("^[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z][A-Za-z0-9_]*)+$")) &&
        skuByPlan.values.all { it.matches(Regex("^[A-Za-z0-9._-]{1,100}$")) } &&
        skuByPlan.values.toSet().size == 5

    private val storeDelegate = lazy { BillingV2Coordinator(activity, activity) }
    private val authDelegate = lazy {
        BillingV2CookieSessionProvider(workerBaseUrl, BuildConfig.SAHAMBAN_PWA_ORIGIN)
    }
    private val apiDelegate = lazy {
        BillingV2ApiClient(workerBaseUrl, authDelegate.value, BuildConfig.BILLING_STORE)
    }

    fun createView(): View {
        if (!configured) {
            return TextView(activity).apply {
                text = "اشتراک هنوز آماده اتصال به فروشگاه نیست. شناسه بسته و پنج شناسه محصول باید از تنظیمات امن ساخت وارد شوند."
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
