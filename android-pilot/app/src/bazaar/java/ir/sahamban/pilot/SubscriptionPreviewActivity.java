package ir.sahamban.pilot;

import androidx.activity.ComponentActivity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.text.NumberFormat;
import java.util.Locale;

/** Existing five-plan preview, now backed by Bazaar Subscription catalog/restore only. */
public final class SubscriptionPreviewActivity extends ComponentActivity {
    private static final int[] DAYS = {30, 60, 90, 180, 365};
    private static final long[] PRICES = {1500000L, 2850000L, 4050000L, 7650000L, 14600000L};
    private SahminoStoreBillingManager billing;
    private TextView status;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        setTitle("اشتراک سهمینو");
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(24, 24, 24, 24);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setBackgroundColor(Color.rgb(247, 250, 253));

        TextView title = new TextView(this);
        title.setText("انتخاب اشتراک سهمینو");
        title.setTextSize(24);
        title.setTextColor(Color.rgb(12, 37, 64));
        root.addView(title);

        NumberFormat format = NumberFormat.getIntegerInstance(new Locale("fa", "IR"));
        for (int i = 0; i < DAYS.length; i++) {
            Button plan = new Button(this);
            plan.setAllCaps(false);
            plan.setText(DAYS[i] + " روز — " + format.format(PRICES[i]) + " ریال");
            plan.setEnabled(false); // Preview only until authenticated order + server verification exist.
            root.addView(plan);
        }

        status = new TextView(this);
        status.setText("در حال آماده‌سازی اتصال اشتراک کافه‌بازار…");
        status.setTextSize(16);
        status.setTextColor(Color.rgb(137, 63, 18));
        status.setPadding(8, 24, 8, 24);
        root.addView(status);

        Button refresh = new Button(this);
        refresh.setAllCaps(false);
        refresh.setText("بررسی قیمت و بازیابی اشتراک‌های بازار");
        refresh.setOnClickListener(v -> { if (billing != null) billing.refreshAll(); });
        root.addView(refresh);

        Button back = new Button(this);
        back.setText("بازگشت");
        back.setOnClickListener(v -> finish());
        root.addView(back);

        ScrollView scroll = new ScrollView(this);
        scroll.addView(root);
        setContentView(scroll);

        billing = new SahminoStoreBillingManager(this, new SahminoStoreBillingManager.Listener() {
            @Override public void onStatus(String message) {
                status.setText(message + "\nپرداخت و فعال‌سازی Pro تا اتصال اعتبارسنجی سرور غیرفعال است.");
            }

            @Override public void onCatalogPrice(SahminoBillingCatalog.Plan plan, String price, boolean matches) {
                status.setText("قیمت SKU اشتراک " + plan.days + " روزه: " + price
                    + (matches ? " — مطابق کاتالوگ مصوب" : " — مغایر/تأییدنشده")
                    + "\nپرداخت تا اتصال سفارش احراز‌شده و اعتبارسنجی سرور غیرفعال است.");
            }

            @Override public void onPurchaseEvidence(SahminoBillingCatalog.Plan plan,
                    SahminoPurchaseEvidence evidence) {
                status.setText("رسید اشتراک دریافت شد؛ هنوز به سرور ارسال و تأیید نشده است. دسترسی Pro فعال نشد.");
            }

            @Override public void onRestoredEvidence(SahminoBillingCatalog.Plan plan,
                    SahminoPurchaseEvidence evidence) {
                status.setText("اشتراک قبلی در حساب بازار پیدا شد؛ برای بازیابی دسترسی باید سرور آن را تأیید کند.");
            }
        });
        billing.connect();
    }

    @Override protected void onDestroy() {
        if (billing != null) billing.close();
        super.onDestroy();
    }
}
