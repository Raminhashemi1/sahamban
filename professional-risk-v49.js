'use strict';
/* v49 risk engine: read-only; never persists, changes or uploads holdings. */
(()=>{
 const $=id=>document.getElementById(id);
 const digits=s=>String(s??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٬،]/g,'').replace(/٫/g,'.');
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n);
 function fail(s){$('riskStatusV49').textContent=s;$('riskSummaryV49').textContent='';$('riskDetailsV49').replaceChildren();}
 function readVerifiedRows(){
  const status=$('livePortfolioStatus')?.textContent||'';
  const verified=status.match(/^دریافت و اعتبارسنجی قیمت پایانی همه\s+([۰-۹٠-٩0-9]+)\s+نماد موفق بود/);
  if(!verified)throw Error('ابتدا دکمه دریافت قیمت پایانی همه نمادها را اجرا کنید و موفقیت کامل اعتبارسنجی قیمت‌ها را ببینید.');
  const expectedCount=Number(digits(verified[1]));
  const rows=[...($('livePortfolioRows')?.querySelectorAll('tr')||[])];
  if(!rows.length)throw Error('جدول قیمت تأییدشده در صفحه موجود نیست.');
  if(rows.length!==expectedCount)throw Error('تعداد ردیف‌های جدول ('+fmt(rows.length)+') با تعداد قیمت‌های تأییدشده ('+fmt(expectedCount)+') برابر نیست؛ گزارش ناقص پذیرفته نشد.');
  const result=rows.map(tr=>{
   const c=[...tr.querySelectorAll('td')].map(td=>td.textContent.trim());
   if(c.length<7)throw Error('ساختار جدول قیمت ناقص است.');
   const quantity=Number(digits(c[1])),buy=Number(digits(c[2])),price=Number(digits(c[3]));
   if(!c[0]||![quantity,buy,price].every(Number.isFinite)||quantity<=0||buy<=0||price<=0)throw Error('مقادیر نامعتبر در ردیف '+(c[0]||'نامشخص'));
   return {symbol:c[0],quantity,buy,price,value:quantity*price,cost:quantity*buy,date:c[6]};
  });
  if(result.length>100||result.some(x=>!Number.isSafeInteger(x.quantity)||!Number.isFinite(x.value)||!Number.isFinite(x.cost)||x.value>Number.MAX_SAFE_INTEGER||x.cost>Number.MAX_SAFE_INTEGER))throw Error('مقادیر از محدوده محاسبه امن خارج‌اند.');
  return result;
 }
 let latestCsv='';
 const exportButton=$('riskExportV49');
 function csvCell(value){
  let text=String(value??'');
  if(/^[=+\-@\t\r]/.test(text))text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
 }
 exportButton?.addEventListener('click',()=>{
  if(!latestCsv)return;
  try{
   const blob=new Blob(['\uFEFF'+latestCsv],{type:'text/csv;charset=utf-8'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='sahamban-risk-report.csv';document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
   $('riskStatusV49').textContent+=' فایل گزارش CSV آماده شد؛ داده‌ای در سرور ذخیره نشد.';
  }catch(e){$('riskStatusV49').textContent+=' ساخت فایل گزارش ناموفق بود: '+e.message;}
 });
 $('riskCalculateV49').addEventListener('click',()=>{
  try{
   const budget=Number(digits($('riskBudgetV49').value)),shock=Number($('riskShockV49').value);
   if(!Number.isFinite(budget)||budget<0.1||budget>10)throw Error('بودجه ریسک را بین ۰٫۱ تا ۱۰ درصد وارد کنید.');
   if(![5,10,20,30].includes(shock))throw Error('سناریوی افت نامعتبر است.');
   const rows=readVerifiedRows(),total=rows.reduce((s,r)=>s+r.value,0),cost=rows.reduce((s,r)=>s+r.cost,0);
   if(!Number.isFinite(total)||total<=0||total>Number.MAX_SAFE_INTEGER)throw Error('ارزش کل سبد نامعتبر است.');
   const hhi=rows.reduce((s,r)=>s+(r.value/total)**2,0),top=[...rows].sort((a,b)=>b.value-a.value);
   const budgetRial=total*budget/100,stress=total*shock/100,pnl=total-cost;
   $('riskStatusV49').textContent='محاسبه موفق: '+fmt(rows.length)+' نماد از جدول قیمت پایانی تأییدشده خوانده شد. اطلاعات ذخیره‌شده تغییر نکرد.';
   $('riskSummaryV49').textContent='ارزش مبنای سبد: '+fmt(total)+' ریال | سود/زیان نسبت به بهای خرید: '+fmt(pnl)+' ریال | افت فرضی '+fmt(shock)+'٪: '+fmt(stress)+' ریال زیان بالقوه | بودجه ریسک فرضی '+fmt(budget)+'٪ ارزش سبد: '+fmt(budgetRial)+' ریال | شاخص تمرکز HHI: '+fmt(hhi*10000)+' از ۱۰۰۰۰.';
   const table=document.createElement('table');table.style.width='100%';const head=document.createElement('tr');
   ['نماد','وزن از سبد','ارزش روز (ریال)','افت فرضی '+shock+'٪ (ریال)','سهم از تمرکز'].forEach(x=>{const th=document.createElement('th');th.textContent=x;th.style.padding='8px';head.append(th)});table.append(head);
   top.forEach(r=>{const tr=document.createElement('tr');[r.symbol,fmt(r.value/total*100)+'٪',fmt(r.value),fmt(r.value*shock/100),fmt((r.value/total)**2*10000)].forEach(x=>{const td=document.createElement('td');td.textContent=x;td.style.padding='8px';td.style.borderBottom='1px solid #34546d';tr.append(td)});table.append(tr)});
   const csvRows=[['نماد','وزن سبد درصد','ارزش روز ریال','افت فرضی ریال','سهم تمرکز HHI']];
   top.forEach(r=>csvRows.push([r.symbol,(r.value/total*100).toFixed(4),r.value.toFixed(0),(r.value*shock/100).toFixed(0),((r.value/total)**2*10000).toFixed(4)]));
   latestCsv=csvRows.map(row=>row.map(csvCell).join(';')).join('\\r\\n');
   if(exportButton)exportButton.disabled=false;
   $('riskDetailsV49').replaceChildren(table);
  }catch(e){fail('محاسبه انجام نشد: '+e.message);}
 });

 function correlation(a,b){
  const keys=[...a.keys()].filter(k=>b.has(k)).sort();
  if(keys.length<15)return null;
  const x=keys.map(k=>a.get(k)),y=keys.map(k=>b.get(k));
  const mx=x.reduce((s,v)=>s+v,0)/x.length,my=y.reduce((s,v)=>s+v,0)/y.length;
  let cov=0,vx=0,vy=0;
  for(let i=0;i<x.length;i++){const dx=x[i]-mx,dy=y[i]-my;cov+=dx*dy;vx+=dx*dx;vy+=dy*dy;}
  if(vx<=0||vy<=0)return null;
  return {value:cov/Math.sqrt(vx*vy),count:keys.length};
 }
 window.addEventListener('sahamban:verified-historical-quotes-v50',event=>{
  const panel=$('riskCorrelationV49');if(!panel)return;
  const incoming=event?.detail?.quotes;
  if(!Array.isArray(incoming)){panel.textContent='داده تاریخچه ساختار معتبر ندارد؛ همبستگی محاسبه نشد.';return;}
  const returns=[];
  for(const quote of incoming){
   if(!quote||typeof quote.symbol!=='string'||!Array.isArray(quote.history))continue;
   const history=quote.history.filter(x=>x&&/^\d{8}$/.test(String(x.date))&&Number.isFinite(Number(x.close))&&Number(x.close)>0).sort((a,b)=>a.date.localeCompare(b.date));
   const daily=new Map();
   for(let i=1;i<history.length;i++){
    const previous=Number(history[i-1].close),current=Number(history[i].close);
    if(previous>0&&Number.isFinite(current))daily.set(history[i].date,current/previous-1);
   }
   if(daily.size>=15)returns.push({symbol:quote.symbol,daily});
  }
  const pairs=[];
  for(let i=0;i<returns.length;i++)for(let j=i+1;j<returns.length;j++){
   const result=correlation(returns[i].daily,returns[j].daily);
   if(result)pairs.push({a:returns[i].symbol,b:returns[j].symbol,r:result.value,n:result.count});
  }
  if(!pairs.length){panel.textContent='برای هیچ جفت نمادی حداقل ۱۵ بازده روزانه مشترک و معتبر وجود ندارد. همبستگی گزارش نشد؛ داده ساختگی یا جایگزین استفاده نشده است.';return;}
  const average=pairs.reduce((sum,p)=>sum+p.r,0)/pairs.length;
  const high=[...pairs].sort((a,b)=>Math.abs(b.r)-Math.abs(a.r)).slice(0,5);
  panel.replaceChildren();
  const title=document.createElement('strong');title.textContent='همبستگی بازده روزانه نمادها';panel.append(title);
  const summary=document.createElement('p');
  summary.textContent='نمادهای دارای تاریخچه کافی: '+fmt(returns.length)+' از '+fmt(incoming.length)+' | جفت‌های قابل محاسبه: '+fmt(pairs.length)+' | میانگین همبستگی جفتی: '+fmt(average)+' | این آمار توصیفی است و به‌تنهایی ریسک یا جهت آینده را پیش‌بینی نمی‌کند.';
  panel.append(summary);
  const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
  const head=document.createElement('tr');
  ['جفت نماد','همبستگی','روزهای مشترک'].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';head.append(th)});table.append(head);
  high.forEach(p=>{const tr=document.createElement('tr');[p.a+' / '+p.b,fmt(p.r),fmt(p.n)].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td)});table.append(tr)});
  panel.append(table);
 });

 function portfolioDrawdown(historyQuotes){
  const tableRows=[...($('livePortfolioRows')?.querySelectorAll('tr')||[])];
  if(!tableRows.length)throw Error('جدول دارایی فعلی در دسترس نیست.');
  const holdings=tableRows.map(tr=>{
   const cells=[...tr.querySelectorAll('td')];
   const symbol=String(cells[0]?.textContent||'').trim();
   const quantity=Number(digits(cells[1]?.textContent));
   if(!symbol||!Number.isSafeInteger(quantity)||quantity<=0)throw Error('نماد یا تعداد دارایی در جدول معتبر نیست.');
   return {symbol,quantity};
  });
  if(holdings.length>100||new Set(holdings.map(h=>h.symbol)).size!==holdings.length)throw Error('فهرست دارایی‌ها تکراری یا خارج از محدوده است.');
  if(!Array.isArray(historyQuotes)||historyQuotes.length!==holdings.length)throw Error('تاریخچه همه نمادهای سبد دریافت نشده است.');
  const bySymbol=new Map(historyQuotes.map(q=>[q?.symbol,q]));
  if(bySymbol.size!==holdings.length||holdings.some(h=>!bySymbol.has(h.symbol)))throw Error('نمادهای تاریخچه با سبد فعلی تطبیق کامل ندارند.');
  const maps=holdings.map(h=>{
   const history=bySymbol.get(h.symbol)?.history;
   if(!Array.isArray(history))throw Error('تاریخچه '+h.symbol+' معتبر نیست.');
   const map=new Map();
   for(const item of history){
    const date=String(item?.date??''),close=Number(item?.close);
    if(/^\d{8}$/.test(date)&&Number.isFinite(close)&&close>0)map.set(date,close*h.quantity);
   }
   if(map.size<15)throw Error('تاریخچه '+h.symbol+' کمتر از ۱۵ قیمت معتبر دارد.');
   return map;
  });
  const dates=[...maps[0].keys()].filter(date=>maps.every(m=>m.has(date))).sort();
  if(dates.length<15)throw Error('کمتر از ۱۵ روز معاملاتی مشترک برای کل سبد وجود دارد.');
  const values=dates.map(date=>maps.reduce((sum,m)=>sum+m.get(date),0));
  let peak=-Infinity,peakDate='',maxDrop=0,drawdownPeak='',troughDate='',troughValue=0,peakValue=0;
  for(let i=0;i<values.length;i++){
   if(values[i]>peak){peak=values[i];peakDate=dates[i];}
   const drop=peak>0?(peak-values[i])/peak:0;
   if(drop>maxDrop){maxDrop=drop;drawdownPeak=peakDate;troughDate=dates[i];peakValue=peak;troughValue=values[i];}
  }
  return {count:holdings.length,days:dates.length,maxDrop,drawdownPeak,troughDate,peakValue,troughValue,first:dates[0],last:dates[dates.length-1]};
 }
 window.addEventListener('sahamban:verified-historical-quotes-v50',event=>{
  const panel=$('riskDrawdownV49');if(!panel)return;
  try{
   const result=portfolioDrawdown(event?.detail?.quotes);
   panel.textContent='حداکثر افت تاریخی سبد: '+fmt(result.maxDrop*100)+'٪ | از اوج '+result.drawdownPeak+' تا کف '+result.troughDate+' | ارزش اوج: '+fmt(result.peakValue)+' | ارزش کف: '+fmt(result.troughValue)+' | '+fmt(result.count)+' نماد و '+fmt(result.days)+' روز مشترک ('+result.first+' تا '+result.last+'). محاسبه با تعداد فعلی هر نماد و قیمت‌های پایانی تاریخی انجام شده؛ کارمزد، سود نقدی، افزایش سرمایه و تغییرات تاریخی تعداد سهام لحاظ نشده‌اند.';
  }catch(e){panel.textContent='حداکثر افت محاسبه نشد: '+e.message+' داده ناقص یا غیرهم‌تراز پذیرفته نشد.';}
 });

 function portfolioLiquidity(quotes){
  const rows=[...($('livePortfolioRows')?.querySelectorAll('tr')||[])];
  if(!rows.length||rows.length>100)throw Error('جدول دارایی‌های فعلی معتبر نیست.');
  const holdings=rows.map(tr=>{
   const cells=[...tr.querySelectorAll('td')],symbol=String(cells[0]?.textContent||'').trim();
   const currentValue=Number(digits(cells[4]?.textContent));
   if(!symbol||!Number.isFinite(currentValue)||currentValue<0)throw Error('ارزش روز نماد '+(symbol||'نامشخص')+' معتبر نیست.');
   return {symbol,currentValue};
  });
  if(new Set(holdings.map(h=>h.symbol)).size!==holdings.length)throw Error('نماد تکراری در جدول دارایی‌ها وجود دارد.');
  if(!Array.isArray(quotes)||quotes.length!==holdings.length)throw Error('تاریخچه همه نمادها دریافت نشده است.');
  const lookup=new Map(quotes.map(q=>[q?.symbol,q]));
  if(lookup.size!==holdings.length||holdings.some(h=>!lookup.has(h.symbol)))throw Error('نمادهای تاریخچه با سبد فعلی تطبیق ندارند.');
  const results=holdings.map(h=>{
   const history=lookup.get(h.symbol)?.history;
   if(!Array.isArray(history))throw Error('تاریخچه '+h.symbol+' موجود نیست.');
   const valid=history.filter(x=>/^\d{8}$/.test(String(x?.date??''))&&Number.isFinite(Number(x?.tradedValue))&&Number(x.tradedValue)>=0).sort((a,b)=>a.date.localeCompare(b.date)).slice(-20);
   if(valid.length<15)throw Error('برای '+h.symbol+' کمتر از ۱۵ روز ارزش معاملات معتبر وجود دارد.');
   const average=valid.reduce((sum,x)=>sum+Number(x.tradedValue),0)/valid.length;
   return {...h,average,count:valid.length,days:average>0?h.currentValue/(average*0.10):null};
  });
  const total=results.reduce((sum,x)=>sum+x.currentValue,0);
  return results.map(x=>({...x,weight:total>0?x.currentValue/total:0})).sort((a,b)=>(b.days??Infinity)-(a.days??Infinity));
 }
 window.addEventListener('sahamban:verified-historical-quotes-v50',event=>{
  const panel=$('riskLiquidityV49');if(!panel)return;
  try{
   const results=portfolioLiquidity(event?.detail?.quotes);
   panel.replaceChildren();
   const title=document.createElement('strong');title.textContent='تحلیل نقدشوندگی بر پایه ارزش معاملات روزانه';panel.append(title);
   const note=document.createElement('p');note.textContent='میانگین ارزش معاملات از حداکثر ۲۰ جلسه اخیر (حداقل ۱۵ جلسه معتبر) محاسبه شده است. زمان تقریبی خروج با فرض مشارکت حداکثر ۱۰٪ از ارزش معاملات روزانه برآورد می‌شود؛ این برآورد تضمین اجرای سفارش نیست و صف، دامنه نوسان، توقف نماد و اثر بازار را مدل نمی‌کند.';panel.append(note);
   const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
   const head=document.createElement('tr');
   ['نماد','وزن سبد','میانگین ارزش معاملات روزانه (ریال)','روز خروج فرضی','جلسات داده'].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';head.append(th)});table.append(head);
   results.forEach(x=>{
    const tr=document.createElement('tr');
    const vals=[x.symbol,fmt(x.weight*100)+'٪',fmt(x.average),x.days===null?'بدون معامله':fmt(x.days),fmt(x.count)];
    vals.forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td)});table.append(tr);
   });
   panel.append(table);
  }catch(e){panel.textContent='تحلیل نقدشوندگی انجام نشد: '+e.message+' داده ناقص یا ارزش معاملات نامعتبر پذیرفته نشد.';}
 });

 window.addEventListener('sahamban:verified-portfolio-sectors-v50',event=>{
  const panel=$('riskSectorV49');if(!panel)return;
  try{
   const rows=[...($('livePortfolioRows')?.querySelectorAll('tr')||[])];
   const incoming=event?.detail?.quotes;
   if(!rows.length||rows.length>100||!Array.isArray(incoming))throw Error('اطلاعات سبد یا مشخصات صنعت معتبر نیست.');
   const values=new Map(rows.map(tr=>{
    const cells=[...tr.querySelectorAll('td')],symbol=String(cells[0]?.textContent||'').trim(),value=Number(digits(cells[4]?.textContent));
    if(!symbol||!Number.isFinite(value)||value<0)throw Error('ارزش روز یکی از نمادها معتبر نیست.');
    return [symbol,value];
   }));
   const unique=new Map(incoming.map(q=>[q?.symbol,q]));
   if(unique.size!==values.size||[...values.keys()].some(s=>!unique.has(s)))throw Error('فهرست نمادها با سبد فعلی تطبیق کامل ندارد.');
   const groups=new Map();let missing=[];
   for(const [symbol,value] of values){
    const q=unique.get(symbol),code=String(q?.sectorCode??'').trim(),name=String(q?.sectorName??'').trim();
    if(!code||!name){missing.push(symbol);continue;}
    const key=code;
    const g=groups.get(key)||{code,name,value:0,count:0};
    g.value+=value;g.count++;groups.set(key,g);
   }
   if(missing.length)throw Error('طبقه‌بندی صنعت برای '+missing.join('، ')+' از منبع بازار دریافت نشد؛ سهم کل صنایع و شاخص تمرکز گزارش نمی‌شود.');
   const total=[...groups.values()].reduce((sum,g)=>sum+g.value,0);
   if(!Number.isFinite(total)||total<=0)throw Error('ارزش کل سبد برای محاسبه تمرکز معتبر نیست.');
   const result=[...groups.values()].map(g=>({...g,weight:g.value/total})).sort((a,b)=>b.value-a.value);
   const hhi=result.reduce((sum,g)=>sum+g.weight*g.weight,0);
   panel.replaceChildren();
   const title=document.createElement('strong');title.textContent='تمرکز سرمایه بر اساس صنعت رسمی بازار';panel.append(title);
   const note=document.createElement('p');note.textContent='طبقه‌بندی از فیلدهای صنعت در مشخصات ابزار بازار گرفته شده است. سهم‌ها بر مبنای ارزش روز فعلی سبد محاسبه می‌شوند؛ HHI مجموع مربع وزن صنایع است و صرفاً شاخص تمرکز توصیفی است، نه پیش‌بینی ریسک.';panel.append(note);
   const summary=document.createElement('p');summary.textContent='تعداد نمادها: '+fmt(values.size)+' | تعداد صنایع: '+fmt(result.length)+' | شاخص تمرکز HHI: '+fmt(hhi)+' ('+fmt(hhi*10000)+' از ۱۰٬۰۰۰) | بزرگ‌ترین صنعت: '+result[0].name+' با سهم '+fmt(result[0].weight*100)+'٪';panel.append(summary);
   const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
   const head=document.createElement('tr');['صنعت','تعداد نماد','ارزش روز (ریال)','سهم سبد'].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';head.append(th)});table.append(head);
   result.forEach(g=>{const tr=document.createElement('tr');[g.name,fmt(g.count),fmt(g.value),fmt(g.weight*100)+'٪'].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td)});table.append(tr)});
   panel.append(table);
  }catch(e){panel.textContent='تحلیل تمرکز صنایع انجام نشد: '+e.message+' طبقه‌بندی حدسی یا جایگزین استفاده نشده است.';}
 });
})();
