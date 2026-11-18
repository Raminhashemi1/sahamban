package ir.sahamban.pilot;

import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Authenticated order preparation and receipt submission only.
 * The Worker is the sole authority that settles a payment or grants Pro.
 */
public final class SahminoPrepaidOrderClient implements AutoCloseable {
    public interface Callback {
        void onPrepared(String orderId);
        void onFailure(String reason);
    }
    public interface VerifyCallback {
        void onVerified(String paidUntil);
        void onFailure(String reason);
    }
    private static final String PWA_ORIGIN = "https://raminhashemi1.github.io";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private final String baseUrl;

    public SahminoPrepaidOrderClient(String configuredWorkerBaseUrl) {
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

    private String sessionCookie() {
        String cookie = CookieManager.getInstance().getCookie(baseUrl);
        if (cookie == null || !cookie.matches(".*(?:^|;\\s*)sahmino_session=[a-f0-9]{64}(?:;|$).*"))
            return null;
        return cookie;
    }

    private HttpURLConnection openPost(String path, String cookie) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(baseUrl + path).openConnection();
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
        return connection;
    }

    private static byte[] readBounded(InputStream in, int maxBytes) throws Exception {
        try (InputStream input = in; ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
            byte[] chunk = new byte[1024];
            int n;
            while ((n = input.read(chunk)) != -1) {
                if (buffer.size() + n > maxBytes) throw new IllegalStateException("RESPONSE_TOO_LARGE");
                buffer.write(chunk, 0, n);
            }
            return buffer.toByteArray();
        }
    }

    public void prepare(String planId, Callback callback) { prepare(planId, false, callback); }

    public void prepare(String planId, boolean autoRenew, Callback callback) {
        if (callback == null) throw new IllegalArgumentException("callback required");
        if (!isConfigured() || SahminoBillingCatalog.byPlanId(planId) == null) {
            main.post(() -> callback.onFailure("ORDER_CLIENT_NOT_CONFIGURED"));
            return;
        }
        executor.execute(() -> {
            String error = "ORDER_UNAVAILABLE";
            HttpURLConnection connection = null;
            try {
                String cookie = sessionCookie();
                if (cookie == null) {
                    error = "NOT_AUTHENTICATED";
                } else {
                    connection = openPost("/api/v1/me/prepaid-orders", cookie);
                    JSONObject requestBody = new JSONObject().put("planId", planId)
                            .put("renewalMode", autoRenew ? "AUTO" : "MANUAL");
                    if (autoRenew) requestBody.put("consentVersion", "sahmino-auto-renew-v1");
                    byte[] body = requestBody.toString()
                            .getBytes(StandardCharsets.UTF_8);
                    try (OutputStream out = connection.getOutputStream()) { out.write(body); }
                    int status = connection.getResponseCode();
                    if (status == 201) {
                        JSONObject response = new JSONObject(new String(
                                readBounded(connection.getInputStream(), 8192), StandardCharsets.UTF_8));
                        JSONObject order = response.optJSONObject("order");
                        String id = order == null ? "" : order.optString("id", "");
                        if ("PENDING_ORDER_CREATED".equals(response.optString("reason"))
                                && id.matches("^ord_[a-f0-9]{32}$")
                                && planId.equals(order.optString("planId"))
                                && order.optLong("amountRial", -1)
                                   == SahminoBillingCatalog.byPlanId(planId).priceRial
                                && "IRR".equals(order.optString("currency"))
                                && (autoRenew ? "AUTO" : "MANUAL").equals(order.optString("renewalMode"))
                                && (autoRenew ? "sahmino-auto-renew-v1".equals(order.optString("consentVersion"))
                                              : order.isNull("consentVersion")))) {
                            final String validId = id;
                            main.post(() -> callback.onPrepared(validId));
                            return;
                        }
                        error = "INVALID_SERVER_ORDER";
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

    /** Restores access from the authenticated server entitlement, never from local store inventory. */
    public void refreshEntitlement(VerifyCallback callback) {
        if (callback == null) throw new IllegalArgumentException("callback required");
        if (!isConfigured()) {
            main.post(() -> callback.onFailure("ORDER_CLIENT_NOT_CONFIGURED"));
            return;
        }
        executor.execute(() -> {
            String error = "ENTITLEMENT_UNAVAILABLE";
            HttpURLConnection connection = null;
            try {
                String cookie = sessionCookie();
                if (cookie == null) {
                    error = "NOT_AUTHENTICATED";
                } else {
                    connection = (HttpURLConnection) new URL(baseUrl + "/api/v1/me/prepaid-overview").openConnection();
                    connection.setInstanceFollowRedirects(false);
                    connection.setConnectTimeout(10000);
                    connection.setReadTimeout(10000);
                    connection.setRequestMethod("GET");
                    connection.setRequestProperty("Origin", PWA_ORIGIN);
                    connection.setRequestProperty("Cookie", cookie);
                    connection.setRequestProperty("Accept", "application/json");
                    int status = connection.getResponseCode();
                    if (status == 200) {
                        JSONObject response = new JSONObject(new String(
                                readBounded(connection.getInputStream(), 16384), StandardCharsets.UTF_8));
                        String paidUntil = response.optString("paidUntil", "");
                        if (response.optBoolean("proEnabled", false)
                                && paidUntil.matches("^\\\\d{4}-\\\\d{2}-\\\\d{2}T\\\\d{2}:\\\\d{2}:\\\\d{2}(?:\\\\.\\\\d{1,3})?Z$")) {
                            main.post(() -> callback.onVerified(paidUntil));
                            return;
                        }
                        error = "NO_ACTIVE_ENTITLEMENT";
                    } else if (status == 401 || status == 403) {
                        error = "NOT_AUTHENTICATED";
                    }
                }
            } catch (Exception ignored) {
                error = "ENTITLEMENT_UNAVAILABLE";
            } finally {
                if (connection != null) connection.disconnect();
            }
            final String failure = error;
            main.post(() -> callback.onFailure(failure));
        });
    }

    /** Sends raw Bazaar evidence; only a verified SETTLED response confirms Pro. */
    public void verifyPurchase(SahminoPurchaseEvidence evidence, VerifyCallback callback) {
        if (callback == null) throw new IllegalArgumentException("callback required");
        SahminoBillingCatalog.Plan plan = evidence == null ? null
                : SahminoBillingCatalog.byProductId(evidence.productId);
        if (!isConfigured() || evidence == null || plan == null
                || evidence.purchaseState != 0
                || evidence.payload == null || !evidence.payload.matches("^ord_[a-f0-9]{32}$")) {
            main.post(() -> callback.onFailure("INVALID_PURCHASE_EVIDENCE"));
            return;
        }
        executor.execute(() -> {
            String error = "RECEIPT_VERIFICATION_UNAVAILABLE";
            HttpURLConnection connection = null;
            try {
                String cookie = sessionCookie();
                if (cookie == null) {
                    error = "NOT_AUTHENTICATED";
                } else {
                    connection = openPost("/api/v1/me/prepaid-orders/verify", cookie);
                    JSONObject body = new JSONObject()
                            .put("serverOrderId", evidence.payload)
                            .put("orderId", evidence.orderId)
                            .put("purchaseToken", evidence.purchaseToken)
                            .put("payload", evidence.payload)
                            .put("packageName", evidence.packageName)
                            .put("productId", evidence.productId)
                            .put("purchaseTime", evidence.purchaseTime)
                            .put("purchaseState", evidence.purchaseState)
                            .put("originalJson", evidence.originalJson)
                            .put("dataSignature", evidence.dataSignature);
                    try (OutputStream out = connection.getOutputStream()) {
                        out.write(body.toString().getBytes(StandardCharsets.UTF_8));
                    }
                    int status = connection.getResponseCode();
                    if (status == 200) {
                        JSONObject response = new JSONObject(new String(
                                readBounded(connection.getInputStream(), 8192), StandardCharsets.UTF_8));
                        String paidUntil = response.optString("paidUntil", "");
                        if ("SETTLED".equals(response.optString("status"))
                                && response.optBoolean("proEnabled", false)
                                && response.has("autoRenew")
                                && evidence.payload.equals(response.optString("orderId"))
                                && plan.planId.equals(response.optString("planId"))
                                && paidUntil.matches("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$")) {
                            final String confirmedUntil = paidUntil;
                            main.post(() -> callback.onVerified(confirmedUntil));
                            return;
                        }
                        error = "INVALID_SETTLEMENT_RESPONSE";
                    } else if (status == 401 || status == 403) {
                        error = "NOT_AUTHENTICATED";
                    } else if (status == 409) {
                        error = "SUBSCRIPTION_POLICY_OR_ORDER_CONFLICT";
                    } else if (status == 422) {
                        error = "RECEIPT_REJECTED";
                    }
                }
            } catch (Exception ignored) {
                error = "RECEIPT_VERIFICATION_UNAVAILABLE";
            } finally {
                if (connection != null) connection.disconnect();
            }
            final String failure = error;
            main.post(() -> callback.onFailure(failure));
        });
    }

    @Override public void close() { executor.shutdownNow(); }
}
