package ir.sahamban.pilot

import android.os.Handler
import android.os.Looper
import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection
import java.util.concurrent.Executors

/** HTTPS-only adapter for authenticated Billing V2 Worker endpoints. */
class BillingV2ApiClient(private val baseUrl: String, private val bearerToken: String) {
    data class Order(val id: String, val planId: String, val days: Int)
    data class Access(val planId: String, val expiresAt: String, val renewalMode: String)

    sealed interface Result<out T> {
        data class Success<T>(val value: T) : Result<T>
        data class Failure(val httpStatus: Int, val code: String) : Result<Nothing>
    }

    private val executor = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())

    init {
        val parsed = URL(baseUrl)
        require(parsed.protocol == "https" && parsed.userInfo == null &&
            parsed.query == null && parsed.fragment == null && bearerToken.isNotBlank())
    }

    fun createOrder(planId: String, callback: (Result<Order>) -> Unit) {
        require(planId in setOf("SAHAMBAN_PRO_30D","SAHAMBAN_PRO_60D",
            "SAHAMBAN_PRO_90D","SAHAMBAN_PRO_180D","SAHAMBAN_PRO_365D"))
        request("/api/v2/billing/orders", JSONObject().put("planId", planId),
            { status, json ->
                if (status == 201) {
                    val order = json.optJSONObject("order")
                    val id = order?.optString("id").orEmpty()
                    val days = order?.optInt("days", 0) ?: 0
                    val returnedPlan = order?.optString("planId").orEmpty()
                    if (id.matches(Regex("^ord_[a-f0-9]{32}$")) && days > 0 &&
                        returnedPlan == planId) Result.Success(Order(id, returnedPlan, days))
                    else Result.Failure(502, "INVALID_ORDER_RESPONSE")
                } else Result.Failure(status, json.optString("error", "ORDER_FAILED"))
            }, callback)
    }

    fun verifyPurchase(orderId: String, sku: String, purchaseToken: String,
                           originalJson: String, dataSignature: String,
                           callback: (Result<Access>) -> Unit) {
        require(orderId.matches(Regex("^ord_[a-f0-9]{32}$")))
        require(sku.matches(Regex("^[A-Za-z0-9._-]{1,100}$")))
        require(purchaseToken.length in 8..4096 && originalJson.length in 1..8192 &&
            dataSignature.length in 1..4096)
        val body = JSONObject().put("orderId", orderId).put("sku", sku)
            .put("token", purchaseToken).put("originalJson", originalJson)
            .put("dataSignature", dataSignature)
        request("/api/v2/billing/verify", body, { status, json ->
            if (status == 200 && json.optString("status") == "ACTIVE") {
                val plan = json.optString("planId")
                val expires = json.optString("expiresAt")
                if (plan.isNotBlank() && expires.isNotBlank() && json.optString("renewalMode") == "MANUAL")
                    Result.Success(Access(plan, expires, "MANUAL"))
                else Result.Failure(502, "INVALID_ACCESS_RESPONSE")
            } else Result.Failure(status, json.optString("error", "VERIFY_FAILED"))
        }, callback)
    }

    private fun <T> request(
        path: String,
        body: JSONObject,
        map: (Int, JSONObject) -> Result<T>,
        callback: (Result<T>) -> Unit
    ) {
        executor.execute {
            val result: Result<T> = try {
                val base = URL(baseUrl)
                val endpoint = URL(base, path)
                require(endpoint.protocol == "https" && endpoint.host == base.host &&
                    endpoint.port == base.port)
                val connection = endpoint.openConnection() as HttpsURLConnection
                try {
                    connection.requestMethod = "POST"
                    connection.connectTimeout = 10000
                    connection.readTimeout = 15000
                    connection.doOutput = true
                    connection.setRequestProperty("Authorization", "Bearer $bearerToken")
                    connection.setRequestProperty("Content-Type", "application/json")
                    connection.setRequestProperty("Accept", "application/json")
                    connection.setRequestProperty("Cache-Control", "no-store")
                    connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
                    val status = connection.responseCode
                    val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                    val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: "{}"
                    map(status, JSONObject(text))
                } finally { connection.disconnect() }
            } catch (_: Exception) {
                Result.Failure(0, "NETWORK_UNAVAILABLE")
            }
            main.post { callback(result) }
        }
    }

    fun close() { executor.shutdown() }
}
