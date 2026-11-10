'use strict';
/* Read-only Day 3 real-evidence audit. Composes existing independent byte-
 * integrity and receipt-arithmetic validators. No network, accounts or trades. */
const {verifyTsetmcCapture}=require('./tsetmc-capture-integrity-review-v1.cjs');
const {reviewRedactedReceipt}=require('./trade-cost-receipt-review-v1.cjs');
function auditDay3Evidence({manifest,dailyBytes,adjustmentsBytes,receipt,expectedDailyDate}={}){
 const capture=verifyTsetmcCapture({manifest,dailyBytes,adjustmentsBytes});
 if(capture.status!=='RAW_BYTES_MATCH_MANIFEST_FOR_REVIEW')
  return Object.freeze({status:'EVIDENCE_REVIEW_BLOCKED',captureStatus:capture.status,
   reason:capture.reason,historyBasisAuthenticated:false,threeModesVerified:false,
   tradingSignalsEnabled:false,day3FinalAccepted:false});
 if(typeof expectedDailyDate!=='string'||!/^20\d{6}$/.test(expectedDailyDate))
  throw new TypeError('expectedDailyDate must be a YYYYMMDD string');
 const daily=JSON.parse(dailyBytes.toString('utf8')).closingPriceDaily;
 const adjustments=JSON.parse(adjustmentsBytes.toString('utf8')).priceAdjust;
 const sameDay=daily.filter(row=>String(row.dEven)===expectedDailyDate);
 const noTradeRows=daily.filter(row=>Number(row.zTotTran)===0).length;
 const dateSet=new Set(daily.map(row=>String(row.dEven)));
 const adjustmentDatesInHistory=adjustments.filter(row=>dateSet.has(String(row.dEven)))
  .map(row=>String(row.dEven)).sort();
 const buyReceipt=receipt===undefined?null:reviewRedactedReceipt(receipt);
 const ledgerArithmeticReconciled=Boolean(buyReceipt&&buyReceipt.grossMatches&&buyReceipt.settlementMatches);
 return Object.freeze({
  status:'REAL_DATA_REVIEW_PARTIAL',
  captureStatus:capture.status,
  captureScope:capture.captureScope,
  fullHistoryCaptured:capture.fullHistoryCaptured,
  capturedDailyRows:capture.rowCounts.daily,
  capturedAdjustmentRows:capture.rowCounts.adjustments,
  latestDailyDate:capture.latestDailyDate,
  expectedDailyDate,expectedDatePublished:sameDay.length===1,
  noTradeRows,adjustmentDatesInHistory:Object.freeze(adjustmentDatesInHistory),
  ledgerArithmeticReconciled,
  receiptReviewStatus:buyReceipt?.status||'NOT_SUPPLIED',
  observedFeeRial:buyReceipt?.observedFeesRial??null,
  estimatedFeeRial:buyReceipt?.estimatedFeesRial??null,
  feeDifferenceRial:buyReceipt?.feeDifferenceRial??null,
  sourceAuthenticated:false,brokerReceiptAuthenticated:false,
  historyBasisAuthenticated:false,threeModesVerified:false,
  capitalAdjustmentAllowed:false,entryEligible:false,tradingSignalsEnabled:false,
  day3FinalAccepted:false,
  note:'Real original bytes and ledger arithmetic are review evidence only. A partial history and adjustment events cannot replace authenticated 0/1/2 modes or actual fee component proofs.'
 });
}
module.exports=Object.freeze({auditDay3Evidence});
