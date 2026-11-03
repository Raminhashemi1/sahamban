'use strict';
/* v131: historical event audit of entry candidates (NOT an executable backtest).
 * Each rule sees closes through signal day only. Entry/exit proxy are NEXT-day
 * closing prices, not actual trade fills. No fees, slippage, halts or corporate
 * action adjustments. Non-overlapping windows, no data persistence/network.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SahambanSignalAuditV131=api;})(typeof globalThis!=='undefined'?globalThis:null,function(){
 function audit(quote,{holdingDays=10,minHistory=110}={}){
  if(!quote||!Array.isArray(quote.history)||quote.history.length<minHistory)throw new RangeError('برای آزمون تاریخی دست‌کم ۱۱۰ جلسه معتبر لازم است.');
  if(holdingDays!==10)throw new RangeError('در این نسخه افق محاسبه فقط ۱۰ جلسه معاملاتی است.');
  if(!globalThis.SahambanDecisionV129?.analyze)throw new Error('موتور قواعد ورود بارگذاری نشده است.');
  const dates=quote.history.map(x=>String(x?.date||'')),prices=quote.history.map(x=>Number(x?.close));
  if(dates.some((d,i)=>!/^\d{8}$/.test(d)||(i>0&&d<=dates[i-1]))||prices.some(p=>!Number.isFinite(p)||p<=0))throw new RangeError('ترتیب تاریخ یا قیمت تاریخچه نامعتبر است.');
  const marks=[],firstSignal=59,lastSignal=quote.history.length-2-holdingDays;
  let tested=0,skipped=0;
  for(let i=firstSignal;i<=lastSignal;i++){
   let r;
   try{r=globalThis.SahambanDecisionV129.analyze({symbol:quote.symbol,history:quote.history.slice(0,i+1)},{today:dates[i],maxAgeDays:0});}catch(e){skipped++;continue;}
   tested++;
   if(r.code!=='ENTRY_CANDIDATE')continue;
   const entryIndex=i+1,exitIndex=entryIndex+holdingDays;
   const entry=prices[entryIndex],exit=prices[exitIndex],ret=(exit/entry-1)*100;
   marks.push({signalDate:dates[i],entryDate:dates[entryIndex],exitDate:dates[exitIndex],entry,exit,returnPct:ret,signalScore:r.score});
   i=exitIndex-1; // never overlap event windows; subsequent signal may use subsequent observations
  }
  const count=marks.length,mean=count?marks.reduce((t,m)=>t+m.returnPct,0)/count:null;
  const wins=count?marks.filter(m=>m.returnPct>0).length:null;
  return {symbol:quote.symbol,historyCount:quote.history.length,firstDate:dates[0],lastDate:dates.at(-1),testedSignals:tested,skipped,events:marks,count,winRatePct:count?wins/count*100:null,meanReturnPct:mean,holdingDays,rule:'signal at day close, proxy entry at next session close, proxy exit after ten further session closes',adequateSample:count>=10};
 }
 return Object.freeze({audit});
});
