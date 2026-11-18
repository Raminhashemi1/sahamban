package ir.sahamban.pilot

import android.os.Handler
import android.os.Looper
import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection
import java.util.concurrent.Executors

/** Authenticated client: server response, never local callbacks, is authoritative. */
class SahambanBazaarReceiptClient {
    data class VerifiedAccess(val planId: String, val paidUntil: String)
    sealed interface Result {
        data class Verified(val access: VerifiedAccess) : Result
        data class Rejected(val status: Int, val code: String) : Result
        data object Unavailable : Result
    }

    private val io = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())

    fun verify(baseUrl: String, bearerToken: String,
               evidence: SahambanBazaarBillingManager.Evidence,
               callback: (Result) -> Unit) {
        io.execute {
            val result = try {
                require(bearerToken.isNotBlank() && bearerToken.length <= 5000)
                val base = URL(baseUrl)
                require(base.protocol == "https" && base.userInfo == null &&
                    base.query == null && base.fragment == null)
                val endpoint = URL(baseUrl.trimEnd('/') + "/api/v1/me/prepaid-orders/verify-bazaar")
                val c = endpoint.openConnection() as HttpsURLConnection
                try {
                    c.requestMethod = "POST"
                    c.connectTimeout = 10000
                    c.readTimeout = 15000
                    c.doOutput = true
                    c.setRequestProperty("Authorization", "Bearer $bearerToken")
                    c.setRequestProperty("Content-Type", "application/json")
                    c.setRequestProperty("Accept", "application/json")
                    c.setRequestProperty("Cache-Control", "no-store")
                    val body = JSONObject()
                        .put("orderId", evidence.serverOrderId)
                        .put("productId", evidence.productId)
                        .put("purchaseToken", evidence.purchaseToken)
                        .toString()
                    c.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
                    val status = c.responseCode
                    val stream = if (status in 200..299) c.inputStream else c.errorStream
                    val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: "{}"
                    val json = JSONObject(text)
                    if (status in 200..299 && json.optString("status") == "SETTLED") {
                        val plan = json.optString("planId")
                        val until = json.optString("paidUntil")
                        if (plan.isBlank() || until.isBlank()) Result.Unavailable
                        else Result.Verified(VerifiedAccess(plan, until))
                    } else Result.Rejected(status, json.optString("error", "VERIFICATION_FAILED"))
                } finally { c.disconnect() }
            } catch (_: Exception) { Result.Unavailable }
            main.post { callback(result) }
        }
    }

    fun close() { io.shutdown() }
}
