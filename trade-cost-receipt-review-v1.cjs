'use strict';
/* Local-only, de-identified arithmetic comparison with the existing ceiling estimator.
 * Never certifies issuer/source authenticity, broker billing, or trade eligibility. */
const {calculateOrderCosts}=require('./trade-cost-v1.js');
const KEYS=new Set(['side','quantity','priceRial','instrumentType','market','grossRial','feesRial','settlementRial']);
function positive(v,name){if(!Number.isSafeInteger(v)||v<=0)throw new RangeError(name+' must be a positive safe integer');}
function nonnegative(v,name){if(!Number.isSafeInteger(v)||v<0)throw new RangeError(name+' must be a nonnegative safe integer');}
function reviewRedactedReceipt(receipt){
 if(!receipt||typeof receipt!=='object'||Array.isArray(receipt))throw new TypeError('receipt must be a plain numeric record');
 const prototype=Object.getPrototypeOf(receipt);
 if(prototype!==Object.prototype&&prototype!==null)throw new TypeError('receipt must be a plain numeric record');
 if(Reflect.ownKeys(receipt).some(key=>typeof key!=='string'||!KEYS.has(key)||!Object.prototype.hasOwnProperty.call(Object.getOwnPropertyDescriptor(receipt,key),'value')))
  throw new TypeError('unexpected field or accessor: only own de-identified data fields are permitted');
 for(const key of Object.keys(receipt))if(!KEYS.has(key))throw new TypeError('unexpected field: only de-identified numeric fields are permitted');
 const {side,quantity,priceRial,market,instrumentType='SHARE_OR_RIGHT',grossRial,feesRial,settlementRial}=receipt;
 if(market!=='TSE'&&market!=='IFB')throw new TypeError('market must be TSE or IFB');
 positive(quantity,'quantity');positive(priceRial,'priceRial');positive(grossRial,'grossRial');nonnegative(feesRial,'feesRial');nonnegative(settlementRial,'settlementRial');
 const estimate=calculateOrderCosts({side,quantity,priceRial,instrumentType});
 const receiptArithmetic=side==='BUY'?grossRial+feesRial:grossRial-feesRial;
 const arithmeticSafe=Number.isSafeInteger(receiptArithmetic)&&receiptArithmetic>=0;
 const grossMatches=grossRial===estimate.grossRial;
 const settlementMatches=arithmeticSafe&&receiptArithmetic===settlementRial;
 const ceilingDifferenceRial=feesRial-estimate.feesRial;
 let status='NUMERICALLY_CONSISTENT_UNATTESTED';
 if(!grossMatches||!settlementMatches)status='RECEIPT_ARITHMETIC_MISMATCH';
 else if(ceilingDifferenceRial>0)status='ABOVE_ESTIMATED_CEILING_REVIEW_REQUIRED';
 else if(ceilingDifferenceRial<0)status='BELOW_ESTIMATED_CEILING_UNATTESTED';
 return Object.freeze({status,market,side,grossMatches,settlementMatches,
  feeDifferenceRial:ceilingDifferenceRial,estimatedFeesRial:estimate.feesRial,
  observedFeesRial:feesRial,estimatedSettlementRial:estimate.settlementRial,
  observedSettlementRial:settlementRial,feeSchedule:estimate.schedule,
  sourceAuthenticated:false,brokerReceiptAuthenticated:false,feeScheduleOfficiallyVerified:false,
  tradeEligible:false,tradingSignalsEnabled:false,
  note:'De-identified arithmetic review only. Matching numbers cannot authenticate the brokerage receipt, official tariff, discounts, rounding or market classification.'});
}
module.exports=Object.freeze({reviewRedactedReceipt});
