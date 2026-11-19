package ir.sahamban.pilot

import android.os.Handler
import android.os.Looper
import android.webkit.CookieManager
import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection
import java.util.concurrent.Executors

/**
 * Native OTP transport for the Android host.
 *
 * OTP requests go directly to the HTTPS Worker. The session Set-Cookie is installed
 * into WebView's native cookie jar without exposing the token to JavaScript or logs.
 * This avoids depending on third-party Set-Cookie acceptance by a GitHub Pages PWA.
 */
class BillingV2NativeOtpClient @JvmOverloads constructor(
    private val workerBaseUrl: String,
    private val pwaOrigin: String = BuildConfig.SAHAMBAN_PWA_ORIGIN
) {
    data class Challenge(val challengeId: String, val expiresInSeconds: Int, val resendAfterSeconds: Int)

    fun interface SessionCallback { fun onResult(result: Result<Boolean>) }
    fun interface LogoutCallback { fun onResult(result: Result<Boolean>) }

    sealed interface Result<out T> {
        data class Success<T>(val value: T) : Result<T>
        data class Failure(val status: Int, val code: String) : Result<Nothing>
    }

    private val executor = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())

    init {
        val worker = URL(workerBaseUrl)
        val origin = URL(pwaOrigin)
        require(worker.protocol == "https" && worker.userInfo == null &&
            worker.query == null && worker.ref == null &&
            (worker.path.isNullOrEmpty() || worker.path == "/"))
        require(origin.protocol == "https" && origin.userInfo == null &&
            origin.query == null && origin.ref == null && origin.path.isNullOrEmpty())
    }

    fun requestCode(phone: String, callback: (Result<Challenge>) -> Unit) {
        if (!phone.matches(Regex("^(?:\\+98|0098|0)?9[0-9]{9}$"))) {
            callback(Result.Failure(400, "INVALID_IRANIAN_MOBILE"))
            return
        }
        postJson("/api/v1/auth/otp/request", JSONObject().put("phone", phone)) { status, body, _ ->
            if (status == 202) {
                val id = body.optString("challengeId")
                val expiry = body.optInt("expiresInSeconds", 0)
                val resend = body.optInt("resendAfterSeconds", 0)
                if (id.matches(Regex("^[a-f0-9]{48}$")) && expiry > 0 && resend > 0)
                    callback(Result.Success(Challenge(id, expiry, resend)))
                else callback(Result.Failure(502, "INVALID_OTP_RESPONSE"))
            } else callback(Result.Failure(status, body.optString("error", "OTP_REQUEST_FAILED")))
        }
    }

    fun verifyCode(challengeId: String, code: String, callback: (Result<Boolean>) -> Unit) {
        if (!challengeId.matches(Regex("^[a-f0-9]{48}$")) || !code.matches(Regex("^[0-9]{6}$"))) {
            callback(Result.Failure(400, "INVALID_OTP_REQUEST"))
            return
        }
        postJson("/api/v1/auth/otp/verify",
            JSONObject().put("challengeId", challengeId).put("code", code)) { status, body, setCookie ->
            if (status != 200 || !body.optBoolean("authenticated")) {
                callback(Result.Failure(status, body.optString("error", "OTP_VERIFY_FAILED")))
                return@postJson
            }
            val cookie = setCookie?.takeIf {
                it.startsWith("sahmino_session=") &&
                    it.contains("; Path=/") && it.contains("; HttpOnly") &&
                    it.contains("; Secure") && it.contains("; SameSite=None")
            }
            if (cookie == null) {
                callback(Result.Failure(502, "SESSION_COOKIE_MISSING"))
                return@postJson
            }
            main.post {
                try {
                    val manager = CookieManager.getInstance()
                    manager.setAcceptCookie(true)
                    manager.setCookie(workerBaseUrl, cookie) { accepted ->
                        callback(if (accepted) Result.Success(true)
                            else Result.Failure(502, "SESSION_COOKIE_REJECTED"))
                    }
                    manager.flush()
                } catch (_: Exception) {
                    callback(Result.Failure(502, "SESSION_COOKIE_STORE_FAILED"))
                }
            }
        }
    }

    /** Validate the persisted native session against the Worker on every cold start. */
    fun checkSession(callback: SessionCallback) {
        main.post {
            val raw = try { CookieManager.getInstance().getCookie(workerBaseUrl) } catch (_: Exception) { null }
            val cookie = raw.orEmpty().split(';').map { it.trim() }
                .singleOrNull { it.startsWith("sahmino_session=") }
                ?.takeIf { it.matches(Regex("^sahmino_session=[a-f0-9]{64}$")) }
            if (cookie == null) {
                callback.onResult(Result.Success(false))
                return@post
            }
            executor.execute {
                val result: Result<Boolean> = try {
                    val endpoint = URL(URL(workerBaseUrl), "/api/v1/auth/session")
                    val connection = endpoint.openConnection() as HttpsURLConnection
                    try {
                        connection.requestMethod = "GET"
                        connection.connectTimeout = 10000
                        connection.readTimeout = 15000
                        connection.setRequestProperty("Origin", pwaOrigin)
                        connection.setRequestProperty("Cookie", cookie)
                        connection.setRequestProperty("Accept", "application/json")
                        connection.setRequestProperty("Cache-Control", "no-store")
                        val status = connection.responseCode
                        val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                        val body = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: "{}"
                        val authenticated = status == 200 && JSONObject(body).optBoolean("authenticated")
                        if (status == 200 || status == 401) Result.Success(authenticated)
                        else Result.Failure(status, "SESSION_CHECK_FAILED")
                    } finally { connection.disconnect() }
                } catch (_: Exception) { Result.Failure(0, "NETWORK_UNAVAILABLE") }
                main.post { callback.onResult(result) }
            }
        }
    }

    fun logout(callback: LogoutCallback) {
        val raw = try { CookieManager.getInstance().getCookie(workerBaseUrl) } catch (_: Exception) { null }
        val cookie = raw.orEmpty().split(';').map { it.trim() }
            .singleOrNull { it.startsWith("sahmino_session=") }
            ?.takeIf { it.matches(Regex("^sahmino_session=[a-f0-9]{64}$")) }
        if (cookie == null) {
            callback.onResult(Result.Success(true))
            return
        }
        executor.execute {
            val result = try {
                val endpoint = URL(URL(workerBaseUrl), "/api/v1/auth/logout")
                val connection = endpoint.openConnection() as HttpsURLConnection
                try {
                    connection.requestMethod = "POST"
                    connection.connectTimeout = 10000
                    connection.readTimeout = 15000
                    connection.doOutput = true
                    connection.setRequestProperty("Origin", pwaOrigin)
                    connection.setRequestProperty("X-Sahmino-CSRF", "1")
                    connection.setRequestProperty("Cookie", cookie)
                    connection.setRequestProperty("Content-Type", "application/json")
                    connection.outputStream.use { it.write("{}".toByteArray(Charsets.UTF_8)) }
                    connection.responseCode in 200..299
                } finally { connection.disconnect() }
            } catch (_: Exception) { false }
            main.post {
                if (result) {
                    CookieManager.getInstance().setCookie(workerBaseUrl,
                        "sahmino_session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0") {
                        CookieManager.getInstance().flush()
                        callback(Result.Success(true))
                    }
                } else callback.onResult(Result.Failure(0, "LOGOUT_UNAVAILABLE"))
            }
        }
    }

    private fun postJson(
        path: String,
        body: JSONObject,
        callback: (Int, JSONObject, String?) -> Unit
    ) {
        executor.execute {
            var status = 0
            var response = JSONObject()
            var setCookie: String? = null
            try {
                val endpoint = URL(URL(workerBaseUrl), path)
                require(endpoint.protocol == "https")
                val connection = endpoint.openConnection() as HttpsURLConnection
                try {
                    connection.requestMethod = "POST"
                    connection.connectTimeout = 10000
                    connection.readTimeout = 15000
                    connection.doOutput = true
                    connection.setRequestProperty("Origin", pwaOrigin)
                    connection.setRequestProperty("Content-Type", "application/json")
                    connection.setRequestProperty("Accept", "application/json")
                    connection.setRequestProperty("Cache-Control", "no-store")
                    connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
                    status = connection.responseCode
                    setCookie = connection.getHeaderField("Set-Cookie")
                    val stream = if (status in 200..299) connection.inputStream else connection.errorStream
                    val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: "{}"
                    response = JSONObject(text)
                } finally { connection.disconnect() }
            } catch (_: Exception) {
                status = 0
                response = JSONObject().put("error", "NETWORK_UNAVAILABLE")
            }
            val finalStatus = status
            val finalBody = response
            val finalCookie = setCookie
            main.post { callback(finalStatus, finalBody, finalCookie) }
        }
    }

    fun close() { executor.shutdown() }
}
