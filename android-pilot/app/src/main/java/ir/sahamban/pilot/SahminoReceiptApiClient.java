package ir.sahamban.pilot;

import android.content.Context;
import android.webkit.CookieManager;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** Authenticated native client for the private Sahmino Worker receipt API. */
public final class SahminoReceiptApiClient {
    private SahminoReceiptApiClient() { }

    public static String createOrder(Context context, String planId) throws IOException {
        JSONObject pending = request(context, "GET", "/api/v1/me/prepaid-orders", null);
        if (pending.optBoolean("pending", false)) {
            JSONObject order = pending.optJSONObject("order");
            if (order == null || !planId.equals(order.optString("planId"))) {
                throw new IOException("یک سفارش معلق دیگر برای این حساب وجود دارد.");
            }
            return checkedOrderId(order.optString("id"));
        }
        JSONObject body = new JSONObject();
        try { body.put("planId", planId); }
        catch (org.json.JSONException ex) { throw new IOException("درخواست سفارش نامعتبر است.", ex); }
        JSONObject created = request(context, "POST", "/api/v1/me/prepaid-orders", body);
        if (created.optInt("status") != 201) throw new IOException("ساخت سفارش در سرور تأیید نشد.");
        JSONObject order = created.optJSONObject("order");
        if (order == null || !planId.equals(order.optString("planId"))) {
            throw new IOException("پاسخ سفارش سرور معتبر نیست.");
        }
        return checkedOrderId(order.optString("id"));
    }

    public static boolean submitMyketReceipt(Context context, String orderId,
            String developerPayload, String originalJson, String signature) throws IOException {
        if (originalJson == null || originalJson.isEmpty() || originalJson.length() > 16384
                || signature == null || signature.isEmpty() || signature.length() > 8192
                || !orderId.equals(developerPayload)) {
            throw new IOException("رسید مایکت به سفارش سرور متصل نیست.");
        }
        JSONObject body = new JSONObject();
        try {
            body.put("provider", "MYKET");
            body.put("orderId", checkedOrderId(orderId));
            body.put("originalJson", originalJson);
            body.put("signature", signature);
        } catch (org.json.JSONException ex) { throw new IOException("رسید مایکت نامعتبر است.", ex); }
        JSONObject result = request(context, "POST", "/api/v1/me/prepaid-receipts", body);
        return "SETTLED".equals(result.optString("status"));
    }

    public static boolean submitBazaarReceipt(Context context, String orderId,
            String purchaseToken) throws IOException {
        if (purchaseToken == null || purchaseToken.trim().isEmpty() || purchaseToken.length() > 4096) {
            throw new IOException("توکن خرید بازار معتبر نیست.");
        }
        JSONObject body = new JSONObject();
        try {
            body.put("provider", "CAFEBAZAAR");
            body.put("orderId", checkedOrderId(orderId));
            body.put("purchaseToken", purchaseToken);
        } catch (org.json.JSONException ex) { throw new IOException("رسید بازار نامعتبر است.", ex); }
        JSONObject result = request(context, "POST", "/api/v1/me/prepaid-receipts", body);
        return "SETTLED".equals(result.optString("status"));
    }

    private static String checkedOrderId(String id) throws IOException {
        if (id == null || !id.matches("ord_[a-f0-9]{32}")) throw new IOException("شناسه سفارش سرور نامعتبر است.");
        return id;
    }

    private static JSONObject request(Context context, String method, String path, JSONObject body)
            throws IOException {
        String base = BuildConfig.API_BASE_URL == null ? "" : BuildConfig.API_BASE_URL.trim();
        if (!base.matches("https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?")) {
            throw new IOException("نشانی امن API سهمینو تنظیم نشده است.");
        }
        String cookie = CookieManager.getInstance().getCookie(base);
        if (cookie == null || !cookie.matches("(?s).*\\bsahmino_session=[a-f0-9]{64}\\b.*")) {
            throw new IOException("نشست معتبر سهمینو در دسترس نیست؛ ابتدا وارد حساب شوید.");
        }
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(base + path).openConnection();
            connection.setRequestMethod(method);
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(15000);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Origin", BuildConfig.PWA_ORIGIN);
            connection.setRequestProperty("Cookie", cookie);
            connection.setRequestProperty("X-Sahmino-CSRF", "1");
            if (body != null) {
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
                if (bytes.length > 32768) throw new IOException("رسید بزرگ‌تر از حد مجاز است.");
                try (OutputStream out = connection.getOutputStream()) { out.write(bytes); }
            }
            int status = connection.getResponseCode();
            InputStream stream = status >= 200 && status < 400
                    ? connection.getInputStream() : connection.getErrorStream();
            if (stream == null) throw new IOException("پاسخ سرور خالی است.");
            byte[] bytes = readLimited(stream, 32768);
            JSONObject response = new JSONObject(new String(bytes, StandardCharsets.UTF_8));
            if (status < 200 || status >= 300) {
                String reason = response.optString("error", "SERVER_REJECTED");
                throw new IOException("سرور پرداخت را نپذیرفت: " + reason);
            }
            return response;
        } catch (org.json.JSONException ex) {
            throw new IOException("پاسخ JSON سرور معتبر نیست.", ex);
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static byte[] readLimited(InputStream in, int max) throws IOException {
        try (InputStream stream = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[2048];
            int count, total = 0;
            while ((count = stream.read(buffer)) != -1) {
                total += count;
                if (total > max) throw new IOException("پاسخ سرور بیش از حد بزرگ است.");
                out.write(buffer, 0, count);
            }
            return out.toByteArray();
        }
    }
}
