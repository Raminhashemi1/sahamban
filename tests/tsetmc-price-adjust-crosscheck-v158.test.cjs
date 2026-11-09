'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {comparePriceAdjustToCapitalActions:check}=require('../tsetmc-price-adjust-crosscheck-v158.js');
const insCode='123456789012345';
const event=(patch={})=>({dEven:20260321,insCode,pClosing:800,pClosingNotAdjusted:1200,...patch});
const action=(patch={})=>({status:'CAPITAL_ADJUSTMENT_READY_FOR_REVIEW',
 adjustment:{symbol:'ونوین',effectiveDate:'۱۴۰۵/۰۱/۰۱',actionType:'BONUS_ISSUE',
 historicalPriceMultiplier:2/3,source:{tracingNo:'12345',row:'مصوبه افزایش سرمایه',page:6},...patch}});
const input=(patch={})=>({insCode,expectedSymbol:'ونوین',payload:{priceAdjust:[event()]},capitalActions:[action()],...patch});
test('same event calendar date and ratio yield only a review candidate, never verification',()=>{
 const x=check(input());
 assert.equal(x.status,'PRICE_ADJUSTMENT_CANDIDATES_FOR_MANUAL_REVIEW');
 assert.equal(x.comparisons[0].actionDate,'1405/01/01');
 assert.equal(x.comparisons[0].tsetmcGregorianDate,'20260321');
 assert.equal(x.comparisons[0].dateMatched,true);
 assert.equal(x.comparisons[0].ratioMatched,true);
 assert.equal(x.sourceEndpoint,'/ClosingPrice/GetPriceAdjustList/'+insCode);
 for(const flag of ['originVerified','priceBasisVerified','capitalActionsVerified','entryEligible','tradingSignalsEnabled'])
  assert.equal(x[flag],false);
});
test('mismatched ratio and mismatched calendar date remain manual differences, not successful identity',()=>{
 const changedRatio=check(input({payload:{priceAdjust:[event({pClosing:780})]}}));
 assert.equal(changedRatio.status,'PRICE_ADJUSTMENT_DIFFERENCES_FOR_MANUAL_REVIEW');
 assert.equal(changedRatio.comparisons[0].ratioMatched,false);
 const changedDate=check(input({payload:{priceAdjust:[event({dEven:20260320})]}}));
 assert.equal(changedDate.status,'PRICE_ADJUSTMENT_DIFFERENCES_FOR_MANUAL_REVIEW');
 assert.equal(changedDate.comparisons[0].dateMatched,false);
 assert.equal(changedDate.entryEligible,false);
});
test('reject duplicate or invalid Gregorian adjustment event dates and invalid prices',()=>{
 for(const [payload,reason] of [
  [{priceAdjust:[event(),event()]},'AMBIGUOUS_DUPLICATE_TSETMC_EVENT_DATE'],
  [{priceAdjust:[event({dEven:20260230})]},'INVALID_TSETMC_EVENT_DATE'],
  [{priceAdjust:[event({dEven:20260321,pClosing:null})]},'INVALID_TSETMC_ADJUSTMENT_PRICES'],
  [{priceAdjust:[event({pClosingNotAdjusted:0})]},'INVALID_TSETMC_ADJUSTMENT_PRICES'],
  [{priceAdjust:[event({insCode:'999999999999999'})]},'INSTRUMENT_CODE_MISMATCH']
 ]){
  const x=check(input({payload}));assert.equal(x.reason,reason);
 }
});
test('refuse duplicate CODAL action source identity and unreviewed capital evidence',()=>{
 const repeated=action({effectiveDate:'۱۴۰۵/۰۲/۰۱'});
 const duplicate=check(input({capitalActions:[action(),repeated]}));
 assert.equal(duplicate.reason,'DUPLICATE_CAPITAL_ACTION_SOURCE');
 assert.equal(check(input({capitalActions:[{...action(),status:'UNVERIFIED'}]})).reason,'UNREVIEWED_CAPITAL_ACTION');
 assert.equal(check(input({capitalActions:[action({symbol:'فولاد'})]})).reason,'INVALID_CAPITAL_ACTION_PROVENANCE_OR_FACTOR');
});
test('multiple distinct action events can be reviewed without giving trade authorization',()=>{
 const second=event({dEven:20260522,pClosing:500,pClosingNotAdjusted:1000});
 const nextAction=action({effectiveDate:'۱۴۰۵/۰۳/۰۱',historicalPriceMultiplier:0.5,
  source:{tracingNo:'12346',row:'مصوبه تجزیه دوم',page:7}});
 const r=check(input({payload:{priceAdjust:[second,event()]},capitalActions:[nextAction,action()]}));
 assert.equal(r.status,'PRICE_ADJUSTMENT_CANDIDATES_FOR_MANUAL_REVIEW');
 assert.equal(r.comparisons.length,2);
 assert.equal(r.entryEligible,false);
});
test('source payload and action inputs remain untouched',()=>{
 const x=input(),before=JSON.stringify(x);
 check(x);
 assert.equal(JSON.stringify(x),before);
});
