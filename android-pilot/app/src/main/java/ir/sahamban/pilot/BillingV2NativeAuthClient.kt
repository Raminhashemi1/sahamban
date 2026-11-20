package ir.sahamban.pilot

import android.os.Handler
import android.os.Looper
import android.webkit.CookieManager
import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection
import java.util.concurrent.Executors

/**
 * Native username/password transport. Credentials are sent only to the configured HTTPS
 * Worker and are never persisted, logged, placed in URLs, or exposed to WebView JavaScript.
 * The Worker issues an HttpOnly session cookie which is installed in WebView's native jar.
 */
class BillingV2NativeAuthClient @JvmOverloads constructor(
    private val workerBaseUrl: String,
    private val pwaOrigin: String = BuildConfig.SAHAMBAN_PWA_ORIGIN
) {
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

    fun login(username: String, password: String, callback: (Result<Boolean>) -> Unit) {
        if (username.length !in 3..128 || password.length !in 12..128) {
            callback(Result.Failure(400, "INVALID_CREDENTIALS"))
            return
        }
        postJson("/api/v1/auth/login",
            JSONObject().put("username", username).put("password", password)) { status, body, setCookie ->
            if (status != 200 || !body.optBoolean("authenticated")) {
                callback(Result.Failure(status, body.optString("error", "LOGIN_FAILED")))
                return@postJson
            }
            val cookie = setCookie?.takeIf {
                it.startsWith("sahmino_session=") && it.contains("; Path=/") &&
                    it.contains("; HttpOnly") && it.contains("; Secure") &&
                    it.contains("; SameSite=None")
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
                        if (accepted) {
                            manager.flush()
                            callback(Result.Success(true))
                        } else callback(Result.Failure(502, "SESSION_COOKIE_REJECTED"))
                    }
                } catch (_: Exception) {
                    callback(Result.Failure(502, "SESSION_COOKIE_STORE_FAILED"))
                }
            }
        }
    }

    /** Validate the persisted native session against the Worker on every cold start. */
    fun checkSession(callback: SessionCallback) {
        main.post {
            val cookie = readSessionCookie()
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
        val cookie = readSessionCookie()
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
                        callback.onResult(Result.Success(true))
                    }
                } else callback.onResult(Result.Failure(0, "LOGOUT_UNAVAILABLE"))
            }
        }
    }

    private fun readSessionCookie(): String? {
        val raw = try { CookieManager.getInstance().getCookie(workerBaseUrl) } catch (_: Exception) { null }
        return raw.orEmpty().split(';').map { it.trim() }
            .singleOrNull { it.startsWith("sahmino_session=") }
            ?.takeIf { it.matches(Regex("^sahmino_session=[a-f0-9]{64}$")) }
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
