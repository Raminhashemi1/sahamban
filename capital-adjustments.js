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
 if(!/^\\d{1,20}$/.test(tracing)||BigInt(tracing||'0')<=0n)errors.push('INVALID_TRACING');
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
 let theoreticalExRightsPrice=null,historicalPriceMultiplier;
 if(type==='RIGHTS_ISSUE'){
  if(after<=before)return {status:'INSUFFICIENT_EVIDENCE',errors:['RIGHTS_ISSUE_REQUIRES_NEW_SHARES'],adjustment:null};
  const cumPrice=data.cum_rights_price,subscription=data.subscription_price;
  if(!Number.isFinite(cumPrice)||cumPrice<=0||!Number.isFinite(subscription)||subscription<0)
   return {status:'INSUFFICIENT_EVIDENCE',errors:['INVALID_RIGHTS_PRICING_INPUTS'],adjustment:null};
  const newShares=after-before;
  theoreticalExRightsPrice=(cumPrice*before+subscription*newShares)/after;
  historicalPriceMultiplier=theoreticalExRightsPrice/cumPrice;
 }else{
  theoreticalExRightsPrice=null;
  historicalPriceMultiplier=before/after;
 }
 const shareCountMultiplier=after/before;
 if(!Number.isFinite(historicalPriceMultiplier)||historicalPriceMultiplier<=0||
  !Number.isFinite(shareCountMultiplier)||shareCountMultiplier<=0||
  (theoreticalExRightsPrice!==null&&(!Number.isFinite(theoreticalExRightsPrice)||theoreticalExRightsPrice<=0)))
  return {status:'INSUFFICIENT_EVIDENCE',errors:['CAPITAL_ADJUSTMENT_OUT_OF_RANGE'],adjustment:null};
 return {status:'CAPITAL_ADJUSTMENT_READY_FOR_REVIEW',errors:[],adjustment:{
  actionType:type,effectiveDate:data.effective_date,preActionShares:before,postActionShares:after,
  newShares:after-before,shareCountMultiplier,historicalPriceMultiplier,
  theoreticalExRightsPrice,source:{tracingNo:tracing,row:data.source_row,page:data.source_page},
  formula:type==='RIGHTS_ISSUE'?
   'TERP=(cum_rights_price*pre_action_shares+subscription_price*new_shares)/post_action_shares; historical_price_multiplier=TERP/cum_rights_price':
   'historical_price_multiplier=pre_action_shares/post_action_shares'
 },note:'A review-only corporate-action factor derived from user-entered, traceable source rows. It does not authenticate the CODAL document, establish the legally effective share count, adjust accounting EPS automatically, or authorize trading.'};
}
module.exports={calculateCapitalAdjustment,ACTIONS};
