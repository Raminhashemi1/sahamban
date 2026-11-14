'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildTseClientThreeModeSeries:build}=require('../tse-client-three-mode-adapter-v161.js');
const insCode='123456789012345',symbol='نمادآزمایشی',startDate='20260101';
const dates=[20260101,20260102,20260103];
function response(mode,patch={}){
 return {request:{insCode,symbol,startDate,daysWithoutTrade:false,cache:false,
  mergeSimilarSymbols:false,adjustPrices:mode},
  data:[{date:dates,close:dates.map((_,i)=>1000+i*10),symbol:dates.map(()=>symbol)}],
  ...patch};
}
function input(patch={}){
 return {insCode,symbol,startDate,daysWithoutTrade:false,
  dailyHistory:dates.map((d,i)=>({dEven:d,pClosing:1000+i*10})),
  noneResult:response(0),capitalPlusDividendsResult:response(1),
  capitalOnlyResult:response(2),...patch};
}
test('normalizes the documented three getPrices modes and daily pClosing into date-keyed rows',()=>{
 const x=build(input());
 assert.equal(x.status,'NORMALIZED_FOR_REVIEW');
 assert.deepEqual(x.series.noneAdjusted,[{date:'20260101',close:1000},{date:'20260102',close:1010},{date:'20260103',close:1020}]);
 assert.equal(x.series.capitalPlusDividends.length,3);
 assert.equal(x.series.capitalOnly.length,3);
 assert.equal(x.series.dailyHistory.length,3);
 assert.equal(x.requestContract.cache,false);
 assert.equal(x.requestContract.mergeSimilarSymbols,false);
 assert.equal(x.requestContract.adjustPrices[1],'CAPITAL_INCREASE_PLUS_DIVIDENDS');
 assert.equal(x.providerAuthenticated,false);
 assert.equal(x.capitalAdjustmentAllowed,false);
 assert.equal(x.tradingSignalsEnabled,false);
});
test('requires exact request metadata and the only permitted mode per response',()=>{
 for(const patch of [
  {noneResult:response(1)},
  {capitalPlusDividendsResult:response(1,{request:{...response(1).request,cache:true}})},
  {capitalOnlyResult:response(2,{request:{...response(2).request,mergeSimilarSymbols:true}})},
  {noneResult:response(0,{request:{...response(0).request,symbol:'نماددیگر'}})},
  {capitalOnlyResult:response(2,{request:{...response(2).request,startDate:'20250101'}})}
 ]){
  const x=build(input(patch));assert.equal(x.status,'INSUFFICIENT_EVIDENCE');
 }
});
test('rejects missing, multiple, failed and mismatched instrument responses',()=>{
 for(const patch of [
  {noneResult:{...response(0),error:{code:1}}},
  {noneResult:{...response(0),data:[]}},
  {capitalPlusDividendsResult:{...response(1),data:[response(1).data[0],response(1).data[0]]}},
  {capitalOnlyResult:{...response(2),data:[{...response(2).data[0],symbol:['نماددیگر','نماددیگر','نماددیگر']}]}}
 ])assert.equal(build(input(patch)).status,'INSUFFICIENT_EVIDENCE');
});
test('rejects mismatched array lengths, duplicate dates, invalid dates and prices',()=>{
 const badItems=[
  {date:[20260101,20260102],close:[1000]},
  {date:[20260101,20260101,20260103],close:[1000,1001,1020]},
  {date:[20260230,20260102,20260103],close:[1000,1010,1020]},
  {date:[20260101,20260102,20260103],close:[1000,0,1020]}
 ];
 for(const item of badItems){
  const x=build(input({noneResult:{...response(0),data:[item]}}));
  assert.equal(x.status,'INSUFFICIENT_EVIDENCE');
 }
});
test('rejects coercible non-number prices and non-string instrument IDs',()=>{\n for(const bad of ['1000',true,null,{},NaN,Infinity]){\n  const mode=response(0);mode.data[0].close[0]=bad;\n  assert.equal(build(input({noneResult:mode})).status,'INSUFFICIENT_EVIDENCE');\n  assert.equal(build(input({dailyHistory:[{dEven:20260101,pClosing:bad}]})).status,'INSUFFICIENT_EVIDENCE');\n }\n for(const insCode of [123456789012345,null,true]) assert.equal(build(input({insCode})).status,'INSUFFICIENT_EVIDENCE');\n});\ntest('validates raw daily history and immutable source arrays',()=>{
 const x=input(),before=JSON.stringify(x);
 const out=build(x);
 assert.equal(out.status,'NORMALIZED_FOR_REVIEW');
 assert.equal(JSON.stringify(x),before);
 assert.equal(build(input({dailyHistory:[{dEven:20260230,pClosing:10}]})).reason,'INVALID_RAW_DAILY_HISTORY_ROW');
});
