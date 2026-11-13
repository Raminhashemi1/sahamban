package ir.sahamban.pilot;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.ClipData;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.SslErrorHandler;
import android.net.http.SslError;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Debug-only, entirely local SAF acceptance screen. It never loads the public PWA,
 * reads localStorage, authenticates a user or accesses any private holdings.
 * loadDataWithBaseURL supplies the same HTTPS origin/path required by the production
 * WebMessage source policy, without deploying new files to public GitHub Pages.
 */
public final class BackupSelfTestActivity extends Activity {
    private static final String FIXTURE_URL =
            "https://raminhashemi1.github.io/sahamban/_pilot_backup_self_test.html";
    private static final int PICK_TEST_JSON = 3042;

    private WebView webView;
    private BackupExportBridge exporter;
    private ValueCallback<Uri[]> fileCallback;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(false); // No PWA data read, even by accident.
        settings.setAllowFileAccess(false);
        // Only this packaged, network-blocked DEBUG fixture may read a content://
        // URI explicitly selected by the user through ACTION_OPEN_DOCUMENT.
        // Without content access, WebView's <input type="file"> may be unable
        // to read the returned SAF document and report a false restore failure.
        settings.setAllowContentAccess(true);
        settings.setBlockNetworkLoads(true);  // Test HTML needs no remote resource.
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return true; // The isolated fixture never navigates to the real site.
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
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
                picker.setType("application/json");
                picker.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try {
                    startActivityForResult(picker, PICK_TEST_JSON);
                } catch (ActivityNotFoundException | SecurityException error) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                }
                return true;
            }
        });

        exporter = new BackupExportBridge(this, webView);
        exporter.install();
        try (InputStream input = getAssets().open("backup-self-test.html");
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] bytes = new byte[4096];
            int count;
            while ((count = input.read(bytes)) != -1) output.write(bytes, 0, count);
            String html = new String(output.toByteArray(), StandardCharsets.UTF_8);
            webView.loadDataWithBaseURL(FIXTURE_URL, html, "text/html", "UTF-8", null);
        } catch (Exception error) {
            // No fallback to a network page; the fixture must be bundled in this APK.
            android.widget.TextView notice = new android.widget.TextView(this);
            notice.setText("صفحه آزمون محلی در این APK موجود نیست. هیچ داده‌ای بارگذاری نشد.");
            setContentView(notice);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (exporter != null && exporter.onActivityResult(requestCode, resultCode, data)) return;
        if (requestCode != PICK_TEST_JSON || fileCallback == null) return;
        Uri[] selected = null;
        if (resultCode == RESULT_OK && data != null) {
            ClipData clips = data.getClipData();
            Uri chosen = null;
            if (clips != null && clips.getItemCount() == 1) {
                chosen = clips.getItemAt(0).getUri();
            } else if (clips == null) {
                chosen = data.getData();
            }
            // Never pass file:// or a multi-selection into the isolated WebView.
            if (chosen != null && "content".equals(chosen.getScheme())) {
                selected = new Uri[]{chosen};
            }
        }
        fileCallback.onReceiveValue(selected);
        fileCallback = null;
    }

    @Override
    protected void onDestroy() {
        if (exporter != null) exporter.discard();
        if (fileCallback != null) {
            fileCallback.onReceiveValue(null);
            fileCallback = null;
        }
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
