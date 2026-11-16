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
 * Design-time billing navigation preview ONLY. No billing SDK or payment URLs.
 * Do not infer account status, charge a user, or grant entitlement from this view.
 */
public final class SubscriptionPreviewActivity extends Activity {
    private static final int[] DAYS = {30, 60, 90, 180, 365};
    private static final int[] PRICES_TOMAN = {150000, 285000, 405000, 765000, 1460000};
    // Detected only from Android installer metadata; no user selector.
    private BillingDistributionPolicy distribution;
    private int selectedDays = DAYS[0];
    private TextView details;
    private LinearLayout planList;

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

    private String toman(int amount) {
        return NumberFormat.getIntegerInstance(new Locale("fa", "IR")).format(amount);
    }

    private int priceForDays(int days) {
        for (int i = 0; i < DAYS.length; i++) if (DAYS[i] == days) return PRICES_TOMAN[i];
        throw new IllegalArgumentException("Unknown subscription duration");
    }

    private void renderChoices() {
        planList.removeAllViews();
        for (int days : DAYS) {
            Button button = choice((days == selectedDays ? "✓  " : "") + days + " روز — " + toman(priceForDays(days)) + " تومان");
            button.setOnClickListener(v -> {
                selectedDays = days;
                renderChoices();
            });
            planList.addView(button);
        }
        String status = distribution.isConfiguredBuild()
            ? distribution.statusText()
            : "منبع نصب شناسایی نشد؛ پرداخت غیرفعال است.";
        details.setText("دوره انتخابی: " + selectedDays + " روز\\n"
            + "مبلغ نهایی: " + toman(priceForDays(selectedDays)) + " تومان\\n"
            + "مسیر تشخیص‌داده‌شده این نصب: " + distribution.displayName()
            + "\\n" + status
            + "\\n\\nحالت تمدید پیش‌فرض: دستی؛ تمدید خودکار تا اتصال و تأیید رسمی ارائه‌دهنده غیرفعال است."\n            + "\\nپرداخت واقعی در این نسخه آزمایشی غیرفعال است."
            + "\\nانتخاب مسیر پرداخت توسط کاربر وجود ندارد.");
    }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        distribution = BillingInstallSource.detect(this);
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
        content.addView(text("۲. مسیر متناسب با محل نصب: " + distribution.displayName(),
            18f, Color.rgb(12, 37, 64)));
        details = text("", 15f, Color.rgb(12, 37, 64));
        details.setContentDescription("وضعیت اتصال خودکار پرداخت");
        content.addView(details);
        Button payment = choice("پرداخت واقعی — غیرفعال");
        payment.setEnabled(false);
        content.addView(payment);
        Button back = choice("بازگشت به سهمینو");
        back.setOnClickListener(v -> finish());
        content.addView(back);
        scroll.addView(content);
        setContentView(scroll);
        renderChoices();
    }
}
