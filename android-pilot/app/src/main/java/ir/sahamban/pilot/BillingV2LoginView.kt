package ir.sahamban.pilot

import android.content.Context
import android.graphics.Typeface
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView

fun interface AuthenticatedListener { fun onAuthenticated() }

/** Native Persian username/password form. Credentials never enter the WebView. */
class BillingV2LoginView(
    context: Context,
    private val authClient: BillingV2NativeAuthClient,
    private val onAuthenticated: AuthenticatedListener
) : LinearLayout(context) {
    private val usernameInput = EditText(context)
    private val passwordInput = EditText(context)
    private val loginButton = Button(context)
    private val status = TextView(context)
    private var busy = false

    init {
        orientation = VERTICAL
        gravity = Gravity.CENTER
        layoutDirection = View.LAYOUT_DIRECTION_RTL
        setPadding(dp(24), dp(24), dp(24), dp(24))
        addView(label("ورود به سهمینو", 24f, true))
        addView(label("نام کاربری و رمز عبور خود را وارد کنید.", 15f, false))
        usernameInput.hint = "نام کاربری، مثلاً شماره همراه"
        usernameInput.inputType = InputType.TYPE_CLASS_PHONE
        usernameInput.setSingleLine(true)
        usernameInput.layoutDirection = View.LAYOUT_DIRECTION_LTR
        addView(usernameInput, matchWidth())
        passwordInput.hint = "رمز عبور"
        passwordInput.inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        passwordInput.setSingleLine(true)
        passwordInput.layoutDirection = View.LAYOUT_DIRECTION_LTR
        addView(passwordInput, matchWidth())
        loginButton.text = "ورود"
        loginButton.isAllCaps = false
        loginButton.setOnClickListener { login() }
        addView(loginButton, matchWidth())
        status.text = "ورود امن با نام کاربری و رمز عبور"
        status.textSize = 14f
        status.gravity = Gravity.CENTER
        addView(status, matchWidth())
    }

    private fun login() {
        if (busy) return
        val username = asciiDigits(usernameInput.text.toString()).trim()
        val password = passwordInput.text.toString()
        setBusy(true, "در حال بررسی اطلاعات ورود…")
        authClient.login(username, password) { result ->
            when (result) {
                is BillingV2NativeAuthClient.Result.Success -> {
                    passwordInput.text?.clear()
                    setBusy(false, "ورود موفق بود.")
                    onAuthenticated.onAuthenticated()
                }
                is BillingV2NativeAuthClient.Result.Failure -> setBusy(false, messageFor(result.code))
            }
        }
    }

    private fun messageFor(code: String): String = when (code) {
        "INVALID_CREDENTIALS" -> "نام کاربری یا رمز عبور صحیح نیست."
        "LOGIN_RATE_LIMITED" -> "تعداد تلاش‌های ورود زیاد است؛ ۱۵ دقیقه دیگر تلاش کنید."
        "SESSION_COOKIE_MISSING", "SESSION_COOKIE_REJECTED", "SESSION_COOKIE_STORE_FAILED" ->
            "نشست امن روی دستگاه ذخیره نشد؛ دوباره تلاش کنید."
        "NETWORK_UNAVAILABLE" -> "ارتباط با سرور برقرار نشد."
        else -> "ورود انجام نشد: " + code
    }

    private fun setBusy(value: Boolean, message: String) {
        busy = value
        loginButton.isEnabled = !value
        usernameInput.isEnabled = !value
        passwordInput.isEnabled = !value
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
