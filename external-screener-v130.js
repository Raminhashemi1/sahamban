'use strict';
/* v130 external-symbol discovery: opt-in, bounded, read-only and zero persisted user data.
 * Returns observations only when the public market response identifies ONE exact symbol
 * and supplies valid, ordered, sufficiently long actual daily close history. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SahambanDiscoveryV130=api;})(typeof globalThis!=='undefined'?globalThis:null,function(){
 const BASE='https://cdn.tsetmc.com/api';
 const normalize=s=>String(s??'').replace(/[\u200c\u200e\u200f\uFEFF\s]/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک').toUpperCase();
 function parseNames(raw){
  if(typeof raw!=='string')throw new TypeError('ورودی نام نماد باید متن باشد.');
  const fields=raw.split(/[,،؛;\n]/).map(s=>s.trim()).filter(Boolean);
  if(!fields.length||fields.length>8)throw new RangeError('بین ۱ تا ۸ نماد را با ویرگول از هم جدا کنید.');
  const seen=new Set();
  return fields.map(symbol=>{const key=normalize(symbol);if(!/^[\p{L}\p{N}_-]{1,32}$/u.test(key)||seen.has(key))throw new RangeError('نام نماد نامعتبر یا تکراری است: '+symbol);seen.add(key);return {symbol,key};});
 }
 function parseExactIdentity(payload,key){
  if(!Array.isArray(payload?.instrumentSearch))throw new Error('ساختار جست‌وجوی نماد معتبر نیست.');
  const matches=[...new Map(payload.instrumentSearch.filter(x=>normalize(x?.lVal18AFC)===key&&/^\d{8,25}$/.test(String(x?.insCode??''))).map(x=>[String(x.insCode),x])).values()];
  if(matches.length===0)throw new Error('هیچ شناسه دقیق و معتبر برای نماد پیدا نشد.');
  if(matches.length!==1)throw new Error('چند شناسه دقیق برای این نماد وجود دارد؛ انتخاب خودکار متوقف شد.');
  return {insCode:String(matches[0].insCode),symbol:String(matches[0].lVal18AFC)};
 }
 function parseHistory(payload,identity){
  if(!Array.isArray(payload?.closingPriceDaily))throw new Error('ساختار تاریخچه بازار معتبر نیست.');
  const validDate=s=>/^\d{8}$/.test(s)&&(()=>{const d=new Date(Date.UTC(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8)));return d.getUTCFullYear()===+s.slice(0,4)&&d.getUTCMonth()+1===+s.slice(4,6)&&d.getUTCDate()===+s.slice(6,8);})();
  const hist=payload.closingPriceDaily.map(x=>{const date=String(x?.dEven??''),close=Number(x?.pClosing);if(!validDate(date)||!Number.isFinite(close)||close<=0)return null;const tradedValue=x?.qTotCap==null?null:Number(x.qTotCap);return {date,close,tradedValue:Number.isFinite(tradedValue)&&tradedValue>0?tradedValue:null};}).filter(Boolean).sort((a,b)=>a.date.localeCompare(b.date));
  if(hist.length<60)throw new Error('کمتر از ۶۰ قیمت پایانی معتبر دریافت شد.');
  if(new Set(hist.map(x=>x.date)).size!==hist.length)throw new Error('تاریخچه دارای تاریخ تکراری است؛ تحلیل متوقف شد.');
  if(hist.length>12000)throw new Error('حجم تاریخچه خارج از محدوده امن است.');
  const history=hist.slice(-250);
  return {symbol:identity.symbol,insCode:identity.insCode,marketDate:history.at(-1).date,history,historyPriceBasis:'UNKNOWN_NOT_ATTESTED',historyPriceBasisEvidence:'NOT_ESTABLISHED',capitalAdjustmentAllowed:false,historicalPriceSource:{provider:'TSETMC',endpoint:'/ClosingPrice/GetClosingPriceDailyList/'+identity.insCode+'/0',dateField:'dEven',priceField:'pClosing',dateCalendar:'GREGORIAN_YYYYMMDD',adjustmentBasis:'UNKNOWN_NOT_ATTESTED'}};
 }
 async function getJson(path,{fetcher=fetch,timeoutMs=15000}={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{const response=await fetcher(BASE+path,{method:'GET',cache:'no-store',headers:{Accept:'application/json'},signal:controller.signal});
   if(!response.ok)throw new Error('خطای HTTP '+response.status);
   if(!String(response.headers.get('content-type')||'').toLowerCase().includes('json'))throw new Error('پاسخ بازار JSON معتبر نیست.');
   return await response.json();
  }finally{clearTimeout(timer);}
 }
 async function discoverOne(name,opts={}){
  const {symbol,key}=name;
  const found=parseExactIdentity(await getJson('/Instrument/GetInstrumentSearch/'+encodeURIComponent(symbol),opts),key);
  const quote=parseHistory(await getJson('/ClosingPrice/GetClosingPriceDailyList/'+encodeURIComponent(found.insCode)+'/0',opts),found);
  return quote;
 }
 async function screen(raw,{fetcher,today,onProgress}={}){
  const names=parseNames(raw),results=new Array(names.length);let next=0,done=0;
  if(!/^[0-9]{8}$/.test(String(today??'')))throw new Error('تاریخ مبنای بازار مشخص نیست.');
  async function worker(){while(next<names.length){const i=next++;try{const quote=await discoverOne(names[i],{fetcher});const report=globalThis.SahambanDecisionV129.analyze(quote,{today,maxAgeDays:7});if(quote.historyPriceBasisEvidence!=='INDEPENDENTLY_ATTESTED'){report.code='DATA_BASIS_UNVERIFIED';report.action='عدم صدور سیگنال؛ مبنای تعدیل قیمت تاریخی تأیید نشده';report.reason='مبنای تعدیل تاریخچه قیمت از منبع بازار مستقلاً احراز نشده است. امتیاز تکنیکال صرفاً تشخیصی است و نامزد ورود، خروج یا حد ضرر صادر نمی‌شود.';report.stop=null;report.target=null;report.riskPerShare=null;report.dataBasisStatus='UNKNOWN_NOT_ATTESTED';}results[i]={symbol:names[i].symbol,ok:true,report,quote};}catch(e){results[i]={symbol:names[i].symbol,ok:false,error:e.name==='AbortError'?'مهلت اتصال به منبع بازار تمام شد':e.message};}done++;onProgress?.(done,names.length);}}
  await Promise.all(Array.from({length:Math.min(2,names.length)},()=>worker()));
  return results;
 }
 return Object.freeze({parseNames,parseExactIdentity,parseHistory,screen});
});
