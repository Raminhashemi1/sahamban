package ir.sahamban.pilot

import android.os.Handler
import android.os.Looper
import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection
import java.util.concurrent.Executors

/**
 * Sends raw Poolakey evidence to the authenticated Worker.
 * This client never grants access locally; only a successful server response is authoritative.
 */
class SahambanBazaarReceiptClient {
    data class VerifiedAccess(val planId: String, val paidUntil: String)

    sealed interface Result {
        data class Verified(val access: VerifiedAccess) : Result
        data class Rejected(val httpStatus: Int, val code: String) : Result
        data object Unavailable : Result
    }

    private val io = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())

    fun verify(
        workerBaseUrl: String,
        bearerToken: String,
        evidence: SahambanBazaarBillingManager.Evidence,
        callback: (Result) -> Unit
    ) {
        io.execute {
            val result = try {
                require(bearerToken.isNotBlank() && bearerToken.length <= 5000)
                val base = URL(workerBaseUrl)
                require(base.protocol == "https" && base.userInfo == null &&
                    base.query == null && base.fragment == null)
                val endpoint = URL(workerBaseUrl.trimEnd('/') +
                    "/api/v1/me/prepaid-orders/verify-bazaar")
                val connection = (endpoint.openConnection() as HttpsURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 10000
                    readTimeout = 15000
                    doOutput = true
                    setRequestProperty("Authorization", "Bearer $bearerToken")
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    setRequestProperty("Accept", "application/json")
                    setRequestProperty("Cache-Control", "no-store")
                }
                try {
                    val body = JSONObject()
                        .put("orderId", evidence.orderId)
                        .put("productId", evidence.productId)
                        .put("purchaseToken", evidence.purchaseToken)
                        .toString()
                    connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
                    val status = connection.responseCode
                    val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                    val responseText = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: "{}"
                    val response = JSONObject(responseText)
                    if (status in 200..299 && response.optString("status") == "SETTLED") {
                        val planId = response.optString("planId")
                        val paidUntil = response.optString("paidUntil")
                        if (planId.isBlank() || paidUntil.isBlank()) Result.Unavailable
                        else Result.Verified(VerifiedAccess(planId, paidUntil))
                    } else {
                        Result.Rejected(status, response.optString("error", "VERIFICATION_FAILED"))
                    }
                } finally {
                    connection.disconnect()
                }
            } catch (_: Exception) {
                Result.Unavailable
            }
            main.post { callback(result) }
        }
    }

    fun close() {
        io.shutdown()
    }
}
