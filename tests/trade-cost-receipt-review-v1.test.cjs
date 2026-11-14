'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {reviewRedactedReceipt:review}=require('../trade-cost-receipt-review-v1.cjs');
const base={market:'TSE',side:'BUY',quantity:1000,priceRial:100000,grossRial:100000000,feesRial:371200,settlementRial:100371200};
test('exact fee-ceiling arithmetic is never authenticated',()=>{const r=review(base);assert.equal(r.status,'NUMERICALLY_CONSISTENT_UNATTESTED');assert.equal(r.feeDifferenceRial,0);assert.equal(r.brokerReceiptAuthenticated,false);assert.equal(r.tradingSignalsEnabled,false);});
test('lower brokerage fee remains unattested (discount/rounding unknown)',()=>{const r=review({...base,feesRial:300000,settlementRial:100300000});assert.equal(r.status,'BELOW_ESTIMATED_CEILING_UNATTESTED');assert.equal(r.feeDifferenceRial,-71200);});
test('above ceiling is flagged, not silently accepted',()=>{const r=review({...base,feesRial:500000,settlementRial:100500000});assert.equal(r.status,'ABOVE_ESTIMATED_CEILING_REVIEW_REQUIRED');assert.equal(r.feeDifferenceRial,128800);});
test('sale receipt tax and settlement arithmetic are checked',()=>{const r=review({market:'IFB',side:'SELL',quantity:1000,priceRial:100000,grossRial:100000000,feesRial:880000,settlementRial:99120000});assert.equal(r.status,'NUMERICALLY_CONSISTENT_UNATTESTED');assert.equal(r.estimatedFeesRial,880000);assert.equal(r.brokerReceiptAuthenticated,false);});
test('inconsistent gross or settlement always outranks rate comparison',()=>{assert.equal(review({...base,grossRial:99999999}).status,'RECEIPT_ARITHMETIC_MISMATCH');assert.equal(review({...base,settlementRial:100371201}).status,'RECEIPT_ARITHMETIC_MISMATCH');});
test('rejects identity/account data and unsupported instruments',()=>{assert.throws(()=>review({...base,accountNumber:'secret'}),/unexpected field/);assert.throws(()=>review({...base,market:'ETF'}),/market/);assert.throws(()=>review({...base,instrumentType:'ETF'}),/ordinary shares/);});
test('rejects malformed, negative, fractional and unsafe numerical inputs',()=>{for(const record of [null,[],{...base,quantity:0},{...base,feesRial:-1},{...base,feesRial:1.1},{...base,grossRial:Number.MAX_SAFE_INTEGER+1},{...base,settlementRial:'100371200'}])assert.throws(()=>review(record));});
test('returns no personal identifiers or unchanged opaque receipt input',()=>{const input={...base};const before=JSON.stringify(input),r=review(input);assert.equal(JSON.stringify(input),before);assert.equal('accountNumber' in r,false);assert.ok(Object.isFrozen(r));});

test('rejects receipt accessors, symbols and inherited custom objects',()=>{
 const accessor={...base};Object.defineProperty(accessor,'feesRial',{enumerable:true,get(){throw Error('getter must not run');}});
 assert.throws(()=>review(accessor),/accessor/);
 const symbol={...base,[Symbol('secret')]:'hidden'};
 assert.throws(()=>review(symbol),/unexpected/);
 const inherited=Object.assign(Object.create({account:'not allowed'}),base);
 assert.throws(()=>review(inherited),/plain numeric/);
});


test('real de-identified وساخت buy ledger debit: three-rial difference from ceiling estimate remains unattested',()=>{
 const r=review({market:'TSE',side:'BUY',quantity:21136,priceRial:1966,
  grossRial:41553376,feesRial:154243,settlementRial:41707619});
 assert.equal(r.status,'BELOW_ESTIMATED_CEILING_UNATTESTED');
 assert.equal(r.grossMatches,true);assert.equal(r.settlementMatches,true);
 assert.equal(r.observedFeesRial,154243);
 assert.equal(r.estimatedFeesRial,154246);
 assert.equal(r.feeDifferenceRial,-3);
 assert.equal(r.estimatedSettlementRial,41707622);
 assert.equal(r.observedSettlementRial,41707619);
 assert.equal(r.brokerReceiptAuthenticated,false);
 assert.equal(r.tradeEligible,false);
 assert.equal(r.tradingSignalsEnabled,false);
});
