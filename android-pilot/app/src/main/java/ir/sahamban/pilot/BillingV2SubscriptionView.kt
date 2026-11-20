package ir.sahamban.pilot

import android.content.Context
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

/**
 * Standalone native subscription selector for the Sahmino Billing V2 module.
 *
 * The host app supplies an already-authenticated BillingV2PurchaseFlow. This view
 * never handles credentials, store SDK tokens, or WebView messages. Store product
 * identifiers and the account session remain injected by the host integration.
 */
class BillingV2SubscriptionView(
    context: Context,
    private val purchaseFlow: BillingV2PurchaseFlow,
    private val onStatusChanged: (String) -> Unit = {}
) : ScrollView(context) {

    private data class Plan(
        val id: String,
        val days: Int,
        val title: String,
        val priceRial: Long
    )

    private val plans = listOf(
        Plan("SAHAMBAN_PRO_30D", 30, "حرفه‌ای ۳۰ روزه", 1500000),
        Plan("SAHAMBAN_PRO_60D", 60, "حرفه‌ای ۶۰ روزه", 2850000),
        Plan("SAHAMBAN_PRO_90D", 90, "حرفه‌ای ۹۰ روزه", 4050000),
        Plan("SAHAMBAN_PRO_180D", 180, "حرفه‌ای ۱۸۰ روزه", 7650000),
        Plan("SAHAMBAN_PRO_365D", 365, "حرفه‌ای یک‌ساله", 14600000)
    )

    private val mainHandler = Handler(Looper.getMainLooper())
    private val actionButtons = mutableListOf<Button>()
    private val planPriceViews = mutableMapOf<String, TextView>()
    private lateinit var statusView: TextView
    private var busy = false

    init {
        isFillViewport = true
        layoutDirection = View.LAYOUT_DIRECTION_RTL
        val content = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(20), dp(24), dp(20), dp(28))
            layoutDirection = View.LAYOUT_DIRECTION_RTL
        }
        addView(content, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))

        content.addView(text("خرید اشتراک سهمینو", 24f, true))
        content.addView(text(
            "تمدید خودکار نداریم. هر پلن فقط برای مدت درج‌شده فعال است؛ پس از پایان اعتبار، در صورت تمایل خودتان خرید جدید انجام می‌دهید و هیچ مبلغی خودکار برداشت نمی‌شود.",
            14f, false
        ).apply { setPadding(0, dp(12), 0, dp(20)) })

        plans.forEach { plan ->
            val card = LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                layoutDirection = View.LAYOUT_DIRECTION_RTL
                setPadding(dp(16), dp(14), dp(16), dp(14))
                background = GradientDrawable().apply {
                    setColor(0xFFF7F8FA.toInt())
                    cornerRadius = dp(14).toFloat()
                    setStroke(dp(1), 0xFFE0E4E8.toInt())
                }
            }
            card.addView(text(plan.title, 18f, true))
            val price = text("${plan.priceRial} ریال · در حال دریافت قیمت فروشگاه…", 16f, true).apply {
                setPadding(0, dp(8), 0, dp(10))
            }
            planPriceViews[plan.id] = price
            card.addView(price)
            val buy = Button(context).apply {
                text = "خرید پلن ${plan.days} روزه"
                isAllCaps = false
                contentDescription = "خرید ${plan.title}"
                setOnClickListener { beginPurchase(plan) }
            }
            actionButtons += buy
            card.addView(buy, LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ))
            content.addView(card, LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(12) })
        }

        val restore = Button(context).apply {
            text = "بازیابی اشتراک"
            isAllCaps = false
            setOnClickListener { beginRestore() }
        }
        actionButtons += restore
        content.addView(restore, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ))

        statusView = text("وضعیت اشتراک پس از بررسی فروشگاه نمایش داده می‌شود.", 14f, false)
        statusView.setPadding(0, dp(16), 0, 0)
        content.addView(statusView)

        if (!BuildConfig.SAHAMBAN_BILLING_ENABLED) {
            planPriceViews.values.forEach {
                it.text = "قیمت نهایی پس از فعال‌سازی پرداخت از فروشگاه دریافت می‌شود."
            }
            statusView.text = "پرداخت در این نسخه غیرفعال است؛ هیچ خریدی انجام نمی‌شود."
        } else {
            purchaseFlow.loadPlanDetails { prices ->
                mainHandler.post {
                    if (prices == null) {
                        planPriceViews.values.forEach { it.text = "قیمت فروشگاه در دسترس نیست." }
                        actionButtons.forEach { it.isEnabled = false }
                        statusView.text = "قیمت پلن‌ها از فروشگاه دریافت نشد؛ امکان خرید موقتاً غیرفعال است."
                    } else {
                        prices.forEach { (planId, displayPrice) ->
                            planPriceViews[planId]?.text = "${plans.first { it.id == planId }.priceRial} ریال · $displayPrice"
                        }
                    }
                }
            }
        }
    }

    private fun beginPurchase(plan: Plan) {
        if (busy) return
        setBusy(true, "در حال آماده‌سازی خرید…")
        purchaseFlow.purchase(plan.id) { outcome ->
            mainHandler.post {
                setBusy(false, messageFor(outcome))
            }
        }
    }

    private fun beginRestore() {
        if (busy) return
        setBusy(true, "در حال بررسی و بازیابی اشتراک…")
        purchaseFlow.restore { outcomes ->
            mainHandler.post {
                val message = when {
                    outcomes.isEmpty() -> "اشتراک فعالی برای بازیابی پیدا نشد."
                    outcomes.any { it is BillingV2PurchaseFlow.Outcome.Active ||
                        it is BillingV2PurchaseFlow.Outcome.EntitlementRestored } ->
                        outcomes.firstNotNullOfOrNull { outcome ->
                            when (outcome) {
                                is BillingV2PurchaseFlow.Outcome.Active ->
                                    "اشتراک تأیید و فعال است. اعتبار تا ${outcome.access.expiresAt}"
                                is BillingV2PurchaseFlow.Outcome.EntitlementRestored ->
                                    "اشتراک حساب شما فعال است. اعتبار تا ${outcome.entitlement.paidUntil.orEmpty()}"
                                else -> null
                            }
                        } ?: "وضعیت اشتراک بررسی شد."
                    else -> outcomes.joinToString("؛ ") { messageFor(it) }
                }
                setBusy(false, message)
            }
        }
    }

    private fun messageFor(outcome: BillingV2PurchaseFlow.Outcome): String =
        when (outcome) {
            is BillingV2PurchaseFlow.Outcome.Active ->
                if (outcome.consumptionPending)
                    "پرداخت تأیید شد و اشتراک فعال است؛ تکمیل ثبت نهایی در فروشگاه در صف تلاش مجدد است. اعتبار تا ${outcome.access.expiresAt}"
                else "پرداخت تأیید شد و اشتراک فعال است. اعتبار تا ${outcome.access.expiresAt}"
            is BillingV2PurchaseFlow.Outcome.EntitlementRestored ->
                "اشتراک حساب شما فعال است. اعتبار تا ${outcome.entitlement.paidUntil.orEmpty()}"
            BillingV2PurchaseFlow.Outcome.Cancelled ->
                "خرید لغو شد و اشتراکی فعال نشد."
            is BillingV2PurchaseFlow.Outcome.Failed ->
                when (outcome.reason) {
                    "BILLING_DISABLED" -> "خرید هنوز در این نسخه فعال نشده است."
                    "NOT_AUTHENTICATED" -> "برای خرید ابتدا وارد حساب سهمینو شوید."
                    "PLAN_NOT_CONFIGURED" -> "این پلن هنوز در فروشگاه پیکربندی نشده است."
                    "STORE_CONNECTION_FAILED" -> "ارتباط با فروشگاه برقرار نشد."
                    "NETWORK_UNAVAILABLE" -> "ارتباط با سرور برقرار نشد؛ وضعیت پرداخت را پیش از تلاش دوباره بررسی کنید."
                    else -> "خرید تکمیل نشد: ${outcome.reason}"
                }
        }

    private fun setBusy(value: Boolean, message: String) {
        busy = value
        actionButtons.forEach { it.isEnabled = !value }
        statusView.text = message
        onStatusChanged(message)
    }

    private fun text(value: String, sizeSp: Float, bold: Boolean) =
        TextView(context).apply {
            text = value
            textSize = sizeSp
            gravity = Gravity.RIGHT
            setTextColor(0xFF20252B.toInt())
            if (bold) setTypeface(typeface, Typeface.BOLD)
            layoutDirection = View.LAYOUT_DIRECTION_RTL
        }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()
}
