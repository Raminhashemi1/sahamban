'use strict';
/* Cross-check TSETMC daily pClosing against the chart API's explicit a=0/1
 * modes. A match is evidence of series correspondence, not source authentication. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SahambanTsetmcPriceBasisCrosscheckV159=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 const fail=reason=>({status:'UNKNOWN_NOT_ATTESTED',reason,basis:null,
  evidence:{overlapCount:0,discriminatingCount:0,rawMatches:0,adjustedMatches:0,unmatched:0},
  sourceAuthenticated:false,historyMutated:false,capitalAdjustmentAllowed:false,
  entryEligible:false,tradingSignalsEnabled:false});
 const dateKey=v=>{
  const s=String(v??'').trim();
  if(!/^(19|20|21)\d{6}$/.test(s))return null;
  const y=+s.slice(0,4),m=+s.slice(4,6),d=+s.slice(6);
  const dt=new Date(Date.UTC(y,m-1,d,12));
  return dt.getUTCFullYear()===y&&dt.getUTCMonth()+1===m&&dt.getUTCDate()===d?s:null;
 };
 const index=(rows,dateField,priceField)=>{
  if(!Array.isArray(rows)||rows.length>10000)return null;
  const map=new Map();
  for(const row of rows){
   if(!row||typeof row!=='object'||Array.isArray(row))return null;
   const date=dateKey(row[dateField]),price=Number(row[priceField]);
   if(!date||!Number.isFinite(price)||price<=0||map.has(date))return null;
   map.set(date,price);
  }
  return map;
 };
 function crosscheckTsetmcHistoryBasis({dailyHistory,chartRaw,chartAdjusted,
  tolerance=0.5,minOverlap=10,minDiscriminating=3,requiredAgreement=0.95}={}){
  if(!Number.isFinite(tolerance)||tolerance<0||tolerance>5||
   !Number.isInteger(minOverlap)||minOverlap<3||minOverlap>10000||
   !Number.isInteger(minDiscriminating)||minDiscriminating<3||minDiscriminating>10000||
   !Number.isFinite(requiredAgreement)||requiredAgreement<0.9||requiredAgreement>1)
   return fail('INVALID_CROSSCHECK_POLICY');
  const daily=index(dailyHistory,'dEven','pClosing');
  const raw=index(chartRaw,'date','close');
  const adjusted=index(chartAdjusted,'date','close');
  if(!daily||!raw||!adjusted)return fail('INVALID_OR_DUPLICATE_SERIES_ROWS');
  if(!daily.size||!raw.size||!adjusted.size)return fail('EMPTY_PRICE_SERIES');
  let overlap=0,discriminating=0,rawMatches=0,adjustedMatches=0,unmatched=0;
  const samples=[];
  for(const [date,dailyPrice] of daily){
   if(!raw.has(date)||!adjusted.has(date))continue;
   overlap++;
   const rawPrice=raw.get(date),adjustedPrice=adjusted.get(date);
   if(Math.abs(rawPrice-adjustedPrice)<=tolerance*2)continue;
   discriminating++;
   const matchesRaw=Math.abs(dailyPrice-rawPrice)<=tolerance;
   const matchesAdjusted=Math.abs(dailyPrice-adjustedPrice)<=tolerance;
   if(matchesRaw&&!matchesAdjusted)rawMatches++;
   else if(matchesAdjusted&&!matchesRaw)adjustedMatches++;
   else unmatched++;
   if(samples.length<12)samples.push({date,dailyPrice,chartRaw:rawPrice,chartAdjusted:adjustedPrice,
    match:matchesRaw&&!matchesAdjusted?'RAW':matchesAdjusted&&!matchesRaw?'ADJUSTED':'NEITHER_OR_AMBIGUOUS'});
  }
  const base={overlapCount:overlap,discriminatingCount:discriminating,rawMatches,adjustedMatches,unmatched,
   tolerance,minOverlap,minDiscriminating,requiredAgreement,samples};
  if(overlap<minOverlap)return {...fail('INSUFFICIENT_OVERLAPPING_DATES'),evidence:base};
  if(discriminating<minDiscriminating)return {...fail('INSUFFICIENT_ADJUSTMENT_DISCRIMINATORS'),evidence:base};
  const rawAgreement=rawMatches/discriminating,adjustedAgreement=adjustedMatches/discriminating;
  const rawPass=rawAgreement>=requiredAgreement&&adjustedMatches===0&&unmatched===0;
  const adjustedPass=adjustedAgreement>=requiredAgreement&&rawMatches===0&&unmatched===0;
  let basis=null,status='UNKNOWN_NOT_ATTESTED',reason='MIXED_OR_NONMATCHING_SERIES';
  if(rawPass){basis='RAW_UNADJUSTED';status='BASIS_MATCHES_TSETMC_CHART_A0';reason=null;}
  else if(adjustedPass){basis='CAPITAL_ACTION_ADJUSTED';status='BASIS_MATCHES_TSETMC_CHART_A1';reason=null;}
  return {status,reason,basis,evidence:{...base,rawAgreement,adjustedAgreement},
   source:{daily:'/ClosingPrice/GetClosingPriceDailyList/{insCode}/0',
    chartRaw:'/tsev2/chart/data/Financial.aspx?i={insCode}&t=ph&a=0',
    chartAdjusted:'/tsev2/chart/data/Financial.aspx?i={insCode}&t=ph&a=1',
    dailyPriceField:'pClosing',chartCloseField:'close',calendar:'GREGORIAN_YYYYMMDD'},
   sourceAuthenticated:false,historyMutated:false,capitalAdjustmentAllowed:false,
   entryEligible:false,tradingSignalsEnabled:false,
   note:'Classifies only correspondence with the supplied TSETMC a=0/a=1 chart series over discriminating overlapping dates. It does not authenticate either feed, prove event causes, or authorize automatic price adjustment.'};
 }
 return Object.freeze({crosscheckTsetmcHistoryBasis});
});