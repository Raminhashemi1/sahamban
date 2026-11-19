package ir.sahmino.subscription

import android.app.Activity

fun createStoreBillingProvider(
    activity: Activity,
    productSkus: List<String>
): StoreBillingProvider = MyketBillingProvider(
    activity = activity,
    publicKeyBase64 = BuildConfig.IAB_PUBLIC_KEY,
    productSkus = productSkus
)
