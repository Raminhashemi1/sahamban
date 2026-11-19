package ir.sahmino.subscription

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

fun interface BillingBearerTokenProvider {
    suspend fun getBearerToken(): String?
}

/**
 * Small Worker HTTP client. The token provider must return the real commercial
 * account session token; pilot/demo tokens are not accepted as production auth.
 */
class HttpBillingBackendClient(
    baseUrl: String,
    private val storeName: String,
    private val tokenProvider: BillingBearerTokenProvider
) : BillingBackendClient {
    private val baseUrl = baseUrl.trimEnd('/')

    init {
        require(this.baseUrl.startsWith("https://")) { "BILLING_BASE_URL_MUST_BE_HTTPS" }
        require(storeName == "BAZAAR" || storeName == "MYKET") { "UNSUPPORTED_STORE" }
    }

    override suspend fun createOrder(planId: String): BillingServerOrder {
        val response = request(
            method = "POST",
            path = "/api/v2/billing/orders",
            body = JSONObject().put("planId", planId)
        )
        val order = response.getJSONObject("order")
        return BillingServerOrder(
            orderId = order.getString("orderId"),
            planId = order.getString("planId"),
            productId = order.getString("productId"),
            amountIrr = order.getLong("amountIrr"),
            store = order.getString("store")
        )
    }

    override suspend fun verifyPurchase(
        orderId: String,
        purchase: StorePurchase
    ): BillingSettlement {
        val body = JSONObject().put("orderId", orderId)
        if (storeName == "BAZAAR") {
            body.put("purchaseToken", purchase.purchaseToken)
        } else {
            val signedData = purchase.rawSignedData
                ?: throw IllegalStateException("MISSING_MYKET_SIGNED_DATA")
            val signature = purchase.signature
                ?: throw IllegalStateException("MISSING_MYKET_SIGNATURE")
            body.put("originalJson", signedData)
            body.put("signature", signature)
        }

        val response = request("POST", "/api/v2/billing/verify", body)
        return BillingSettlement(
            paid = response.optBoolean("ok") && response.optString("status") == "PAID",
            expiresAt = response.optString("expiresAt").takeIf { it.isNotBlank() && it != "null" },
            alreadySettled = response.optBoolean("alreadySettled")
        )
    }

    override suspend fun getEntitlement(): BillingEntitlement {
        val response = request("GET", "/api/v1/me/entitlement")
        return BillingEntitlement(
            active = response.optBoolean("active"),
            expiresAt = response.optString("expiresAt").takeIf { it.isNotBlank() && it != "null" }
        )
    }

    private suspend fun request(
        method: String,
        path: String,
        body: JSONObject? = null
    ): JSONObject {
        val bearer = tokenProvider.getBearerToken()
            ?: throw IllegalStateException("UNAUTHENTICATED")
        return withContext(Dispatchers.IO) {
            val connection = (URL(baseUrl + path).openConnection() as HttpURLConnection)
            try {
                connection.requestMethod = method
                connection.connectTimeout = 15_000
                connection.readTimeout = 20_000
                connection.setRequestProperty("Accept", "application/json")
                connection.setRequestProperty("Authorization", "Bearer $bearer")
                if (body != null) {
                    connection.doOutput = true
                    connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
                }
                val status = connection.responseCode
                val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
                val json = try { JSONObject(text) } catch (_: Throwable) {
                    throw IllegalStateException("BILLING_SERVER_BAD_RESPONSE")
                }
                if (status !in 200..299 || !json.optBoolean("ok", false)) {
                    throw IllegalStateException(json.optString("error").ifBlank { "BILLING_SERVER_ERROR" })
                }
                json
            } finally {
                connection.disconnect()
            }
        }
    }
}
