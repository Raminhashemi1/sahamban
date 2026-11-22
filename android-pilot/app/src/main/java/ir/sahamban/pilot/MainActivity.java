package ir.sahamban.pilot;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;

/**
 * HTTPS WebView shell for the public PWA.
 * Native file export is a narrowly scoped, main-frame-only WebMessageListener;
 * no general-purpose JavaScript interface or filesystem permission is exposed.
 */
public final class MainActivity extends Activity {
    private static final String START_URL = "https://raminhashemi1.github.io/sahamban/";
    private static final int PICK_FILE = 3040;
    private static final int CREATE_BACKUP_FILE = 3041;
    private static final int MAX_BACKUP_BYTES = 256 * 1024;
    private static final String BACKUP_FILENAME = "sahamban-local-backup-v1.json";
    private static final Set<String> BACKUP_KEYS = new HashSet<>(Arrays.asList(
        "sahamban-broker-holdings-v1",
        "sahamban-broker-holdings-v1-previous",
        "sahamban-portfolio-local-v1",
        "sahamban-v1",
        "sahamban-watchlist-v6"
    ));

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] pendingBackupBytes;
    private JavaScriptReplyProxy pendingBackupReply;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true); // Required by the existing PWA.
        settings.setDomStorageEnabled(true); // Separate from Chrome's local storage.
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);

        installBackupMessageListener();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri target = request.getUrl();
                if (TrustedNavigation.isInternal(target.toString())) return false;
                // Never execute intent:, javascript:, file:, data:, or cleartext links.
                if ("https".equalsIgnoreCase(target.getScheme())) {
                    Intent browser = new Intent(Intent.ACTION_VIEW, target);
                    browser.addCategory(Intent.CATEGORY_BROWSABLE);
                    try {
                        startActivity(browser);
                    } catch (ActivityNotFoundException ignored) {
                        // Deny navigation if no browser is installed.
                    }
                }
                return true;
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel(); // Never bypass invalid TLS certificates.
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                picker.setType("*/*"); // PWA validates imported file content itself.
                try {
                    startActivityForResult(picker, PICK_FILE);
                } catch (ActivityNotFoundException ignored) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                }
                return true;
            }
        });
        webView.loadUrl(START_URL);
    }

    private void installBackupMessageListener() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return;
        WebViewCompat.addWebMessageListener(
            webView,
            "sahambanNativeBackup",
            new HashSet<>(Arrays.asList("https://raminhashemi1.github.io")),
            (view, message, sourceOrigin, isMainFrame, replyProxy) -> {
                if (!isMainFrame || !isTrustedMainFrame(view, sourceOrigin)) {
                    replyProxy.postMessage("{\"type\":\"save-result\",\"status\":\"denied\"}");
                    return;
                }
                if (message.getType() != WebMessageCompat.TYPE_STRING) {
                    replyProxy.postMessage("{\"type\":\"save-result\",\"status\":\"invalid\"}");
                    return;
                }
                handleBackupExport(message.getData(), replyProxy);
            }
        );
    }

    private boolean isTrustedMainFrame(WebView view, Uri sourceOrigin) {
        if (!"https".equals(sourceOrigin.getScheme()) ||
            !"raminhashemi1.github.io".equals(sourceOrigin.getHost()) ||
            sourceOrigin.getPort() != -1) return false;
        Uri current = Uri.parse(view.getUrl() == null ? "" : view.getUrl());
        String path = current.getPath();
        return "https".equals(current.getScheme()) &&
            "raminhashemi1.github.io".equals(current.getHost()) &&
            current.getPort() == -1 &&
            path != null && path.startsWith("/sahamban/");
    }

    private void handleBackupExport(String raw, JavaScriptReplyProxy replyProxy) {
        if (pendingBackupBytes != null) {
            replyProxy.postMessage("{\"type\":\"save-result\",\"status\":\"busy\"}");
            return;
        }
        try {
            if (raw == null || raw.getBytes(StandardCharsets.UTF_8).length > MAX_BACKUP_BYTES) {
                throw new JSONException("BACKUP_TOO_LARGE");
            }
            JSONObject request = new JSONObject(raw);
            if (!"save-local-backup".equals(request.optString("type")) ||
                !BACKUP_FILENAME.equals(request.optString("filename")) ||
                !"application/json".equals(request.optString("mimeType"))) {
                throw new JSONException("INVALID_EXPORT_REQUEST");
            }
            String content = request.optString("content", "");
            byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
            if (bytes.length == 0 || bytes.length > MAX_BACKUP_BYTES) {
                throw new JSONException("BACKUP_TOO_LARGE");
            }
            validateBackupSnapshot(content);

            pendingBackupBytes = bytes;
            pendingBackupReply = replyProxy;
            Intent create = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            create.addCategory(Intent.CATEGORY_OPENABLE);
            create.setType("application/json");
            create.putExtra(Intent.EXTRA_TITLE, BACKUP_FILENAME);
            try {
                startActivityForResult(create, CREATE_BACKUP_FILE);
                replyProxy.postMessage("{\"type\":\"save-result\",\"status\":\"picker_opened\"}");
            } catch (ActivityNotFoundException error) {
                clearPendingBackup();
                replyProxy.postMessage("{\"type\":\"save-result\",\"status\":\"unavailable\"}");
            }
        } catch (JSONException error) {
            replyProxy.postMessage("{\"type\":\"save-result\",\"status\":\"invalid\"}");
        }
    }

    private void validateBackupSnapshot(String content) throws JSONException {
        JSONObject snapshot = new JSONObject(content);
        if (!"sahamban-local-backup".equals(snapshot.optString("format")) ||
            snapshot.optInt("schema", -1) != 1) {
            throw new JSONException("INVALID_BACKUP_SCHEMA");
        }
        JSONObject items = snapshot.optJSONObject("items");
        if (items == null || items.length() < 1 || items.length() > BACKUP_KEYS.size()) {
            throw new JSONException("INVALID_BACKUP_ITEMS");
        }
        Iterator<String> keys = items.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            Object value = items.get(key);
            if (!BACKUP_KEYS.contains(key) || !(value instanceof String) ||
                ((String) value).length() > MAX_BACKUP_BYTES) {
                throw new JSONException("INVALID_BACKUP_ITEM");
            }
        }
    }

    private void clearPendingBackup() {
        pendingBackupBytes = null;
        pendingBackupReply = null;
    }

    private void reportBackupResult(String status) {
        JavaScriptReplyProxy reply = pendingBackupReply;
        clearPendingBackup();
        if (reply != null) {
            reply.postMessage("{\"type\":\"save-result\",\"status\":\"" + status + "\"}");
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == CREATE_BACKUP_FILE) {
            if (resultCode != RESULT_OK || data == null || data.getData() == null) {
                reportBackupResult("cancelled");
                return;
            }
            Uri destination = data.getData();
            if (!"content".equals(destination.getScheme()) || pendingBackupBytes == null) {
                reportBackupResult("failed");
                return;
            }
            try (OutputStream output = getContentResolver().openOutputStream(destination, "w")) {
                if (output == null) throw new java.io.IOException("OUTPUT_STREAM_UNAVAILABLE");
                output.write(pendingBackupBytes);
                output.flush();
                reportBackupResult("saved");
            } catch (Exception error) {
                reportBackupResult("failed");
            }
            return;
        }

        if (requestCode != PICK_FILE || fileCallback == null) return;
        Uri[] selected = null;
        if (resultCode == RESULT_OK && data != null) {
            ClipData clips = data.getClipData();
            if (clips != null && clips.getItemCount() > 0 && clips.getItemCount() <= 10) {
                selected = new Uri[clips.getItemCount()];
                for (int i = 0; i < clips.getItemCount(); i++) {
                    selected[i] = clips.getItemAt(i).getUri();
                }
            } else if (data.getData() != null) {
                selected = new Uri[]{data.getData()};
            }
        }
        fileCallback.onReceiveValue(selected);
        fileCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (fileCallback != null) {
            fileCallback.onReceiveValue(null);
            fileCallback = null;
        }
        clearPendingBackup();
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
