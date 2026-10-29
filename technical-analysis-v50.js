'use strict';
/* v50 UI consumes only the in-memory, verified historical-close event. */
(()=>{
 const $=id=>document.getElementById(id);
 const selector=$('technicalSymbolV50'),result=$('technicalResultV50'),status=$('technicalStatusV50');
 if(!selector||!result||!status||!window.SahambanTechnicalV50)return;
 let quotes=[];
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:4}).format(n);
 const latest=values=>{for(let i=values.length-1;i>=0;i--)if(values[i]!==null&&Number.isFinite(values[i]))return values[i];return null;};
 function show(){
  const q=quotes.find(x=>x.symbol===selector.value);
  if(!q){result.textContent='برای نمایش تحلیل، ابتدا دریافت و اعتبارسنجی قیمت پایانی همه نمادها را با موفقیت اجرا کنید.';return;}
  if(!Array.isArray(q.history)||!q.history.length){result.textContent='تاریخچه معتبر برای این نماد در پاسخ بازار موجود نیست؛ هیچ عددی حدس زده نمی‌شود.';return;}
  try{
   const closes=q.history.map(x=>x.close);
   const indicators=window.SahambanTechnicalV50.calculate(closes,{smaPeriod:20,rsiPeriod:14,macd:{fast:12,slow:26,signal:9}});
   const sma=latest(indicators.sma),rsi=latest(indicators.rsi),macd=latest(indicators.macd.macd),signal=latest(indicators.macd.signal),hist=latest(indicators.macd.histogram);
   const line=(label,value,suffix='')=>label+': '+(value===null?'تاریخچه کافی نیست':fmt(value)+suffix);
   result.textContent=[
    'نماد: '+q.symbol,
    'آخرین تاریخ بازار تأییدشده: '+String(q.marketDate||'نامشخص').replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]),
    'تعداد نقاط تاریخی معتبر: '+fmt(indicators.count),
    line('قیمت پایانی آخرین روز',indicators.lastClose,' ریال'),
    line('میانگین متحرک ساده ۲۰روزه (SMA20)',sma,' ریال'),
    line('شاخص قدرت نسبی ۱۴دوره‌ای (RSI14)',rsi),
    line('MACD (12,26)',macd,' ریال'),
    line('خط سیگنال MACD (9)',signal,' ریال'),
    line('میله‌نگار MACD',hist,' ریال')
   ].join('\n');
   status.textContent='تحلیل فقط از تاریخچه قیمت پایانی معتبرِ دریافت‌شده در همین نشست محاسبه شد؛ اطلاعات سبد ذخیره یا ارسال نشده است.';
  }catch(e){result.textContent='تحلیل محاسبه نشد: '+e.message;}
 }
 selector.addEventListener('change',show);
 window.addEventListener('sahamban:verified-historical-quotes-v50',event=>{
  const incoming=event?.detail?.quotes;
  if(!Array.isArray(incoming)){status.textContent='داده تاریخی دریافت‌شده ساختار معتبر ندارد.';return;}
  quotes=incoming.filter(q=>q&&typeof q.symbol==='string'&&Array.isArray(q.history));
  selector.replaceChildren();
  for(const q of quotes){const option=document.createElement('option');option.value=q.symbol;option.textContent=q.symbol;selector.append(option);}
  selector.disabled=quotes.length===0;
  if(quotes.length){selector.value=quotes[0].symbol;show();}
  else{result.textContent='تاریخچه معتبر از منبع بازار دریافت نشد؛ اندیکاتور قابل محاسبه نیست.';status.textContent='هیچ سری تاریخی معتبر برای تحلیل تأیید نشد.';}
 });
})();
