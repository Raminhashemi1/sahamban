package ir.sahamban.pilot;

import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Authenticated order preparation only. Never starts billing, forwards session
 * cookies to a different host, or grants an entitlement. Disabled until the
 * HTTPS Worker base URL is explicitly configured and the WebView OTP session
 * is available in the shared Android CookieManager.
 */
public final class SahminoPrepaidOrderClient implements AutoCloseable {
    public interface Callback {
        void onPrepared(String orderId);
        void onFailure(String reason);
    }
    private static final String PWA_ORIGIN = "https://raminhashemi1.github.io";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private final String baseUrl;

    public SahminoPrepaidOrderClient(String configuredWorkerBaseUrl) {
        // No fallback endpoint: a missing/unsafe configuration fails closed.
        if (configuredWorkerBaseUrl == null || !configuredWorkerBaseUrl.matches(
                "^https://[A-Za-z0-9.-]+(?::443)?/?$")) {
            baseUrl = null;
        } else {
            baseUrl = configuredWorkerBaseUrl.endsWith("/")
                    ? configuredWorkerBaseUrl.substring(0, configuredWorkerBaseUrl.length() - 1)
                    : configuredWorkerBaseUrl;
        }
    }

    public boolean isConfigured() { return baseUrl != null; }

    public void prepare(String planId, Callback callback) {
        if (callback == null) throw new IllegalArgumentException("callback required");
        if (!isConfigured() || SahminoBillingCatalog.byPlanId(planId) == null) {
            main.post(() -> callback.onFailure("ORDER_CLIENT_NOT_CONFIGURED"));
            return;
        }
        executor.execute(() -> {
            String error = "ORDER_UNAVAILABLE";
            HttpURLConnection connection = null;
            try {
                URL url = new URL(baseUrl + "/api/v1/me/prepaid-orders");
                // Cookies belong to the Worker origin, never the PWA origin.
                String cookie = CookieManager.getInstance().getCookie(baseUrl);
                if (cookie == null || !cookie.matches(".*(?:^|;\\s*)sahmino_session=[a-f0-9]{64}(?:;|$).*")) {
                    error = "NOT_AUTHENTICATED";
                } else {
                    connection = (HttpURLConnection) url.openConnection();
                    connection.setInstanceFollowRedirects(false);
                    connection.setConnectTimeout(10000);
                    connection.setReadTimeout(10000);
                    connection.setRequestMethod("POST");
                    connection.setRequestProperty("Origin", PWA_ORIGIN);
                    connection.setRequestProperty("Cookie", cookie);
                    connection.setRequestProperty("X-Sahmino-CSRF", "1");
                    connection.setRequestProperty("Content-Type", "application/json");
                    connection.setRequestProperty("Accept", "application/json");
                    connection.setDoOutput(true);
                    byte[] body = new JSONObject().put("planId", planId).toString()
                            .getBytes(StandardCharsets.UTF_8);
                    try (OutputStream out = connection.getOutputStream()) { out.write(body); }
                    int status = connection.getResponseCode();
                    if (status == 201) {
                        try (InputStream in = connection.getInputStream()) {
                            byte[] bytes = in.readNBytes(8192);
                            JSONObject response = new JSONObject(new String(bytes, StandardCharsets.UTF_8));
                            JSONObject order = response.optJSONObject("order");
                            String id = order == null ? "" : order.optString("id", "");
                            if ("PENDING_ORDER_CREATED".equals(response.optString("reason"))
                                    && id.matches("^ord_[a-f0-9]{32}$")
                                    && planId.equals(order.optString("planId"))
                                    && order.optLong("amountRial", -1)
                                       == SahminoBillingCatalog.byPlanId(planId).priceRial
                                    && "IRR".equals(order.optString("currency"))) {
                                final String validId = id;
                                main.post(() -> callback.onPrepared(validId));
                                return;
                            }
                            error = "INVALID_SERVER_ORDER";
                        }
                    } else if (status == 401 || status == 403) {
                        error = "NOT_AUTHENTICATED";
                    }
                }
            } catch (Exception ignored) {
                error = "ORDER_UNAVAILABLE";
            } finally {
                if (connection != null) connection.disconnect();
            }
            final String failure = error;
            main.post(() -> callback.onFailure(failure));
        });
    }

    @Override public void close() { executor.shutdownNow(); }
}
