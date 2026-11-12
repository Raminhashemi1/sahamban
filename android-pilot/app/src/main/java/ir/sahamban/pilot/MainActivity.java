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

/**
 * Test-only HTTPS WebView shell for the existing public PWA.
 * No JavaScript bridge, injected identity, payment integration or browser data import.
 */
public final class MainActivity extends Activity {
    private static final String START_URL = "https://raminhashemi1.github.io/sahamban/";
    private static final int PICK_FILE = 3040;
    private WebView webView;
    private BackupExportBridge backupExport;
    private ValueCallback<Uri[]> fileCallback;

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
        // Explicit marker prevents unverified blob fallback on unsupported pilot WebViews.
        settings.setUserAgentString(settings.getUserAgentString() + " SahambanPilotWebView/1");
        backupExport = new BackupExportBridge(this, webView);
        backupExport.install();

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

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (backupExport != null && backupExport.onActivityResult(requestCode, resultCode, data)) return;
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
        if (backupExport != null) backupExport.discard();
        if (fileCallback != null) {
            fileCallback.onReceiveValue(null);
            fileCallback = null;
        }
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
