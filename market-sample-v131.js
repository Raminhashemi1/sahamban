'use strict';
/* v131 opt-in "most viewed" sample, NOT a whole-market screen. No holdings access.
 * Exactly one public top-list request, at most 6 historical requests, sequential.
 * Never implies top-viewed symbols are objectively best opportunities.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SahambanMarketSampleV131=api;})(typeof globalThis!=='undefined'?globalThis:null,function(){
 const BASE='https://cdn.tsetmc.com/api';
 const TOP='/ClosingPrice/GetTradeTop/MostVisited/0/40';
 const normalize=s=>String(s??'').replace(/[\u200c\u200e\u200f\uFEFF\s]/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک').toUpperCase();
 function candidates(payload,{limit=6}={}){
  if(!Array.isArray(payload?.tradeTop)||payload.tradeTop.length>1000)throw new Error('فهرست پربازدیدها معتبر نیست.');
  if(!Number.isInteger(limit)||limit<1||limit>6)throw new RangeError('حداکثر ۶ نماد در هر نوبت قابل بررسی است.');
  const candidates=[],seen=new Set();
  for(const row of payload.tradeTop){
   const instrument=row?.instrument;
   const code=String(instrument?.insCode??''),symbol=String(instrument?.lVal18AFC??'').trim(),key=normalize(symbol);
   if(!/^\d{8,25}$/.test(code)||!key||!/^[\p{L}\p{N}_-]{1,32}$/u.test(key)||seen.has(key))continue;
   seen.add(key);
   candidates.push({symbol,key,insCode:code});
   if(candidates.length>=limit)break;
  }
  if(!candidates.length)throw new Error('در فهرست پربازدیدها نماد با شناسه قابل تأیید یافت نشد.');
  return candidates;
 }
 async function json(url,fetcher,timeoutMs=15000){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  try{
   const r=await fetcher(url,{method:'GET',cache:'no-store',headers:{Accept:'application/json'},signal:ctrl.signal});
   if(!r.ok)throw new Error('خطای HTTP '+r.status);
   if(!String(r.headers.get('content-type')||'').toLowerCase().includes('json'))throw new Error('پاسخ JSON معتبر نیست.');
   return await r.json();
  }finally{clearTimeout(timer);}
 }
 async function sample({fetcher=fetch,today,onProgress,limit=6}={}){
  if(!/^\d{8}$/.test(String(today??'')))throw new Error('تاریخ مبنای بازار نامعتبر است.');
  const feed=await json(BASE+TOP,fetcher),list=candidates(feed,{limit}),results=[];
  for(const [idx,c] of list.entries()){
   try{
    const data=await json(BASE+'/ClosingPrice/GetClosingPriceDailyList/'+encodeURIComponent(c.insCode)+'/0',fetcher);
    const quote=globalThis.SahambanDiscoveryV130.parseHistory(data,c);
    const report=globalThis.SahambanDecisionV129.analyze(quote,{today,maxAgeDays:7});
    const basisAttested=quote.historyPriceBasisEvidence==='INDEPENDENTLY_ATTESTED';
    if(!basisAttested){
     report.code='DATA_BASIS_UNVERIFIED';report.action='عدم صدور سیگنال؛ مبنای تعدیل قیمت تاریخی تأیید نشده';
     report.reason='منبع TSETMC فیلدهای dEven و pClosing را ارائه کرده، اما خام یا تعدیل‌شده بودن تاریخچه مستقلاً احراز نشده است. امتیاز تکنیکال صرفاً تشخیصی است؛ نامزد ورود و حد ضرر صادر نمی‌شود.';
     report.stop=null;report.target=null;report.riskPerShare=null;report.dataBasisStatus='UNKNOWN_NOT_ATTESTED';
    }
    let historical=null;
    if(!basisAttested)historical={error:'مبنای تعدیل قیمت تاریخی مستقلاً تأیید نشده است.'};
    else try{historical=globalThis.SahambanSignalAuditV132.audit(quote);}
    catch(e){historical={error:e.message};}
    let holdout=null;
    if(!basisAttested)holdout={error:'مبنای تعدیل قیمت تاریخی مستقلاً تأیید نشده است.'};
    else try{holdout=globalThis.SahambanHoldoutV134.evaluate(quote);}
    catch(e){holdout={error:e.message};}
    results.push({symbol:c.symbol,ok:true,report,historical,holdout,quote});
   }catch(e){results.push({symbol:c.symbol,ok:false,error:e.name==='AbortError'?'مهلت اتصال به بورس پایان یافت':e.message});}
   onProgress?.(idx+1,list.length);
  }
  return {source:'MostVisited',poolSize:feed.tradeTop.length,sampled:list.length,results};
 }
 return Object.freeze({candidates,sample});
});
