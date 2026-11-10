'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {auditDay3Evidence}=require('../day3-real-evidence-audit-v1.cjs');
const CODE='46348559193224090',TIME='2026-11-10T09:47:49.485Z';
function fixture(){
 const dailyBytes=Buffer.from(JSON.stringify({closingPriceDaily:[
  {insCode:CODE,dEven:20261109,pClosing:4670,zTotTran:8793},
  {insCode:CODE,dEven:20261108,pClosing:4540,zTotTran:40440},
  {insCode:CODE,dEven:20260803,pClosing:2604,zTotTran:0}]}));
 const adjustmentsBytes=Buffer.from(JSON.stringify({priceAdjust:[
  {insCode:Number(CODE),dEven:20260803,pClosing:2549,pClosingNotAdjusted:2604}]}));
 const prefix='tsetmc-'+CODE+'-'+TIME.replace(/[:.]/g,'-');
 const meta=(kind,bytes,rows)=>({
  filename:prefix+'-'+kind+'.json',
  url:'https://cdn.tsetmc.com/api/ClosingPrice/'+(kind==='daily'
   ?'GetClosingPriceDailyList/'+CODE+'/500':'GetPriceAdjustList/'+CODE),
  sha256:createHash('sha256').update(bytes).digest('hex'),
  sizeBytes:bytes.length,rowCount:rows,contentType:'application/json; charset=utf-8'
 });
 return {manifest:{status:'CAPTURED_FOR_MANUAL_REVIEW',insCode:CODE,collectedAt:TIME,
  host:'https://cdn.tsetmc.com',captureScope:'BOUNDED_DAILY_TOP_500',dailyTop:500,
  files:{daily:meta('daily',dailyBytes,3),adjustments:meta('adjustments',adjustmentsBytes,1)},
  sourceAuthenticated:false,priceBasisVerified:false,capitalActionsVerified:false,
  entryEligible:false,tradingSignalsEnabled:false},
  dailyBytes,adjustmentsBytes,expectedDailyDate:'20261110',
  receipt:{market:'TSE',side:'BUY',quantity:21136,priceRial:1966,grossRial:41553376,
   feesRial:154243,settlementRial:41707619}
 };
}
test('real-event-shaped audit never promotes 500 rows and executed buy to attested',()=>{
 const r=auditDay3Evidence(fixture());
 assert.equal(r.status,'REAL_DATA_REVIEW_PARTIAL');
 assert.equal(r.captureScope,'BOUNDED_DAILY_TOP_500');
 assert.equal(r.fullHistoryCaptured,false);
 assert.equal(r.latestDailyDate,'20261109');
 assert.equal(r.expectedDatePublished,false);
 assert.equal(r.noTradeRows,1);
 assert.deepEqual(r.adjustmentDatesInHistory,['20260803']);
 assert.equal(r.ledgerArithmeticReconciled,true);
 assert.equal(r.receiptReviewStatus,'BELOW_ESTIMATED_CEILING_UNATTESTED');
 assert.equal(r.observedFeeRial,154243);
 assert.equal(r.estimatedFeeRial,154246);
 assert.equal(r.feeDifferenceRial,-3);
 assert.equal(r.historyBasisAuthenticated,false);
 assert.equal(r.threeModesVerified,false);
 assert.equal(r.day3FinalAccepted,false);
 assert.equal(r.tradingSignalsEnabled,false);
});
test('tampered original market bytes cannot be promoted',()=>{
 const f=fixture();f.dailyBytes=Buffer.from(f.dailyBytes.toString().replace('4670','4690'));
 const r=auditDay3Evidence(f);
 assert.equal(r.status,'EVIDENCE_REVIEW_BLOCKED');
 assert.equal(r.captureStatus,'CAPTURE_NOT_VERIFIED');
 assert.equal(r.tradingSignalsEnabled,false);
});
test('without actual receipt audit stays honest',()=>{
 const f=fixture();delete f.receipt;
 const r=auditDay3Evidence(f);
 assert.equal(r.receiptReviewStatus,'NOT_SUPPLIED');
 assert.equal(r.ledgerArithmeticReconciled,false);
 assert.equal(r.day3FinalAccepted,false);
});
test('original capture objects remain unchanged',()=>{
 const f=fixture(),saved=JSON.stringify(f.manifest),bytes=f.dailyBytes.toString();
 auditDay3Evidence(f);
 assert.equal(JSON.stringify(f.manifest),saved);
 assert.equal(f.dailyBytes.toString(),bytes);
});
