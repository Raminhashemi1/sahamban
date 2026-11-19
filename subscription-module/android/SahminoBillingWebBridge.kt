package ir.sahmino.subscription

import android.net.Uri
import android.webkit.WebView
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import org.json.JSONObject

interface SahminoBillingBridgeActions {
    suspend fun getAvailability(): Map<String, Any?>
    suspend fun getEntitlement(): Map<String, Any?>
    suspend fun purchase(planId: String): Map<String, Any?>
    suspend fun restore(): Map<String, Any?>
}

/**
 * Origin-restricted PWA-to-native billing bridge.
 *
 * The trustedOrigin must be an exact HTTPS origin, e.g. https://app.example.com.
 * The host Activity supplies the coordinator-backed actions and a lifecycle scope.
 */
class SahminoBillingWebBridge(
    private val webView: WebView,
    private val trustedOrigin: String,
    private val scope: CoroutineScope,
    private val actions: SahminoBillingBridgeActions
) {
    private val originUri = Uri.parse(trustedOrigin)

    init {
        require(originUri.scheme == "https" && !originUri.host.isNullOrBlank() &&
            originUri.path.isNullOrEmpty() && originUri.query == null && originUri.fragment == null) {
            "TRUSTED_ORIGIN_MUST_BE_EXACT_HTTPS_ORIGIN"
        }
        check(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            "WEB_MESSAGE_LISTENER_NOT_SUPPORTED"
        }

        WebViewCompat.addWebMessageListener(
            webView,
            "SahminoNative",
            setOf(trustedOrigin)
        ) { _, message, sourceOrigin, isMainFrame, replyProxy ->
            if (!isMainFrame || sourceOrigin.toString() != trustedOrigin) return@addWebMessageListener
            val raw = message.data ?: return@addWebMessageListener
            if (raw.length > 16_384) {
                reply(replyProxy, null, false, "MESSAGE_TOO_LARGE")
                return@addWebMessageListener
            }
            val request = try { JSONObject(raw) } catch (_: Throwable) {
                reply(replyProxy, null, false, "INVALID_MESSAGE")
                return@addWebMessageListener
            }
            val version = request.optInt("version", -1)
            val requestId = request.optString("requestId", "")
            val action = request.optString("action", "")
            val payload = request.optJSONObject("payload") ?: JSONObject()
            if (version != 1 || requestId.isBlank() || requestId.length > 80) {
                reply(replyProxy, requestId, false, "INVALID_ENVELOPE")
                return@addWebMessageListener
            }

            scope.launch {
                try {
                    val result = when (action) {
                        "billing.getAvailability" -> actions.getAvailability()
                        "billing.getEntitlement" -> actions.getEntitlement()
                        "billing.purchase" -> {
                            val planId = payload.optString("planId", "")
                            require(planId in setOf(
                                "SAHAMBAN_PRO_30D",
                                "SAHAMBAN_PRO_60D",
                                "SAHAMBAN_PRO_90D",
                                "SAHAMBAN_PRO_180D",
                                "SAHAMBAN_PRO_365D"
                            )) { "UNKNOWN_PLAN" }
                            actions.purchase(planId)
                        }
                        "billing.restore" -> actions.restore()
                        else -> throw IllegalArgumentException("UNKNOWN_ACTION")
                    }
                    reply(replyProxy, requestId, true, null, JSONObject(result))
                } catch (error: Throwable) {
                    val safeCode = when (error.message) {
                        "UNKNOWN_PLAN" -> "UNKNOWN_PLAN"
                        "UNKNOWN_ACTION" -> "UNKNOWN_ACTION"
                        "UNAUTHENTICATED" -> "UNAUTHENTICATED"
                        else -> "BILLING_OPERATION_FAILED"
                    }
                    reply(replyProxy, requestId, false, safeCode)
                }
            }
        }
    }

    fun remove() {
        WebViewCompat.removeWebMessageListener(webView, "SahminoNative")
    }

    private fun reply(
        proxy: JavaScriptReplyProxy,
        requestId: String?,
        ok: Boolean,
        error: String?,
        result: JSONObject? = null
    ) {
        val response = JSONObject()
            .put("version", 1)
            .put("requestId", requestId ?: "")
            .put("ok", ok)
        if (ok) response.put("result", result ?: JSONObject())
        else response.put("error", error ?: "BILLING_OPERATION_FAILED")
        proxy.postMessage(response.toString())
    }
}
