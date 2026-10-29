'use strict';
/* v50 pure technical indicators. Input closes must be verified historical closes, oldest first.
 * No network, storage, portfolio mutation, or price-source assumptions. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.SahambanTechnicalV50=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  function series(values){
    if(!Array.isArray(values)||values.length===0) throw new TypeError('حداقل یک قیمت پایانی تاریخی لازم است.');
    const out=values.map(Number);
    if(out.some(v=>!Number.isFinite(v)||v<=0)) throw new RangeError('قیمت‌های پایانی باید اعداد مثبت و معتبر باشند.');
    return out;
  }
  function periodOf(period){
    if(!Number.isInteger(period)||period<1||period>1000) throw new RangeError('دوره اندیکاتور نامعتبر است.');
    return period;
  }
  function sma(closes,period){
    const x=series(closes),p=periodOf(period),out=Array(x.length).fill(null);
    let sum=0;
    for(let i=0;i<x.length;i++){sum+=x[i];if(i>=p)sum-=x[i-p];if(i>=p-1)out[i]=sum/p;}
    return out;
  }
  function ema(closes,period){
    const x=series(closes),p=periodOf(period),out=Array(x.length).fill(null);
    if(x.length<p)return out;
    let seed=0;for(let i=0;i<p;i++)seed+=x[i];
    let prev=seed/p;out[p-1]=prev;const alpha=2/(p+1);
    for(let i=p;i<x.length;i++){prev=(x[i]-prev)*alpha+prev;out[i]=prev;}
    return out;
  }
  function rsi(closes,period=14){
    const x=series(closes),p=periodOf(period),out=Array(x.length).fill(null);
    if(x.length<=p)return out;
    let gains=0,losses=0;
    for(let i=1;i<=p;i++){const d=x[i]-x[i-1];if(d>0)gains+=d;else losses-=d;}
    let avgGain=gains/p,avgLoss=losses/p;
    const value=()=>avgGain===0&&avgLoss===0?50:avgLoss===0?100:avgGain===0?0:100-(100/(1+avgGain/avgLoss));
    out[p]=value();
    for(let i=p+1;i<x.length;i++){const d=x[i]-x[i-1],g=Math.max(d,0),l=Math.max(-d,0);avgGain=((avgGain*(p-1))+g)/p;avgLoss=((avgLoss*(p-1))+l)/p;out[i]=value();}
    return out;
  }
  function macd(closes,fast=12,slow=26,signal=9){
    const x=series(closes),f=periodOf(fast),s=periodOf(slow),sig=periodOf(signal);
    if(f>=s)throw new RangeError('دوره سریع MACD باید از دوره کند کوتاه‌تر باشد.');
    const ef=ema(x,f),es=ema(x,s),line=Array(x.length).fill(null);
    for(let i=0;i<x.length;i++)if(ef[i]!==null&&es[i]!==null)line[i]=ef[i]-es[i];
    const validStart=s-1,compact=line.slice(validStart),sigCompact=compact.length?ema(compact,sig):[],signalLine=Array(x.length).fill(null),hist=Array(x.length).fill(null);
    for(let j=0;j<sigCompact.length;j++){const i=j+validStart;if(sigCompact[j]!==null){signalLine[i]=sigCompact[j];hist[i]=line[i]-sigCompact[j];}}
    return {macd:line,signal:signalLine,histogram:hist};
  }
  function calculate(closes,options={}){
    const x=series(closes),smaPeriod=options.smaPeriod??20,rsiPeriod=options.rsiPeriod??14;
    const macdOptions=options.macd||{};
    return {count:x.length,lastClose:x[x.length-1],sma:sma(x,smaPeriod),rsi:rsi(x,rsiPeriod),macd:macd(x,macdOptions.fast??12,macdOptions.slow??26,macdOptions.signal??9),metadata:{inputOrder:'oldest-first',requiresVerifiedHistoricalCloses:true,generatedAtRuntime:false}};
  }
  return Object.freeze({sma,ema,rsi,macd,calculate});
});
