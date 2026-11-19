package ir.sahamban.pilot

import android.content.Context
import android.graphics.Typeface
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView

/** Java-friendly completion callback for the native sign-in screen. */
fun interface AuthenticatedListener { fun onAuthenticated.onAuthenticated() }

/** Minimal native Persian OTP sign-in screen. Credentials never enter the WebView. */
class BillingV2OtpLoginView(
    context: Context,
    private val otpClient: BillingV2NativeOtpClient,
    private val onAuthenticated: AuthenticatedListener
) : LinearLayout(context) {
    private val phoneInput = EditText(context)
    private val codeInput = EditText(context)
    private val sendButton = Button(context)
    private val verifyButton = Button(context)
    private val status = TextView(context)
    private var challengeId: String? = null
    private var busy = false

    init {
        orientation = VERTICAL
        gravity = Gravity.CENTER
        layoutDirection = View.LAYOUT_DIRECTION_RTL
        setPadding(dp(24), dp(24), dp(24), dp(24))
        addView(label("ورود به سهمینو", 24f, true))
        addView(label("برای ورود، شماره موبایل خود را وارد کنید.", 15f, false))
        phoneInput.hint = "شماره موبایل، مثلاً 09123456789"
        phoneInput.inputType = android.text.InputType.TYPE_CLASS_PHONE
        phoneInput.setSingleLine(true)
        phoneInput.layoutDirection = View.LAYOUT_DIRECTION_LTR
        addView(phoneInput, matchWidth())
        sendButton.text = "دریافت کد تأیید"
        sendButton.isAllCaps = false
        sendButton.setOnClickListener { requestCode() }
        addView(sendButton, matchWidth())
        codeInput.hint = "کد شش‌رقمی پیامک‌شده"
        codeInput.inputType = android.text.InputType.TYPE_CLASS_NUMBER or
            android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD
        codeInput.setSingleLine(true)
        codeInput.layoutDirection = View.LAYOUT_DIRECTION_LTR
        codeInput.visibility = View.GONE
        addView(codeInput, matchWidth())
        verifyButton.text = "تأیید و ورود"
        verifyButton.isAllCaps = false
        verifyButton.visibility = View.GONE
        verifyButton.setOnClickListener { verifyCode() }
        addView(verifyButton, matchWidth())
        status.text = "ورود امن با کد یک‌بارمصرف پیامکی"
        status.textSize = 14f
        status.gravity = Gravity.CENTER
        addView(status, matchWidth())
    }

    private fun requestCode() {
        if (busy) return
        val phone = asciiDigits(phoneInput.text.toString()).trim()
        setBusy(true, "در حال ارسال کد…")
        otpClient.requestCode(phone) { result ->
            when (result) {
                is BillingV2NativeOtpClient.Result.Success -> {
                    challengeId = result.value.challengeId
                    codeInput.visibility = View.VISIBLE
                    verifyButton.visibility = View.VISIBLE
                    setBusy(false, "کد ارسال شد. تا " + result.value.expiresInSeconds + " ثانیه برای تأیید فرصت دارید.")
                }
                is BillingV2NativeOtpClient.Result.Failure -> setBusy(false, messageFor(result.code))
            }
        }
    }

    private fun verifyCode() {
        if (busy) return
        val challenge = challengeId
        if (challenge == null) {
            setBusy(false, "ابتدا کد تأیید را دریافت کنید.")
            return
        }
        val code = asciiDigits(codeInput.text.toString()).filter { it.isDigit() }
        setBusy(true, "در حال بررسی کد…")
        otpClient.verifyCode(challenge, code) { result ->
            when (result) {
                is BillingV2NativeOtpClient.Result.Success -> {
                    setBusy(false, "ورود موفق بود.")
                    onAuthenticated()
                }
                is BillingV2NativeOtpClient.Result.Failure -> setBusy(false, messageFor(result.code))
            }
        }
    }

    private fun messageFor(code: String): String = when (code) {
        "INVALID_IRANIAN_MOBILE" -> "شماره موبایل ایران معتبر نیست."
        "OTP_RATE_LIMITED" -> "تعداد درخواست زیاد است؛ کمی بعد دوباره تلاش کنید."
        "OTP_DELIVERY_UNAVAILABLE" -> "ارسال پیامک فعلاً ممکن نیست."
        "OTP_INVALID_OR_EXPIRED" -> "کد اشتباه است یا اعتبار آن پایان یافته است."
        "SESSION_COOKIE_MISSING", "SESSION_COOKIE_REJECTED", "SESSION_COOKIE_STORE_FAILED" ->
            "نشست امن روی دستگاه ذخیره نشد؛ دوباره تلاش کنید."
        "NETWORK_UNAVAILABLE" -> "ارتباط با سرور برقرار نشد."
        else -> "ورود انجام نشد: " + code
    }

    private fun setBusy(value: Boolean, message: String) {
        busy = value
        sendButton.isEnabled = !value
        verifyButton.isEnabled = !value
        status.text = message
    }

    private fun asciiDigits(value: String): String = value
        .replace(Regex("[\\u06f0-\\u06f9]")) { (it.value[0].code - 0x06f0).toString() }
        .replace(Regex("[\\u0660-\\u0669]")) { (it.value[0].code - 0x0660).toString() }

    private fun label(value: String, size: Float, bold: Boolean) = TextView(context).apply {
        text = value
        textSize = size
        gravity = Gravity.CENTER
        setPadding(0, dp(10), 0, dp(10))
        if (bold) setTypeface(typeface, Typeface.BOLD)
    }

    private fun matchWidth() = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}
