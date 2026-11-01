'use strict';
/* v95 beginner explanations are presentation-only.
 * Never inspect, infer or edit quotes, NAV, positions, financial results or storage.
 */
(()=>{
 const root=document.getElementById('livePortfolioSection');
 const overview=document.getElementById('sb88-panel-overview');
 const help=document.getElementById('sb88-panel-help');
 if(!root||!overview||!help)return;
 const make=(tag,cls,text)=>{
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(text)n.textContent=text;
  return n;
 };
 const notice=make('aside','sb95-reading-note');
 notice.setAttribute('aria-label','نکته مهم درباره اعتبار اعداد');
 notice.append(
  make('strong','','پیش از تفسیر اعداد'),
  make('p','','قیمت‌ها الزاماً لحظه‌ای نیستند. تاریخ قیمت هر نماد، وضعیت دریافت داده و اعتبار NAV صندوق را جداگانه بررسی کنید. عدد نامشخص را صفر در نظر نگیرید.')
 );
 const action=make('a','sb95-reading-link','دیدن جزئیات قیمت‌ها و تاریخ داده');
 action.href='#livePortfolioTable';
 notice.append(action);
 const intro=overview.querySelector('.sb88-panel-heading');
 if(intro)intro.insertAdjacentElement('afterend',notice);
 else overview.prepend(notice);
 const basics=make('section','sb95-reading-guide');
 basics.setAttribute('aria-label','راهنمای خواندن اعداد و خطاهای سبد');
 basics.append(make('h3','','چطور خروجی‌های سبد را بخوانیم؟'));
 const examples=[
  ['اگر قیمت دریافت نشده است','ابتدا اتصال و دریافت قیمت را بررسی کنید. نبود قیمت معتبر به معنی ارزش صفر دارایی نیست.'],
  ['اگر تاریخ قیمت قدیمی یا متفاوت است','مقایسه بازده و ارزش را با احتیاط تفسیر کنید؛ تاریخ معامله و تاریخ انتشار NAV ممکن است یکسان نباشند.'],
  ['اگر NAV نامعتبر یا نامشخص است','حباب صندوق را نتیجه‌گیری نکنید. برای مقایسه، نوع NAV بازخرید، تاریخ و منبع باید معتبر باشند.'],
  ['اگر درصد ریسک یا تمرکز بالاست','خروجی یک توصیف یا سناریوی فرضی است، نه احتمال وقوع، پیش‌بینی قیمت یا توصیه معامله.']
 ];
 for(const [heading,body] of examples){
  const details=make('details','sb95-reading-detail');
  const summary=make('summary','',heading);
  const copy=make('p','',body);
  details.append(summary,copy);
  basics.append(details);
 }
 help.append(basics);
})();