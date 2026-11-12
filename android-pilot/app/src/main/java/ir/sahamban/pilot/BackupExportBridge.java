package ir.sahamban.pilot;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebView;

import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

/**
 * Test-only, origin-scoped WebView message listener for explicit JSON backup exports.
 * Uses Android's Storage Access Framework. Never exposes a generic JavaScript interface
 * or unrestricted filesystem access. Does not log, persist or upload user backup bytes.
 */
public final class BackupExportBridge {
    public static final int CREATE_FILE = 3041;
    public static final String JS_OBJECT = "SahambanBackupExport";
    private static final String PROTOCOL = "sahamban-backup-export-v1";
    private final Activity activity;
    private final WebView webView;
    private Pending pending;

    private static final class Pending {
        final String requestId;
        final byte[] bytes;
        final JavaScriptReplyProxy reply;
        Pending(String requestId, byte[] bytes, JavaScriptReplyProxy reply) {
            this.requestId = requestId;
            this.bytes = bytes;
            this.reply = reply;
        }
    }

    public BackupExportBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    public boolean install() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return false;
        WebViewCompat.addWebMessageListener(
            webView, JS_OBJECT,
            Collections.singleton("https://raminhashemi1.github.io"),
            (view, message, sourceOrigin, isMainFrame, replyProxy) ->
                onMessage(view, message, sourceOrigin, isMainFrame, replyProxy)
        );
        return true;
    }

    private void onMessage(WebView view, WebMessageCompat message, Uri sourceOrigin,
                           boolean isMainFrame, JavaScriptReplyProxy replyProxy) {
        // Reject cross-origin subframes, wrong paths and non-string/oversized messages.
        if (view != webView || !BackupExportPolicy.acceptsSource(
                sourceOrigin.toString(), isMainFrame, view.getUrl())) {
            reply(replyProxy, "", "rejected");
            return;
        }
        if (message.getType() != WebMessageCompat.TYPE_STRING) {
            reply(replyProxy, "", "rejected");
            return;
        }
        String raw = message.getData();
        if (raw == null || raw.length() > BackupExportPolicy.MAX_MESSAGE_CHARS) {
            reply(replyProxy, "", "rejected");
            return;
        }
        String id = "";
        try {
            JSONObject request = new JSONObject(raw);
            id = request.optString("requestId", "");
            if (!id.matches("[A-Za-z0-9_-]{1,80}")
                    || !PROTOCOL.equals(request.optString("protocol"))
                    || pending != null) {
                reply(replyProxy, id, "rejected");
                return;
            }
            String name = request.optString("name", "");
            String content = request.optString("content", "");
            if (!BackupExportPolicy.acceptsContents(name, content)) {
                reply(replyProxy, id, "rejected");
                return;
            }
            JSONObject document = new JSONObject(content);
            if (BackupExportPolicy.LOCAL_NAME.equals(name)) {
                if (!"sahamban-local-backup".equals(document.optString("format"))
                        || document.optInt("schema") != 1
                        || !(document.opt("items") instanceof JSONObject)) {
                    reply(replyProxy, id, "rejected");
                    return;
                }
            } else if (!"sahamban-portfolio".equals(document.optString("format"))
                    || document.optInt("version") != 2
                    || !document.has("data")
                    || !(document.opt("data") instanceof String)) {
                reply(replyProxy, id, "rejected");
                return;
            }

            pending = new Pending(id, content.getBytes(StandardCharsets.UTF_8), replyProxy);
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");
            intent.putExtra(Intent.EXTRA_TITLE, name);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                    | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            try {
                activity.startActivityForResult(intent, CREATE_FILE);
            } catch (ActivityNotFoundException | SecurityException error) {
                Pending previous = pending;
                pending = null;
                reply(previous.reply, previous.requestId, "failed");
            }
        } catch (JSONException error) {
            reply(replyProxy, id, "rejected");
        }
    }

    public boolean onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != CREATE_FILE) return false;
        Pending work = pending;
        pending = null;
        if (work == null) return true;
        if (resultCode != Activity.RESULT_OK) {
            reply(work.reply, work.requestId, "cancelled");
            return true;
        }
        Uri destination = data == null ? null : data.getData();
        if (destination == null || !"content".equals(destination.getScheme())
                || !TrustedNavigation.isInternal(webView.getUrl())) {
            reply(work.reply, work.requestId, "failed");
            return true;
        }
        try (OutputStream output = activity.getContentResolver().openOutputStream(destination, "wt")) {
            if (output == null) throw new java.io.IOException("Output stream unavailable");
            output.write(work.bytes);
            output.flush();
        } catch (Exception error) {
            // Do not log or reflect file bytes, filenames or sensitive file metadata.
            reply(work.reply, work.requestId, "failed");
            return true;
        }
        // A successful write is not enough: some SAF providers may keep old
        // trailing bytes, silently truncate or fail on close. Read the exact
        // selected document back before acknowledging this backup.
        try (InputStream input = activity.getContentResolver().openInputStream(destination)) {
            if (!BackupFileVerifier.matches(input, work.bytes)) {
                reply(work.reply, work.requestId, "failed");
                return true;
            }
        } catch (Exception error) {
            // Missing read permissions, provider errors or mismatched bytes all fail closed.
            reply(work.reply, work.requestId, "failed");
            return true;
        }
        // Still not a guarantee of long-term storage or an actual user restore.
        reply(work.reply, work.requestId, "saved");
        return true;
    }

    public void discard() {
        pending = null;
    }

    private static void reply(JavaScriptReplyProxy proxy, String id, String status) {
        try {
            JSONObject value = new JSONObject();
            value.put("protocol", "sahamban-backup-result-v1");
            value.put("requestId", id);
            value.put("status", status);
            proxy.postMessage(value.toString());
        } catch (Exception ignored) {
            // Navigation may have already destroyed the original JavaScript context.
        }
    }
}
