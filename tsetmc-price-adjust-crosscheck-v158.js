'use strict';
/* Offline cross-check only. TSETMC adjustment rows may include cash dividends,
 * which are NOT equivalent to share-capital actions. Never authorize a trade. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SahambanTsetmcCapitalCrosscheckV158=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 const fail=(reason)=>({status:'INSUFFICIENT_EVIDENCE',reason,comparisons:[],
  originVerified:false,priceBasisVerified:false,capitalActionsVerified:false,
  entryEligible:false,tradingSignalsEnabled:false});
 const dateKey=raw=>{
  if(!/^(19|20|21)\d{6}$/.test(String(raw??'')))return null;
  const s=String(raw),y=+s.slice(0,4),m=+s.slice(4,6),d=+s.slice(6);
  const date=new Date(Date.UTC(y,m-1,d,12));
  return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?s:null;
 };
 const jalaliFromGregorian=raw=>{
  const key=dateKey(raw);
  if(!key)return null;
  const date=new Date(Date.UTC(+key.slice(0,4),+key.slice(4,6)-1,+key.slice(6),12));
  try{
   const format=new Intl.DateTimeFormat('en-US-u-ca-persian',{timeZone:'UTC',year:'numeric',month:'2-digit',day:'2-digit'});
   if(format.resolvedOptions().calendar!=='persian')return null;
   const parts=Object.fromEntries(format.formatToParts(date).filter(x=>['year','month','day'].includes(x.type)).map(x=>[x.type,x.value]));
   if(!/^(13|14)\d{2}$/.test(parts.year)||!(/^\d{2}$/.test(parts.month)&&/^\d{2}$/.test(parts.day)))return null;
   return parts.year+'/'+parts.month+'/'+parts.day;
  }catch{return null;}
 };
 const jalaliKey=s=>{
  if(typeof s!=='string')return null;
  const ascii=s.replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));
  const m=ascii.match(/^(13\d{2}|14\d{2})[/-](\d{1,2})[/-](\d{1,2})$/);
  if(!m)return null;
  const month=+m[2],day=+m[3];
  if(month<1||month>12||day<1||day>(month<=6?31:month<=11?30:30))return null;
  return m[1]+'/'+String(month).padStart(2,'0')+'/'+String(day).padStart(2,'0');
 };
 const textOk=s=>typeof s==='string'&&s.trim().length>0&&s.length<=240;
 function comparePriceAdjustToCapitalActions({insCode,payload,capitalActions,expectedSymbol}={}){
  if(!/^\d{8,25}$/.test(String(insCode??'')))return fail('INVALID_INSTRUMENT_CODE');
  if(!textOk(expectedSymbol))return fail('MISSING_SYMBOL');
  if(!payload||!Array.isArray(payload.priceAdjust)||payload.priceAdjust.length>500)
   return fail('INVALID_TSETMC_ADJUSTMENT_PAYLOAD');
  if(!Array.isArray(capitalActions)||capitalActions.length<1||capitalActions.length>20)
   return fail('INVALID_CAPITAL_ACTION_LIST');
  const events=[],dates=new Set();
  for(const row of payload.priceAdjust){
   if(!row||typeof row!=='object'||Array.isArray(row))return fail('INVALID_ADJUSTMENT_EVENT');
   if(row.insCode!==undefined&&String(row.insCode)!==String(insCode))return fail('INSTRUMENT_CODE_MISMATCH');
   const date=dateKey(row.dEven);
   if(!date)return fail('INVALID_TSETMC_EVENT_DATE');
   if(dates.has(date))return fail('AMBIGUOUS_DUPLICATE_TSETMC_EVENT_DATE');
   dates.add(date);
   const adjusted=row.pClosing,unadjusted=row.pClosingNotAdjusted;
   if(typeof adjusted!=='number'||typeof unadjusted!=='number'||
    !Number.isFinite(adjusted)||!Number.isFinite(unadjusted)||adjusted<=0||unadjusted<=0)
    return fail('INVALID_TSETMC_ADJUSTMENT_PRICES');
   const ratio=adjusted/unadjusted;
   if(!Number.isFinite(ratio)||ratio<=0)return fail('INVALID_TSETMC_ADJUSTMENT_RATIO');
   const jalali=jalaliFromGregorian(date);
   if(!jalali)return fail('PERSIAN_CALENDAR_CONVERSION_UNAVAILABLE');
   events.push({gregorianDate:date,jalaliDate:jalali,observedRatio:ratio});
  }
  const comparisons=[],sources=new Set(),actionDates=new Set();
  for(const result of capitalActions){
   if(result?.status!=='CAPITAL_ADJUSTMENT_READY_FOR_REVIEW'||!result.adjustment)
    return fail('UNREVIEWED_CAPITAL_ACTION');
   const a=result.adjustment,source=a.source;
   if(a.symbol!==expectedSymbol||!source||!textOk(source.row)||
    !/^\d{1,20}$/.test(String(source.tracingNo??''))||
    !Number.isInteger(source.page)||source.page<1||source.page>99999||
    !Number.isFinite(a.historicalPriceMultiplier)||a.historicalPriceMultiplier<=0)
    return fail('INVALID_CAPITAL_ACTION_PROVENANCE_OR_FACTOR');
   const actionDate=jalaliKey(a.effectiveDate);
   if(!actionDate)return fail('INVALID_CAPITAL_ACTION_DATE');
   const identity=[String(source.tracingNo),source.row.normalize('NFKC').trim(),String(source.page)].join('\u0000');
   if(sources.has(identity))return fail('DUPLICATE_CAPITAL_ACTION_SOURCE');
   sources.add(identity);
   if(actionDates.has(actionDate))return fail('AMBIGUOUS_SAME_DAY_CAPITAL_ACTIONS');
   actionDates.add(actionDate);
   const exactDate=events.filter(e=>e.jalaliDate===actionDate);
   const match=exactDate[0]||null;
   const factorMatch=!!match&&Math.abs(match.observedRatio-a.historicalPriceMultiplier)<=1e-6*Math.max(1,Math.abs(a.historicalPriceMultiplier));
   comparisons.push({actionDate,actionType:a.actionType,expectedRatio:a.historicalPriceMultiplier,
    tsetmcGregorianDate:match?.gregorianDate||null,observedRatio:match?.observedRatio??null,
    dateMatched:!!match,ratioMatched:factorMatch,
    source:{tracingNo:source.tracingNo,row:source.row,page:source.page}});
  }
  const status=comparisons.every(x=>x.dateMatched&&x.ratioMatched)?
   'PRICE_ADJUSTMENT_CANDIDATES_FOR_MANUAL_REVIEW':'PRICE_ADJUSTMENT_DIFFERENCES_FOR_MANUAL_REVIEW';
  return {status,insCode:String(insCode),symbol:expectedSymbol,comparisons,
   tsetmcEventCount:events.length,capitalActionCount:comparisons.length,
   sourceEndpoint:'/ClosingPrice/GetPriceAdjustList/'+insCode,
   originVerified:false,priceBasisVerified:false,capitalActionsVerified:false,
   entryEligible:false,tradingSignalsEnabled:false,
   note:'Date and ratio consistency only. TSETMC adjustments may include cash dividends and events with different effective dates. This is not proof of event identity, raw-price basis, source authenticity, or trading eligibility.'};
 }
 return Object.freeze({comparePriceAdjustToCapitalActions});
});