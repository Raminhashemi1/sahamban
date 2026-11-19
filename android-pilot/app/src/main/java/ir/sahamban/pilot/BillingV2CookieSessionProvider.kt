package ir.sahamban.pilot

import android.os.Handler
import android.os.Looper
import android.webkit.CookieManager
import java.net.URL

/**
 * Reads the Worker-origin HttpOnly session from Android WebView's shared cookie jar.
 *
 * The raw session cookie remains in native process memory and is sent only to the
 * configured HTTPS Worker. It is never returned to JavaScript, local storage, logs,
 * or a URL. The PWA Origin is explicit because the Worker checks it for cookie auth.
 */
class BillingV2CookieSessionProvider(
    private val workerBaseUrl: String,
    private val pwaOrigin: String = "https://raminhashemi1.github.io"
) : BillingV2AuthProvider {
    private val main = Handler(Looper.getMainLooper())

    init {
        val worker = URL(workerBaseUrl)
        val origin = URL(pwaOrigin)
        require(worker.protocol == "https" && worker.userInfo == null &&
            worker.query == null && worker.ref == null && worker.path.isNullOrEmpty())
        require(origin.protocol == "https" && origin.userInfo == null &&
            origin.query == null && origin.ref == null && origin.path.isNullOrEmpty())
    }

    override fun getHeaders(callback: (Map<String, String>?) -> Unit) {
        val read = Runnable {
            val raw = try {
                CookieManager.getInstance().getCookie(workerBaseUrl)
            } catch (_: Exception) {
                null
            }
            val matches = raw.orEmpty().split(';').map { it.trim() }
                .filter { it.startsWith("sahmino_session=") }
            val value = matches.singleOrNull()?.substringAfter('=')?.takeIf {
                it.matches(Regex("^[a-f0-9]{64}$"))
            }
            val headers = value?.let {
                mapOf(
                    "Cookie" to "sahmino_session=$it",
                    "Origin" to pwaOrigin,
                    "X-Sahmino-CSRF" to "1"
                )
            }
            callback(headers)
        }
        if (Looper.myLooper() == Looper.getMainLooper()) read.run()
        else main.post(read)
    }
}
