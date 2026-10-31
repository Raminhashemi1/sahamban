'use strict';
/* v49 risk engine: read-only; never persists, changes or uploads holdings. */
(()=>{
 const $=id=>document.getElementById(id);
 const digits=s=>String(s??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٬،]/g,'').replace(/٫/g,'.');
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n);
 function fail(s){$('riskStatusV49').textContent=s;$('riskSummaryV49').textContent='';$('riskDetailsV49').replaceChildren();}
 function readVerifiedRows(){
  const status=$('livePortfolioStatus')?.textContent||'';
  // Accept both the legacy v50 quote status and the current v61 live-price status.
  const verified=status.match(/^(?:دریافت و اعتبارسنجی قیمت پایانی همه|دریافت قیمت جاری همه)\s+([۰-۹٠-٩0-9]+)\s+نماد موفق بود/);
  if(!verified)throw Error('ابتدا دریافت قیمت جاری همه نمادهای سبد را اجرا کنید و موفقیت کامل اعتبارسنجی قیمت‌ها را ببینید.');
  const expectedCount=Number(digits(verified[1]));
  const rows=[...($('livePortfolioRows')?.querySelectorAll('tr')||[])];
  if(!rows.length)throw Error('جدول قیمت تأییدشده در صفحه موجود نیست.');
  if(rows.length!==expectedCount)throw Error('تعداد ردیف‌های جدول ('+fmt(rows.length)+') با تعداد قیمت‌های تأییدشده ('+fmt(expectedCount)+') برابر نیست؛ گزارش ناقص پذیرفته نشد.');
  const result=rows.map(tr=>{
   const c=[...tr.querySelectorAll('td')].map(td=>td.textContent.trim());
   if(c.length<7)throw Error('ساختار جدول قیمت ناقص است.');
   const quantity=Number(digits(c[1])),buy=Number(digits(c[2])),price=Number(digits(c[3]));
   const marketDate=String(c.length>=15?c[9]:c[6]??'').trim(),priceBasis=String(c.length>=15?c[13]:'').trim();
   if(!c[0]||![quantity,buy,price].every(Number.isFinite)||quantity<=0||buy<=0||price<=0)throw Error('مقادیر نامعتبر در ردیف '+(c[0]||'نامشخص'));
   if(!/^(?:\d{8}|\d{4}\/\d{2}\/\d{2})$/.test(marketDate))throw Error('تاریخ بازار برای '+c[0]+' معتبر نیست؛ گزارش ریسک فقط با قیمت تأییدشده پذیرفته می‌شود.');
   if(c.length>=15&&priceBasis!=='آخرین معامله'&&priceBasis!=='پایانی')throw Error('مبنای قیمت برای '+c[0]+' تأیید نشده است.');
   return {symbol:c[0],quantity,buy,price,value:quantity*price,cost:quantity*buy,date:marketDate};
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

 window.addEventListener('sahamban:verified-investor-flow-v50',event=>{
  const panel=$('riskInvestorFlowV49');if(!panel)return;
  try{
   const flows=event?.detail?.flows;
   if(!Array.isArray(flows)||!flows.length||flows.length>100)throw Error('فهرست جریان پول معتبر نیست.');
   const failed=flows.filter(x=>x?.error||!x?.symbol);
   if(failed.length)throw Error('داده حقیقی و حقوقی برای '+failed.map(x=>x.symbol||'نماد نامشخص').join('، ')+' کامل دریافت نشد؛ گزارش تجمیعی صادر نمی‌شود.');
   const rows=flows.map(x=>{
    const fields=['buyIndividualValue','buyCorporateValue','sellIndividualValue','sellCorporateValue','buyIndividualVolume','sellIndividualVolume','individualBuyerCount','individualSellerCount'];
    if(fields.some(k=>!Number.isFinite(x[k])||x[k]<0))throw Error('فیلدهای جریان پول برای '+x.symbol+' معتبر نیست.');
    const net=x.buyIndividualValue-x.sellIndividualValue;
    const avgBuy=x.individualBuyerCount>0?x.buyIndividualVolume/x.individualBuyerCount:null;
    const avgSell=x.individualSellerCount>0?x.sellIndividualVolume/x.individualSellerCount:null;
    return {...x,net,avgBuy,avgSell,power:avgBuy!==null&&avgSell!==null&&avgSell>0?avgBuy/avgSell:null};
   });
   const net=rows.reduce((sum,x)=>sum+x.net,0),corporateNet=rows.reduce((sum,x)=>sum+x.buyCorporateValue-x.sellCorporateValue,0);
   const dates=new Set(rows.map(x=>x.marketDate));
   const comparable=rows.length>=5&&dates.size===1&&[...dates][0]&&rows.every(x=>x.buyIndividualValue+x.sellIndividualValue>0);
   const ratios=rows.map(x=>x.net/(x.buyIndividualValue+x.sellIndividualValue));
   const sorted=[...ratios].sort((a,b)=>a-b),median=sorted.length%2?sorted[(sorted.length-1)/2]:(sorted[sorted.length/2-1]+sorted[sorted.length/2])/2;
   const deviations=ratios.map(x=>Math.abs(x-median)).sort((a,b)=>a-b),mad=deviations.length%2?deviations[(deviations.length-1)/2]:(deviations[deviations.length/2-1]+deviations[deviations.length/2])/2;
   rows.forEach((x,i)=>{x.netRatio=ratios[i];x.robustScore=comparable&&mad>0?0.6745*(ratios[i]-median)/mad:null;x.crossSectionalOutlier=x.robustScore!==null&&Math.abs(x.robustScore)>=3.5;});
   panel.replaceChildren();
   const title=document.createElement('strong');title.textContent='جریان خرید و فروش حقیقی و حقوقی';panel.append(title);
   const note=document.createElement('p');note.textContent='مبنای محاسبه: داده رسمی نوع مشتری برای تاریخ معاملاتی هر نماد. خالص جریان حقیقی = ارزش خرید حقیقی منهای ارزش فروش حقیقی. قدرت خریدار حقیقی از میانگین حجم خرید هر خریدار تقسیم بر میانگین حجم فروش هر فروشنده محاسبه می‌شود. پرچم غیرعادی فعلی فقط مقایسه مقطعی نسبت خالص جریان به مجموع خرید و فروش حقیقی بین حداقل ۵ نماد در یک تاریخ یکسان است؛ امتیاز مقاوم MAD با آستانه ۳٫۵ استفاده می‌شود و به معنی ناهنجاری زمانی یا سیگنال خرید و فروش نیست. برای تشخیص تغییر نسبت به روزهای گذشته، سری تاریخی معتبر هنوز لازم است.';panel.append(note);
   const summary=document.createElement('p');summary.textContent='نمادهای کامل: '+fmt(rows.length)+' | خالص جریان حقیقی سبد: '+fmt(net)+' ریال | خالص جریان حقوقی سبد: '+fmt(corporateNet)+' ریال | نمادهای دارای انحراف مقطعی قوی: '+(comparable?fmt(rows.filter(x=>x.crossSectionalOutlier).length):'قابل محاسبه نیست؛ حداقل ۵ نماد با تاریخ یکسان لازم است');panel.append(summary);
   const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
   const head=document.createElement('tr');['نماد','خالص حقیقی (ریال)','خالص حقوقی (ریال)','قدرت خریدار حقیقی','نسبت خالص حقیقی','امتیاز انحراف مقطعی','تاریخ داده'].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';head.append(th)});table.append(head);
   rows.forEach(x=>{const tr=document.createElement('tr');[x.symbol,fmt(x.net),fmt(x.buyCorporateValue-x.sellCorporateValue),x.power===null?'ناموجود':fmt(x.power),fmt(x.netRatio*100)+'٪',x.robustScore===null?'ناموجود':fmt(x.robustScore)+(x.crossSectionalOutlier?' | غیرعادی':''),x.marketDate].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td)});table.append(tr)});
   panel.append(table);
  }catch(e){panel.textContent='تحلیل جریان حقیقی و حقوقی انجام نشد: '+e.message+' داده ناقص به‌صورت جمع کل نمایش داده نمی‌شود.';}
 });

 window.addEventListener('sahamban:verified-investor-flow-history-v50',event=>{
  const panel=$('riskInvestorFlowHistoryV50');if(!panel)return;
  try{
   const series=event?.detail?.series,depth=event?.detail?.depth;
   if(!Array.isArray(series)||!series.length||series.length>100||![5,10,20].includes(depth))throw Error('ساختار تاریخچه معتبر نیست.');
   const rows=series.map(item=>{
    if(!item?.symbol||!Array.isArray(item.observations))throw Error('سری نماد نامعتبر است.');
    const valid=item.observations.filter(x=>!x.error&&String(x.date).length===8&&[...String(x.date)].every(ch=>ch>='0'&&ch<='9')&&Number.isFinite(x.netRatio)&&Number.isFinite(x.netIndividual)).sort((a,b)=>a.date.localeCompare(b.date));
    if(new Set(valid.map(x=>x.date)).size!==valid.length)throw Error('تاریخ تکراری برای '+item.symbol);
    const latest=valid.at(-1),baseline=valid.slice(0,-1).slice(-10);
    if(!latest||baseline.length<5)return {symbol:item.symbol,latest,baselineCount:baseline.length,score:null,flag:false,net:latest?.netIndividual??null};
    const medianOf=a=>{const v=[...a].sort((x,y)=>x-y);return v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2;};
    const median=medianOf(baseline.map(x=>x.netRatio)),mad=medianOf(baseline.map(x=>Math.abs(x.netRatio-median)));
    const score=mad>0?0.6745*(latest.netRatio-median)/mad:null;
    return {symbol:item.symbol,latest,baselineCount:baseline.length,score,flag:score!==null&&Math.abs(score)>=3.5,net:latest.netIndividual};
   });
   panel.replaceChildren();
   const title=document.createElement('strong');title.textContent='روند تاریخی جریان پول حقیقی';panel.append(title);
   const note=document.createElement('p');note.textContent='نسبت خالص جریان حقیقی به مجموع خرید و فروش حقیقی در آخرین جلسه با حداکثر ۱۰ مشاهده پیشین همان نماد مقایسه می‌شود. حداقل ۵ مشاهده پیشین لازم است. امتیاز مقاوم MAD با آستانه ۳٫۵ شاخص آماری است، نه سیگنال خرید یا فروش.';panel.append(note);
   const summary=document.createElement('p');summary.textContent='نمادهای بررسی‌شده: '+fmt(rows.length)+' | دارای حداقل ۵ جلسه مبنا: '+fmt(rows.filter(x=>x.score!==null).length)+' | انحراف زمانی قوی: '+fmt(rows.filter(x=>x.flag).length)+' | بازه درخواستی: '+fmt(depth)+' جلسه';panel.append(summary);
   const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
   const head=document.createElement('tr');['نماد','تاریخ','خالص حقیقی (ریال)','نسبت خالص','جلسات مبنا','امتیاز MAD','وضعیت'].forEach(v=>{const th=document.createElement('th');th.textContent=v;table.appendChild(head);th.style.padding='7px';head.append(th)});table.append(head);
   rows.forEach(x=>{const tr=document.createElement('tr');[x.symbol,x.latest?.date||'ناموجود',x.net===null?'ناموجود':fmt(x.net),x.latest?fmt(x.latest.netRatio*100)+'٪':'ناموجود',fmt(x.baselineCount),x.score===null?'ناموجود':fmt(x.score),x.flag?'انحراف غیرعادی':x.score===null?'داده ناکافی':'در محدوده مبنا'].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.padding='7px';tr.append(td)});table.append(tr)});
   panel.append(table);
  }catch(e){panel.textContent='تحلیل تاریخی جریان پول انجام نشد: '+e.message+'؛ داده ناقص به هشدار تبدیل نمی‌شود.';}
 });

 const scoreState={quotes:null,flows:null,sector:null};
 const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
 function renderScorecard(){
  const panel=$('riskScorecardV51');if(!panel||!scoreState.quotes)return;
  try{
   const quotes=scoreState.quotes,rows=[...($('livePortfolioRows')?.querySelectorAll('tr')||[])];
   if(!Array.isArray(quotes)||!rows.length||rows.length>100)throw Error('قیمت یا سبد معتبر در دسترس نیست.');
   const holdings=rows.map(tr=>{const c=[...tr.querySelectorAll('td')],symbol=String(c[0]?.textContent||'').trim(),quantity=Number(digits(c[1]?.textContent)),value=Number(digits(c[4]?.textContent));if(!symbol||!Number.isSafeInteger(quantity)||quantity<=0||!Number.isFinite(value)||value<0)throw Error('اطلاعات دارایی نامعتبر است.');return {symbol,quantity,value};});
   const qmap=new Map(quotes.map(q=>[q?.symbol,q]));
   if(qmap.size!==holdings.length||holdings.some(h=>!qmap.has(h.symbol)))throw Error('تاریخچه با نمادهای سبد فعلی تطبیق کامل ندارد.');
   const flowMap=new Map((scoreState.flows?.series||[]).map(x=>[x.symbol,x]));
   const retMaps=new Map();
   for(const q of quotes){
    const hist=Array.isArray(q.history)?q.history.filter(x=>x&&/^\d{8}$/.test(String(x.date))&&Number.isFinite(Number(x.close))&&Number(x.close)>0).sort((a,b)=>a.date.localeCompare(b.date)):[];
    const closes=hist.map(x=>Number(x.close)),daily=new Map();
    for(let i=1;i<hist.length;i++)daily.set(hist[i].date,closes[i]/closes[i-1]-1);
    retMaps.set(q.symbol,daily);
   }
   const rowsOut=holdings.map(h=>{
    const q=qmap.get(h.symbol),hist=(q.history||[]).filter(x=>/^\d{8}$/.test(String(x?.date??''))&&Number.isFinite(Number(x.close))&&Number(x.close)>0).sort((a,b)=>a.date.localeCompare(b.date));
    const components=[];
    if(hist.length>=26){
     const closes=hist.map(x=>Number(x.close)),last=closes.at(-1),sma=closes.slice(-20).reduce((a,b)=>a+b,0)/20;
     const changes=closes.slice(-15).map((v,i,a)=>i?v-a[i-1]:0).slice(1),gains=changes.map(x=>Math.max(0,x)),losses=changes.map(x=>Math.max(0,-x));
     const ag=gains.reduce((a,b)=>a+b,0)/14,al=losses.reduce((a,b)=>a+b,0)/14, rsi=al===0?100:100-100/(1+ag/al);
     const trend=clamp(50+(last/sma-1)*500),momentum=clamp(100-Math.abs(rsi-50)*1.5);
     components.push({name:'تکنیکال',weight:40,score:(trend+momentum)/2});
    }
    const flow=flowMap.get(h.symbol),obs=(flow?.observations||[]).filter(x=>!x.error&&Number.isFinite(x.netRatio)).sort((a,b)=>a.date.localeCompare(b.date));
    if(obs.length>=6){
     const base=obs.slice(0,-1).slice(-10).map(x=>x.netRatio).sort((a,b)=>a-b),mid=base.length%2?base[(base.length-1)/2]:(base[base.length/2-1]+base[base.length/2])/2;
     const dev=base.map(x=>Math.abs(x-mid)).sort((a,b)=>a-b),mad=dev.length%2?dev[(dev.length-1)/2]:(dev[dev.length/2-1]+dev[dev.length/2])/2;
     const z=mad>0?0.6745*(obs.at(-1).netRatio-mid)/mad:null;
     components.push({name:'جریان پول',weight:25,score:z===null?clamp(50+obs.at(-1).netRatio*50):clamp(50+z*7)});
    }
    const liquidity=(q.history||[]).filter(x=>Number.isFinite(Number(x?.tradedValue))&&Number(x.tradedValue)>0).slice(-20);
    if(liquidity.length>=15){
     const avg=liquidity.reduce((a,x)=>a+Number(x.tradedValue),0)/liquidity.length,days=avg>0?h.value/(avg*.1):null;
     if(days!==null&&Number.isFinite(days))components.push({name:'نقدشوندگی',weight:20,score:days<=1?100:days<=3?80:days<=7?60:days<=15?35:10});
    }
    const own=retMaps.get(h.symbol)||[],corrs=[];
    for(const other of holdings){if(other.symbol===h.symbol)continue;const b=retMaps.get(other.symbol)||[],keys=[...own.keys()].filter(k=>b.has(k)).sort();if(keys.length<15)continue;const x=keys.map(k=>own.get(k)),y=keys.map(k=>b.get(k)),mx=x.reduce((a,v)=>a+v,0)/x.length,my=y.reduce((a,v)=>a+v,0)/y.length;let cov=0,vx=0,vy=0;for(let i=0;i<x.length;i++){const dx=x[i]-mx,dy=y[i]-my;cov+=dx*dy;vx+=dx*dx;vy+=dy*dy;}if(vx>0&&vy>0)corrs.push(Math.abs(cov/Math.sqrt(vx*vy)));}
    if(corrs.length)components.push({name:'تنوع/همبستگی',weight:15,score:clamp(100-corrs.reduce((a,b)=>a+b,0)/corrs.length*100)});
    const used=components.reduce((a,x)=>a+x.weight,0),score=used?components.reduce((a,x)=>a+x.score*x.weight,0)/used:null;
    return {...h,components,score,coverage:used/100*100};
   });
   const total=rowsOut.reduce((a,x)=>a+x.value,0),available=rowsOut.filter(x=>x.score!==null),portfolio=total>0?available.reduce((a,x)=>a+x.score*x.value,0)/total:null;
   const coverage=total>0?rowsOut.reduce((a,x)=>a+x.coverage*x.value,0)/total:0;
   panel.replaceChildren();
   const title=document.createElement('strong');title.textContent='امتیاز تحلیلی نمادها و سبد';panel.append(title);
   const note=document.createElement('p');note.textContent='امتیاز ۰ تا ۱۰۰، شاخص توصیفی داخلی است و احتمال سود یا توصیه معامله نیست. وزن مؤلفه‌ها: تکنیکال ۴۰، جریان پول ۲۵، نقدشوندگی ۲۰ و تنوع بر پایه همبستگی ۱۵. مؤلفه‌های فاقد داده حذف و وزن باقی‌مانده برای امتیاز نماد نرمال می‌شود؛ پوشش داده جداگانه گزارش شده است. برای امتیاز سبد، نماد بدون امتیاز صفر فرض نمی‌شود و پوشش کل اعلام می‌شود.';panel.append(note);
   const summary=document.createElement('p');summary.textContent='امتیاز وزنی نمادهای قابل ارزیابی: '+(portfolio===null?'ناموجود':fmt(portfolio))+' از ۱۰۰ | پوشش وزنی داده: '+fmt(coverage)+'٪ | نمادهای دارای امتیاز: '+fmt(available.length)+' از '+fmt(rowsOut.length);panel.append(summary);
   const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';const head=document.createElement('tr');
   ['رتبه','نماد','امتیاز','پوشش داده','تکنیکال','جریان پول','نقدشوندگی','تنوع','هم‌جهتی شاخص‌ها'].forEach(v=>{const th=document.createElement('th');th.textContent=v;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';head.append(th)});table.append(head);
   rowsOut.sort((a,b)=>(b.score??-1)-(a.score??-1)||b.coverage-a.coverage||b.value-a.value).forEach((x,index)=>{const m=Object.fromEntries(x.components.map(c=>[c.name,c.score]));const tr=document.createElement('tr');const rank=x.score===null?'—':String(index+1);const alignment=m['تکنیکال']!==undefined&&m['جریان پول']!==undefined&&m['تکنیکال']>=60&&m['جریان پول']>=60?'هم‌جهت مثبت':m['نقدشوندگی']!==undefined&&m['نقدشوندگی']<35?'ریسک نقدشوندگی':'خنثی/ناقص';[rank,x.symbol,x.score===null?'ناموجود':fmt(x.score),fmt(x.coverage)+'٪',m['تکنیکال']===undefined?'ناموجود':fmt(m['تکنیکال']),m['جریان پول']===undefined?'ناموجود':fmt(m['جریان پول']),m['نقدشوندگی']===undefined?'ناموجود':fmt(m['نقدشوندگی']),m['تنوع/همبستگی']===undefined?'ناموجود':fmt(m['تنوع/همبستگی']),alignment].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td)});table.append(tr)});
   panel.append(table);

   const daily=$('riskDailyReportV52');
   if(daily){
    daily.replaceChildren();
    const title=document.createElement('strong');title.textContent='گزارش تغییرات روزانه سبد';daily.append(title);
    const note=document.createElement('p');note.textContent='تغییر قیمت نسبت به آخرین جلسه قبلی موجود در تاریخچه و تغییر پنج‌جلسه‌ای بر پایه قیمت‌های ثبت‌شده محاسبه می‌شود. جریان پول مربوط به آخرین تاریخ معتبر دریافت‌شده است؛ این گزارش جایگزین ذخیره امتیاز روزهای قبل نیست.';daily.append(note);
    const reportRows=holdings.map(h=>{
     const q=qmap.get(h.symbol),hist=(q.history||[]).filter(x=>x&&String(x.date||'').length===8&&Number.isFinite(Number(x.close))&&Number(x.close)>0).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
     const last=hist.at(-1),prev=hist.at(-2),five=hist.length>=6?hist.at(-6):null;
     const pct=(a,b)=>a&&b?((Number(a.close)/Number(b.close))-1)*100:null;
     const flow=(flowMap.get(h.symbol)?.observations||[]).filter(x=>!x.error&&Number.isFinite(x.netIndividual)).sort((a,b)=>String(a.date).localeCompare(String(b.date))).at(-1);
     return {symbol:h.symbol,date:last?.date,day:pct(last,prev),five:pct(last,five),net:flow?.netIndividual??null,flowDate:flow?.date??null};
    });
    const summary=document.createElement('p');summary.textContent='نمادهای سبد: '+fmt(reportRows.length)+' | دارای تغییر روزانه: '+fmt(reportRows.filter(x=>x.day!==null).length)+' | دارای جریان پول معتبر: '+fmt(reportRows.filter(x=>x.net!==null).length);daily.append(summary);
    const rt=document.createElement('table');rt.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
    const rh=document.createElement('tr');['نماد','تاریخ قیمت','تغییر جلسه‌ای','تغییر ۵ جلسه‌ای','خالص پول حقیقی','تاریخ جریان پول'].forEach(v=>{const th=document.createElement('th');th.textContent=v;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';rh.append(th)});rt.append(rh);
    reportRows.forEach(x=>{const tr=document.createElement('tr');[x.symbol,x.date||'ناموجود',x.day===null?'ناموجود':fmt(x.day)+'٪',x.five===null?'داده ناکافی':fmt(x.five)+'٪',x.net===null?'ناموجود':fmt(x.net),x.flowDate||'ناموجود'].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td)});rt.append(tr)});
    daily.append(rt);
   }

   renderStressReport(holdings,qmap,rowsOut,retMaps);
   renderAllocationReport(holdings,qmap,retMaps);
   const alertPanel=$('riskAlertsV53');
   if(alertPanel){
    alertPanel.replaceChildren();
    const at=document.createElement('strong');at.textContent='هشدارهای تحلیلی سبد';alertPanel.append(at);
    const alerts=[];
    rowsOut.forEach(x=>{
     const m=Object.fromEntries(x.components.map(c=>[c.name,c.score]));
     const q=qmap.get(x.symbol),hist=(q.history||[]).filter(v=>v&&String(v.date||'').length===8&&Number.isFinite(Number(v.close))&&Number(v.close)>0).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
     const latest=hist.at(-1),previous=hist.at(-2);
     const dayChange=latest&&previous?(Number(latest.close)/Number(previous.close)-1)*100:null;
     const obs=(flowMap.get(x.symbol)?.observations||[]).filter(v=>!v.error&&Number.isFinite(v.netRatio)).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
     let flowZ=null;
     if(obs.length>=6){
      const base=obs.slice(0,-1).slice(-10).map(v=>v.netRatio).sort((a,b)=>a-b),mid=base.length%2?base[(base.length-1)/2]:(base[base.length/2-1]+base[base.length/2])/2;
      const deviations=base.map(v=>Math.abs(v-mid)).sort((a,b)=>a-b),mad=deviations.length%2?deviations[(deviations.length-1)/2]:(deviations[deviations.length/2-1]+deviations[deviations.length/2])/2;
      if(mad>0)flowZ=.6745*(obs.at(-1).netRatio-mid)/mad;
     }
     if(dayChange!==null&&dayChange<=-5)alerts.push({symbol:x.symbol,level:'زیاد',message:'افت قیمت حداقل ۵٪ نسبت به جلسه قبل'});
     if(m['نقدشوندگی']!==undefined&&m['نقدشوندگی']<35)alerts.push({symbol:x.symbol,level:'زیاد',message:'امتیاز نقدشوندگی پایین است'});
     if(m['تکنیکال']!==undefined&&m['تکنیکال']<35)alerts.push({symbol:x.symbol,level:'متوسط',message:'امتیاز تکنیکال پایین است'});
     if(flowZ!==null&&flowZ<=-3.5)alerts.push({symbol:x.symbol,level:'زیاد',message:'خروج پول حقیقی به‌شدت غیرعادی نسبت به سابقه نماد'});
     if(m['تکنیکال']!==undefined&&m['جریان پول']!==undefined&&m['تکنیکال']<40&&m['جریان پول']<40)alerts.push({symbol:x.symbol,level:'زیاد',message:'ضعف هم‌زمان تکنیکال و جریان پول'});
    });
    const summary=document.createElement('p');summary.textContent='تعداد هشدارها: '+fmt(alerts.length)+' | نمادهای دارای هشدار: '+fmt(new Set(alerts.map(a=>a.symbol)).size)+' از '+fmt(rowsOut.length)+'. آستانه افت قیمت: ۵٪ در یک جلسه؛ سایر آستانه‌ها طبق امتیازهای ۰ تا ۱۰۰ و MAD تعریف شده‌اند.';alertPanel.append(summary);
    if(!alerts.length){const none=document.createElement('p');none.textContent='با داده‌های معتبر فعلی، هیچ‌یک از آستانه‌های هشدار تعریف‌شده فعال نشده است. این نتیجه به معنی نبود ریسک نیست.';alertPanel.append(none);}
    const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
    const head=document.createElement('tr');['نماد','شدت','دلیل هشدار'].forEach(v=>{const th=document.createElement('th');th.textContent=v;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';head.append(th)});table.append(head);
    alerts.forEach(a=>{const tr=document.createElement('tr');[a.symbol,a.level,a.message].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td)});table.append(tr)});alertPanel.append(table);
    const disclaimer=document.createElement('p');disclaimer.textContent='این هشدارها صرفاً غربالگر داده‌محورند؛ ممکن است به‌علت تأخیر داده یا شرایط بازار کامل نباشند و توصیه معاملاتی محسوب نمی‌شوند.';alertPanel.append(disclaimer);
   }
  }catch(e){panel.textContent='امتیازدهی انجام نشد: '+e.message+'؛ داده ناقص به‌عنوان امتیاز معتبر نمایش داده نمی‌شود.';}
 }
 window.addEventListener('sahamban:verified-historical-quotes-v50',event=>{scoreState.quotes=event?.detail?.quotes;renderScorecard();});
 window.addEventListener('sahamban:verified-investor-flow-history-v50',event=>{scoreState.flows=event?.detail;renderScorecard();});

 window.addEventListener('sahamban:verified-portfolio-sectors-v50',event=>{scoreState.sectors=Array.isArray(event?.detail?.quotes)?event.detail.quotes:[];renderScorecard();});
 function renderStressReport(holdings,qmap,rowsOut,retMaps){
  const box=$('riskStressV54');if(!box)return;
  try{
   const total=holdings.reduce((a,h)=>a+h.value,0);
   if(!(total>0))throw Error('ارزش کل سبد معتبر نیست.');
   const weights=holdings.map(h=>({h,w:h.value/total,q:qmap.get(h.symbol)}));
   const sectors=new Map();
   const sectorMap=new Map((scoreState.sectors||[]).map(x=>[x.symbol,x]));
   weights.forEach(x=>{const info=sectorMap.get(x.h.symbol),name=String(info?.sectorName||info?.sectorCode||'نامشخص').trim()||'نامشخص';sectors.set(name,(sectors.get(name)||0)+x.w);});
   const concentration=[...sectors].sort((a,b)=>b[1]-a[1]);
   const sectorHHI=concentration.reduce((a,x)=>a+x[1]*x[1],0);
   const dated=new Map();
   weights.forEach(({h,q,w})=>{const hist=(q?.history||[]).filter(x=>x&&String(x.date||'').length===8&&Number.isFinite(Number(x.close))&&Number(x.close)>0).sort((a,b)=>String(a.date).localeCompare(String(b.date)));for(let i=1;i<hist.length;i++){const date=hist[i].date,ret=Number(hist[i].close)/Number(hist[i-1].close)-1;if(!dated.has(date))dated.set(date,{sum:0,weight:0});const d=dated.get(date);d.sum+=w*ret;d.weight+=w;}});
   const returns=[...dated].filter(([,v])=>v.weight>=.8).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,v])=>({date,ret:v.sum/v.weight}));
   let equity=1,peak=1,maxDrawdown=0;for(const x of returns){equity*=1+x.ret;peak=Math.max(peak,equity);maxDrawdown=Math.min(maxDrawdown,equity/peak-1);}
   const shocks=[-5,-10,-20].map(pct=>({pct,loss:total*Math.abs(pct)/100}));
   const dominant=concentration[0],sectorLoss=dominant?total*dominant[1]*.15:null;
   box.replaceChildren();
   const title=document.createElement('strong');title.textContent='ریسک سبد و سناریوهای تنش';box.append(title);
   const note=document.createElement('p');note.textContent='افت سرمایه تاریخی با وزن‌های فعلی دارایی‌ها روی تاریخ‌های مشترک بازسازی شده و اثر معاملات و تغییر وزن تاریخی را لحاظ نمی‌کند. سناریوهای منفی، شوک یکنواخت فرضی به کل ارزش سبد هستند، نه پیش‌بینی. سناریوی صنعت، افت فرضی ۱۵٪ فقط برای بزرگ‌ترین صنعت است. داده ناقص حذف می‌شود و پوشش زمانی گزارش می‌شود.';box.append(note);
   const summary=document.createElement('p');summary.textContent='ارزش سبد: '+fmt(total)+' | جلسات مشترک قابل محاسبه: '+fmt(returns.length)+' | پوشش وزن در جلسات: '+(returns.length?fmt(Math.min(...[...dated.values()].map(x=>x.weight))*100)+'٪':'ناموجود')+' | بیشینه افت تاریخی تقریبی: '+(returns.length>=2?fmt(Math.abs(maxDrawdown)*100)+'٪':'داده ناکافی؛ حداقل دو بازده مشترک لازم است')+' | HHI تمرکز صنعت: '+fmt(sectorHHI*10000);box.append(summary);
   const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';const head=document.createElement('tr');['سناریو','افت فرضی','زیان برآوردی سبد'].forEach(v=>{const th=document.createElement('th');th.textContent=v;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';head.append(th)});table.append(head);
   shocks.forEach(x=>{const tr=document.createElement('tr');['شوک یکنواخت',x.pct+'٪-',fmt(x.loss)+' ریال'].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td)});table.append(tr)});box.append(table);
   const sectorTitle=document.createElement('p');sectorTitle.textContent=dominant?'بزرگ‌ترین تمرکز صنعت: '+dominant[0]+' ('+fmt(dominant[1]*100)+'٪ از ارزش سبد) | زیان فرضی با افت ۱۵٪ این صنعت: '+fmt(sectorLoss)+' ریال':'اطلاعات صنعت برای محاسبه تمرکز در دسترس نیست.';box.append(sectorTitle);
   const sectorTable=document.createElement('table');sectorTable.style.cssText='width:100%;border-collapse:collapse;font-size:13px';const sh=document.createElement('tr');['صنعت','وزن از ارزش سبد'].forEach(v=>{const th=document.createElement('th');th.textContent=v;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';sh.append(th)});sectorTable.append(sh);
   concentration.forEach(([name,w])=>{const tr=document.createElement('tr');[name,fmt(w*100)+'٪'].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td)});sectorTable.append(tr)});box.append(sectorTable);
   const pairCorr=[];
   for(let i=0;i<weights.length;i++)for(let j=i+1;j<weights.length;j++){
    const a=retMaps.get(weights[i].h.symbol)||new Map(),b=retMaps.get(weights[j].h.symbol)||new Map(),keys=[...a.keys()].filter(k=>b.has(k)).sort();
    if(keys.length<15)continue;
    const x=keys.map(k=>a.get(k)),y=keys.map(k=>b.get(k)),mx=x.reduce((u,v)=>u+v,0)/x.length,my=y.reduce((u,v)=>u+v,0)/y.length;
    let cov=0,vx=0,vy=0;for(let k=0;k<x.length;k++){const dx=x[k]-mx,dy=y[k]-my;cov+=dx*dy;vx+=dx*dx;vy+=dy*dy;}
    if(vx>0&&vy>0)pairCorr.push({a:weights[i].h.symbol,b:weights[j].h.symbol,corr:cov/Math.sqrt(vx*vy),n:keys.length});
   }
   const corrTitle=document.createElement('p');corrTitle.textContent='همبستگی زوجی: '+fmt(pairCorr.length)+' جفت با حداقل ۱۵ جلسه مشترک؛ میانگین قدرمطلق همبستگی: '+(pairCorr.length?fmt(pairCorr.reduce((u,v)=>u+Math.abs(v.corr),0)/pairCorr.length*100)+'٪':'داده ناکافی');box.append(corrTitle);
   if(returns.length>=20){
    const dailyReturns=returns.map(x=>x.ret).filter(Number.isFinite),mean=dailyReturns.reduce((u,v)=>u+v,0)/dailyReturns.length;
    const variance=dailyReturns.reduce((u,v)=>u+(v-mean)**2,0)/(dailyReturns.length-1),annualVol=Math.sqrt(variance)*Math.sqrt(252);
    let seed=20261031;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const outcomes=[];for(let path=0;path<2000;path++){let equity=1;for(let day=0;day<20;day++)equity*=Math.max(.000001,1+dailyReturns[Math.floor(random()*dailyReturns.length)]);outcomes.push(equity-1);}
    outcomes.sort((a,b)=>a-b);const q=(p)=>outcomes[Math.floor((outcomes.length-1)*p)],q05=q(.05),q50=q(.5),q95=q(.95),tail=outcomes.filter(x=>x<=q05),cvar=tail.reduce((u,v)=>u+v,0)/tail.length;
    const mc=document.createElement('p');mc.textContent='شبیه‌سازی تاریخی مونت‌کارلو (بوت‌استرپ روزانه، ۲٬۰۰۰ مسیر، افق ۲۰ جلسه): نوسان سالانه‌شده سبد '+fmt(annualVol*100)+'٪ | صدک ۵٪ بازده '+fmt(q05*100)+'٪ | میانه '+fmt(q50*100)+'٪ | صدک ۹۵٪ '+fmt(q95*100)+'٪ | میانگین بدترین ۵٪ مسیرها (CVaR) '+fmt(cvar*100)+'٪.';box.append(mc);
   }else{const mc=document.createElement('p');mc.textContent='شبیه‌سازی مونت‌کارلو انجام نشد: برای برآورد قابل اتکا حداقل ۲۰ بازده روزانه مشترک با پوشش حداقل ۸۰٪ وزن لازم است؛ داده فعلی '+fmt(returns.length)+' جلسه است.';box.append(mc);}
   const methodology=document.createElement('p');methodology.textContent='ریسک ترکیبی با بازده روزانه سبد و وزن‌های فعلی محاسبه می‌شود؛ این تجمیع، هم‌حرکتی نمادها را در روزهای مشترک حفظ می‌کند. مونت‌کارلو از بازنمونه‌گیری تاریخی بازده روزانه سبد استفاده می‌کند، نه فرض توزیع نرمال؛ وابستگی زمانی، تغییر وزن، هزینه معامله و شوک‌های خارج از نمونه را مدل نمی‌کند. نتایج سناریویی‌اند، تضمین یا پیش‌بینی نیستند.';box.append(methodology);

  }catch(e){box.textContent='گزارش ریسک محاسبه نشد: '+e.message+'؛ از داده ناقص برآورد قطعی ساخته نمی‌شود.';}
 }

 function renderAllocationReport(holdings,qmap,retMaps){
  const box=$('riskAllocationV55');if(!box)return;
  try{
   const total=holdings.reduce((a,h)=>a+h.value,0);if(!(total>0))throw Error('ارزش کل سبد معتبر نیست.');
   const eligible=holdings.map(h=>{
    const series=[...(retMaps.get(h.symbol)||new Map()).entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-61).map(x=>x[1]).filter(Number.isFinite);
    if(series.length<20)return {...h,vol:null};
    const mean=series.reduce((a,b)=>a+b,0)/series.length;
    const variance=series.reduce((a,b)=>a+(b-mean)**2,0)/(series.length-1);
    const vol=Math.sqrt(variance)*Math.sqrt(252);
    return {...h,vol:Number.isFinite(vol)&&vol>0?vol:null};
   });
   const active=eligible.filter(x=>x.vol!==null);
   if(!active.length)throw Error('برای هیچ نمادی حداقل ۲۰ بازده روزانه معتبر موجود نیست.');
   const inverse=active.map(x=>1/x.vol),sum=inverse.reduce((a,b)=>a+b,0);
   const cap=Math.max(.2,1/active.length),target=Array(active.length).fill(0),remaining=new Set(active.map((x,i)=>i));
   let left=1;
   while(remaining.size){
    const denom=[...remaining].reduce((a,i)=>a+inverse[i],0);
    if(!(denom>0))break;
    let capped=false;
    for(const i of [...remaining]){
     const proposed=left*inverse[i]/denom;
     if(proposed>cap){target[i]=cap;left-=cap;remaining.delete(i);capped=true;}
    }
    if(!capped){for(const i of remaining)target[i]=left*inverse[i]/denom;left=0;break;}
   }
   const targetMap=new Map(active.map((x,i)=>[x.symbol,target[i]]));
   box.replaceChildren();
   const title=document.createElement('strong');title.textContent='مقایسه وزن فعلی با تخصیص فرضی مبتنی بر نوسان';box.append(title);
   const note=document.createElement('p');note.textContent='وزن هدف با روش معکوس نوسان سالانه‌شده و سقف ۲۰٪ برای هر نماد واجد شرایط محاسبه می‌شود؛ در سبدهای کمتر از پنج نماد، سقف حداقل به وزن مساوی افزایش می‌یابد. این روش بهینه‌سازی میانگین-واریانس یا برابری ریسک کامل نیست، هزینه معامله و مالیات را لحاظ نمی‌کند و توصیه خرید/فروش نیست. نمادهای فاقد ۲۰ بازده روزانه از تخصیص هدف کنار گذاشته می‌شوند؛ بنابراین وزن‌های هدف فقط بین نمادهای واجد شرایط جمعاً ۱۰۰٪ می‌شوند.';box.append(note);
   const eligibleValue=active.reduce((a,x)=>a+x.value,0);
   const summary=document.createElement('p');summary.textContent='نمادهای واجد شرایط: '+fmt(active.length)+' از '+fmt(holdings.length)+' | ارزش نمادهای واجد شرایط: '+fmt(eligibleValue)+' ریال | روش: معکوس نوسان با سقف '+fmt(cap*100)+'٪';box.append(summary);
   const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';const head=document.createElement('tr');
   ['نماد','وزن فعلی از کل سبد','وزن هدف در بخش واجد شرایط','اختلاف هدف و فعلی','نوسان سالانه‌شده'].forEach(v=>{const th=document.createElement('th');th.textContent=v;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';head.append(th)});table.append(head);
   eligible.forEach(x=>{const current=x.value/total,targetWeight=targetMap.get(x.symbol),tr=document.createElement('tr');[x.symbol,fmt(current*100)+'٪',targetWeight===undefined?'داده ناکافی':fmt(targetWeight*100)+'٪',targetWeight===undefined?'محاسبه‌نشده':fmt((targetWeight-current)*100)+' واحد درصد',x.vol===null?'داده ناکافی':fmt(x.vol*100)+'٪'].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td)});table.append(tr)});
   box.append(table);
   const footer=document.createElement('p');footer.textContent='اختلاف وزن صرفاً فاصله ریاضی از تخصیص فرضی است. هیچ سفارش، انتقال وجه یا تغییری در سبد ثبت نشده است.';box.append(footer);
  }catch(e){box.textContent='تخصیص فرضی محاسبه نشد: '+e.message+'؛ داده ناقص به وزن هدف تبدیل نمی‌شود.';}
 }
})();
