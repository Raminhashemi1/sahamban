'use strict';
/* Evidence-gated corporate-action factors. Arithmetic review only; no automatic history rewrite. */
const {safeReportUrl}=require('./fundamental-evidence.js');
const {normalizeSymbol,toAsciiDigits,validPublicationDate}=require('./tests/codal-search-quality.cjs');
const ACTIONS=new Set(['BONUS_ISSUE','STOCK_SPLIT','REVERSE_SPLIT','RIGHTS_ISSUE']);
function positiveSafeInteger(value){return Number.isSafeInteger(value)&&value>0;}
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
  if(!Number.isFinite(cumPrice)||cumPrice<=0||!Number.isFinite(subscription)||subscription<0||data.price_unit!=='IRR_PER_SHARE')
   return {status:'INSUFFICIENT_EVIDENCE',errors:['INVALID_RIGHTS_PRICING_INPUTS_OR_UNIT'],adjustment:null};
  if(!sourceOk(data.cum_rights_price_source_row,data.cum_rights_price_source_page)||
     !sourceOk(data.subscription_price_source_row,data.subscription_price_source_page))
   return {status:'INSUFFICIENT_EVIDENCE',errors:['UNTRACEABLE_RIGHTS_PRICING_INPUTS'],adjustment:null};
  const newShares=after-before;
  theoreticalExRightsPrice=(cumPrice*before+subscription*newShares)/after;
  historicalPriceMultiplier=theoreticalExRightsPrice/cumPrice;
  // IAS 33 bonus element: restate pre-rights shares by fair value immediately before rights / TERP.
  epsRetrospectiveShareMultiplier=cumPrice/theoreticalExRightsPrice;
  rightsPricingSource={cumRightsPrice:{row:data.cum_rights_price_source_row,page:data.cum_rights_price_source_page},
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

function calculateAdjustedWeightedAverageShares(actionResult,{daysBefore,daysAfter,periodEnd}={}){
 const a=actionResult?.adjustment;
 if(actionResult?.status!=='CAPITAL_ADJUSTMENT_READY_FOR_REVIEW'||!a)
  return {status:'INSUFFICIENT_EVIDENCE',errors:['UNVERIFIED_CAPITAL_ACTION'],weightedAverageShares:null};
 if(!Number.isSafeInteger(daysBefore)||daysBefore<0||!Number.isSafeInteger(daysAfter)||daysAfter<0||
  !Number.isSafeInteger(daysBefore+daysAfter)||daysBefore+daysAfter<=0||!validPublicationDate(periodEnd))
  return {status:'INSUFFICIENT_EVIDENCE',errors:['INVALID_CAPITAL_ACTION_DAY_WEIGHTS'],weightedAverageShares:null};
 if(!positiveSafeInteger(a.preActionShares)||!positiveSafeInteger(a.postActionShares)||
  !Number.isFinite(a.epsRetrospectiveShareMultiplier)||a.epsRetrospectiveShareMultiplier<=0)
  return {status:'INSUFFICIENT_EVIDENCE',errors:['INVALID_CAPITAL_ACTION_SHARE_BASIS'],weightedAverageShares:null};
 const preAdjusted=a.preActionShares*a.epsRetrospectiveShareMultiplier;
 const numerator=preAdjusted*daysBefore+a.postActionShares*daysAfter;
 const weightedAverageShares=numerator/(daysBefore+daysAfter);
 if(!Number.isFinite(preAdjusted)||preAdjusted<=0||!Number.isFinite(numerator)||!Number.isFinite(weightedAverageShares)||weightedAverageShares<=0)
  return {status:'INSUFFICIENT_EVIDENCE',errors:['ADJUSTED_WEIGHTED_AVERAGE_OUT_OF_RANGE'],weightedAverageShares:null};
 return {status:'CAPITAL_ADJUSTED_WA_SHARES_READY_FOR_REVIEW',symbol:a.symbol,periodEnd,weightedAverageShares,
  unit:'SHARES',daysBefore,daysAfter,totalDays:daysBefore+daysAfter,
  source:{tracingNo:a.source.tracingNo,row:a.source.row,page:a.source.page},
  formula:'((pre_action_shares * eps_retrospective_share_multiplier * days_before) + (post_action_shares * days_after)) / total_period_days',
  note:'Review-only IAS 33-style denominator adjustment for one corporate action. Day weights and source share counts require independent verification; do not combine multiple actions without chronological restatement.'};
}
module.exports={calculateCapitalAdjustment,calculateAdjustedWeightedAverageShares,ACTIONS};
