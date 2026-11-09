'use strict';
/* Evidence-gated corporate-action factors. Arithmetic review only; no automatic history rewrite. */
(function(root,factory){
 const evidence=typeof module==='object'&&module.exports?require('./fundamental-evidence.js'):root?.SahambanFundamentalEvidenceV150;
 const api=factory(evidence);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SahambanCapitalAdjustmentsV150=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(evidence){
 const {safeReportUrl,normalizeSymbol,toAsciiDigits,validPublicationDate}=evidence;
const ACTIONS=new Set(['BONUS_ISSUE','STOCK_SPLIT','REVERSE_SPLIT','RIGHTS_ISSUE']);
function positiveSafeInteger(value){return Number.isSafeInteger(value)&&value>0;}
function jalaliKey(value){
 const m=toAsciiDigits(value).trim().match(/^(13\d\d|14\d\d)[/-](\d{1,2})[/-](\d{1,2})$/);
 if(!m||!validPublicationDate(value))return null;
 return m[1]+String(Number(m[2])).padStart(2,'0')+String(Number(m[3])).padStart(2,'0');
}
function calculateCapitalAdjustment(data,expectedSymbol){
 const errors=[];
 if(!data||typeof data!=='object'||Array.isArray(data))
  return {status:'INSUFFICIENT_EVIDENCE',errors:['MISSING_CAPITAL_ACTION_EVIDENCE'],adjustment:null};
 if(!normalizeSymbol(expectedSymbol)||normalizeSymbol(data.symbol)!==normalizeSymbol(expectedSymbol))errors.push('SYMBOL_MISMATCH');
 if(!ACTIONS.has(data.action_type))errors.push('UNSUPPORTED_CAPITAL_ACTION');
 const tracing=toAsciiDigits(data.tracing_no).trim();
 if(!/^\d{1,20}$/.test(tracing)||BigInt(tracing||'0')<=0n)errors.push('INVALID_TRACING');
 const url=safeReportUrl(data.report_url);
 if(!url)errors.push('INVALID_REPORT_URL');
 else{
  const serial=new URL(url).searchParams.get('LetterSerial');
  if(!serial||toAsciiDigits(serial).trim()!==tracing)errors.push('REPORT_TRACING_MISMATCH');
 }
 const effective=toAsciiDigits(data.effective_date).trim();
 if(!validPublicationDate(effective))errors.push('INVALID_EFFECTIVE_DATE');
 if(!/^[a-f0-9]{64}$/i.test(String(data.document_sha256??'')))errors.push('MISSING_OR_INVALID_SHA256');
 if(data.original_document_read!==true)errors.push('ORIGINAL_DOCUMENT_NOT_READ');
 if(typeof data.source_row!=='string'||!data.source_row.trim()||data.source_row.length>240||
  !Number.isInteger(data.source_page)||data.source_page<1||data.source_page>99999)errors.push('UNTRACEABLE_CAPITAL_ACTION');
 const before=data.pre_action_shares,after=data.post_action_shares;
 if(!positiveSafeInteger(before)||!positiveSafeInteger(after))errors.push('INVALID_ACTION_SHARE_COUNTS');
 if(errors.length)return {status:'INSUFFICIENT_EVIDENCE',errors,adjustment:null};
 const type=data.action_type;
 if((type==='BONUS_ISSUE'||type==='STOCK_SPLIT')&&after<=before)
  return {status:'INSUFFICIENT_EVIDENCE',errors:['POST_ACTION_SHARES_MUST_INCREASE'],adjustment:null};
 if(type==='REVERSE_SPLIT'&&after>=before)
  return {status:'INSUFFICIENT_EVIDENCE',errors:['POST_ACTION_SHARES_MUST_DECREASE'],adjustment:null};
 let theoreticalExRightsPrice=null,historicalPriceMultiplier,epsRetrospectiveShareMultiplier=null,rightsPricingSource=null;
 if(type==='RIGHTS_ISSUE'){
  if(after<=before)return {status:'INSUFFICIENT_EVIDENCE',errors:['RIGHTS_ISSUE_REQUIRES_NEW_SHARES'],adjustment:null};
  const cumPrice=data.cum_rights_price,subscription=data.subscription_price;
  const sourceOk=(row,page)=>typeof row==='string'&&row.trim().length>0&&row.length<=240&&Number.isInteger(page)&&page>0&&page<=99999;
  const cumPriceOrdinal=jalaliOrdinal(data.cum_rights_price_date),effectiveOrdinal=jalaliOrdinal(effective);
  if(cumPriceOrdinal===null||effectiveOrdinal===null||cumPriceOrdinal>=effectiveOrdinal||effectiveOrdinal-cumPriceOrdinal>7)
   return {status:'INSUFFICIENT_EVIDENCE',errors:['INVALID_OR_STALE_CUM_RIGHTS_PRICE_DATE'],adjustment:null};
  if(!Number.isFinite(cumPrice)||cumPrice<=0||!Number.isFinite(subscription)||subscription<0||data.price_unit!=='IRR_PER_SHARE')
   return {status:'INSUFFICIENT_EVIDENCE',errors:['INVALID_RIGHTS_PRICING_INPUTS_OR_UNIT'],adjustment:null};
  if(!sourceOk(data.cum_rights_price_source_row,data.cum_rights_price_source_page)||
     !sourceOk(data.subscription_price_source_row,data.subscription_price_source_page))
   return {status:'INSUFFICIENT_EVIDENCE',errors:['UNTRACEABLE_RIGHTS_PRICING_INPUTS'],adjustment:null};
  const newShares=after-before;
  theoreticalExRightsPrice=(cumPrice*before+subscription*newShares)/after;
  historicalPriceMultiplier=theoreticalExRightsPrice/cumPrice;
  // IAS 33 bonus element exists only when subscription price is below fair value.
  // A nil/negative bonus element must never reverse-restatement prior-period EPS shares.
  epsRetrospectiveShareMultiplier=Math.max(1,cumPrice/theoreticalExRightsPrice);
  rightsPricingSource={cumRightsPrice:{row:data.cum_rights_price_source_row,page:data.cum_rights_price_source_page,marketDate:data.cum_rights_price_date},
   subscriptionPrice:{row:data.subscription_price_source_row,page:data.subscription_price_source_page},unit:data.price_unit};
 }else{
  theoreticalExRightsPrice=null;
  historicalPriceMultiplier=before/after;
  epsRetrospectiveShareMultiplier=after/before;
 }
 const shareCountMultiplier=after/before;
 if(!Number.isFinite(historicalPriceMultiplier)||historicalPriceMultiplier<=0||
  !Number.isFinite(shareCountMultiplier)||shareCountMultiplier<=0||
  (theoreticalExRightsPrice!==null&&(!Number.isFinite(theoreticalExRightsPrice)||theoreticalExRightsPrice<=0)))
  return {status:'INSUFFICIENT_EVIDENCE',errors:['CAPITAL_ADJUSTMENT_OUT_OF_RANGE'],adjustment:null};
 return {status:'CAPITAL_ADJUSTMENT_READY_FOR_REVIEW',errors:[],adjustment:{
  actionType:type,symbol:data.symbol,effectiveDate:data.effective_date,preActionShares:before,postActionShares:after,
  newShares:after-before,shareCountMultiplier,historicalPriceMultiplier,
  epsRetrospectiveShareMultiplier,theoreticalExRightsPrice,rightsPricingSource,source:{tracingNo:tracing,row:data.source_row,page:data.source_page},
  formula:type==='RIGHTS_ISSUE'?
   'TERP=(cum_rights_price*pre_action_shares+subscription_price*new_shares)/post_action_shares; historical_price_multiplier=TERP/cum_rights_price':
   'historical_price_multiplier=pre_action_shares/post_action_shares'
 },note:'A review-only corporate-action factor derived from user-entered, traceable source rows. It does not authenticate the CODAL document, establish the legally effective share count, adjust accounting EPS automatically, or authorize trading.'};
}

function reconcileDividendRecordDateShares({symbol,expectedSymbol,openingShares,openingDate,recordDate,openingSource,capitalActionResults,reportedEligibleShares}={}){
 const fail=code=>({status:'INSUFFICIENT_EVIDENCE',errors:[code],reconciledShares:null,comparison:'NOT_PERFORMED'});
 if(!normalizeSymbol(expectedSymbol)||normalizeSymbol(symbol)!==normalizeSymbol(expectedSymbol))return fail('DIVIDEND_SHARE_SYMBOL_MISMATCH');
 if(!positiveSafeInteger(openingShares))return fail('INVALID_OPENING_SHARE_COUNT');
 const opening=jalaliOrdinal(openingDate),record=jalaliOrdinal(recordDate);
 if(opening===null||record===null||record<opening)return fail('INVALID_DIVIDEND_SHARE_RECONCILIATION_DATES');
 if(!openingSource||typeof openingSource.row!=='string'||!openingSource.row.trim()||!Number.isInteger(openingSource.page)||openingSource.page<1)return fail('UNTRACEABLE_OPENING_SHARE_COUNT');
 if(!Array.isArray(capitalActionResults)||capitalActionResults.length>20)return fail('INVALID_DIVIDEND_CAPITAL_ACTION_SEQUENCE');
 const actions=[];
 for(const result of capitalActionResults){
  if(result?.status!=='CAPITAL_ADJUSTMENT_READY_FOR_REVIEW'||!result.adjustment)return fail('UNVERIFIED_CAPITAL_ACTION_IN_DIVIDEND_SEQUENCE');
  const a=result.adjustment,ordinal=jalaliOrdinal(a.effectiveDate);
  if(ordinal===null||ordinal<opening||ordinal>record||!positiveSafeInteger(a.preActionShares)||!positiveSafeInteger(a.postActionShares)||
   !a.source||!/^\d{1,20}$/.test(String(a.source.tracingNo))||typeof a.source.row!=='string'||!a.source.row.trim()||!Number.isInteger(a.source.page)||a.source.page<1)
   return fail('INVALID_DIVIDEND_ACTION_DATE_COUNTS_OR_PROVENANCE');
  actions.push({...a,ordinal});
 }
 actions.sort((a,b)=>a.ordinal-b.ordinal);
 const symbolKey=normalizeSymbol(expectedSymbol);
 if(actions.some(a=>normalizeSymbol(a.symbol)!==symbolKey))return fail('DIVIDEND_CAPITAL_ACTION_SYMBOL_MISMATCH');
 let shares=openingShares,previous=opening;
 for(const a of actions){
  if(a.ordinal<=previous)return fail('DUPLICATE_OR_NON_CHRONOLOGICAL_DIVIDEND_ACTION_DATE');
  if(a.preActionShares!==shares)return fail('DIVIDEND_CAPITAL_ACTION_SHARE_CHAIN_MISMATCH');
  shares=a.postActionShares;previous=a.ordinal;
 }
 if(reportedEligibleShares!==undefined){
  if(!positiveSafeInteger(reportedEligibleShares))return fail('INVALID_REPORTED_DIVIDEND_ELIGIBLE_SHARES');
  if(reportedEligibleShares!==shares)return {status:'INSUFFICIENT_EVIDENCE',errors:['DIVIDEND_ELIGIBLE_SHARES_DO_NOT_MATCH_ACTION_CHAIN'],reconciledShares:shares,reportedEligibleShares,comparison:'MISMATCH'};
 }
 return {status:'DIVIDEND_RECORD_DATE_SHARES_READY_FOR_REVIEW',symbol:expectedSymbol,recordDate,openingShares,openingDate,
  reconciledShares:shares,reportedEligibleShares:reportedEligibleShares??null,comparison:reportedEligibleShares===undefined?'NOT_COMPARED':'MATCH',
  actionCount:actions.length,sources:actions.map(a=>({tracingNo:a.source.tracingNo,row:a.source.row,page:a.source.page})),
  openingSource:{row:openingSource.row,page:openingSource.page},
  note:'Arithmetic share-count chain only. This does not determine legal dividend entitlement, treasury-share exclusions, settlement eligibility, or authenticate source documents; AGM/record-date evidence and applicable rules require independent review.'};
}

function reviewDPSWithCapitalReconciliation(data,expectedSymbol,{openingShares,openingDate,openingSource,capitalActions,coverageEvidence}={}){
 const fail=(code,reconciliation=null)=>({status:'INSUFFICIENT_EVIDENCE',errors:[code],dps:null,reconciliation});
 if(!data||typeof data!=='object'||Array.isArray(data))return fail('MISSING_DIVIDEND_EVIDENCE');
 // Completeness is a documented claim for arithmetic review, not independent provenance verification.
 if(coverageEvidence?.completeThroughRecordDate!==true||typeof coverageEvidence.sourceRow!=='string'||
  !coverageEvidence.sourceRow.trim()||coverageEvidence.sourceRow.length>240||
  !Number.isInteger(coverageEvidence.sourcePage)||coverageEvidence.sourcePage<1||coverageEvidence.sourcePage>99999)
  return fail('DIVIDEND_CAPITAL_ACTION_COVERAGE_NOT_DOCUMENTED');
 const checked=evidence.checkFinancialEvidence(data,expectedSymbol);
 if(checked.status!=='READY_FOR_REVIEW')return {status:'INSUFFICIENT_EVIDENCE',errors:checked.errors,dps:null,reconciliation:null};
 const reportedShares=checked.fields.find(x=>x.name==='dividend_eligible_shares')?.amount;
 if(!positiveSafeInteger(reportedShares))return fail('DIVIDEND_ELIGIBLE_SHARES_MISSING_OR_UNSAFE');
 if(!Array.isArray(capitalActions)||capitalActions.length>20)return fail('INVALID_DIVIDEND_CAPITAL_ACTION_SEQUENCE');
 const results=capitalActions.map(action=>calculateCapitalAdjustment(action,expectedSymbol));
 const reconciliation=reconcileDividendRecordDateShares({symbol:data.symbol,expectedSymbol,openingShares,openingDate,
  recordDate:data.dividend_record_date,openingSource,capitalActionResults:results,reportedEligibleShares:reportedShares});
 if(reconciliation.status!=='DIVIDEND_RECORD_DATE_SHARES_READY_FOR_REVIEW'||reconciliation.comparison!=='MATCH')
  return fail('DIVIDEND_SHARE_RECONCILIATION_REQUIRED',reconciliation);
 const dpsResult=evidence.calculateDPS(data,expectedSymbol);
 if(dpsResult.status!=='DPS_READY_FOR_REVIEW')return {status:'INSUFFICIENT_EVIDENCE',errors:dpsResult.errors,dps:null,reconciliation};
 return {status:'DPS_RECONCILED_FOR_REVIEW',errors:[],dps:dpsResult.dps,reconciliation,
  coverageSource:{row:coverageEvidence.sourceRow,page:coverageEvidence.sourcePage},
  note:'Arithmetic review only; declared coverage and user-entered sources are not independently authenticated. This result does not establish legal dividend entitlement or authorize investment decisions.'};
}

function calculateAdjustedWeightedAverageShares(actionResult,{periodStart,periodEnd}={}){
 return calculateMultiActionWeightedAverageShares([actionResult],{periodStart,periodEnd});
}

function jalaliOrdinal(value){
 const key=jalaliKey(value);if(!key)return null;
 const year=Number(key.slice(0,4)),month=Number(key.slice(4,6)),day=Number(key.slice(6,8));
 try{
  const fmt=new Intl.DateTimeFormat('en-u-ca-persian-nu-latn',{year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'});
  let start=null;
  for(let d=19;d<=22;d++){
   const candidate=new Date(Date.UTC(year+621,2,d));
   const parts=Object.fromEntries(fmt.formatToParts(candidate).map(p=>[p.type,p.value]));
   if(parts.year===String(year)&&parts.month==='1'&&parts.day==='1'){start=candidate;break;}
  }
  if(!start)return null;
  const offset=(month<=6?(month-1)*31:month<=11?186+(month-7)*30:336)+day-1;
  return Math.floor(start.getTime()/86400000)+offset;
 }catch{return null;}
}
function calculateMultiActionWeightedAverageShares(actionResults,{periodStart,periodEnd}={}){
 const fail=code=>({status:'INSUFFICIENT_EVIDENCE',errors:[code],weightedAverageShares:null,segments:[]});
 if(!Array.isArray(actionResults)||!actionResults.length||actionResults.length>20)return fail('INVALID_CAPITAL_ACTION_SEQUENCE');
 const start=jalaliOrdinal(periodStart),end=jalaliOrdinal(periodEnd);
 if(start===null||end===null||end<start)return fail('INVALID_REPORTING_PERIOD');
 const actions=[];
 for(const result of actionResults){
  if(result?.status!=='CAPITAL_ADJUSTMENT_READY_FOR_REVIEW'||!result.adjustment)return fail('UNVERIFIED_CAPITAL_ACTION_IN_SEQUENCE');
  const a=result.adjustment,ordinal=jalaliOrdinal(a.effectiveDate);
  if(ordinal===null||ordinal<start||ordinal>end||!positiveSafeInteger(a.preActionShares)||
   !positiveSafeInteger(a.postActionShares)||!Number.isFinite(a.epsRetrospectiveShareMultiplier)||
   a.epsRetrospectiveShareMultiplier<=0||!a.source||!/^\d{1,20}$/.test(String(a.source.tracingNo))||
   typeof a.source.row!=='string'||!a.source.row.trim()||!Number.isInteger(a.source.page)||a.source.page<1)
   return fail('INVALID_ACTION_DATE_SHARE_COUNTS_OR_PROVENANCE');
  actions.push({...a,ordinal});
 }
 const symbol=normalizeSymbol(actions[0].symbol);
 if(!symbol||actions.some(a=>normalizeSymbol(a.symbol)!==symbol))return fail('CAPITAL_ACTION_SYMBOL_MISMATCH');
 for(let i=1;i<actions.length;i++){
  if(actions[i].ordinal<=actions[i-1].ordinal)return fail('CAPITAL_ACTIONS_NOT_STRICTLY_CHRONOLOGICAL');
  if(actions[i].preActionShares!==actions[i-1].postActionShares)return fail('CAPITAL_ACTION_SHARE_CHAIN_MISMATCH');
 }
 const segments=[];
 for(let i=0;i<=actions.length;i++){
  const segStart=i===0?start:actions[i-1].ordinal;
  const segEnd=i===actions.length?end:actions[i].ordinal-1;
  const days=Math.max(0,segEnd-segStart+1);
  if(!days)continue;
  const baseShares=i===0?actions[0].preActionShares:actions[i-1].postActionShares;
  let factor=1;
  for(let j=i;j<actions.length;j++)factor*=actions[j].epsRetrospectiveShareMultiplier;
  const adjustedShares=baseShares*factor;
  if(!Number.isFinite(adjustedShares)||adjustedShares<=0)return fail('MULTI_ACTION_SHARE_FACTOR_OUT_OF_RANGE');
  segments.push({from:i===0?periodStart:actions[i-1].effectiveDate,
   endsBefore:i===actions.length?null:actions[i].effectiveDate,
   days,baseShares,subsequentRestatementFactor:factor,adjustedShares});
 }
 const totalDays=end-start+1,weightedTotal=segments.reduce((sum,x)=>sum+x.adjustedShares*x.days,0);
 const weightedAverageShares=weightedTotal/totalDays;
 if(segments.reduce((sum,x)=>sum+x.days,0)!==totalDays||!Number.isFinite(weightedAverageShares)||weightedAverageShares<=0)
  return fail('MULTI_ACTION_WEIGHTED_AVERAGE_OUT_OF_RANGE');
 return {status:'CAPITAL_ADJUSTED_WA_SHARES_READY_FOR_REVIEW',symbol:actions[0].symbol,
  periodStart,periodEnd,weightedAverageShares,unit:'SHARES',totalDays,
  actions:actions.map(a=>({actionType:a.actionType,effectiveDate:a.effectiveDate,
   preActionShares:a.preActionShares,postActionShares:a.postActionShares,
   epsRetrospectiveShareMultiplier:a.epsRetrospectiveShareMultiplier,
   source:{tracingNo:a.source.tracingNo,row:a.source.row,page:a.source.page}})),
  sources:actions.map(a=>({tracingNo:a.source.tracingNo,row:a.source.row,page:a.source.page})),
  source:actions.at(-1).source,segments,
  formula:'For each period segment, use the share count after the preceding action multiplied by every later action retrospective EPS factor; day-weight each segment over the full reporting period.',
  note:'Review-only chronological IAS 33-style restatement for up to 20 verified-input corporate actions. Each action must be independently verified; sequence and day counts are derived from Jalali effective dates. This arithmetic does not authenticate source documents.'};
}

return {calculateCapitalAdjustment,reconcileDividendRecordDateShares,reviewDPSWithCapitalReconciliation,calculateAdjustedWeightedAverageShares,calculateMultiActionWeightedAverageShares,ACTIONS};
});
