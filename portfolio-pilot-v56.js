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
  if(!Number.isFinite(closing)||closing<=0)throw Error('قیمت پایانی معتبر نیست.');
  const marketDate=validDate(info.dEven??info.date??info.lastDate);
  const hasLast=Number.isFinite(last)&&last>0;
  // hEven is the market's HHMMSS clock when provided by this endpoint.
  // Do not confuse response receipt time with the last trade time.
  const rawClock=String(info.hEven??'').trim();
  const clock=/^\\d{1,6}$/.test(rawClock)?rawClock.padStart(6,'0'):'';
  const hh=Number(clock.slice(0,2)),mm=Number(clock.slice(2,4)),ss=Number(clock.slice(4,6));
  const tradeTime=/^\d{6}$/.test(clock)&&hh<24&&mm<60&&ss<60&&Number(rawClock)>0
   ?clock.slice(0,2)+':'+clock.slice(2,4)+':'+clock.slice(4,6):'نامشخص';
  return {symbol:holding.symbol,insCode,quantity:holding.quantity,buy:holding.buy,
   price:hasLast?last:closing,closingPrice:closing,
   priceKind:hasLast?'آخرین معامله':'پایانی',lastTradePrice:hasLast?last:null,lastTradeTime:tradeTime,marketDate,history:null};
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
   const vals=[h.symbol,h.quantity,h.buy,q.price,q.price*h.quantity,h.importCurrent,h.quantity*h.importCurrent,h.quantity*(q.price-h.importCurrent),h.quantity*(q.price-h.buy),q.marketDate,q.lastTradePrice??'نامشخص',q.closingPrice??'نامشخص',q.lastTradeTime??'نامشخص'];
   vals.forEach((v,i)=>{const td=document.createElement('td');td.style.padding='7px 5px';td.style.borderBottom='1px solid #34546d';td.textContent=i===0||i===9||i===12||v==='نامشخص'?String(v).replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]):fmt(v);tr.append(td);});
   const rowValue=q.price*h.quantity,rowCost=h.buy*h.quantity;
   if(!Number.isSafeInteger(h.quantity)||!Number.isFinite(rowValue)||!Number.isFinite(rowCost)||rowValue>Number.MAX_SAFE_INTEGER||rowCost>Number.MAX_SAFE_INTEGER)throw Error('مبلغ دارایی از محدوده محاسبه مطمئن خارج است.');
   body.append(tr);value+=rowValue;cost+=rowCost;
  }
  if(!Number.isFinite(value)||!Number.isFinite(cost)||value>Number.MAX_SAFE_INTEGER||cost>Number.MAX_SAFE_INTEGER)throw Error('جمع سبد از محدوده محاسبه مطمئن خارج است.');
  const pnl=value-cost,percent=cost?100*pnl/cost:0;
  $('livePortfolioSummary').textContent=(mode==='import'?'ارزش بر اساس قیمت فایل: ':'ارزش طبق قیمت جاری دریافتی بازار: ')+fmt(value)+' ریال | بهای خرید: '+fmt(cost)+' ریال | سود/زیان تحقق‌نیافته: '+fmt(pnl)+' ریال ('+fmt(percent)+'٪). کارمزد و مالیات لحاظ نشده‌اند.';
  $('livePortfolioMeta').textContent=mode==='import'?'تعداد دارایی: '+fmt(holdings.length)+' | منبع: قیمت پایانی درج‌شده در فایل کارگزاری؛ تاریخ دقیق قیمت بازار نامشخص است. زمان ورود فایل به مرورگر: '+(Number.isFinite(Date.parse(receivedAt))?new Date(receivedAt).toLocaleString('fa-IR'):'نامشخص')+'. این نتیجه قیمت روز یا به‌روزرسانی خودکار نیست.':'تعداد دارایی: '+fmt(holdings.length)+' | قیمت: آخرین معامله در صورت وجود، وگرنه پایانی | تاریخ بازار هر نماد در جدول مشخص است | زمان دریافت پاسخ‌ها: '+new Date(receivedAt).toLocaleString('fa-IR')+' (زمان دستگاه). زمان دریافت، زمان آخرین معامله نیست؛ ستون ساعت بازار از خود سرویس گرفته می‌شود و ممکن است نامشخص باشد.';
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
     return {date,close};
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
   window.dispatchEvent(new CustomEvent('sahamban:verified-historical-quotes-v50',{detail:{quotes:quotes.map(q=>({symbol:q.symbol,marketDate:q.marketDate,history:q.history}))}}));
   say('دریافت قیمت جاری همه '+fmt(holdings.length)+' نماد موفق بود. نتیجه فقط روی همین صفحه محاسبه شد؛ هیچ داده‌ای در حافظه مرورگر ذخیره یا تغییر نکرد. تاریخ قیمت هر نماد در جدول مشخص است.');
  }catch(e){
   say('به‌روزرسانی انجام نشد: '+e.message+'. قیمت قبلی به‌عنوان قیمت جدید معرفی نمی‌شود و اطلاعات دارایی‌ها تغییر نمی‌کنند.');
  }finally{running=false;$('livePortfolioRefresh').disabled=false;}
 }
 $('livePortfolioRefresh').addEventListener('click',refreshLiveQuotes);
 // Refresh only while the page is visible; never modify stored holdings.
 setInterval(()=>{if(!document.hidden&&!running&&localStorage.getItem(HOLDINGS_KEY))refreshLiveQuotes();},60000);
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