package ir.sahamban.pilot;

import androidx.activity.ComponentActivity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

/** Test-only host with native username/password sign-in and a credential-isolated HTTPS PWA WebView. */
public final class MainActivity extends ComponentActivity {
    private static final String START_URL = "https://raminhashemi1.github.io/sahamban/";
    private static final int PICK_FILE = 3040;
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private BillingV2NativeAuthClient authClient;
    private BillingV2SubscriptionHost subscriptionHost;
    private boolean showingSubscription;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        CookieManager.getInstance().setAcceptCookie(true);
        String worker = BuildConfig.SAHAMBAN_WORKER_BASE_URL;
        if (worker == null || worker.trim().isEmpty()) {
            showMessage("ورود امن هنوز پیکربندی نشده است. آدرس HTTPS مربوط به Worker را در ساخت اندروید تنظیم کنید.", false);
            return;
        }
        try {
            authClient = new BillingV2NativeAuthClient(worker);
        } catch (IllegalArgumentException error) {
            showMessage("پیکربندی آدرس سرویس ورود معتبر نیست.", false);
            return;
        }
        checkSession();
    }

    private void checkSession() {
        showMessage("در حال بررسی نشست امن حساب…", false);
        authClient.checkSession(result -> {
            if (result instanceof BillingV2NativeAuthClient.Result.Success) {
                Boolean active = (Boolean) ((BillingV2NativeOtpClient.Result.Success<?>) result).getValue();
                if (Boolean.TRUE.equals(active)) showWebApp();
                else showLogin();
            } else {
                showMessage("بررسی نشست انجام نشد. اتصال اینترنت و سرویس ورود را بررسی کنید.", true);
            }
        });
    }

    private void showLogin() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        setContentView(new BillingV2PasswordLoginView(this, authClient, this::showWebApp));
    }

    private void showWebApp() {
        showingSubscription = false;
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);

        Button subscriptions = new Button(this);
        subscriptions.setText("اشتراک سهمینو");
        subscriptions.setAllCaps(false);
        subscriptions.setOnClickListener(v -> showSubscription());
        root.addView(subscriptions, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        Button logout = new Button(this);
        logout.setText("خروج از حساب");
        logout.setAllCaps(false);
        logout.setOnClickListener(v -> new AlertDialog.Builder(this)
            .setTitle("خروج از حساب")
            .setMessage("از حساب سهمینو خارج می‌شوید؟")
            .setNegativeButton("انصراف", null)
            .setPositiveButton("خروج", (dialog, which) -> performLogout(logout))
            .show());
        root.addView(logout, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        // Preserve the existing WebView instance when returning from the native subscription screen.
        // Reloading the PWA here would discard unsaved in-memory user work.
        boolean loadPwa = webView == null;
        webView = loadPwa ? new WebView(this) : webView;
        if (webView.getParent() instanceof ViewGroup) {
            ((ViewGroup) webView.getParent()).removeView(webView);
        }
        root.addView(webView, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri target = request.getUrl();
                if (TrustedNavigation.isInternal(target.toString())) return false;
                if ("https".equalsIgnoreCase(target.getScheme())) {
                    Intent browser = new Intent(Intent.ACTION_VIEW, target);
                    browser.addCategory(Intent.CATEGORY_BROWSABLE);
                    try { startActivity(browser); }
                    catch (ActivityNotFoundException ignored) { }
                }
                return true;
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
                picker.setType("*/*");
                try { startActivityForResult(picker, PICK_FILE); }
                catch (ActivityNotFoundException ignored) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                }
                return true;
            }
        });
        if (loadPwa) webView.loadUrl(START_URL);
    }

    private void showSubscription() {
        if (subscriptionHost == null) {
            subscriptionHost = new BillingV2SubscriptionHost(this, BuildConfig.SAHAMBAN_WORKER_BASE_URL);
        }
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);

        Button back = new Button(this);
        back.setText("بازگشت به سهمینو");
        back.setAllCaps(false);
        back.setOnClickListener(v -> showWebApp());
        root.addView(back, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        if (webView != null && webView.getParent() instanceof ViewGroup) {
            ((ViewGroup) webView.getParent()).removeView(webView);
        }
        View subscription = subscriptionHost.createView();
        root.addView(subscription, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
        showingSubscription = true;
        setContentView(root);
    }

    private void performLogout(Button button) {
        button.setEnabled(false);
        authClient.logout(result -> {
            if (result instanceof BillingV2NativeOtpClient.Result.Success) showLogin();
            else {
                button.setEnabled(true);
                Toast.makeText(this, "خروج از حساب انجام نشد؛ دوباره تلاش کنید.", Toast.LENGTH_LONG).show();
            }
        });
    }

    private void showMessage(String message, boolean retry) {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(32, 32, 32, 32);
        TextView text = new TextView(this);
        text.setText(message);
        text.setTextSize(16);
        text.setGravity(Gravity.CENTER);
        panel.addView(text, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        if (retry) {
            Button button = new Button(this);
            button.setText("تلاش دوباره");
            button.setOnClickListener(v -> checkSession());
            panel.addView(button);
        }
        setContentView(panel);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_FILE || fileCallback == null) return;
        Uri[] selected = null;
        if (resultCode == RESULT_OK && data != null) {
            ClipData clips = data.getClipData();
            if (clips != null && clips.getItemCount() > 0 && clips.getItemCount() <= 10) {
                selected = new Uri[clips.getItemCount()];
                for (int i = 0; i < clips.getItemCount(); i++) selected[i] = clips.getItemAt(i).getUri();
            } else if (data.getData() != null) selected = new Uri[]{data.getData()};
        }
        fileCallback.onReceiveValue(selected);
        fileCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (showingSubscription) { showWebApp(); return; }
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (fileCallback != null) {
            fileCallback.onReceiveValue(null);
            fileCallback = null;
        }
        if (webView != null) webView.destroy();
        if (authClient != null) authClient.close();
        if (subscriptionHost != null) subscriptionHost.close();
        super.onDestroy();
    }
}
