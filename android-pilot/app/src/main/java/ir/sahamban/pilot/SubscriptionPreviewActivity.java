package ir.sahamban.pilot;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.text.NumberFormat;
import java.util.Locale;

/**
 * Store inventory and price-check preview. No checkout or local entitlement grant.
 * Payment remains disabled until a trusted server verifier is integrated.
 */
public final class SubscriptionPreviewActivity extends Activity {
    private static final int[] DAYS = {30, 60, 90, 180, 365};
    // Display-only mirror of the approved server catalogue; no client-side charging.
    private static final long[] PRICE_RIAL = {1500000L, 2850000L, 4050000L, 7650000L, 14600000L};
    // Build flavor is the authoritative distribution channel; installer metadata is not trusted.
    private final String distribution = BuildConfig.STORE_CHANNEL;
    private int selectedDays = DAYS[0];
    private TextView details;
    private LinearLayout planList;
    private SahminoStoreBillingManager billing;
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
        button.setGravity(Gravity.CENTER);
        return button;
    }

    private String formatRial(long amount) {
        return NumberFormat.getIntegerInstance(new Locale("fa", "IR")).format(amount);
    }

    private long selectedPriceRial() {
        for (int i = 0; i < DAYS.length; i++) {
            if (DAYS[i] == selectedDays) return PRICE_RIAL[i];
        }
        throw new IllegalStateException("Unknown subscription duration");
    }

    private void renderChoices() {
        planList.removeAllViews();
        for (int i = 0; i < DAYS.length; i++) {
            final int days = DAYS[i];
            Button button = choice((days == selectedDays ? "✓  " : "") + days + " روز — "
                + formatRial(PRICE_RIAL[i]) + " ریال");
            button.setOnClickListener(v -> {
                selectedDays = days;
                renderChoices();
            });
            planList.addView(button);
        }
        String storeName = "CAFEBAZAAR".equals(distribution) ? "کافه‌بازار" : "مایکت";
        String status = storeStatus;
        details.setText("دوره انتخابی: " + selectedDays + " روز — مبلغ نهایی: "
            + formatRial(selectedPriceRial()) + " ریال\n"
            + "تمدید دستی حالت پیش‌فرض است؛ تمدید خودکار در این نسخه ارائه نمی‌شود.\n"
            + "کانال نسخه نصب‌شده: " + storeName
            + "\n" + status
            + "\n\nقیمت فروشگاه برای پلن انتخابی: " + (verifiedPrices[indexForDays(selectedDays)] ? "مطابقت دارد" : "هنوز تأیید نشده")
            + "\nپرداخت واقعی و فعال‌سازی اشتراک تا اتصال اعتبارسنجی سرور غیرفعال است."
            + "\nانتخاب مسیر پرداخت توسط کاربر وجود ندارد.");
    }

    private int indexForDays(int days) {
        for (int i = 0; i < DAYS.length; i++) if (DAYS[i] == days) return i;
        throw new IllegalArgumentException("Unknown plan duration");
    }

    @Override
    protected void onDestroy() {
        if (billing != null) billing.close();
        super.onDestroy();
    }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setTitle("اشتراک آزمایشی");
        ScrollView scroll = new ScrollView(this);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(20, 20, 20, 28);
        content.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        content.setBackgroundColor(Color.rgb(247, 250, 253));

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.ic_sahamban_logo);
        logo.setContentDescription("لوگوی برنامه سهمینو");
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(94, 94);
        logoParams.gravity = Gravity.CENTER_HORIZONTAL;
        content.addView(logo, logoParams);
        TextView title = text("انتخاب اشتراک سهمینو", 24f, Color.rgb(12, 37, 64));
        content.addView(title);
        content.addView(text("پیش‌نمایش اشتراک — درگاه بر اساس منبع نصب، بدون دریافت وجه", 14f,
            Color.rgb(137, 63, 18)));
        content.addView(text("۱. مدت اشتراک را انتخاب کنید", 18f, Color.rgb(12, 37, 64)));
        planList = new LinearLayout(this);
        planList.setOrientation(LinearLayout.VERTICAL);
        content.addView(planList);
        content.addView(text("۲. کانال انتشار: " + ("CAFEBAZAAR".equals(distribution) ? "کافه‌بازار" : "مایکت"),
            18f, Color.rgb(12, 37, 64)));
        details = text("", 15f, Color.rgb(12, 37, 64));
        details.setContentDescription("وضعیت اتصال خودکار پرداخت");
        content.addView(details);
        Button payment = choice("پرداخت واقعی — غیرفعال");
        payment.setEnabled(false);
        content.addView(payment);
        Button refresh = choice("بررسی قیمت و بازیابی خریدهای فروشگاه");
        refresh.setOnClickListener(v -> { if (billing != null) billing.refreshInventory(); });
        content.addView(refresh);
        Button back = choice("بازگشت به سهمینو");
        back.setOnClickListener(v -> finish());
        content.addView(back);
        scroll.addView(content);
        setContentView(scroll);
        renderChoices();
        billing = new SahminoStoreBillingManager(this, new SahminoStoreBillingManager.Listener() {
            @Override public void onStatus(String message) {
                storeStatus = message;
                renderChoices();
            }
            @Override public void onCatalogPrice(SahminoBillingCatalog.Plan plan,
                    String price, boolean matches) {
                for (int i = 0; i < DAYS.length; i++) {
                    if (DAYS[i] == plan.days) verifiedPrices[i] = matches;
                }
                renderChoices();
            }
            @Override public void onPurchaseNeedsServerVerification(
                    SahminoBillingCatalog.Plan plan,
                    ir.myket.billingclient.util.Purchase purchase) { }
            @Override public void onOwnedInventoryItem(
                    SahminoBillingCatalog.Plan plan,
                    ir.myket.billingclient.util.Purchase purchase) { }
            @Override public void onNoOwnedPurchase() { }
            @Override public void onOwnedPurchaseEvidence(
                    SahminoBillingCatalog.Plan plan, SahminoPurchaseEvidence evidence) {
                storeStatus = "خرید قبلی پیدا شد؛ فعال‌سازی فقط پس از تأیید سرور ممکن است.";
                renderChoices();
            }
        });
        billing.connect();
    }
}
