'use strict';
/* v129 transparent decision-support rules. Verified daily closes only; no trading, prediction, storage or network. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SahambanDecisionV129=api;})(typeof globalThis!=='undefined'?globalThis:null,function(){
 const validDate=s=>/^\d{8}$/.test(String(s||''))&&(()=>{const x=String(s),d=new Date(Date.UTC(+x.slice(0,4),+x.slice(4,6)-1,+x.slice(6,8)));return d.getUTCFullYear()===+x.slice(0,4)&&d.getUTCMonth()+1===+x.slice(4,6)&&d.getUTCDate()===+x.slice(6,8);})();
 const dayNumber=s=>Date.UTC(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8))/86400000;
 const sma=(a,n)=>a.slice(-n).reduce((x,y)=>x+y,0)/n;
 function analyze(q,{today,maxAgeDays=7}={}){
  if(!q||typeof q.symbol!=='string'||!Array.isArray(q.history))throw new TypeError('نماد و تاریخچه معتبر لازم است.');
  const h=q.history.map(x=>({date:String(x?.date||''),close:Number(x?.close),tradedValue:x?.tradedValue==null?null:Number(x.tradedValue)}));
  if(h.length<60)throw new RangeError('برای تحلیل روند میان‌مدت حداقل ۶۰ قیمت پایانی معتبر لازم است.');
  if(h.some(x=>!validDate(x.date)||!Number.isFinite(x.close)||x.close<=0)||h.some((x,i)=>i&&x.date<=h[i-1].date))throw new RangeError('تاریخچه باید معتبر، یکتا و از قدیم به جدید مرتب باشد.');
  if(!validDate(today))throw new RangeError('تاریخ مبنای بازار معتبر نیست.');
  const age=dayNumber(today)-dayNumber(h.at(-1).date);
  if(age<0||age>maxAgeDays)throw new RangeError('آخرین داده بازار بیش از حد قدیمی یا دارای تاریخ آینده است؛ سیگنال صادر نشد.');
  const closes=h.map(x=>x.close),ind=globalThis.SahambanTechnicalV50?.calculate(closes,{smaPeriod:20,rsiPeriod:14,macd:{fast:12,slow:26,signal:9}});
  if(!ind)throw new Error('کتابخانه اندیکاتورهای معتبر در دسترس نیست.');
  const last=closes.at(-1),s20=ind.sma.at(-1),s50=sma(closes,50),rsi=ind.rsi.at(-1),macd=ind.macd.macd.at(-1),hist=ind.macd.histogram.at(-1),prevHist=ind.macd.histogram.at(-2),momentum=(last/closes.at(-21)-1)*100,priorHigh=Math.max(...closes.slice(-21,-1)),priorLow=Math.min(...closes.slice(-21,-1));
  if([s20,s50,rsi,macd,hist,prevHist,momentum,priorHigh,priorLow].some(x=>!Number.isFinite(x)))throw new RangeError('برای محاسبه همه مؤلفه‌ها داده کافی وجود ندارد.');
  const trend=last>s20&&s20>s50,healthyRsi=rsi>=50&&rsi<=68,positiveMacd=hist>0&&hist>prevHist,positiveMomentum=momentum>0,breakout=last>priorHigh;
  const points={trend:trend?30:0,rsi:healthyRsi?15:0,macd:positiveMacd?25:0,momentum:positiveMomentum?15:0,breakout:breakout?15:0};
  const score=Object.values(points).reduce((a,b)=>a+b,0),broken20=last<priorLow,weakTrend=last<s20&&s20<s50,negativeMomentum=momentum<0,negativeMacd=hist<0&&hist<prevHist;
  let action='صبر و پایش',code='WAIT',reason='هنوز همه شروط ورود هم‌زمان برقرار نیستند.';
  if(broken20){action='بررسی فوری حد ضرر',code='RISK_EXIT',reason='قیمت پایانی زیر کمترین قیمت پایانی ۲۰ جلسه قبل بسته شده؛ حد ضرر و امکان خروج را بررسی کنید.';}
  else if(weakTrend&&negativeMomentum&&negativeMacd&&rsi<45){action='بررسی خروج / کاهش ریسک',code='EXIT_REVIEW',reason='روند، مومنتوم و MACD هم‌زمان ضعیف‌اند؛ خروج قطعی نیست و باید با حد ضرر و وضعیت موقعیت بررسی شود.';}
  else if(score>=80&&breakout){action='نامزد ورود؛ نیازمند تأیید',code='ENTRY_CANDIDATE',reason='روند، مومنتوم، RSI و شکست سقف ۲۰ جلسه هم‌راستا هستند؛ این فقط نامزد بررسی است، نه دستور خرید.';}
  else if(score<40){action='فعلاً عدم ورود',code='AVOID',reason='امتیاز شروط روند و مومنتوم پایین است؛ برای ورود عجله نکنید.';}
  const stop=priorLow,riskPerShare=last-stop,target=last+2*riskPerShare;
  const reasons=[['روند صعودی (قیمت > SMA20 > SMA50)',trend],['RSI در بازه ۵۰ تا ۶۸',healthyRsi],['MACD مثبت و رو به تقویت',positiveMacd],['بازده ۲۰ جلسه مثبت',positiveMomentum],['شکست سقف ۲۰ جلسه قبل',breakout]];
  return {symbol:q.symbol,marketDate:h.at(-1).date,ageDays:age,last,sma20:s20,sma50:s50,rsi,macd,hist,momentum,priorHigh,priorLow,score,points,action,code,reason,stop:stop<last?stop:null,target:stop<last?target:null,riskPerShare:stop<last?riskPerShare:null,reasons};
 }
 function sizePosition({capital,riskPercent,entry,stop}){
  for(const [k,v] of Object.entries({capital,riskPercent,entry,stop}))
   if(!Number.isFinite(v)||v<=0)throw new RangeError('همه مقادیر باید مثبت و معتبر باشند.');
  if(!Number.isSafeInteger(capital)||!Number.isSafeInteger(entry)||!Number.isSafeInteger(stop))
   throw new RangeError('مبالغ ریالی باید عدد صحیح در محدوده دقت امن باشند.');
  if(riskPercent>5||stop>=entry)throw new RangeError('ریسک هر معامله باید حداکثر ۵٪ و حد ضرر کمتر از ورود باشد.');
  const riskPerShare=entry-stop,riskBudget=capital*riskPercent/100;
  const byRisk=Math.floor(riskBudget/riskPerShare),byCash=Math.floor(capital/entry);
  const quantity=Math.min(byRisk,byCash);
  if(!Number.isSafeInteger(quantity)||quantity<0)throw new RangeError('تعداد سهام خارج از محدوده امن است.');
  const estimatedCost=quantity*entry,estimatedLoss=quantity*riskPerShare;
  if(!Number.isSafeInteger(estimatedCost)||!Number.isSafeInteger(estimatedLoss))
   throw new RangeError('مبلغ یا ریسک محاسبه‌شده خارج از محدوده امن است.');
  return {riskBudget,quantity,maxLoss:estimatedLoss,estimatedCost,limitedBy:byCash<byRisk?'AVAILABLE_CASH':'RISK_BUDGET'};
 }
 return Object.freeze({analyze,sizePosition});
});
