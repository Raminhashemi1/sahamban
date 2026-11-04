'use strict';
/* v134: fixed, chronological 60/40 holdout diagnostic of unchanged entry rules.
 * Never tunes model weights on training observations, never calls future closes
 * in signal generation, excludes trades crossing split boundary. Not a proof
 * of predictive skill or an investable strategy.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SahambanHoldoutV134=api;})(typeof globalThis!=='undefined'?globalThis:null,function(){
 const validDate=s=>/^\d{8}$/.test(s)&&(()=>{const d=new Date(Date.UTC(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8)));return d.toISOString().slice(0,10).replaceAll('-','')===s;})();
 const stats=(arr,costPct)=>{const n=arr.length,net=arr.map(x=>x.netReturnPct),gross=arr.map(x=>x.grossReturnPct),stressCostPct=Math.min(5,costPct+1),stressNet=gross.map(x=>x-stressCostPct),mean=a=>n?a.reduce((x,y)=>x+y,0)/n:null;return {count:n,meanNetReturnPct:mean(net),meanGrossReturnPct:mean(gross),netPositivePct:n?net.filter(x=>x>0).length/n*100:null,adequateSample:n>=10,stressCostPct,stressMeanNetReturnPct:mean(stressNet),stressPositivePct:n?stressNet.filter(x=>x>0).length/n*100:null,evidenceStatus:n<10?'INSUFFICIENT_EVENTS':mean(net)<=0?'NONPOSITIVE_NET_RETURN':mean(stressNet)<=0?'FRAGILE_TO_COSTS':'DIAGNOSTIC_ONLY_NOT_VALIDATED'};};
 function evaluate(quote,{holdingDays=10,costPct=1,trainingShare=.6}={}){
  if(holdingDays!==10||trainingShare!==.6)throw new RangeError('تقسیم زمانی ثابت ۶۰/۴۰ و افق ۱۰ جلسه قابل تغییر نیستند.');
  if(!Number.isFinite(costPct)||costPct<0||costPct>5)throw new RangeError('هزینه فرضی باید بین صفر تا ۵ درصد باشد.');
  if(!globalThis.SahambanDecisionV129?.analyze)throw new Error('موتور سیگنال در دسترس نیست.');
  const h=quote?.history;if(!Array.isArray(h)||h.length<200)throw new RangeError('برای جداسازی زمانی حداقل ۲۰۰ جلسه قیمت پایانی معتبر لازم است.');
  const dates=h.map(x=>String(x?.date??'')),prices=h.map(x=>Number(x?.close));
  if(dates.some((d,i)=>!validDate(d)||(i&&d<=dates[i-1]))||prices.some(p=>!Number.isFinite(p)||p<=0))throw new RangeError('داده تاریخی نامعتبر، تکراری یا نامرتب است.');
  const cut=Math.floor(h.length*trainingShare),training=[],holdout=[],excludedBoundary=[],evaluations={training:0,holdout:0},skipped=0;
  const maxSignal=h.length-2-holdingDays;
  for(let i=59;i<=maxSignal;i++){
   const entryIndex=i+1,exitIndex=entryIndex+holdingDays;
   // Crossing-window exclusion prevents contaminating training outcomes with holdout prices.
   if(i<cut&&exitIndex>=cut){excludedBoundary.push(dates[i]);continue;}
   const phase=i<cut?'training':'holdout';
   let signal;try{signal=globalThis.SahambanDecisionV129.analyze({symbol:quote.symbol,history:h.slice(0,i+1)},{today:dates[i],maxAgeDays:0});}catch(e){skipped++;continue;}
   evaluations[phase]++;
   if(signal.code!=='ENTRY_CANDIDATE')continue;
   const gross=(prices[exitIndex]/prices[entryIndex]-1)*100,event={signalDate:dates[i],entryDate:dates[entryIndex],exitDate:dates[exitIndex],signalIndex:i,entryIndex,exitIndex,grossReturnPct:gross,netReturnPct:gross-costPct,phase};
   (phase==='training'?training:holdout).push(event);
   i=exitIndex-1;
  }
  const train=stats(training,costPct),test=stats(holdout,costPct);
  return {symbol:quote.symbol,historyCount:h.length,splitIndex:cut,splitDate:dates[cut],training:{...train,events:training,signalDaysEvaluated:evaluations.training},holdout:{...test,events:holdout,signalDaysEvaluated:evaluations.holdout},skipped,embargoedSignalDays:excludedBoundary.length,costPct,holdingDays,validity:'fixed-rules temporal diagnostic only',sufficientToClaimSkill:false};
 }
 return Object.freeze({evaluate});
});
