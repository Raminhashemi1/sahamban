'use strict';
/* Historical turnover trend: descriptive comparison, not a liquidity or trade signal.
 * Consumes verified history in memory and never contacts APIs or writes to storage.
 */
(()=>{
 const panel=document.getElementById('portfolioTradingTrendV66');
 if(!panel)return;
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n);
 const validDate=date=>/^\d{8}$/.test(String(date??''));
 const validValue=n=>Number.isSafeInteger(n)&&n>=0;
 function compare(history){
  if(!Array.isArray(history))return {ok:false,reason:'تاریخچه معتبر موجود نیست'};
  const dates=history.filter(x=>validDate(x?.date)).sort((a,b)=>a.date.localeCompare(b.date));
  const recent=dates.slice(-20);
  if(recent.length!==20||new Set(recent.map(x=>x.date)).size!==20)return {ok:false,reason:'۲۰ جلسه یکتای معتبر موجود نیست'};
  const previous=recent.slice(0,10).map(x=>x.tradedValue).filter(validValue);
  const current=recent.slice(10).map(x=>x.tradedValue).filter(validValue);
  if(previous.length<8||current.length<8)return {ok:false,reason:'پوشش داده کمتر از ۸ جلسه در یکی از دو بازه است',previous:previous.length,current:current.length};
  const oldMean=previous.reduce((a,b)=>a+b,0)/previous.length;
  const newMean=current.reduce((a,b)=>a+b,0)/current.length;
  if(!Number.isFinite(oldMean)||!Number.isFinite(newMean)||oldMean<=0)return {ok:false,reason:'میانگین دوره قبلی صفر یا نامعتبر است'};
  const change=(newMean/oldMean-1)*100;
  if(!Number.isFinite(change))return {ok:false,reason:'تغییر درصدی قابل محاسبه نیست'};
  return {ok:true,oldMean,newMean,change,previous:previous.length,current:current.length,start:recent[0].date,end:recent[19].date};
 }
 window.addEventListener('sahamban:verified-historical-quotes-v50',event=>{
  try{
   const quotes=event?.detail?.quotes;
   if(!Array.isArray(quotes)||!quotes.length||quotes.length>100)throw Error('فهرست تاریخچه معتبر نیست.');
   panel.replaceChildren();
   const title=document.createElement('strong');title.textContent='روند ارزش معاملات: ۱۰ جلسه اخیر در برابر ۱۰ جلسه پیشین';panel.append(title);
   const note=document.createElement('p');note.textContent='صرفاً تاریخچه تأییدشده TSETMC بررسی می‌شود. هر دوره باید حداقل ۸ مشاهده معتبر از ۱۰ جلسه داشته باشد. تغییر میانگین ارزش معاملات به معنی بهبود نقدشوندگی، سیگنال خرید یا توصیه فروش نیست.';panel.append(note);
   const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
   const header=document.createElement('tr');
   ['نماد','میانگین ۱۰ جلسه پیشین (ریال)','میانگین ۱۰ جلسه اخیر (ریال)','تغییر درصدی','پوشش داده','اعتبار'].forEach(v=>{const th=document.createElement('th');th.textContent=v;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';header.append(th)});
   table.append(header);
   let eligible=0;
   for(const q of quotes){
    const result=compare(q?.history);
    if(result.ok)eligible++;
    const tr=document.createElement('tr');
    const cells=result.ok?[q.symbol,fmt(result.oldMean),fmt(result.newMean),fmt(result.change)+'٪',result.previous+'/۱۰ و '+result.current+'/۱۰','قابل مقایسه']:[String(q?.symbol||'نامشخص'),'—','—','—',result.previous===undefined?'نامشخص':result.previous+'/۱۰ و '+result.current+'/۱۰',result.reason];
    cells.forEach(v=>{const td=document.createElement('td');td.textContent=String(v);td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td)});table.append(tr);
   }
   const summary=document.createElement('p');summary.textContent='نمادهای قابل مقایسه: '+fmt(eligible)+' از '+fmt(quotes.length)+'؛ نبود داده به معنی ارزش معاملات صفر نیست.';panel.append(summary);panel.append(table);
  }catch(e){panel.textContent='محاسبه روند ارزش معاملات انجام نشد: '+e.message+'؛ هیچ مقدار تخمینی نمایش داده نشد.';}
 });
})();
