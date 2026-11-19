package ir.sahmino.subscription

import android.content.Context
import androidx.activity.result.ActivityResultRegistry

fun createStoreBillingProvider(
    context: Context,
    activityResultRegistry: ActivityResultRegistry,
    productSkus: List<String> = emptyList()
): StoreBillingProvider = BazaarBillingProvider(context, activityResultRegistry)
