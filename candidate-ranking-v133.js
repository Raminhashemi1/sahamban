'use strict';
/* v133: transparent short-list ORDERING ONLY among currently sampled public symbols.
 * No invented liquidity; missing transaction values prevent eligibility.
 * Historical event studies are diagnostic and deliberately NOT used for ranking
 * (no out-of-sample validation yet). No network, orders, holdings or persistence.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SahambanRankV133=api;})(typeof globalThis!=='undefined'?globalThis:null,function(){
 const median=values=>{const a=[...values].sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
 function quality(item){
  const r=item?.report,h=item?.quote?.history;
  if(!item?.ok||!r||!Array.isArray(h)||h.length<60)return {eligible:false,reason:'داده معتبر و کامل برای نماد دریافت نشده است.'};
  if(item?.quote?.historyPriceBasisEvidence!=='INDEPENDENTLY_ATTESTED')return {eligible:false,reason:'مبنای تعدیل قیمت تاریخی مستقلاً تأیید نشده است؛ رتبه ورود صادر نمی‌شود.'};
  if(r.code!=='ENTRY_CANDIDATE')return {eligible:false,reason:'بر اساس قواعد فعلی، نماد نامزد ورود نیست.'};
  if(!Number.isFinite(r.last)||r.last<=0||!Number.isFinite(r.stop)||r.stop<=0||r.stop>=r.last)return {eligible:false,reason:'سطح حد ضرر ساختاری معتبر موجود نیست.'};
  const latest=h.slice(-20),values=latest.map(x=>x?.tradedValue).filter(x=>Number.isFinite(x)&&x>0);
  if(values.length<15)return {eligible:false,reason:'ارزش معاملات ۲۰ جلسه اخیر پوشش کافی ندارد؛ رتبه صادر نمی‌شود.',coverage:values.length};
  const riskPct=(r.last-r.stop)/r.last*100;
  if(!Number.isFinite(riskPct)||riskPct<=0)return {eligible:false,reason:'فاصله حد ضرر از قیمت پایانی معتبر نیست.'};
  return {eligible:true,score:r.score,riskPct,medianTradedValue:median(values),coverage:values.length,reason:'نامزد ورود با پوشش کافی ارزش معاملات و حد ضرر ساختاری'};
 }
 function rank(results){
  if(!Array.isArray(results)||results.length>40)throw new RangeError('رتبه‌بندی حداکثر ۴۰ نتیجه در هر نشست مجاز است.');
  const enriched=results.map((item,index)=>({item,index,quality:quality(item)}));
  const eligible=enriched.filter(x=>x.quality.eligible).sort((a,b)=>b.quality.score-a.quality.score||a.quality.riskPct-b.quality.riskPct||b.quality.medianTradedValue-a.quality.medianTradedValue||a.index-b.index);
  return {ranked:eligible.map((x,i)=>({rank:i+1,symbol:x.item.symbol,report:x.item.report,historical:x.item.historical,quality:x.quality})),excluded:enriched.filter(x=>!x.quality.eligible).map(x=>({symbol:x.item?.symbol??'',reason:x.quality.reason})),total:results.length};
 }
 return Object.freeze({quality,rank});
});
