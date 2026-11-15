package ir.sahamban.pilot;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/**
 * Design-time billing navigation preview ONLY. No billing SDK or payment URLs.
 * Do not infer account status, charge a user, or grant entitlement from this view.
 */
public final class SubscriptionPreviewActivity extends Activity {
    private static final int[] DAYS = {30, 60, 90, 180, 365};
    private static final String[] CHANNELS = {"کافه‌بازار", "مایکت", "Google Play", "وب‌سایت"};
    private static final String[] CHANNEL_STATUS = {
        "اتصال رسمی بازار هنوز پیکربندی نشده است.",
        "استعلام سروری آزمایشی آماده است؛ خرید داخل اپ متصل نیست.",
        "استعلام سروری آزمایشی آماده است؛ Play Billing متصل نیست.",
        "جریان آزمایشی سروری آماده است؛ درگاه بانکی انتخاب نشده است."
    };
    private int selectedDays = DAYS[0];
    private int selectedChannel = -1;
    private TextView details;
    private LinearLayout planList;
    private LinearLayout providerList;

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

    private void renderChoices() {
        planList.removeAllViews();
        for (int days : DAYS) {
            Button button = choice((days == selectedDays ? "✓  " : "") + days + " روز");
            button.setOnClickListener(v -> {
                selectedDays = days;
                renderChoices();
            });
            planList.addView(button);
        }
        providerList.removeAllViews();
        for (int index = 0; index < CHANNELS.length; index++) {
            final int channelIndex = index;
            Button button = choice((index == selectedChannel ? "✓  " : "") + CHANNELS[index]);
            button.setOnClickListener(v -> {
                selectedChannel = channelIndex;
                renderChoices();
            });
            providerList.addView(button);
        }
        String status = selectedChannel < 0
            ? "یکی از چهار مسیر پرداخت را انتخاب کنید."
            : CHANNEL_STATUS[selectedChannel];
        details.setText("دوره انتخابی: " + selectedDays + " روز\n"
            + "مسیر پرداخت: " + (selectedChannel < 0 ? "انتخاب نشده" : CHANNELS[selectedChannel])
            + "\n" + status
            + "\n\nپرداخت واقعی غیرفعال است. قیمت و شناسه محصول رسمی هنوز تنظیم نشده‌اند."
            + "\nاین صفحه فقط برای آزمایش نمایش و انتخاب مسیر است؛ هیچ اشتراکی فعال نمی‌شود.");
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

        TextView title = text("انتخاب اشتراک سهمینو", 24f, Color.rgb(12, 37, 64));
        content.addView(title);
        content.addView(text("پیش‌نمایش فنی چهار درگاه — بدون دریافت وجه", 14f,
            Color.rgb(137, 63, 18)));
        content.addView(text("۱. مدت اشتراک را انتخاب کنید", 18f, Color.rgb(12, 37, 64)));
        planList = new LinearLayout(this);
        planList.setOrientation(LinearLayout.VERTICAL);
        content.addView(planList);
        content.addView(text("۲. مسیر پرداخت را انتخاب کنید", 18f, Color.rgb(12, 37, 64)));
        providerList = new LinearLayout(this);
        providerList.setOrientation(LinearLayout.VERTICAL);
        content.addView(providerList);
        details = text("", 15f, Color.rgb(12, 37, 64));
        details.setContentDescription("وضعیت اتصال پرداخت انتخابی");
        content.addView(details);
        Button payment = choice("پرداخت واقعی — غیرفعال");
        payment.setEnabled(false);
        content.addView(payment);
        Button back = choice("بازگشت به برنامه");
        back.setOnClickListener(v -> finish());
        content.addView(back);
        scroll.addView(content);
        setContentView(scroll);
        renderChoices();
    }
}
