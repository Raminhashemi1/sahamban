'use strict';
/* Live market overlay for imported holdings.
 * Reads holdings but never writes to their storage key. Prices live in a separate key.
 */
(()=> {
 const $=id=>document.getElementById(id);
 const HOLDINGS_KEY='sahamban-broker-holdings-v1';
 const QUOTES_KEY='sahamban-broker-live-quotes-v1';
 const MAPPINGS_KEY='sahamban-instrument-mappings-v1';
 let mappingCandidates={};
 // Pilot mode: no persistent quote writes; all quote calculations stay in memory.
 const API='https://cdn.tsetmc.com/api';
 const fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n);
 const norm=s=>String(s??'').replace(/[\u200c\u200e\u200f\uFEFF\s]/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک').toUpperCase();
 const digits=s=>String(s??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
 let running=false;
 function say(message){$('livePortfolioStatus').textContent=message;}
 function readHoldings(){
  const raw=localStorage.getItem(HOLDINGS_KEY);
  if(!raw)throw Error('ابتدا فایل کارگزاری را وارد و دارایی‌ها را روی همین گوشی ذخیره کنید.');
  const data=JSON.parse(raw);
  if(!data||![1,2].includes(data.version)||!Array.isArray(data.holdings)||!data.holdings.length)throw Error('ساختار دارایی‌های ذخیره‌شده معتبر نیست.');
  if(data.holdings.length>100)throw Error('بیش از ۱۰۰ سهم پشتیبانی نمی‌شود.');
  const seen=new Set();
  return data.holdings.map((p,i)=>{
   const symbol=String(p.symbol??'').trim(),quantity=Number(p.quantity),buy=Number(p.buy)*(data.version===1?10:1),importCurrent=Number(p.current)*(data.version===1?10:1);
   const key=norm(symbol);
   if(!symbol||!key||seen.has(key))throw Error('نماد خالی یا تکراری در دارایی ذخیره‌شده (ردیف '+(i+1)+').');
   seen.add(key);
   if(!Number.isSafeInteger(quantity)||quantity<=0||!Number.isFinite(buy)||buy<=0)throw Error('تعداد یا میانگین خرید نامعتبر برای '+symbol+'.');
   return {symbol,key,quantity,buy,importCurrent,importedAt:typeof data.created==='string'?data.created:null};
  });
 }
 async function fetchJson(path){
  let lastError;
  for(let attempt=0;attempt<3;attempt++){
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),15000);
   try{
    const response=await fetch(API+path,{method:'GET',cache:'no-store',signal:ctrl.signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw Error('HTTP '+response.status);
    const type=response.headers.get('content-type')||'';
    if(!type.toLowerCase().includes('json'))throw Error('پاسخ JSON نیست؛ احتمال محدودیت شبکه یا جغرافیایی');
    return await response.json();
   }catch(e){
    lastError=e;
    const transient=e.name==='AbortError'||e instanceof TypeError||/^HTTP (429|500|502|503|504)$/.test(e.message);
    if(!transient||attempt===2)break;
    await new Promise(resolve=>setTimeout(resolve,400*(attempt+1)));
   }finally{clearTimeout(timer);}
  }
  throw Error('دریافت داده بازار پس از تلاش مجدد ناموفق بود: '+(lastError?.name==='AbortError'?'مهلت اتصال تمام شد':lastError?.message??'خطای نامشخص'));
 }
 function validDate(raw){
  const s=String(raw??'').trim();
  if(!/^\d{8}$/.test(s))throw Error('تاریخ بازار در پاسخ وجود ندارد یا معتبر نیست.');
  const y=+s.slice(0,4),m=+s.slice(4,6),d=+s.slice(6,8),dt=new Date(Date.UTC(y,m-1,d));
  if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)throw Error('تاریخ بازار نامعتبر است.');
  // Compare against the exchange's Tehran calendar date, not the phone's timezone.
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
  const todayUTC=Date.UTC(parts.year,parts.month-1,parts.day);
  const age=Math.floor((todayUTC-dt.getTime())/86400000);
  if(age<0)throw Error('تاریخ داده بازار در آینده است.');
  if(age>7)throw Error('قیمت قدیمی است؛ تاریخ آخرین بازار '+fmt(age)+' روز پیش است.');
  return s;
 }
 async function verifiedCode(holding,insCode){
  // The current-price endpoint is independent of delayed daily history.
  const result=await fetchJson('/ClosingPrice/GetClosingPriceInfo/'+insCode);
  const info=result?.closingPriceInfo;
  if(!info||typeof info!=='object')throw Error('پاسخ قیمت نماد معتبر نیست.');
  const closing=Number(info.pClosing),last=Number(info.pDrCotVal);
  const safeMarketCount=raw=>{if(raw===null||raw===undefined||raw==='')return null;const value=Number(raw);return Number.isSafeInteger(value)&&value>=0?value:null;};
  const tradedValue=safeMarketCount(info.qTotCap),tradedVolume=safeMarketCount(info.qTotTran5J),tradeCount=safeMarketCount(info.zTotTran);
  if(!Number.isFinite(closing)||closing<=0)throw Error('قیمت پایانی معتبر نیست.');
  const marketDate=validDate(info.dEven??info.date??info.lastDate);
  const infoSectorCode=info.cSecVal??info.sector?.cSecVal??'';
  const infoSectorName=info.lSecVal??info.sector?.lSecVal??'';
  const hasLast=Number.isFinite(last)&&last>0;
  // hEven is the market's HHMMSS clock when provided by this endpoint.
  // Do not confuse response receipt time with the last trade time.
  const rawClock=String(info.hEven??'').trim();
  const clock=/^[0-9]{1,6}$/.test(rawClock)?rawClock.padStart(6,'0'):'';
  const hh=Number(clock.slice(0,2)),mm=Number(clock.slice(2,4)),ss=Number(clock.slice(4,6));
  const tradeTime=/^\d{6}$/.test(clock)&&hh<24&&mm<60&&ss<60&&Number(rawClock)>0
   ?clock.slice(0,2)+':'+clock.slice(2,4)+':'+clock.slice(4,6):'نامشخص';
  return {symbol:holding.symbol,insCode,quantity:holding.quantity,buy:holding.buy,
   price:hasLast?last:closing,closingPrice:closing,
   priceKind:hasLast?'آخرین معامله':'پایانی',lastTradePrice:hasLast?last:null,lastTradeTime:tradeTime,tradedValue,tradedVolume,tradeCount,marketDate,sectorCode:String(infoSectorCode??'').trim(),sectorName:String(infoSectorName??'').trim(),history:null};
 }
 async function getOne(holding){
  const search=await fetchJson('/Instrument/GetInstrumentSearch/'+encodeURIComponent(holding.symbol));
  const rows=search?.instrumentSearch;
  if(!Array.isArray(rows))throw Error('ساختار پاسخ جست‌وجو برای '+holding.symbol+' معتبر نیست.');
  const exact=[...new Map(rows.filter(x=>norm(x.lVal18AFC)===holding.key&&/^[0-9]{8,25}$/.test(String(x.insCode??''))).map(x=>[String(x.insCode),x])).values()];
  if(!exact.length)throw Error('شناسه دقیق نماد '+holding.symbol+' پیدا نشد.');
  if(exact.length>5)throw Error('شناسه‌های مشابه برای '+holding.symbol+' بیش از حد هستند؛ انتخاب خودکار ایمن نیست.');
  const valid=[];
  let lastError='';
  for(const candidate of exact){
   try{const verified=await verifiedCode(holding,String(candidate.insCode));verified.flow=Number.isFinite(Number(candidate.flow))?Number(candidate.flow):null;valid.push(verified);}
   catch(e){lastError=e.message;}
  }
  if(valid.length!==1)throw Error(valid.length?'چند شناسه تازه و معتبر برای '+holding.symbol+' وجود دارد؛ انتخاب خودکار ایمن نیست.':'هیچ شناسه‌ای برای '+holding.symbol+' با قیمت و تاریخ معتبر تأیید نشد. '+lastError);
  const quote=valid[0];
  // Sector metadata is optional: a failure must not invalidate an otherwise verified quote.
  try{
   const response=await fetchJson('/Instrument/GetInstrumentInfo/'+encodeURIComponent(quote.insCode));
   const meta=response?.instrumentInfo??response;
   if(meta&&String(meta.insCode??quote.insCode)===String(quote.insCode)){
    quote.sectorCode=String(meta.cSecVal??meta.sector?.cSecVal??'').trim();
    quote.sectorName=String(meta.lSecVal??meta.sector?.lSecVal??'').trim();
    quote.instrumentTypeCode=String(meta.yVal??'').trim();
    quote.instrumentFlow=Number.isFinite(Number(meta.flow))?Number(meta.flow):quote.flow;
   }
  }catch(_sectorError){quote.sectorCode='';quote.sectorName='';}
  quote.instrumentFlow=quote.instrumentFlow??quote.flow;
  quote.assetClass='unknown';quote.assetClassLabel='نامشخص';quote.fundNav=null;quote.fundNavDate='';quote.fundNavTime='';quote.fundNavStatus='شناسه صندوق هنوز از منبع رسمی تأیید نشده';
  if(quote.instrumentFlow===18){
   quote.fundNavStatus='در انتظار پاسخ معتبر صندوق از TSETMC';
   try{
    const fundResponse=await fetchJson('/Fund/GetETFByInsCode/'+encodeURIComponent(quote.insCode));
    const fund=fundResponse?.etf;
    if(fund&&String(fund.insCode??'')===String(quote.insCode)){
     quote.assetClass='fund_etf';quote.assetClassLabel='صندوق قابل معامله';
     quote.fundNavStatus='NAV بازخرید موجود نیست یا عدد معتبر ندارد';
     // Only TSETMC redemption NAV pRedTran; never substitute subscription NAV.
     const nav=typeof fund.pRedTran==='number'?fund.pRedTran:null;
     if(Number.isFinite(nav)&&nav>0){
      try{
       const navDate=validDate(fund.deven);
       let navClock='';
       if(fund.hEven!==null&&fund.hEven!==undefined&&fund.hEven!==''){
        const rawClock=String(fund.hEven).trim();
        if(!/^\\d{1,6}$/.test(rawClock))throw Error('ساعت NAV معتبر نیست');
        const clock=rawClock.padStart(6,'0');
        const hh=Number(clock.slice(0,2)),mm=Number(clock.slice(2,4)),ss=Number(clock.slice(4,6));
        if(hh>23||mm>59||ss>59)throw Error('ساعت NAV معتبر نیست');
        navClock=clock.slice(0,2)+':'+clock.slice(2,4)+':'+clock.slice(4,6);
       }
       quote.fundNav=nav;quote.fundNavDate=navDate;quote.fundNavTime=navClock;
       quote.fundNavStatus='NAV بازخرید با تاریخ معتبر تأیید شد؛ هم‌زمانی لحظه‌ای با قیمت بازار تأیید نشده';
      }catch(_invalidNavDate){quote.fundNavStatus='تاریخ یا ساعت NAV نامعتبر، آینده یا قدیمی است';}
     }
    }else{quote.fundNavStatus='ساختار پاسخ یا شناسه صندوق با درخواست تطبیق نداشت';}
   }catch(_fundError){quote.fundNavStatus='سرویس NAV در دسترس نبود یا پاسخ معتبر نداد';}
  }else if(quote.instrumentTypeCode==='300'){quote.assetClass='equity';quote.assetClassLabel='سهام شرکت';}
  else if(quote.instrumentTypeCode==='301'){quote.assetClass='preemptive_right';quote.assetClassLabel='حق تقدم';}
  return quote;
 }
 function render(holdings,quotes,receivedAt,mode='live'){
  const body=$('livePortfolioRows');body.replaceChildren();
  let value=0,cost=0;
  const dateParts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
  const tehranToday=String(dateParts.year)+String(dateParts.month).padStart(2,'0')+String(dateParts.day).padStart(2,'0');
  for(const h of holdings){
   const q=quotes.find(x=>x.symbol===h.symbol);
   const tr=document.createElement('tr');
   const vals=[h.symbol,h.quantity,h.buy,q.price,q.price*h.quantity,h.importCurrent,h.quantity*h.importCurrent,h.quantity*(q.price-h.importCurrent),h.quantity*(q.price-h.buy),q.marketDate,q.lastTradePrice??'نامشخص',q.closingPrice??'نامشخص',q.lastTradeTime??'نامشخص',mode==='import'?'قیمت فایل':q.priceKind??'نامشخص',mode==='import'?'نامشخص':q.marketDate===tehranToday?'امروز تهران':'پیش از امروز'];
   vals.forEach((v,i)=>{const td=document.createElement('td');td.style.padding='7px 5px';td.style.borderBottom='1px solid #34546d';td.textContent=i===0||i===9||i===12||i===13||i===14||v==='نامشخص'?String(v).replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]):fmt(v);tr.append(td);});
   const rowValue=q.price*h.quantity,rowCost=h.buy*h.quantity;
   if(!Number.isSafeInteger(h.quantity)||!Number.isFinite(rowValue)||!Number.isFinite(rowCost)||rowValue>Number.MAX_SAFE_INTEGER||rowCost>Number.MAX_SAFE_INTEGER)throw Error('مبلغ دارایی از محدوده محاسبه مطمئن خارج است.');
   body.append(tr);value+=rowValue;cost+=rowCost;
  }
  if(!Number.isFinite(value)||!Number.isFinite(cost)||value>Number.MAX_SAFE_INTEGER||cost>Number.MAX_SAFE_INTEGER)throw Error('جمع سبد از محدوده محاسبه مطمئن خارج است.');
  const pnl=value-cost,percent=cost?100*pnl/cost:0;
  $('livePortfolioSummary').textContent=(mode==='import'?'ارزش بر اساس قیمت فایل: ':'ارزش طبق قیمت جاری دریافتی بازار: ')+fmt(value)+' ریال | بهای خرید: '+fmt(cost)+' ریال | سود/زیان تحقق‌نیافته: '+fmt(pnl)+' ریال ('+fmt(percent)+'٪). کارمزد و مالیات لحاظ نشده‌اند.';
  $('livePortfolioMeta').textContent=mode==='import'?'تعداد دارایی: '+fmt(holdings.length)+' | منبع: قیمت پایانی درج‌شده در فایل کارگزاری؛ تاریخ دقیق قیمت بازار نامشخص است. زمان ورود فایل به مرورگر: '+(Number.isFinite(Date.parse(receivedAt))?new Date(receivedAt).toLocaleString('fa-IR'):'نامشخص')+'. این نتیجه قیمت روز یا به‌روزرسانی خودکار نیست.':'تعداد دارایی: '+fmt(holdings.length)+' | قیمت: آخرین معامله در صورت وجود، وگرنه پایانی | تاریخ بازار هر نماد در جدول مشخص است | زمان دریافت پاسخ‌ها: '+new Date(receivedAt).toLocaleString('fa-IR')+' (زمان دستگاه). زمان دریافت، زمان آخرین معامله نیست؛ ستون ساعت بازار از خود سرویس گرفته می‌شود و ممکن است نامشخص باشد.';
  if(mode==='live'){
   const lastCount=quotes.filter(q=>q.priceKind==='آخرین معامله').length;
   const closingCount=quotes.filter(q=>q.priceKind==='پایانی').length;
   const unknownClockCount=quotes.filter(q=>q.lastTradeTime==='نامشخص').length;
   $('livePortfolioMeta').textContent+=' | پوشش قیمت: '+fmt(lastCount)+' نماد آخرین معامله، '+fmt(closingCount)+' نماد قیمت پایانی | ساعت نامشخص: '+fmt(unknownClockCount)+' نماد.';
   const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
   const today=String(parts.year)+String(parts.month).padStart(2,'0')+String(parts.day).padStart(2,'0');
   const old=quotes.filter(q=>q.marketDate!==today);
   if(old.length)$('livePortfolioMeta').textContent+=' | هشدار: تاریخ بازار '+fmt(old.length)+' نماد مربوط به امروز تهران نیست؛ دریافت تازه لزوماً به معنی معامله امروز نیست.';
  }
  const insight=$('portfolioInsightsV613');
  if(insight){
   insight.replaceChildren();
   const ranked=holdings.map(h=>{const q=quotes.find(x=>x.symbol===h.symbol);const market=q.price*h.quantity,costRow=h.buy*h.quantity;return {symbol:h.symbol,market,cost:costRow,pnl:market-costRow,pct:costRow?(market-costRow)/costRow*100:0,weight:value?market/value*100:0};}).sort((a,b)=>b.pct-a.pct);
   const title=document.createElement('strong');title.textContent='خلاصه عملکرد و تمرکز سبد';insight.append(title);
   const stats=document.createElement('p');
   const best=ranked[0],worst=ranked[ranked.length-1],hhi=ranked.reduce((sum,r)=>sum+(r.weight/100)**2,0)*10000,top3=ranked.slice().sort((a,b)=>b.weight-a.weight).slice(0,3).reduce((sum,r)=>sum+r.weight,0);
   const outliers=ranked.filter(r=>Math.abs(r.pct)>=50);
   stats.textContent='بهترین بازده: '+best.symbol+' ('+fmt(best.pct)+'٪) | ضعیف‌ترین بازده: '+worst.symbol+' ('+fmt(worst.pct)+'٪) | سهم سه نماد بزرگ از ارزش سبد: '+fmt(top3)+'٪ | شاخص تمرکز HHI: '+fmt(hhi)+' از ۱۰۰۰۰.'+(outliers.length?' | نیازمند بررسی بازده غیرعادی: '+fmt(outliers.length)+' نماد':'');
   insight.append(stats);
   const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
   const head=document.createElement('tr');['نماد','وزن سبد','سود/زیان (ریال)','بازده نسبت به خرید','کنترل داده'].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';head.append(th)});table.append(head);
   ranked.forEach(r=>{const tr=document.createElement('tr');const review=Math.abs(r.pct)>=50?'نیازمند بررسی قیمت خرید/تعدیل':'—';[r.symbol,fmt(r.weight)+'٪',fmt(r.pnl),fmt(r.pct)+'٪',review].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td)});table.append(tr)});
   if(outliers.length){const note=document.createElement('p');note.textContent='هشدار کنترل کیفیت: بازده مطلق ۵۰٪ یا بیشتر فقط علامت بررسی است؛ ممکن است ناشی از افزایش سرمایه، تعدیل قیمت، رویداد شرکتی یا میانگین خرید نادرست باشد. سامانه هیچ قیمت یا تعداد سهمی را خودکار اصلاح نمی‌کند.';note.style.cssText='padding:10px;border:1px solid #b88742;border-radius:8px;line-height:1.9';insight.append(note);}
   insight.append(table);
   const stressTitle=document.createElement('strong');stressTitle.textContent='آزمون تنش سبد (سناریو فرضی)';stressTitle.style.display='block';stressTitle.style.marginTop='14px';insight.append(stressTitle);
   const stressTable=document.createElement('table');stressTable.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
   const stressHead=document.createElement('tr');['افت فرضی بازار','کاهش ارزش سبد','ارزش باقی‌مانده'].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';stressHead.append(th)});stressTable.append(stressHead);
   [5,10,15,20].forEach(shock=>{const loss=value*shock/100;const tr=document.createElement('tr');[fmt(shock)+'٪',fmt(loss)+' ریال',fmt(value-loss)+' ریال'].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td)});stressTable.append(tr)});
   insight.append(stressTable);
   const qualityTitle=document.createElement('strong');qualityTitle.textContent='پوشش و کیفیت داده قیمت';qualityTitle.style.display='block';qualityTitle.style.marginTop='14px';insight.append(qualityTitle);
   const lastCount=quotes.filter(q=>q.priceKind==='آخرین معامله').length,closeCount=quotes.length-lastCount;
   const qualitySummary=document.createElement('p');qualitySummary.textContent='مبنای آخرین قیمت: '+fmt(lastCount)+' نماد آخرین معامله و '+fmt(closeCount)+' نماد قیمت پایانی. ارزش، حجم و تعداد معاملات فقط در صورت وجود فیلد معتبر در پاسخ رسمی بازار نمایش داده می‌شوند؛ این آمار یک‌روزه به‌تنهایی رتبه نقدشوندگی نیست.';insight.append(qualitySummary);
   const qualityTable=document.createElement('table');qualityTable.style.cssText='width:100%;border-collapse:collapse;font-size:13px';
   const qualityHead=document.createElement('tr');['نماد','مبنای قیمت','تاریخ بازار','ساعت آخرین معامله','ارزش معاملات (ریال)','حجم معاملات','تعداد معاملات'].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #49627a';qualityHead.append(th)});qualityTable.append(qualityHead);
   quotes.forEach(q=>{const tr=document.createElement('tr');[q.symbol,q.priceKind||'پایانی',q.marketDate||'نامشخص',q.lastTradeTime||'نامشخص',q.tradedValue===null||q.tradedValue===undefined?'نامشخص':fmt(q.tradedValue),q.tradedVolume===null||q.tradedVolume===undefined?'نامشخص':fmt(q.tradedVolume),q.tradeCount===null||q.tradeCount===undefined?'نامشخص':fmt(q.tradeCount)].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:7px;text-align:right;border-bottom:1px solid #34546d';tr.append(td)});qualityTable.append(tr)});
   insight.append(qualityTable);
   const note=document.createElement('p');note.className='muted';note.textContent='رتبه‌بندی بر اساس بازده تحقق‌نیافته نسبت به بهای خرید است؛ این رتبه‌بندی توصیه خرید/فروش نیست. HHI و وزن‌ها فقط از قیمت‌های همین گزارش محاسبه شده‌اند.';insight.append(note);
   insight.hidden=false;
  }
  $('livePortfolioTable').hidden=false;
  // Publish symbol names only so the technical selector stays usable even for file-import views.
  // The historical-analysis panel still requires the separate verified-history event below.
  window.dispatchEvent(new CustomEvent('sahamban:portfolio-symbols-v50',{detail:{symbols:holdings.map(h=>h.symbol)}}));
 }

 // Explicit, local-only instrument mapping. This key is independent from brokerage holdings.
 function readInstrumentMappings(){
  try{
   const raw=localStorage.getItem(MAPPINGS_KEY);
   if(!raw)return {};
   const parsed=JSON.parse(raw);
   if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {};
   return Object.fromEntries(Object.entries(parsed).filter(([symbol,code])=>typeof symbol==='string'&&symbol.length<=50&&/^[0-9]{8,25}$/.test(String(code))));
  }catch(e){return {};}
 }
 function describeCandidate(c){
  const label=String(c.lVal30??c.lVal18AFC??'').trim();
  return String(c.insCode)+(label?' — '+label:'')+
   (c.cIsin?' | cIsin='+c.cIsin:'')+
   (c.instrumentID?' | instrumentID='+c.instrumentID:'')+
   (c.flowTitle?' | '+c.flowTitle:'')+
   (c.flow!=null?' | کد بازار='+c.flow:'')+
   (c.yVal?' | نوع ابزار='+c.yVal:'')+
   (c.cgrValCot?' | گروه='+c.cgrValCot:'')+
   (c.lastDate?' | آخرین تاریخ معامله='+c.lastDate:'')+
   (c.yMarNSC?' | شناسه طبقه‌بندی بازار='+c.yMarNSC:'');
 }
 function renderInstrumentMappingPanel(){
  const panel=$('instrumentMappingPanel');
  if(!panel)return;
  panel.replaceChildren();
  const symbols=Object.keys(mappingCandidates);
  if(!symbols.length){panel.hidden=true;return;}
  panel.hidden=false;
  const intro=document.createElement('p');
  intro.textContent='برای نمادهایی که بیش از یک تاریخچه معتبر دارند، ورقه موردنظر را خودت انتخاب و جداگانه تأیید کن. انتخاب فقط روی همین مرورگر و در کلیدی مستقل از اطلاعات سبد ذخیره می‌شود. پس از ثبت، دوباره «دریافت تاریخچه تأییدشده همه نمادها» را بزن.';
  panel.append(intro);
  const saved=readInstrumentMappings();
  for(const symbol of symbols){
   const candidates=mappingCandidates[symbol];
   const row=document.createElement('div');
   row.style.cssText='border:1px solid #49627a;border-radius:10px;padding:12px;margin:10px 0';
   const heading=document.createElement('strong');heading.textContent='نماد '+symbol;row.append(heading);
   const label=document.createElement('label');label.textContent='ورقه / شناسه ابزار';label.style.marginTop='8px';row.append(label);
   const select=document.createElement('select');select.style.width='100%';
   const empty=document.createElement('option');empty.value='';empty.textContent='انتخاب کنید؛ هیچ گزینه‌ای از پیش تأیید نشده';select.append(empty);
   for(const c of candidates){const option=document.createElement('option');option.value=String(c.insCode);option.textContent=describeCandidate(c);select.append(option);}
   if(candidates.some(c=>String(c.insCode)===String(saved[symbol]??'')))select.value=String(saved[symbol]);
   row.append(select);
   const savedStatus=document.createElement('p');
   savedStatus.setAttribute('aria-live','polite');
   savedStatus.style.cssText='margin:8px 0;font-size:13px';
   const savedCode=saved[symbol];
   const savedIsCandidate=candidates.some(c=>String(c.insCode)===String(savedCode??''));
   if(savedCode){
    savedStatus.textContent='شناسه ذخیره‌شده فعلی: '+savedCode+(savedIsCandidate?' (در فهرست کاندیداهای معتبر این نوبت)':' (در فهرست معتبر این نوبت نیست)');
   }else savedStatus.textContent='هنوز برای این نماد شناسه‌ای ذخیره نشده است.';
   row.append(savedStatus);
   select.addEventListener('change',()=>{
    savedStatus.textContent=select.value?'گزینه انتخاب شده: '+select.value+' — هنوز ذخیره نشده است.':'هیچ گزینه‌ای انتخاب نشده است.';
   });
   const actions=document.createElement('div');actions.className='row';
   const save=document.createElement('button');save.type='button';save.textContent='تأیید و ذخیره انتخاب';
   save.addEventListener('click',()=>{
    const code=String(select.value||'');
    if(!candidates.some(c=>String(c.insCode)===code)){
     savedStatus.textContent='ذخیره انجام نشد: ابتدا یک گزینه از فهرست انتخاب کن.';
     statusMessage('برای '+symbol+' یک کاندیدای معتبر انتخاب کن.');
     return;
    }
    try{
     const next=readInstrumentMappings();next[symbol]=code;
     const serialized=JSON.stringify(next);
     localStorage.setItem(MAPPINGS_KEY,serialized);
     const readBack=localStorage.getItem(MAPPINGS_KEY);
     if(readBack!==serialized)throw Error('محتوای ذخیره‌شده با مقدار انتخابی یکسان نیست.');
     const verified=JSON.parse(readBack);
     if(String(verified?.[symbol]??'')!==code)throw Error('شناسه پس از ذخیره قابل تأیید نبود.');
     savedStatus.textContent='ذخیره تأیید شد؛ شناسه ثبت‌شده: '+code+'. برای اعمال، دریافت تاریخچه همه نمادها را دوباره اجرا کن.';
     statusMessage('ذخیره انتخاب '+symbol+' تأیید شد؛ شناسه '+code+'. اکنون دریافت تاریخچه همه نمادها را دوباره اجرا کن.');
    }catch(e){
     savedStatus.textContent='ذخیره تأیید نشد: '+e.message+'؛ هیچ تغییری در اطلاعات سبد ایجاد نشده است.';
     statusMessage('ذخیره انتخاب '+symbol+' تأیید نشد: '+e.message);
    }
   });
   const clear=document.createElement('button');clear.type='button';clear.className='secondary';clear.textContent='پاک‌کردن انتخاب ذخیره‌شده';
   clear.addEventListener('click',()=>{
    try{
     const next=readInstrumentMappings();delete next[symbol];
     const serialized=JSON.stringify(next);
     localStorage.setItem(MAPPINGS_KEY,serialized);
     const readBack=localStorage.getItem(MAPPINGS_KEY);
     if(readBack!==serialized)throw Error('پاک‌شدن انتخاب از حافظه تأیید نشد.');
     if(Object.hasOwn(JSON.parse(readBack),symbol))throw Error('شناسه هنوز در حافظه وجود دارد.');
     select.value='';
     savedStatus.textContent='انتخاب ذخیره‌شده پاک شد و پاک‌شدن آن از حافظه تأیید شد.';
     statusMessage('انتخاب ذخیره‌شده '+symbol+' پاک شد و نتیجه از حافظه تأیید شد؛ اطلاعات سبد تغییر نکرد.');
    }catch(e){
     savedStatus.textContent='پاک‌کردن تأیید نشد: '+e.message;
     statusMessage('پاک‌کردن انتخاب '+symbol+' تأیید نشد: '+e.message);
    }
   });
   actions.append(save,clear);row.append(actions);panel.append(row);
  }
 }
 function statusMessage(message){const node=$('technicalStatusV50');if(node)node.textContent=message;}
 // Independent historical-series flow: does not require today's quote to pass freshness checks.
 async function getHistoricalOne(holding){
  const search=await fetchJson('/Instrument/GetInstrumentSearch/'+encodeURIComponent(holding.symbol));
  const rows=search?.instrumentSearch;
  if(!Array.isArray(rows))throw Error('ساختار جست‌وجوی '+holding.symbol+' معتبر نیست.');
  const candidates=[...new Map(rows.filter(x=>norm(x.lVal18AFC)===holding.key&&/^[0-9]{8,25}$/.test(String(x.insCode??''))).map(x=>[String(x.insCode),x])).values()];
  if(!candidates.length)throw Error('شناسه دقیق نماد پیدا نشد.');
  if(candidates.length>10)throw Error('برای '+holding.symbol+' بیش از ۱۰ شناسه دقیق برگشت؛ بررسی خودکار متوقف شد تا از انتخاب اشتباه جلوگیری شود.');
  const checks=await Promise.all(candidates.map(async candidate=>{
   const insCode=String(candidate.insCode);
   let identity=null,identityError='';
   try{
    const identityResponse=await fetchJson('/Instrument/GetInstrumentInfo/'+insCode);
    const rawIdentity=identityResponse?.instrumentInfo??identityResponse;
    if(rawIdentity&&String(rawIdentity.insCode??insCode)===insCode)identity=rawIdentity;
    else identityError='پاسخ مشخصات ابزار با شناسه درخواست‌شده تطبیق نداشت.';
   }catch(identityFailure){identityError=identityFailure.name==='AbortError'?'مهلت دریافت مشخصات هویتی تمام شد':identityFailure.message;}
   const enrichedCandidate={...candidate,...(identity?{
    cIsin:identity.cIsin??candidate.cIsin,
    instrumentID:identity.instrumentID??candidate.instrumentID,
    flow:identity.flow??candidate.flow,
    flowTitle:identity.flowTitle??candidate.flowTitle,
    yVal:identity.yVal??candidate.yVal,
    cgrValCot:identity.cgrValCot??candidate.cgrValCot,
    lastDate:identity.lastDate??candidate.lastDate,
    yMarNSC:identity.yMarNSC??candidate.yMarNSC,
    lVal30:identity.lVal30??candidate.lVal30,
    lVal18AFC:identity.lVal18AFC??candidate.lVal18AFC
   }:{}) ,identityError};
   try{
    const data=await fetchJson('/ClosingPrice/GetClosingPriceDailyList/'+insCode+'/0');
    const daily=data?.closingPriceDaily;
    if(!Array.isArray(daily))throw Error('پاسخ تاریخچه ساختار معتبر ندارد.');
    const history=daily.map(row=>{
     const date=String(row?.dEven??''),close=Number(row?.pClosing);
     if(!/^\d{8}$/.test(date)||!Number.isFinite(close)||close<=0)return null;
     const y=+date.slice(0,4),m=+date.slice(4,6),d=+date.slice(6,8),dt=new Date(Date.UTC(y,m-1,d));
     if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)return null;
     const rawValue=row?.qTotCap;const tradedValue=rawValue===null||rawValue===undefined||rawValue===''?null:Number(rawValue);return {date,close,tradedValue:Number.isFinite(tradedValue)&&tradedValue>=0?tradedValue:null};
    }).filter(Boolean).sort((x,y)=>x.date.localeCompare(y.date));
    const unique=new Set(history.map(x=>x.date));
    if(history.length<15||unique.size!==history.length)throw Error('کمتر از ۱۵ قیمت روزانه معتبر یا تاریخ‌های تکراری دریافت شد.');
    const historyStartDate=history[0].date,historyEndDate=history[history.length-1].date;
    const diagnosticCandidate={...enrichedCandidate,historyStartDate,historyEndDate,historyCount:history.length};
    return {ok:true,quote:{symbol:holding.symbol,marketDate:historyEndDate,history:history.slice(-250),insCode},candidate:diagnosticCandidate};
   }catch(e){return {ok:false,insCode,error:e.name==='AbortError'?'مهلت اتصال تمام شد':e.message,candidate:enrichedCandidate};}
  }));
  const valid=checks.filter(x=>x.ok);
  const savedMapping=readInstrumentMappings()[holding.symbol];
  if(savedMapping){
   const selected=valid.find(x=>String(x.quote?.insCode)===String(savedMapping));
   if(selected)return selected.quote;
   // A missing candidate or failed history is not proof that a saved mapping is stale:
   // search responses can be incomplete and market APIs can fail transiently.
   // Never delete or replace a saved identity automatically.
   if(valid.length)mappingCandidates[holding.symbol]=valid.map(x=>x.candidate).filter(Boolean);
   throw Error('شناسه ذخیره‌شده '+savedMapping+' برای '+holding.symbol+' در این نوبت تأیید نشد؛ ممکن است پاسخ جست‌وجو ناقص یا سرویس بازار موقتاً مختل باشد. شناسه حفظ شد و انتخاب خودکار دیگری انجام نشد.');
  }
  if(valid.length===1)return valid[0].quote;
  if(valid.length>1){
   // Operational fallback: among candidates with verified histories in the last
   // 7 Tehran calendar days, use the uniquely freshest history. Equal latest dates
   // remain ambiguous. The temporary selection is never persisted as an identity.
   const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
   const today=Date.UTC(parts.year,parts.month-1,parts.day);
   const recent=valid.map(x=>{
    const raw=String(x.candidate?.historyEndDate??'');
    if(!/^\d{8}$/.test(raw))return null;
    const y=+raw.slice(0,4),m=+raw.slice(4,6),d=+raw.slice(6,8),dt=new Date(Date.UTC(y,m-1,d));
    if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)return null;
    const age=Math.floor((today-dt.getTime())/86400000);
    return age>=0&&age<=7?{...x,historyDate:raw}:null;
   }).filter(Boolean);
   if(recent.length){
    const newest=recent.reduce((best,x)=>x.historyDate>best?x.historyDate:best,'');
    const freshest=recent.filter(x=>x.historyDate===newest);
    if(freshest.length===1){
     const selected=freshest[0];
     return {...selected.quote,resolution:'unique-freshest-recent-history',resolutionNote:'شناسه '+(selected.quote?.insCode??selected.insCode)+' به‌صورت موقت انتخاب شد؛ تاریخچه معتبر آن ('+newest+') از همه کاندیداهای دارای سابقه تازه جدیدتر و یکتا بود. این انتخاب در حافظه ذخیره نشده و هویت بازارِ ثبت‌شده در فایل اکسل را اثبات نمی‌کند.'};
    }
   }
   mappingCandidates[holding.symbol]=valid.map(x=>x.candidate).filter(Boolean);
  }
  const describe=x=>{
   const c=x.candidate||{};
   const label=String(c.lVal30??c.lVal18AFC??'').trim();
   const cIsin=String(c.cIsin??'').trim();
   const flowTitle=String(c.flowTitle??'').trim();
   const flow=c.flow==null?'':'؛ کد بازار='+String(c.flow);
   const instrumentId=String(c.instrumentID??'').trim();
   const instrumentType=String(c.yVal??'').trim();
   const group=String(c.cgrValCot??'').trim();
   const lastDateRaw=String(c.lastDate??'').trim();
   const lastDate=/^\d{8}$/.test(lastDateRaw)?lastDateRaw:'';
   const historyStartDate=String(c.historyStartDate??'').trim();
   const historyEndDate=String(c.historyEndDate??'').trim();
   const historyCount=Number(c.historyCount);
   const marketClass=String(c.yMarNSC??'').trim();
   const identityError=String(c.identityError??'').trim();
   const insCode=String(c.insCode??x.quote?.insCode??x.insCode??'شناسه نامشخص');
   return insCode+(label?' ('+label+')':'')+(cIsin?'؛ cIsin='+cIsin:'')+(instrumentId?'؛ instrumentID='+instrumentId:'')+(flowTitle?'؛ '+flowTitle:'')+flow+(instrumentType?'؛ نوع ابزار='+instrumentType:'')+(group?'؛ گروه='+group:'')+(lastDate?'؛ آخرین تاریخ معامله ثبت‌شده در مشخصات ابزار='+lastDate:'')+(historyStartDate&&historyEndDate?'؛ بازه تاریخچه معتبر='+historyStartDate+' تا '+historyEndDate:'')+(Number.isFinite(historyCount)&&historyCount>0?'؛ تعداد رکوردهای تاریخچه='+historyCount:'')+(marketClass?'؛ شناسه طبقه‌بندی بازار='+marketClass:'')+(identityError?'؛ خطای مشخصات='+identityError:'');
  };
  if(valid.length>1)throw Error('چند شناسه برای '+holding.symbol+' تاریخچه معتبر دارند؛ انتخاب خودکار ایمن نیست: '+valid.map(describe).join(' | '));
  throw Error('هیچ‌یک از '+fmt(candidates.length)+' شناسه دقیق برای '+holding.symbol+' تاریخچه معتبر نداشتند: '+checks.map(x=>describe(x)+'؛ '+x.error).join(' | '));
 }
 const historyButton=$('technicalHistoryAllV50');
 if(historyButton)historyButton.addEventListener('click',async()=>{
  const button=$('technicalHistoryAllV50');
  if(running)return;
  running=true;button.disabled=true;
  try{
   const holdings=readHoldings();
   mappingCandidates={};
   statusMessage('دریافت تاریخچه مستقل برای '+fmt(holdings.length)+' نماد آغاز شد؛ اطلاعات سبد فقط خوانده می‌شود و تغییر نمی‌کند...');
   const outcomes=new Array(holdings.length);let next=0,completed=0;
   async function worker(){while(true){
    const i=next++;if(i>=holdings.length)return;
    try{outcomes[i]={ok:true,quote:await getHistoricalOne(holdings[i])};}
    catch(e){outcomes[i]={ok:false,symbol:holdings[i].symbol,error:e.name==='AbortError'?'مهلت اتصال تمام شد':e.message};}
    completed++;statusMessage('تاریخچه: '+fmt(completed)+' از '+fmt(holdings.length)+' نماد بررسی شد؛ هنوز داده‌ای برای نمادهای ناموفق حدس زده نمی‌شود.');
   }}
   await Promise.all(Array.from({length:Math.min(3,holdings.length)},()=>worker()));
   renderInstrumentMappingPanel();
   const quotes=outcomes.map(x=>x.ok?x.quote:{symbol:x.symbol,marketDate:null,history:null,error:x.error});
   window.dispatchEvent(new CustomEvent('sahamban:verified-historical-quotes-v50',{detail:{quotes}}));
   // Historical investor-flow sampling is opt-in and bounded to the selected recent sessions.
   const flowDepth=Number($('investorFlowHistoryDepthV50')?.value||5);
   if(![5,10,20].includes(flowDepth))throw Error('بازه تاریخچه جریان پول معتبر نیست.');
   const historicalFlows=new Array(quotes.length);let flowNext=0,flowDone=0;
   async function flowWorker(){while(true){
    const index=flowNext++;if(index>=quotes.length)return;
    const q=quotes[index];
    if(!q.insCode||!Array.isArray(q.history)){historicalFlows[index]={symbol:q.symbol,error:'تاریخچه قیمت معتبر یا شناسه ابزار موجود نیست',observations:[]};flowDone++;continue;}
    const dates=[...new Set(q.history.map(x=>x.date).filter(x=>/^\d{8}$/.test(String(x))))].sort().slice(-flowDepth);
    const observations=[];
    for(const date of dates){
     try{
      const response=await fetchJson('/ClientType/GetClientType/'+encodeURIComponent(q.insCode)+'/'+encodeURIComponent(date));
      const row=Array.isArray(response?.clientType)?response.clientType[0]:null;
      const fields=['buy_I_Volume','buy_I_Value','buy_N_Value','buy_CountI','sell_I_Volume','sell_I_Value','sell_N_Value','sell_CountI'];
      if(!row||fields.some(k=>!Number.isFinite(Number(row[k]))||Number(row[k])<0))throw Error('ساختار داده ناقص');
      const buy=Number(row.buy_I_Value),sell=Number(row.sell_I_Value);
      if(buy+sell<=0)throw Error('ارزش خرید و فروش حقیقی صفر است');
      observations.push({date,buyIndividualValue:buy,sellIndividualValue:sell,buyCorporateValue:Number(row.buy_N_Value),sellCorporateValue:Number(row.sell_N_Value),buyIndividualVolume:Number(row.buy_I_Volume),sellIndividualVolume:Number(row.sell_I_Volume),individualBuyerCount:Number(row.buy_CountI),individualSellerCount:Number(row.sell_CountI),netIndividual:buy-sell,netRatio:(buy-sell)/(buy+sell)});
     }catch(error){observations.push({date,error:error.message});}
    }
    historicalFlows[index]={symbol:q.symbol,insCode:q.insCode,observations};
    flowDone++;
    statusMessage('تاریخچه جریان پول: '+fmt(flowDone)+' از '+fmt(quotes.length)+' نماد؛ '+fmt(observations.filter(x=>!x.error).length)+' رکورد معتبر برای '+q.symbol+'.');
   }}
   await Promise.all(Array.from({length:Math.min(2,quotes.length)},()=>flowWorker()));
   window.dispatchEvent(new CustomEvent('sahamban:verified-investor-flow-history-v50',{detail:{symbols:quotes.length,depth:flowDepth,series:historicalFlows}}));

   const good=outcomes.filter(x=>x.ok).length,failed=outcomes.filter(x=>!x.ok);
   statusMessage('تاریخچه معتبر برای '+fmt(good)+' از '+fmt(holdings.length)+' نماد دریافت شد.'+(failed.length?' ناموفق: '+failed.map(x=>x.symbol+': '+x.error).join('؛ '):'')+'؛ اطلاعات سبد تغییری نکرد.');
  }catch(e){statusMessage('دریافت تاریخچه انجام نشد: '+e.message+'؛ اطلاعات سبد دست‌نخورده ماند.');}
  finally{running=false;button.disabled=false;}
 });

 // Read-only startup verification: never writes, uploads or merges real holdings with demo rows.
 try{
  const saved=localStorage.getItem(HOLDINGS_KEY);
  if(saved){
   const holdings=readHoldings();
   say('اطلاعات واقعی کارگزاری روی همین مرورگر شناسایی شد: '+fmt(holdings.length)+' نماد؛ جمع تعداد سهم‌ها '+fmt(holdings.reduce((sum,h)=>sum+h.quantity,0))+' سهم. هیچ داده‌ای تغییر نکرد. قیمت روز هنوز دریافت نشده است.');
  }else say('در این مرورگر هنوز فایل دارایی‌های واقعی ذخیره نشده است؛ این بخش از داده‌های نمایشی استفاده نمی‌کند.');
 }catch(e){say('خواندن ایمن دارایی‌های واقعی ناموفق بود: '+e.message+'؛ داده ذخیره‌شده تغییر نکرد.');}
 // Public-symbol network diagnostic: deliberately never reads the user's brokerage holdings.
 $('livePortfolioNetworkTest').addEventListener('click',async()=>{
  const button=$('livePortfolioNetworkTest');
  if(running)return;
  running=true;button.disabled=true;
  $('livePortfolioNetworkStatus').textContent='در حال آزمون اتصال مستقل با نماد عمومی فولاد. اطلاعات سبد شما ارسال نمی‌شود...';
  try{
   // Synthetic public ticker only: same strict resolver as portfolio quotes, no user holdings.
   const quote=await getOne({symbol:'فولاد',key:norm('فولاد'),quantity:1,buy:1});
   $('livePortfolioNetworkStatus').textContent='اتصال و تطبیق قیمت نماد عمومی فولاد موفق بود. تاریخ بازار: '+quote.marketDate.replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)])+'؛ قیمت پایانی: '+fmt(quote.price)+' ریال. این نتیجه فقط آزمون شبکه همین مرورگر است و به معنی به‌روزشدن سبد شما نیست.';
  }catch(e){
   $('livePortfolioNetworkStatus').textContent='آزمون اتصال از این مرورگر ناموفق یا تأییدنشده بود: '+(e.name==='AbortError'?'مهلت اتصال تمام شد':e.message)+'. اطلاعات سبد ارسال یا تغییر نکرد.';
  }finally{running=false;button.disabled=false;}
 });
 $('livePortfolioImported').addEventListener('click',()=>{
  try{
   const holdings=readHoldings();
   if(holdings.some(h=>!Number.isFinite(h.importCurrent)||h.importCurrent<=0))throw Error('قیمت پایانی معتبر برای همه دارایی‌ها در فایل واردشده موجود نیست.');
   const quotes=holdings.map(h=>({symbol:h.symbol,quantity:h.quantity,buy:h.buy,price:h.importCurrent,marketDate:'نامشخص'}));
   const receivedAt=holdings[0].importedAt;
   render(holdings,quotes,receivedAt,'import');
   say('محاسبه فقط بر اساس آخرین فایل واردشده انجام شد؛ هیچ درخواست بازار ارسال نشد و اطلاعات خرید، تعداد و قیمت ذخیره‌شده تغییر نکردند. این قیمت روز تأییدشده نیست.');
  }catch(e){$('livePortfolioTable').hidden=true;say('محاسبه فایل انجام نشد: '+e.message);}
 });
 async function refreshLiveQuotes(){
  if(running)return;
  running=true;$('livePortfolioRefresh').disabled=true;$('livePortfolioTable').hidden=true;
  $('livePortfolioSummary').textContent='';$('livePortfolioMeta').textContent='';
  try{
   const holdings=readHoldings();
   say('در حال دریافت قیمت جاری از TSETMC برای '+fmt(holdings.length)+' نماد. تا پایان بررسی، جمع ارزش روز نمایش داده نمی‌شود...');
   const outcomes=new Array(holdings.length);let next=0,completed=0,successes=0;
   async function worker(){while(true){
    const i=next++;if(i>=holdings.length)return;
    const h=holdings[i];
    try{outcomes[i]={ok:true,quote:await getOne(h)};successes++;}
    catch(e){outcomes[i]={ok:false,symbol:h.symbol,error:e.name==='AbortError'?'مهلت اتصال تمام شد':e.message};}
    completed++;
    say('بررسی قیمت‌ها: '+fmt(completed)+' از '+fmt(holdings.length)+' نماد؛ تأیید کامل '+fmt(successes)+' نماد. تا پایان همه درخواست‌ها هیچ جمع جدیدی نشان داده نمی‌شود.');
   }}
   await Promise.all(Array.from({length:Math.min(3,holdings.length)},()=>worker()));
   const failed=outcomes.filter(x=>!x.ok);
   if(failed.length){
    const list=failed.map(x=>x.symbol+': '+x.error).join('؛ ');
    say('به‌روزرسانی کامل نشد ('+fmt(failed.length)+' از '+fmt(holdings.length)+' نماد). برای جلوگیری از جمع ناقص یا قیمت گمراه‌کننده، ارزش کل جدید محاسبه نشد. '+list+' هیچ تعداد یا میانگین خریدی تغییر نکرد.');
    return;
   }
   const quotes=outcomes.map(x=>x.quote);
   const currentHoldings=readHoldings();
   if(currentHoldings.length!==holdings.length||holdings.some((h,i)=>currentHoldings[i].key!==h.key||currentHoldings[i].quantity!==h.quantity||currentHoldings[i].buy!==h.buy))throw Error('دارایی‌ها هنگام دریافت قیمت تغییر کرده‌اند؛ برای جلوگیری از نسبت‌دادن قیمت‌ها به سبد اشتباه، نتیجه ذخیره نشد. دوباره تازه‌سازی کنید.');
   const snapshot={version:1,source:'TSETMC',receivedAt:new Date().toISOString(),quotes};
   // No quote-cache persistence in this pilot; never write to any browser storage.
   render(holdings,quotes,snapshot.receivedAt);
   window.dispatchEvent(new CustomEvent('sahamban:portfolio-symbols-v50',{detail:{symbols:quotes.map(q=>q.symbol)}}));
   window.dispatchEvent(new CustomEvent('sahamban:verified-portfolio-sectors-v50',{detail:{quotes:quotes.map(q=>({symbol:q.symbol,sectorCode:q.sectorCode,sectorName:q.sectorName}))}}));
  window.dispatchEvent(new CustomEvent('sahamban:verified-portfolio-asset-types-v62',{detail:{quotes:quotes.map(q=>({symbol:q.symbol,insCode:q.insCode,assetClass:q.assetClass,assetClassLabel:q.assetClassLabel,fundNav:q.fundNav}))}}));
    window.dispatchEvent(new CustomEvent('sahamban:verified-fund-nav-premium-v63',{detail:{quotes:quotes.map(q=>({symbol:q.symbol,insCode:q.insCode,assetClass:q.assetClass,price:q.price,priceKind:q.priceKind,marketDate:q.marketDate,fundNav:q.fundNav,fundNavDate:q.fundNavDate,fundNavTime:q.fundNavTime,fundNavStatus:q.fundNavStatus,fundNavChecked:q.instrumentFlow===18}))}}));
   window.dispatchEvent(new CustomEvent('sahamban:verified-portfolio-concentration-v68',{detail:{positions:holdings.map((h,i)=>({symbol:h.symbol,quantity:h.quantity,price:quotes[i].price,marketDate:quotes[i].marketDate,assetClass:quotes[i].assetClass}))}}));
   // Investor-type flow is fetched separately; a failure never invalidates verified prices.
   const investorFlow=await Promise.all(quotes.map(async q=>{
    try{
     const response=await fetchJson('/ClientType/GetClientType/'+encodeURIComponent(q.insCode)+'/'+encodeURIComponent(q.marketDate));
     const row=Array.isArray(response?.clientType)?response.clientType[0]:null;
     const fields=['buy_I_Volume','buy_N_Volume','buy_I_Value','buy_N_Value','buy_CountI','buy_CountN','sell_I_Volume','sell_N_Volume','sell_I_Value','sell_N_Value','sell_CountI','sell_CountN'];
     if(!row||fields.some(k=>!Number.isFinite(Number(row[k]))||Number(row[k])<0))throw Error('ساختار داده حقیقی و حقوقی ناقص است');
     return {symbol:q.symbol,marketDate:q.marketDate,buyIndividualVolume:Number(row.buy_I_Volume),buyCorporateVolume:Number(row.buy_N_Volume),buyIndividualValue:Number(row.buy_I_Value),buyCorporateValue:Number(row.buy_N_Value),individualBuyerCount:Number(row.buy_CountI),corporateBuyerCount:Number(row.buy_CountN),sellIndividualVolume:Number(row.sell_I_Volume),sellCorporateVolume:Number(row.sell_N_Volume),sellIndividualValue:Number(row.sell_I_Value),sellCorporateValue:Number(row.sell_N_Value),individualSellerCount:Number(row.sell_CountI),corporateSellerCount:Number(row.sell_CountN)};
    }catch(error){return {symbol:q.symbol,marketDate:q.marketDate,error:error.message};}
   }));
   window.dispatchEvent(new CustomEvent('sahamban:verified-investor-flow-v50',{detail:{flows:investorFlow}}));

   say('دریافت قیمت جاری همه '+fmt(holdings.length)+' نماد موفق بود. نتیجه فقط روی همین صفحه محاسبه شد؛ هیچ داده‌ای در حافظه مرورگر ذخیره یا تغییر نکرد. تاریخ قیمت هر نماد در جدول مشخص است.');
  }catch(e){
   say('به‌روزرسانی انجام نشد: '+e.message+'. قیمت قبلی به‌عنوان قیمت جدید معرفی نمی‌شود و اطلاعات دارایی‌ها تغییر نمی‌کنند.');
  }finally{running=false;$('livePortfolioRefresh').disabled=false;}
 }
 $('livePortfolioRefresh').addEventListener('click',refreshLiveQuotes);
 // Price refresh is user-initiated only; no background or periodic market requests.
 $('livePortfolioShowLast').addEventListener('click',()=>{
  try{
   const holdings=readHoldings(),snapshot=JSON.parse(localStorage.getItem(QUOTES_KEY)||'null');
   if(!snapshot||snapshot.version!==1||snapshot.source!=='TSETMC'||!Array.isArray(snapshot.quotes))throw Error('هنوز تصویر قیمت ذخیره‌شده‌ای وجود ندارد.');
   const quotes=snapshot.quotes;
   if(quotes.some(q=>!q||!Number.isFinite(q.price)||q.price<=0||!Number.isSafeInteger(q.quantity)||q.quantity<=0||!Number.isFinite(q.buy)||q.buy<=0||!/^[0-9]{8,25}$/.test(String(q.insCode??''))))throw Error('فایل قیمت ذخیره‌شده ناقص یا نامعتبر است.');
   if(holdings.length!==quotes.length||holdings.some(h=>!quotes.some(q=>q.symbol===h.symbol&&q.quantity===h.quantity&&q.buy===h.buy)))throw Error('سبد فعلی با تصویر قیمت قبلی یکسان نیست؛ ابتدا قیمت‌ها را تازه‌سازی کنید.');
   for(const q of quotes)validDate(q.marketDate);
   render(holdings,quotes,snapshot.receivedAt);
   say('نمایش تصویر قیمت ذخیره‌شده؛ این داده الزاماً قیمت لحظه‌ای نیست. زمان دریافت قبلی: '+new Date(snapshot.receivedAt).toLocaleString('fa-IR')+'.');
  }catch(e){$('livePortfolioTable').hidden=true;say(e.message);}
 });
})();