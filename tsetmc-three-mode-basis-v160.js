'use strict';
/* Offline three-mode classifier. Inputs must be independently fetched and
 * normalized from TseClient2 adjustPrices modes 0/1/2. Never alters prices. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SahambanTsetmcThreeBasisClassifierV160=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 const modes=['NONE','CAPITAL_PLUS_DIVIDENDS','CAPITAL_ONLY'];
 const fail=reason=>({status:'UNKNOWN_NOT_ATTESTED',reason,basis:null,
  evidence:{overlapCount:0,discriminatingCount:0,uniqueMatches:0,ambiguous:0,unmatched:0},
  sourceAuthenticated:false,historyMutated:false,capitalAdjustmentAllowed:false,
  entryEligible:false,tradingSignalsEnabled:false});
 const key=v=>{
  const s=String(v??'').trim();
  if(!/^(19|20|21)\d{6}$/.test(s))return null;
  const y=+s.slice(0,4),m=+s.slice(4,6),d=+s.slice(6),dt=new Date(Date.UTC(y,m-1,d,12));
  return dt.getUTCFullYear()===y&&dt.getUTCMonth()+1===m&&dt.getUTCDate()===d?s:null;
 };
 const makeIndex=rows=>{
  if(!Array.isArray(rows)||rows.length>10000)return null;
  const out=new Map();
  for(const row of rows){
   if(!row||typeof row!=='object'||Array.isArray(row))return null;
   const date=key(row.date),close=Number(row.close);
   if(!date||!Number.isFinite(close)||close<=0||out.has(date))return null;
   out.set(date,close);
  }
  return out;
 };
 function classifyTsetmcAdjustmentMode({dailyHistory,noneAdjusted,capitalPlusDividends,
  capitalOnly,tolerance=0.5,minOverlap=10,minDiscriminating=3,requiredAgreement=0.95}={}){
  if(!Number.isFinite(tolerance)||tolerance<0||tolerance>5||
   !Number.isInteger(minOverlap)||minOverlap<3||minOverlap>10000||
   !Number.isInteger(minDiscriminating)||minDiscriminating<3||minDiscriminating>10000||
   !Number.isFinite(requiredAgreement)||requiredAgreement<0.9||requiredAgreement>1)
   return fail('INVALID_CLASSIFICATION_POLICY');
  const series=[makeIndex(dailyHistory),makeIndex(noneAdjusted),makeIndex(capitalPlusDividends),makeIndex(capitalOnly)];
  if(series.some(x=>!x))return fail('INVALID_OR_DUPLICATE_SERIES_ROWS');
  if(series.some(x=>!x.size))return fail('EMPTY_PRICE_SERIES');
  const [daily,none,total,capital]=series;
  let overlapCount=0,discriminatingCount=0,uniqueMatches=0,ambiguous=0,unmatched=0;
  const modeMatches={NONE:0,CAPITAL_PLUS_DIVIDENDS:0,CAPITAL_ONLY:0},samples=[];
  for(const [date,observed] of daily){
   if(!none.has(date)||!total.has(date)||!capital.has(date))continue;
   overlapCount++;
   const candidates=[none.get(date),total.get(date),capital.get(date)];
   const distinct=[];
   for(const v of candidates)if(!distinct.some(x=>Math.abs(x-v)<=tolerance))distinct.push(v);
   if(distinct.length<2)continue;
   discriminatingCount++;
   const matches=candidates.map((v,i)=>Math.abs(v-observed)<=tolerance?i:-1).filter(i=>i>=0);
   if(matches.length===1){uniqueMatches++;modeMatches[modes[matches[0]]]++;}
   else if(matches.length===0)unmatched++;
   else ambiguous++;
   if(samples.length<15)samples.push({date,dailyClose:observed,
    noneAdjusted:candidates[0],capitalPlusDividends:candidates[1],capitalOnly:candidates[2],
    matchedMode:matches.length===1?modes[matches[0]]:matches.length?'AMBIGUOUS':'NONE'});
  }
  const evidence={overlapCount,discriminatingCount,uniqueMatches,ambiguous,unmatched,modeMatches,
   tolerance,minOverlap,minDiscriminating,requiredAgreement,samples};
  if(overlapCount<minOverlap)return {...fail('INSUFFICIENT_OVERLAPPING_DATES'),evidence};
  if(discriminatingCount<minDiscriminating)return {...fail('INSUFFICIENT_MODE_DISCRIMINATORS'),evidence};
  const candidates=modes.filter(m=>modeMatches[m]/discriminatingCount>=requiredAgreement&&
   modes.filter(other=>other!==m).every(other=>modeMatches[other]===0)&&ambiguous===0&&unmatched===0);
  if(candidates.length!==1)return {...fail('MIXED_AMBIGUOUS_OR_NONMATCHING_MODES'),evidence};
  return {status:'BASIS_MATCHES_TSETMC_ADJUST_MODE',reason:null,basis:candidates[0],evidence,
   source:{provider:'TSETMC_TseClient2',adjustPrices:{
    0:'NONE',1:'CAPITAL_INCREASE_PLUS_DIVIDENDS',2:'CAPITAL_INCREASE_ONLY'},
    dateField:'date',priceField:'close',calendar:'GREGORIAN_YYYYMMDD'},
   sourceAuthenticated:false,historyMutated:false,capitalAdjustmentAllowed:false,
   entryEligible:false,tradingSignalsEnabled:false,
   note:'Classification is limited to matching one of three independently supplied adjustment-mode series on discriminating overlapping dates. It does not authenticate the provider, prove corporate-action causation, or authorize automatic adjustment.'};
 }
 return Object.freeze({classifyTsetmcAdjustmentMode});
});