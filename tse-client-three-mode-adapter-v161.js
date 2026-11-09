'use strict';
/* Adapter for the documented tse-client getPrices() result shape.
 * Caller must fetch modes 0/1/2 with identical settings except adjustPrices.
 * This normalizes only; it does not authenticate the provider or fetch data. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SahambanTseClientThreeModeAdapterV161=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 const fail=reason=>({status:'INSUFFICIENT_EVIDENCE',reason,series:null,
  providerAuthenticated:false,requestSettingsVerified:false,historyMutated:false,
  capitalAdjustmentAllowed:false,entryEligible:false,tradingSignalsEnabled:false});
 const validCode=v=>/^\d{8,25}$/.test(String(v??''));
 const validSymbol=v=>typeof v==='string'&&v.trim().length>0&&v.length<=80;
 const dateKey=v=>{
  const s=String(v??'').trim();
  if(!/^(19|20|21)\d{6}$/.test(s))return null;
  const y=+s.slice(0,4),m=+s.slice(4,6),d=+s.slice(6),dt=new Date(Date.UTC(y,m-1,d,12));
  return dt.getUTCFullYear()===y&&dt.getUTCMonth()+1===m&&dt.getUTCDate()===d?s:null;
 };
 function normalizeMode(response,mode,expected){
  if(!response||typeof response!=='object'||response.error)return {error:'TSE_CLIENT_REQUEST_FAILED'};
  const req=response.request;
  if(!req||req.adjustPrices!==mode||req.symbol!==expected.symbol||
   req.insCode!==expected.insCode||req.cache!==false||req.mergeSimilarSymbols!==false||
   req.startDate!==expected.startDate||req.daysWithoutTrade!==expected.daysWithoutTrade)
   return {error:'INCONSISTENT_OR_UNVERIFIABLE_REQUEST_SETTINGS'};
  if(!Array.isArray(response.data)||response.data.length!==1)return {error:'EXPECTED_EXACTLY_ONE_INSTRUMENT'};
  const item=response.data[0];
  if(!item||!Array.isArray(item.date)||!Array.isArray(item.close)||
   item.date.length===0||item.date.length!==item.close.length||item.date.length>10000)
   return {error:'INVALID_DATE_CLOSE_ARRAYS'};
  if(Array.isArray(item.symbol)&&item.symbol.some(x=>x!==expected.symbol))
   return {error:'RETURNED_SYMBOL_MISMATCH'};
  const seen=new Set(),rows=[];
  for(let i=0;i<item.date.length;i++){
   const date=dateKey(item.date[i]),close=Number(item.close[i]);
   if(!date||!Number.isFinite(close)||close<=0||seen.has(date))
    return {error:'INVALID_DUPLICATE_DATE_OR_PRICE'};
   seen.add(date);rows.push({date,close});
  }
  rows.sort((a,b)=>a.date.localeCompare(b.date));
  return {rows,mode};
 }
 function buildTseClientThreeModeSeries({insCode,symbol,startDate,daysWithoutTrade=false,
  dailyHistory,noneResult,capitalPlusDividendsResult,capitalOnlyResult}={}){
  if(!validCode(insCode))return fail('INVALID_INSTRUMENT_CODE');
  if(!validSymbol(symbol))return fail('INVALID_SYMBOL');
  if(typeof startDate!=='string'||!/^20\d{6}$/.test(startDate)||!dateKey(startDate))
   return fail('INVALID_START_DATE');
  if(typeof daysWithoutTrade!=='boolean')return fail('INVALID_DAYS_WITHOUT_TRADE');
  const modes=[
   normalizeMode(noneResult,0,{insCode,symbol,startDate,daysWithoutTrade}),
   normalizeMode(capitalPlusDividendsResult,1,{insCode,symbol,startDate,daysWithoutTrade}),
   normalizeMode(capitalOnlyResult,2,{insCode,symbol,startDate,daysWithoutTrade})
  ];
  const bad=modes.find(x=>x.error);
  if(bad)return fail(bad.error);
  if(!Array.isArray(dailyHistory)||dailyHistory.length===0||dailyHistory.length>10000)
   return fail('INVALID_RAW_DAILY_HISTORY');
  const rawSeen=new Set(),raw=[];
  for(const row of dailyHistory){
   const date=dateKey(row?.dEven),close=Number(row?.pClosing);
   if(!date||!Number.isFinite(close)||close<=0||rawSeen.has(date))
    return fail('INVALID_RAW_DAILY_HISTORY_ROW');
   rawSeen.add(date);raw.push({date,close});
  }
  raw.sort((a,b)=>a.date.localeCompare(b.date));
  return {status:'NORMALIZED_FOR_REVIEW',reason:null,series:{
   dailyHistory:raw,noneAdjusted:modes[0].rows,
   capitalPlusDividends:modes[1].rows,capitalOnly:modes[2].rows
  },requestContract:{provider:'tse-client getPrices',insCode,symbol,startDate,
   daysWithoutTrade,cache:false,mergeSimilarSymbols:false,
   adjustPrices:{0:'NONE',1:'CAPITAL_INCREASE_PLUS_DIVIDENDS',2:'CAPITAL_INCREASE_ONLY'},
   settingsProvenance:'CALLER_SUPPLIED_REQUEST_METADATA'},
   providerAuthenticated:false,requestSettingsVerified:true,historyMutated:false,
   capitalAdjustmentAllowed:false,entryEligible:false,tradingSignalsEnabled:false,
   note:'Normalized from caller-supplied tse-client responses. Request metadata is caller-asserted; no network fetch, provider authentication, price-basis attestation or trade authorization occurs.'};
 }
 return Object.freeze({buildTseClientThreeModeSeries});
});