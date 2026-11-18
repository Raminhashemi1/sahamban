package ir.sahamban.pilot;

import androidx.activity.ComponentActivity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Bazaar flow: server order -> Poolakey -> Bazaar REST verification -> consume. */
public final class SubscriptionPreviewActivity extends ComponentActivity {
    private static final int[] DAYS = {30, 60, 90, 180, 365};
    private static final long[] PRICES = {1500000L, 2850000L, 4050000L, 7650000L, 14600000L};
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private int selectedDays = DAYS[0];
    private TextView details;
    private LinearLayout planList;
    private Button paymentButton;
    private BazaarBillingManager billing;
    private String storeStatus = "اتصال فروشگاه هنوز بررسی نشده است.";
    private final boolean[] verifiedPrices = new boolean[DAYS.length];

    private TextView text(String value, float size, int color) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setGravity(Gravity.RIGHT);
        view.setPadding(16, 14, 16, 14);
        view.setTextDirection(View.TEXT_DIRECTION_RTL);
        return view;
    }

    private Button choice(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextSize(15f);
        button.setAllCaps(false);
        return button;
    }

    private String formatRial(long amount) {
        return NumberFormat.getIntegerInstance(new Locale("fa", "IR")).format(amount);
    }

    private int indexForDays(int days) {
        for (int i = 0; i < DAYS.length; i++) if (DAYS[i] == days) return i;
        throw new IllegalArgumentException("Unknown plan duration");
    }

    private void renderChoices() {
        planList.removeAllViews();
        for (int i = 0; i < DAYS.length; i++) {
            final int days = DAYS[i];
            Button option = choice((days == selectedDays ? "✓  " : "") + days + " روز — "
                + formatRial(PRICES[i]) + " ریال");
            option.setOnClickListener(v -> { selectedDays = days; renderChoices(); });
            planList.addView(option);
        }
        details.setText("دوره انتخابی: " + selectedDays + " روز — مبلغ نهایی: "
            + formatRial(PRICES[indexForDays(selectedDays)]) + " ریال\n"
            + "تمدید دستی حالت پیش‌فرض است؛ تمدید خودکار در این نسخه ارائه نمی‌شود.\n"
            + "کانال انتشار: کافه‌بازار\n" + storeStatus
            + "\nقیمت فروشگاه: " + (verifiedPrices[indexForDays(selectedDays)] ? "مطابقت دارد" : "هنوز تأیید نشده")
            + "\nآدرس API: " + (BuildConfig.API_BASE_URL != null && BuildConfig.API_BASE_URL.startsWith("https://") ? "تنظیم شده" : "تنظیم نشده")
            + "\nکلید عمومی بازار: " + (billing != null && billing.isConfigured() ? "تنظیم شده" : "تنظیم نشده")
            + "\nخرید فقط پس از تأیید قیمت فروشگاه و اتصال امن سرور فعال می‌شود.");
        if (paymentButton != null) {
            paymentButton.setEnabled(verifiedPrices[indexForDays(selectedDays)]
                && BuildConfig.API_BASE_URL != null && BuildConfig.API_BASE_URL.startsWith("https://")
                && billing != null && billing.isConfigured());
        }
    }

    private void beginPurchase() {
        SahminoBillingCatalog.Plan plan = SahminoBillingCatalog.byPlanId("SAHMINO_PRO_" + selectedDays + "D");
        if (plan == null || !verifiedPrices[indexForDays(selectedDays)]) {
            storeStatus = "قیمت واقعی محصول از بازار تأیید نشده است.";
            renderChoices();
            return;
        }
        paymentButton.setEnabled(false);
        storeStatus = "در حال ایجاد سفارش امن در حساب سهمینو…";
        renderChoices();
        io.execute(() -> {
            try {
                String orderId = SahminoReceiptApiClient.createOrder(this, plan.planId);
                runOnUiThread(() -> {
                    if (billing == null) return;
                    storeStatus = "سفارش سرور ساخته شد؛ در حال بازکردن خرید بازار…";
                    renderChoices();
                    billing.purchase(plan.planId, orderId);
                });
            } catch (Exception ex) {
                runOnUiThread(() -> {
                    storeStatus = ex.getMessage() == null ? "ساخت سفارش ناموفق بود." : ex.getMessage();
                    renderChoices();
                });
            }
        });
    }

    private void submitPurchase(SahminoBillingCatalog.Plan plan,
            ir.cafebazaar.poolakey.entity.PurchaseInfo purchase) {
        if (purchase == null || purchase.getPayload() == null) return;
        io.execute(() -> {
            try {
                boolean settled = SahminoReceiptApiClient.submitBazaarReceipt(
                    this, purchase.getPayload(), purchase.getPurchaseToken());
                if (!settled) throw new java.io.IOException("تسویه سمت سرور تأیید نشد.");
                runOnUiThread(() -> {
                    storeStatus = "اشتراک بازار توسط API رسمی فروشگاه تأیید و ثبت شد.";
                    renderChoices();
                    if (billing != null) // CafeBazaar subscriptions remain owned by the store; never consume them.
                });
            } catch (Exception ex) {
                runOnUiThread(() -> {
                    storeStatus = ex.getMessage() == null
                        ? "تأیید رسید انجام نشد؛ خرید مصرف نمی‌شود و برای بازیابی باقی می‌ماند."
                        : ex.getMessage();
                    renderChoices();
                });
            }
        });
    }

    @Override protected void onDestroy() {
        if (billing != null) billing.close();
        io.shutdownNow();
        super.onDestroy();
    }

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        setTitle("اشتراک سهمینو");
        ScrollView scroll = new ScrollView(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(24, 24, 24, 28);
        root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        root.setBackgroundColor(Color.rgb(247, 250, 253));
        root.addView(text("انتخاب اشتراک سهمینو", 24f, Color.rgb(12, 37, 64)));
        root.addView(text("پرداخت امن از طریق کافه‌بازار", 14f, Color.rgb(137, 63, 18)));
        root.addView(text("۱. مدت اشتراک را انتخاب کنید", 18f, Color.rgb(12, 37, 64)));
        planList = new LinearLayout(this);
        planList.setOrientation(LinearLayout.VERTICAL);
        root.addView(planList);
        details = text("", 15f, Color.rgb(12, 37, 64));
        root.addView(details);
        paymentButton = choice("خرید اشتراک از کافه‌بازار");
        paymentButton.setOnClickListener(v -> beginPurchase());
        root.addView(paymentButton);
        Button refresh = choice("بررسی قیمت و بازیابی خریدهای فروشگاه");
        refresh.setEnabled(true);
        refresh.setOnClickListener(v -> {
            if (billing == null) {
                storeStatus = "سرویس پرداخت هنوز آماده نشده است.";
                renderChoices();
            } else {
                billing.refreshInventory();
            }
        });
        root.addView(refresh);
        Button back = choice("بازگشت به سهمینو");
        back.setOnClickListener(v -> finish());
        root.addView(back);
        scroll.addView(root);
        setContentView(scroll);
        renderChoices();

        billing = new BazaarBillingManager(this, new BazaarBillingManager.Listener() {
            @Override public void onStatus(String message) {
                storeStatus = message;
                renderChoices();
            }
            @Override public void onCatalogPrice(SahminoBillingCatalog.Plan plan,
                    String price, boolean matches) {
                for (int i = 0; i < DAYS.length; i++) if (DAYS[i] == plan.days) verifiedPrices[i] = matches;
                renderChoices();
            }
            @Override public void onPurchaseSucceeded(SahminoBillingCatalog.Plan plan,
                    ir.cafebazaar.poolakey.entity.PurchaseInfo purchase) {
                storeStatus = "توکن خرید دریافت شد؛ در حال اعتبارسنجی نزد سرور بازار…";
                renderChoices();
                submitPurchase(plan, purchase);
            }
            @Override public void onOwnedPurchase(SahminoBillingCatalog.Plan plan,
                    ir.cafebazaar.poolakey.entity.PurchaseInfo purchase) {
                storeStatus = "خرید قبلی پیدا شد؛ در حال بازیابی و تأیید سمت سرور…";
                renderChoices();
                submitPurchase(plan, purchase);
            }
            @Override public void onNoOwnedPurchase() { }
        });
        billing.connect();
    }
}
