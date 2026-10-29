'use strict';
/* v50.3 UI consumes verified quotes and includes a DOM-table fallback. */
(()=>{
 const $=id=>document.getElementById(id);
 const selector=$('technicalSymbolV50'),result=$('technicalResultV50'),status=$('technicalStatusV50');
 if(!selector||!result||!status)return;
 if(!window.SahambanTechnicalV50){status.textContent='کتابخانه محاسبه اندیکاتورها بارگذاری نشده است؛ فهرست نمادها پس از دریافت قیمت همچنان فعال می‌شود.';}
 let quotes=[];
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:4}).format(n);
 const latest=values=>{for(let i=values.length-1;i>=0;i--)if(values[i]!==null&&Number.isFinite(values[i]))return values[i];return null;};
 function show(){
  const q=quotes.find(x=>x.symbol===selector.value);
  if(!q){result.textContent='برای نمایش تحلیل، ابتدا دریافت و اعتبارسنجی قیمت پایانی همه نمادها را با موفقیت اجرا کنید.';return;}
  if(!Array.isArray(q.history)||!q.history.length){result.textContent='تاریخچه معتبر برای این نماد در پاسخ بازار موجود نیست؛ هیچ عددی حدس زده نمی‌شود.';return;}
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


 // Fetch verified daily closing-price history for every visible portfolio symbol.
 const historyButton=$('technicalHistoryAllV50');
 const normalizeSymbol=value=>String(value??'').normalize('NFKC').replace(/[\u200c\u200e\u200f\s]/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک').toLocaleUpperCase('fa-IR');
 async function marketJson(path){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch('https://cdn.tsetmc.com/api'+path,{signal:controller.signal,cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('پاسخ HTTP '+response.status);
   if(!(response.headers.get('content-type')||'').includes('json'))throw Error('پاسخ منبع بازار JSON نبود');
   return await response.json();
  }finally{clearTimeout(timer);}
 }
 async function loadVerifiedHistory(symbol){
  const search=await marketJson('/Instrument/GetInstrumentSearch/'+encodeURIComponent(symbol));
  const records=search?.instrumentSearch;
  if(!Array.isArray(records)||!records.length)throw Error('جست‌وجوی نماد نتیجه نداد');
  const wanted=normalizeSymbol(symbol);
  const exact=records.filter(item=>[item.lVal18AFC,item.lVal18,item.lVal30,item.cValMne,item.symbol,item.ticker].some(v=>normalizeSymbol(v)===wanted));
  const unique=[...new Map(exact.filter(x=>/^\d{8,25}$/.test(String(x.insCode??''))).map(x=>[String(x.insCode),x])).values()];
  if(unique.length!==1)throw Error(unique.length?'شناسه دقیق نماد یکتا نیست':'شناسه دقیق نماد در نتایج جست‌وجو پیدا نشد');
  const code=String(unique[0].insCode);
  const response=await marketJson('/ClosingPrice/GetClosingPriceDailyList/'+code+'/0');
  const rows=response?.closingPriceDaily;
  if(!Array.isArray(rows))throw Error('ساختار تاریخچه معتبر نیست');
  const history=rows.map(row=>({date:String(row.dEven??''),close:Number(row.pClosing)}))
   .filter(row=>/^\d{8}$/.test(row.date)&&Number.isFinite(row.close)&&row.close>0)
   .sort((a,b)=>a.date.localeCompare(b.date));
  if(history.length<15)throw Error('کمتر از ۱۵ قیمت پایانی معتبر دریافت شد');
  const lastDate=history[history.length-1].date;
  const y=Number(lastDate.slice(0,4)),m=Number(lastDate.slice(4,6)),d=Number(lastDate.slice(6,8));
  const parsed=new Date(Date.UTC(y,m-1,d));
  if(parsed.getUTCFullYear()!==y||parsed.getUTCMonth()!==m-1||parsed.getUTCDate()!==d)throw Error('تاریخ آخرین رکورد نامعتبر است');
  return {symbol,marketDate:lastDate,history:history.map(({date,close})=>({date,close})),insCode:code};
 }
 if(historyButton){
  historyButton.addEventListener('click',async()=>{
   const symbols=[...new Set([...selector.options].map(option=>option.value).filter(Boolean))];
   if(!symbols.length){status.textContent='ابتدا نمادهای سبد را در فهرست بارگذاری کنید.';return;}
   historyButton.disabled=true;
   const oldLabel=historyButton.textContent;
   historyButton.textContent='در حال دریافت تاریخچه...';
   status.textContent='درخواست تاریخچه واقعی از TSETMC برای '+fmt(symbols.length)+' نماد آغاز شد؛ این کار ممکن است کمی زمان ببرد.';
   const results=new Array(symbols.length);let next=0,done=0;
   async function worker(){
    while(true){
     const index=next++;if(index>=symbols.length)return;
     const symbol=symbols[index];
     try{results[index]=await loadVerifiedHistory(symbol);}
     catch(error){results[index]={symbol,marketDate:null,history:null,error:String(error?.message||error)};}
     done++;
     status.textContent='دریافت تاریخچه: '+fmt(done)+' از '+fmt(symbols.length)+' نماد بررسی شد.';
    }
   }
   try{
    await Promise.all(Array.from({length:Math.min(3,symbols.length)},()=>worker()));
    window.dispatchEvent(new CustomEvent('sahamban:verified-historical-quotes-v50',{detail:{quotes:results}}));
    const good=results.filter(item=>Array.isArray(item.history)&&item.history.length>=15).length;
    const failed=results.filter(item=>!Array.isArray(item.history)||item.history.length<15);
    status.textContent='تاریخچه معتبر برای '+fmt(good)+' از '+fmt(symbols.length)+' نماد دریافت شد.'+(failed.length?' '+fmt(failed.length)+' نماد تاریخچه قابل استفاده نداشتند؛ جزئیات در فهرست و نتیجه هر نماد مشخص است.':' همه نمادها بررسی شدند.');
   }catch(error){status.textContent='دریافت گروهی تاریخچه کامل نشد: '+String(error?.message||error);}
   finally{historyButton.disabled=false;historyButton.textContent=oldLabel;}
  });
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
   option.textContent=q.symbol+(Array.isArray(q.history)&&q.history.length?'':' — تاریخچه در دسترس نیست');
   selector.append(option);
  }
  selector.disabled=quotes.length===0;
  const withHistory=quotes.filter(q=>Array.isArray(q.history)&&q.history.length>0).length;
  if(quotes.length){
   selector.value=quotes[0].symbol;
   status.textContent=withHistory
    ?'قیمت پایانی نمادها تأیید شد. تاریخچه قابل استفاده برای '+fmt(withHistory)+' نماد از '+fmt(quotes.length)+' نماد دریافت شده است.'
    :'تاریخچه روزانه قابل استفاده دریافت نشد. اندیکاتور بدون تاریخچه محاسبه نمی‌شود.'+(quotes.filter(q=>q.error).slice(0,3).map(q=>q.symbol+': '+q.error).join('؛ ')?' جزئیات: '+quotes.filter(q=>q.error).slice(0,3).map(q=>q.symbol+': '+q.error).join('؛ '):'');
   show();
  }else{
   result.textContent='هیچ نماد تأییدشده‌ای به بخش تکنیکال نرسید. دریافت قیمت پایانی همه نمادها را دوباره اجرا کنید و پیام وضعیت بخش کارگزاری را بررسی کنید.';
   status.textContent='داده قیمت تأییدشده به بخش تحلیل نرسیده است.';
  }
 });
})();
