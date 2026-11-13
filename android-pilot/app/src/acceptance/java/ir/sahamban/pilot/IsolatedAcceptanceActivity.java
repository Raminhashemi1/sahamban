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
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;

import androidx.webkit.ServiceWorkerClientCompat;
import androidx.webkit.ServiceWorkerControllerCompat;
import androidx.webkit.WebViewFeature;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import org.json.JSONObject;

/**
 * Acceptance BUILD TYPE ONLY: the full pinned PWA runs inside this package's
 * separate WebView storage. No public Pages request or remote fallback is allowed.
 *
 * The HTTPS base/history URL is deliberately the exact origin checked by the
 * unchanged native WebMessage export policy. This activity cannot be packaged
 * by the normal debug or release build types.
 */
public final class IsolatedAcceptanceActivity extends Activity {
    private static final String TRUSTED = "https://raminhashemi1.github.io/sahamban/";
    private static final String PREFIX = "/sahamban/";
    private static final int PICK_SYNTHETIC_JSON = 3140;
    private WebView view;
    private BackupExportBridge exporter;
    private ValueCallback<Uri[]> fileCallback;

    private static WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked",
                Collections.singletonMap("Cache-Control", "no-store"),
                new java.io.ByteArrayInputStream(new byte[0]));
    }

    private static String bundledName(Uri uri) {
        // Exact origin, path, and no encoded path tricks. Only top-level PWA assets
        // from the byte-pinned Gradle bundle can be read by this isolated WebView.
        if (uri == null || !"https".equalsIgnoreCase(uri.getScheme())
                || !"raminhashemi1.github.io".equalsIgnoreCase(uri.getHost())
                || uri.getPort() != -1 || uri.getUserInfo() != null
                || uri.getFragment() != null) return null;
        String raw = uri.getEncodedPath();
        if (raw == null || !raw.startsWith(PREFIX)) return null;
        String name = raw.substring(PREFIX.length());
        if (name.isEmpty()) return "index.html";
        if (!name.matches("[A-Za-z0-9][A-Za-z0-9._-]{0,127}")
                || name.contains("..") || name.equals("sw.js")) return null;
        return name;
    }

    private WebResourceResponse localResource(Uri uri) {
        String name = bundledName(uri);
        if (name == null) return blocked();
        try {
            InputStream input = getAssets().open("pwa/" + name);
            String mime = name.endsWith(".js") ? "application/javascript" :
                    name.endsWith(".css") ? "text/css" :
                    name.endsWith(".html") ? "text/html" :
                    name.endsWith(".json") || name.endsWith(".webmanifest") ? "application/json" :
                    name.endsWith(".svg") ? "image/svg+xml" :
                    name.endsWith(".png") ? "image/png" :
                    name.endsWith(".mp3") ? "audio/mpeg" : "application/octet-stream";
            return new WebResourceResponse(mime, "UTF-8", 200, "OK",
                    Collections.singletonMap("Cache-Control", "no-store"), input);
        } catch (Exception ignored) {
            // Never fall back to public GitHub Pages if an asset is missing.
            return blocked();
        }
    }

    private boolean isSelectedSyntheticOnly(Uri uri) {
        // Read only the chosen SAF file, reject any real portfolio or unexpected
        // metadata BEFORE granting it to the PWA file input. No content is logged.
        try (InputStream input = getContentResolver().openInputStream(uri);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) return false;
            byte[] buffer = new byte[4096];
            int size;
            while ((size = input.read(buffer)) != -1) {
                if (output.size() + size > 256 * 1024) return false;
                output.write(buffer, 0, size);
            }
            return BackupExportBridge.isSyntheticLocalSnapshot(
                    new JSONObject(new String(output.toByteArray(), StandardCharsets.UTF_8)));
        } catch (Exception ignored) {
            return false;
        }
    }

    private void failure(String message) {
        TextView notice = new TextView(this);
        notice.setText(message);
        setContentView(notice);
    }

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        view = new WebView(this);
        setContentView(view);
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);  // Only this acceptance package's sandbox.
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // One user-picked SAF content:// document.
        settings.setBlockNetworkLoads(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setSafeBrowsingEnabled(true);
        settings.setUserAgentString(settings.getUserAgentString() + " SahambanPilotWebView/1");

        // Service workers are intentionally not assessed in this isolated harness.
        // The sw.js resource is denied, even when requested through this interceptor.
        // If SW interception is unsupported, network is still denied by WebSettings.
        if (WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_BASIC_USAGE)
                && WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_SHOULD_INTERCEPT_REQUEST)) {
            ServiceWorkerControllerCompat.getInstance().setServiceWorkerClient(
                    new ServiceWorkerClientCompat() {
                        @Override public WebResourceResponse shouldInterceptRequest(
                                WebResourceRequest request) {
                            return blocked();
                        }
                    });
        }
        view.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(
                    WebView webView, WebResourceRequest request) {
                return localResource(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(
                    WebView webView, WebResourceRequest request) {
                return bundledName(request.getUrl()) == null;
            }
            @Override public void onReceivedSslError(
                    WebView webView, SslErrorHandler handler, SslError error) {
                handler.cancel();
            }
            @Override public void onPageFinished(WebView webView, String url) {
                if (!TRUSTED.equals(url)) return;
                // A fabricated alert only; do not inspect/migrate Chrome or pilot data.
                webView.evaluateJavascript(
                        "localStorage.setItem('sahamban-v1'," +
                        "JSON.stringify({symbol:'نماد-ساختگی-آزمایش',aStop:'100',aTarget:'200'}));",
                        null);
            }
        });
        view.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView webView,
                    ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                picker.setType("application/json");
                picker.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try {
                    startActivityForResult(picker, PICK_SYNTHETIC_JSON);
                } catch (ActivityNotFoundException | SecurityException error) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                }
                return true;
            }
        });
        exporter = new BackupExportBridge(this, view, true);
        if (!exporter.install()) {
            failure("نسخه WebView برای آزمون امن خروجی بومی پشتیبانی نمی‌شود.");
            return;
        }
        try (InputStream input = getAssets().open("pwa/index.html");
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] data = new byte[8192];
            int n;
            while ((n = input.read(data)) != -1) output.write(data, 0, n);
            String html = new String(output.toByteArray(), StandardCharsets.UTF_8);
            view.loadDataWithBaseURL(TRUSTED, html, "text/html", "UTF-8", TRUSTED);
        } catch (Exception error) {
            failure("بسته محلی PWA در APK وجود ندارد. بارگذاری آنلاین ممنوع است.");
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (exporter != null && exporter.onActivityResult(requestCode, resultCode, data)) return;
        if (requestCode != PICK_SYNTHETIC_JSON || fileCallback == null) return;
        Uri[] accepted = null;
        if (resultCode == RESULT_OK && data != null &&
                (data.getFlags() & Intent.FLAG_GRANT_READ_URI_PERMISSION) != 0) {
            ClipData clips = data.getClipData();
            Uri selected = clips == null ? data.getData() :
                    clips.getItemCount() == 1 ? clips.getItemAt(0).getUri() : null;
            if (selected != null && BackupImportPolicy.acceptsContentUri(selected.toString())
                    && isSelectedSyntheticOnly(selected))
                accepted = new Uri[]{selected};
        }
        fileCallback.onReceiveValue(accepted);
        fileCallback = null;
    }

    @Override public void onBackPressed() {
        if (view != null && view.canGoBack()) view.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (exporter != null) exporter.discard();
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        if (view != null) view.destroy();
        super.onDestroy();
    }
}
