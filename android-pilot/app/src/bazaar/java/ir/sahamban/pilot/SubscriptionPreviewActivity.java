package ir.sahamban.pilot;
import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.text.NumberFormat;
import java.util.Locale;
/** Bazaar-specific preview; checkout remains disabled pending Poolakey and server verification. */
public final class SubscriptionPreviewActivity extends Activity {
 private static final int[] DAYS={30,60,90,180,365};
 private static final long[] PRICES={1500000L,2850000L,4050000L,7650000L,14600000L};
 @Override protected void onCreate(Bundle state){
  super.onCreate(state); setTitle("اشتراک سهمینو");
  LinearLayout root=new LinearLayout(this); root.setOrientation(1); root.setPadding(24,24,24,24); root.setGravity(Gravity.CENTER_HORIZONTAL); root.setBackgroundColor(Color.rgb(247,250,253));
  TextView title=new TextView(this); title.setText("انتخاب اشتراک سهمینو"); title.setTextSize(24); title.setTextColor(Color.rgb(12,37,64)); root.addView(title);
  NumberFormat fmt=NumberFormat.getIntegerInstance(new Locale("fa","IR"));
  for(int i=0;i<DAYS.length;i++){Button p=new Button(this);p.setAllCaps(false);p.setText(DAYS[i]+" روز — "+fmt.format(PRICES[i])+" ریال");root.addView(p);}
  TextView status=new TextView(this);status.setText("اتصال Poolakey و اعتبارسنجی رسید سمت سرور هنوز تکمیل نشده است؛ پرداخت غیرفعال است.");status.setTextSize(16);status.setTextColor(Color.rgb(137,63,18));status.setPadding(8,24,8,24);root.addView(status);
  Button back=new Button(this);back.setText("بازگشت");back.setOnClickListener(v->finish());root.addView(back);
  ScrollView scroll=new ScrollView(this);scroll.addView(root);setContentView(scroll);
 }
}