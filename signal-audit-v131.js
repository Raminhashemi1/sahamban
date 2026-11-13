'use strict';
/* v132: no-lookahead historical event audit with transparent illustrative cost scenarios.
 * Costs are user-configurable assumptions, NOT official brokerage fee schedules.
 * Proxy entry next close; exit after ten further session closes. No execution simulation.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SahambanSignalAuditV132=api;})(typeof globalThis!=='undefined'?globalThis:null,function(){
 function maxDrawdown(returns){let equity=1,peak=1,worst=0;for(const r of returns){equity*=1+r/100;peak=Math.max(peak,equity);worst=Math.min(worst,(equity/peak-1)*100);}return worst;}
 function audit(quote,{holdingDays=10,minHistory=110,roundTripCostPct=1}={}){
  if(quote?.historyPriceBasisEvidence!=='INDEPENDENTLY_ATTESTED')throw new Error('مبنای تعدیل قیمت تاریخی مستقلاً تأیید نشده است؛ آزمون تاریخی متوقف شد.');
  if(!quote||!Array.isArray(quote.history)||quote.history.length<minHistory)throw new RangeError('برای آزمون تاریخی دست‌کم ۱۱۰ جلسه معتبر لازم است.');
  if(holdingDays!==10)throw new RangeError('در این نسخه افق محاسبه فقط ۱۰ جلسه معاملاتی است.');
  if(!Number.isFinite(roundTripCostPct)||roundTripCostPct<0||roundTripCostPct>5)throw new RangeError('هزینه فرضی رفت‌وبرگشت باید بین صفر تا ۵ درصد باشد.');
  if(!globalThis.SahambanDecisionV129?.analyze)throw new Error('موتور قواعد ورود بارگذاری نشده است.');
  const dates=quote.history.map(x=>String(x?.date||'')),prices=quote.history.map(x=>Number(x?.close));
  const validDate=s=>/^\d{8}$/.test(s)&&(()=>{const y=Number(s.slice(0,4)),m=Number(s.slice(4,6)),d=Number(s.slice(6,8)),x=new Date(Date.UTC(y,m-1,d));return y>=1900&&x.getUTCFullYear()===y&&x.getUTCMonth()+1===m&&x.getUTCDate()===d;})();
  if(dates.some((d,i)=>!validDate(d)||(i>0&&d<=dates[i-1]))||prices.some(p=>!Number.isFinite(p)||p<=0))throw new RangeError('ترتیب تاریخ یا قیمت تاریخچه نامعتبر است.');
  const marks=[],firstSignal=59,lastSignal=quote.history.length-2-holdingDays;let tested=0,skipped=0;
  for(let i=firstSignal;i<=lastSignal;i++){
   let r;try{r=globalThis.SahambanDecisionV129.analyze({symbol:quote.symbol,history:quote.history.slice(0,i+1)},{today:dates[i],maxAgeDays:0});}catch(e){skipped++;continue;}
   tested++;if(r.code!=='ENTRY_CANDIDATE')continue;
   const entryIndex=i+1,exitIndex=entryIndex+holdingDays,entry=prices[entryIndex],exit=prices[exitIndex],gross=(exit/entry-1)*100;
   marks.push({signalDate:dates[i],entryDate:dates[entryIndex],exitDate:dates[exitIndex],entry,exit,grossReturnPct:gross,returnPct:gross,netReturnPct:gross-roundTripCostPct,signalScore:r.score});
   i=exitIndex-1;
  }
  const count=marks.length,avg=key=>count?marks.reduce((t,m)=>t+m[key],0)/count:null;
  const win=key=>count?marks.filter(m=>m[key]>0).length/count*100:null;
  const gross=marks.map(x=>x.grossReturnPct),net=marks.map(x=>x.netReturnPct);
  const stress=marks.map(x=>x.grossReturnPct-2);
  return {symbol:quote.symbol,historyCount:quote.history.length,firstDate:dates[0],lastDate:dates.at(-1),testedSignals:tested,skipped,events:marks,count,holdingDays,roundTripCostPct,meanReturnPct:avg('grossReturnPct'),winRatePct:win('grossReturnPct'),meanGrossReturnPct:avg('grossReturnPct'),meanNetReturnPct:avg('netReturnPct'),grossWinRatePct:win('grossReturnPct'),netWinRatePct:win('netReturnPct'),netMaxDrawdownPct:maxDrawdown(net),stressCostPct:2,stressMeanNetReturnPct:count?stress.reduce((a,b)=>a+b,0)/count:null,stressNetWinRatePct:count?stress.filter(x=>x>0).length/count*100:null,stressMaxDrawdownPct:maxDrawdown(stress),adequateSample:count>=10,rule:'signal at day close, proxy entry at next session close, proxy exit after ten further session closes'};
 }
 return Object.freeze({audit,maxDrawdown});
});
