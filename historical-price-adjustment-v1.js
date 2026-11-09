'use strict';
/* Review-only, pure historical-price adjustment. Never mutates source quotes or applies factors twice. */
(function(root,factory){
 const evidence=typeof module==='object'&&module.exports?require('./fundamental-evidence.js'):root?.SahambanFundamentalEvidenceV150;
 const api=factory(evidence);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SahambanHistoricalPriceAdjustmentV1=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(evidence){
 const {normalizeSymbol,toAsciiDigits,validPublicationDate}=evidence;
 const fail=code=>({status:'INSUFFICIENT_EVIDENCE',errors:[code],adjustedPrice:null,ledger:[]});
 const dateKey=value=>{
  const raw=toAsciiDigits(value).trim();
  if(!validPublicationDate(raw))return null;
  const m=raw.match(/^(13\\d{2}|14\\d{2})[/-](\\d{1,2})[/-](\\d{1,2})$/);
  return m?m[1]+m[2].padStart(2,'0')+m[3].padStart(2,'0'):null;
 };
 const safeText=value=>typeof value==='string'&&value.trim().length>0&&value.length<=240;
 function adjustHistoricalPrice(priceRecord,capitalActionResults,{expectedSymbol,asOfDate}={}){
  if(!priceRecord||typeof priceRecord!=='object'||Array.isArray(priceRecord))return fail('MISSING_RAW_PRICE_RECORD');
  const symbol=normalizeSymbol(expectedSymbol);
  if(!symbol||normalizeSymbol(priceRecord.symbol)!==symbol)return fail('PRICE_SYMBOL_MISMATCH');
  if(priceRecord.priceBasis!=='RAW_UNADJUSTED')return fail('RAW_PRICE_BASIS_REQUIRED');
  if(!['CLOSE','LAST_TRADE'].includes(priceRecord.priceType))return fail('UNSUPPORTED_PRICE_TYPE');
  if(!Number.isFinite(priceRecord.price)||priceRecord.price<=0)return fail('INVALID_RAW_PRICE');
  if(priceRecord.unit!=='IRR_PER_SHARE')return fail('INVALID_RAW_PRICE_UNIT');
  const priceDate=dateKey(priceRecord.date),cutoff=dateKey(asOfDate);
  if(!priceDate||!cutoff||priceDate>cutoff)return fail('INVALID_PRICE_OR_AS_OF_DATE');
  if(!priceRecord.source||!safeText(priceRecord.source.provider)||!safeText(priceRecord.source.recordId))
   return fail('UNTRACEABLE_RAW_PRICE_SOURCE');
  if(!Array.isArray(capitalActionResults)||capitalActionResults.length>20)
   return fail('INVALID_CAPITAL_ACTION_SEQUENCE');
  const actions=[],seen=new Set();
  for(const result of capitalActionResults){
   if(result?.status!=='CAPITAL_ADJUSTMENT_READY_FOR_REVIEW'||!result.adjustment)
    return fail('UNREVIEWED_CAPITAL_ACTION');
   const a=result.adjustment,when=dateKey(a.effectiveDate),source=a.source;
   if(!when||!normalizeSymbol(a.symbol)||normalizeSymbol(a.symbol)!==symbol||
      !source||!/^\\d{1,20}$/.test(String(source.tracingNo??''))||
      !safeText(source.row)||!Number.isInteger(source.page)||source.page<1||source.page>99999||
      !Number.isFinite(a.historicalPriceMultiplier)||a.historicalPriceMultiplier<=0||
      !Number.isSafeInteger(a.preActionShares)||a.preActionShares<=0||
      !Number.isSafeInteger(a.postActionShares)||a.postActionShares<=0)
    return fail('INVALID_CAPITAL_ACTION_FACTOR_OR_PROVENANCE');
   const identity=[String(source.tracingNo),source.row.normalize('NFKC').trim(),String(source.page)].join('\\u0000');
   if(seen.has(identity))return fail('DUPLICATE_CAPITAL_ACTION_SOURCE');
   seen.add(identity);
   if(when>priceDate&&when<=cutoff)actions.push({...a,when});
  }
  actions.sort((a,b)=>a.when.localeCompare(b.when));
  for(let i=1;i<actions.length;i++){
   if(actions[i].when===actions[i-1].when)return fail('AMBIGUOUS_SAME_DAY_CAPITAL_ACTIONS');
   if(actions[i].preActionShares!==actions[i-1].postActionShares)
    return fail('CAPITAL_ACTION_SHARE_CHAIN_MISMATCH');
  }
  let factor=1;
  const ledger=[];
  for(const a of actions){
   factor*=a.historicalPriceMultiplier;
   if(!Number.isFinite(factor)||factor<=0)return fail('CUMULATIVE_PRICE_FACTOR_OUT_OF_RANGE');
   ledger.push({actionType:a.actionType,effectiveDate:a.effectiveDate,
    factor:a.historicalPriceMultiplier,cumulativeFactor:factor,
    source:{tracingNo:a.source.tracingNo,row:a.source.row,page:a.source.page}});
  }
  const adjustedPrice=priceRecord.price*factor;
  if(!Number.isFinite(adjustedPrice)||adjustedPrice<=0)return fail('ADJUSTED_PRICE_OUT_OF_RANGE');
  return {status:'HISTORICAL_PRICE_ADJUSTED_FOR_REVIEW',symbol:priceRecord.symbol,
   rawPrice:priceRecord.price,adjustedPrice,unit:priceRecord.unit,priceType:priceRecord.priceType,
   priceDate:priceRecord.date,asOfDate,rawPriceSource:{...priceRecord.source},
   priceBasis:'RAW_UNADJUSTED',resultBasis:'CAPITAL_ACTION_ADJUSTED',
   cumulativeFactor:factor,actionsApplied:ledger.length,ledger,
   note:'Review-only arithmetic. Factors are applied once to a raw price only for actions effective after the price date and on/before the as-of date. Source rows and factors are not independently authenticated; no original quote is mutated and no trading signal is produced.'};
 }
 return Object.freeze({adjustHistoricalPrice});
});
