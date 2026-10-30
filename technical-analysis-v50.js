'use strict';
/* v50.13 UI exposes per-symbol history validation failures and includes a DOM-table fallback. */
(()=>{
 const $=id=>document.getElementById(id);
 const selector=$('technicalSymbolV50'),result=$('technicalResultV50'),status=$('technicalStatusV50'),copyDiagnostics=$('technicalCopyDiagnosticsV50');
 if(!selector||!result||!status)return;
 if(!window.SahambanTechnicalV50){status.textContent='کتابخانه محاسبه اندیکاتورها بارگذاری نشده است؛ فهرست نمادها پس از دریافت قیمت همچنان فعال می‌شود.';}
 let quotes=[];
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:4}).format(n);
 const latest=values=>{for(let i=values.length-1;i>=0;i--)if(values[i]!==null&&Number.isFinite(values[i]))return values[i];return null;};
 const diagnostics=()=>{const failed=quotes.filter(q=>!Array.isArray(q.history)||!q.history.length);return ['سهام‌بان — گزارش تشخیصی تاریخچه نمادها','نسخه گزارش: تحلیل ۵۰.۱۲ | تطبیق‌گر ۴۸.۸','تعداد نمادها: '+fmt(quotes.length),'تعداد موفق: '+fmt(quotes.length-failed.length),'تعداد ناموفق: '+fmt(failed.length),'',...failed.flatMap(q=>['نماد: '+q.symbol,'علت و مشخصات شناسه‌های کاندیدا: '+(q.error||'سرویس علت مشخصی گزارش نکرده است.'),''])].join('\n');};
 if(copyDiagnostics)copyDiagnostics.addEventListener('click',async()=>{const report=diagnostics();try{await navigator.clipboard.writeText(report);status.textContent='گزارش کامل خطاها و شناسه‌های کاندیدا کپی شد؛ آن را همین‌جا جای‌گذاری کن.';}catch(e){const area=document.createElement('textarea');area.value=report;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();status.textContent=ok?'گزارش کامل کپی شد؛ آن را همین‌جا جای‌گذاری کن.':'کپی خودکار ممکن نشد؛ متن گزارش خطاها را از بخش نتیجه انتخاب و کپی کن.';}});
 function show(){
  const q=quotes.find(x=>x.symbol===selector.value);
  if(!q){result.textContent='برای نمایش تحلیل، ابتدا دریافت و اعتبارسنجی قیمت پایانی همه نمادها را با موفقیت اجرا کنید.';return;}
  if(!Array.isArray(q.history)||!q.history.length){result.textContent='تاریخچه معتبر برای این نماد دریافت نشد؛ هیچ عددی حدس زده نمی‌شود.'+(q.error?'\n\nگزارش کامل سرویس و مشخصات شناسه‌ها:\n'+q.error:'\nعلت دقیق از پاسخ سرویس در دسترس نیست.');return;}
  if(!window.SahambanTechnicalV50){result.textContent='نماد دریافت شد، اما کتابخانه اندیکاتورها بارگذاری نشده است. صفحه را دوباره باز کنید؛ فهرست نمادها فعال می‌ماند.';return;}
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
 window.addEventListener('sahamban:portfolio-symbols-v50',event=>{
  const incoming=event?.detail?.symbols;
  if(!Array.isArray(incoming))return;
  const symbols=[...new Set(incoming.filter(s=>typeof s==='string'&&s.trim()))];
  if(!symbols.length)return;
  // The visible portfolio supplies names only. Imported/current prices are never treated as historical data.
  quotes=symbols.map(symbol=>({symbol,marketDate:null,history:null}));
  selector.replaceChildren();
  for(const symbol of symbols){
   const option=document.createElement('option');
   option.value=symbol;
   option.textContent=symbol+' — تاریخچه تأییدشده دریافت نشده';
   selector.append(option);
  }
  selector.disabled=false;
  selector.value=symbols[0];
  status.textContent='فهرست نمادهای سبد فعال شد؛ برای محاسبه اندیکاتورها هنوز تاریخچه قیمت پایانی تأییدشده لازم است.';
  show();
 });

 // Independent fallback: observe the already-rendered verified portfolio table.
 // This keeps symbol selection usable even if a custom event is missed by the page lifecycle.
 const portfolioRows=$('livePortfolioRows');
 if(portfolioRows&&typeof MutationObserver!=='undefined'){
  const activateFromVisibleRows=()=>{
   if(!selector.disabled||!portfolioRows.rows.length)return;
   const symbols=[...new Set([...portfolioRows.rows].map(row=>String(row.cells[0]?.textContent||'').trim()).filter(s=>s&&s!=='—'))];
   if(!symbols.length)return;
   quotes=symbols.map(symbol=>({symbol,marketDate:null,history:null}));
   selector.replaceChildren();
   for(const symbol of symbols){
    const option=document.createElement('option');
    option.value=symbol;
    option.textContent=symbol+' — تاریخچه تأییدشده دریافت نشده';
    selector.append(option);
   }
   selector.disabled=false;
   selector.value=symbols[0];
   status.textContent='فهرست نمادها از جدول قیمت‌های تأییدشده فعال شد؛ برای اندیکاتورها تاریخچه معتبر لازم است.';
   show();
  };
  new MutationObserver(activateFromVisibleRows).observe(portfolioRows,{childList:true,subtree:true});
  activateFromVisibleRows();
 }


 selector.addEventListener('change',show);
 window.addEventListener('sahamban:verified-historical-quotes-v50',event=>{
  const incoming=event?.detail?.quotes;
  if(!Array.isArray(incoming)){status.textContent='داده تاریخی دریافت‌شده ساختار معتبر ندارد.';return;}
  status.textContent='داده قیمت تأییدشده دریافت شد؛ فهرست نمادها در حال به‌روزرسانی است.';
  quotes=[...new Map(incoming.filter(q=>q&&typeof q.symbol==='string'&&q.symbol.trim()).map(q=>[q.symbol,q])).values()];
  selector.replaceChildren();
  for(const q of quotes){
   const option=document.createElement('option');
   option.value=q.symbol;
   option.textContent=q.symbol+(Array.isArray(q.history)&&q.history.length?'':' — تأیید نشد'+(q.error?'؛ علت: '+q.error.slice(0,110):''));
   selector.append(option);
  }
  selector.disabled=quotes.length===0;
  const withHistory=quotes.filter(q=>Array.isArray(q.history)&&q.history.length>0).length;
  if(quotes.length){
   selector.value=quotes[0].symbol;
   const failed=quotes.filter(q=>!Array.isArray(q.history)||!q.history.length);
   status.textContent='تاریخچه قابل استفاده برای '+fmt(withHistory)+' نماد از '+fmt(quotes.length)+' نماد دریافت شد.'+(failed.length?'؛ برای دیدن و کپی گزارش کامل شناسه‌های کاندیدا، نماد ناموفق را انتخاب کن و دکمه کپی گزارش را بزن.':' همه نمادها موفق بودند.');
   show();
  }else{
   result.textContent='هیچ نماد تأییدشده‌ای به بخش تکنیکال نرسید. دریافت قیمت پایانی همه نمادها را دوباره اجرا کنید و پیام وضعیت بخش کارگزاری را بررسی کنید.';
   status.textContent='داده قیمت تأییدشده به بخش تحلیل نرسیده است.';
  }
 });
})();
