'use strict';
/* Live market overlay for imported holdings.
 * Reads holdings but never writes to their storage key. Prices live in a separate key.
 */
(()=> {
 const $=id=>document.getElementById(id);
 const HOLDINGS_KEY='sahamban-broker-holdings-v1';
 const QUOTES_KEY='sahamban-broker-live-quotes-v1';
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
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
  try{
   const response=await fetch(API+path,{method:'GET',cache:'no-store',signal:ctrl.signal,headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const type=response.headers.get('content-type')||'';
   if(!type.toLowerCase().includes('json'))throw Error('پاسخ JSON نیست؛ احتمال محدودیت شبکه یا جغرافیایی');
   return await response.json();
  }finally{clearTimeout(timer);}
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
  const result=await fetchJson('/ClosingPrice/GetClosingPriceInfo/'+insCode);
  const info=result?.closingPriceInfo;
  if(!info||typeof info!=='object')throw Error('اطلاعات قیمت دریافت نشد.');
  const price=Number(info.pClosing);
  if(!Number.isFinite(price)||price<=0)throw Error('قیمت پایانی معتبر دریافت نشد.');
  const date=validDate(info.dEven??info.date??info.lastDate);
  // Match the closing price against an independent dated history response.
  const history=await fetchJson('/ClosingPrice/GetClosingPriceDailyList/'+insCode+'/0');
  const daily=history?.closingPriceDaily;
  if(!Array.isArray(daily)||daily.length===0)throw Error('تاریخچه معتبر موجود نیست.');
  const matching=daily.filter(row=>String(row?.dEven??'')===date);
  if(matching.length!==1)throw Error('تاریخ معامله در تاریخچه یکتا نیست.');
  const historyPrice=Number(matching[0].pClosing);
  if(!Number.isFinite(historyPrice)||historyPrice<=0||Math.abs(historyPrice-price)>0.000001)throw Error('قیمت با تاریخچه تطبیق ندارد.');
  return {symbol:holding.symbol,insCode,quantity:holding.quantity,buy:holding.buy,price,marketDate:date};
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
   try{valid.push(await verifiedCode(holding,String(candidate.insCode)));}
   catch(e){lastError=e.message;}
  }
  if(valid.length!==1)throw Error(valid.length?'چند شناسه تازه و معتبر برای '+holding.symbol+' وجود دارد؛ انتخاب خودکار ایمن نیست.':'هیچ شناسه‌ای برای '+holding.symbol+' با قیمت و تاریخ معتبر تأیید نشد. '+lastError);
  return valid[0];
 }
 function render(holdings,quotes,receivedAt,mode='live'){
  const body=$('livePortfolioRows');body.replaceChildren();
  let value=0,cost=0;
  for(const h of holdings){
   const q=quotes.find(x=>x.symbol===h.symbol);
   const tr=document.createElement('tr');
   const vals=[h.symbol,h.quantity,h.buy,q.price,q.price*h.quantity,h.quantity*(q.price-h.buy),q.marketDate];
   vals.forEach((v,i)=>{const td=document.createElement('td');td.style.padding='7px 5px';td.style.borderBottom='1px solid #34546d';td.textContent=i===0||i===6?String(v).replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]):fmt(v);tr.append(td);});
   const rowValue=q.price*h.quantity,rowCost=h.buy*h.quantity;
   if(!Number.isSafeInteger(h.quantity)||!Number.isFinite(rowValue)||!Number.isFinite(rowCost)||rowValue>Number.MAX_SAFE_INTEGER||rowCost>Number.MAX_SAFE_INTEGER)throw Error('مبلغ دارایی از محدوده محاسبه مطمئن خارج است.');
   body.append(tr);value+=rowValue;cost+=rowCost;
  }
  if(!Number.isFinite(value)||!Number.isFinite(cost)||value>Number.MAX_SAFE_INTEGER||cost>Number.MAX_SAFE_INTEGER)throw Error('جمع سبد از محدوده محاسبه مطمئن خارج است.');
  const pnl=value-cost,percent=cost?100*pnl/cost:0;
  $('livePortfolioSummary').textContent=(mode==='import'?'ارزش بر اساس قیمت فایل: ':'ارزش روز: ')+fmt(value)+' ریال | بهای خرید: '+fmt(cost)+' ریال | سود/زیان تحقق‌نیافته: '+fmt(pnl)+' ریال ('+fmt(percent)+'٪). کارمزد و مالیات لحاظ نشده‌اند.';
  $('livePortfolioMeta').textContent=mode==='import'?'تعداد دارایی: '+fmt(holdings.length)+' | منبع: قیمت پایانی درج‌شده در فایل کارگزاری؛ تاریخ دقیق قیمت بازار نامشخص است. زمان ورود فایل به مرورگر: '+(Number.isFinite(Date.parse(receivedAt))?new Date(receivedAt).toLocaleString('fa-IR'):'نامشخص')+'. این نتیجه قیمت روز یا به‌روزرسانی خودکار نیست.':'تعداد دارایی: '+fmt(holdings.length)+' | تاریخ بازار هر نماد در جدول مشخص است | زمان دریافت پاسخ‌ها: '+new Date(receivedAt).toLocaleString('fa-IR')+' (زمان دستگاه). زمان دریافت، زمان آخرین معامله نیست.';
  $('livePortfolioTable').hidden=false;
 }
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
 $('livePortfolioRefresh').addEventListener('click',async()=>{
  if(running)return;
  running=true;$('livePortfolioRefresh').disabled=true;$('livePortfolioTable').hidden=true;
  $('livePortfolioSummary').textContent='';$('livePortfolioMeta').textContent='';
  try{
   const holdings=readHoldings();
   say('در حال دریافت قیمت پایانی از TSETMC برای '+fmt(holdings.length)+' نماد. تا پایان بررسی، جمع ارزش روز نمایش داده نمی‌شود...');
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
   localStorage.setItem(QUOTES_KEY,JSON.stringify(snapshot));
   render(holdings,quotes,snapshot.receivedAt);
   say('دریافت و اعتبارسنجی همه '+fmt(holdings.length)+' قیمت موفق بود. فقط قیمت‌ها در ذخیره‌سازی جداگانه ثبت شدند؛ تعداد و میانگین خرید دست‌نخورده‌اند.');
  }catch(e){
   say('به‌روزرسانی انجام نشد: '+e.message+'. قیمت قبلی به‌عنوان قیمت جدید معرفی نمی‌شود و اطلاعات دارایی‌ها تغییر نمی‌کنند.');
  }finally{running=false;$('livePortfolioRefresh').disabled=false;}
 });
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