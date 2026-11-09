'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {crosscheckTsetmcHistoryBasis:check}=require('../tsetmc-price-basis-crosscheck-v159.js');
function series(basis='RAW'){
 const dates=Array.from({length:12},(_,i)=>{
  const d=new Date(Date.UTC(2026,0,1+i,12));
  return d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate();
 });
 const chartRaw=dates.map((date,i)=>({date,close:1000+i*10}));
 const chartAdjusted=dates.map((date,i)=>({date,close:i<4?chartRaw[i].close:chartRaw[i].close*0.8}));
 const dailyHistory=dates.map((d,i)=>({dEven:d,pClosing:basis==='RAW'?chartRaw[i].close:basis==='ADJUSTED'?chartAdjusted[i].close:
  i<8?chartRaw[i].close:chartAdjusted[i].close}));
 return {dailyHistory,chartRaw,chartAdjusted};
}
test('identifies daily pClosing matching explicitly unadjusted chart a=0 series',()=>{
 const x=check(series('RAW'));
 assert.equal(x.status,'BASIS_MATCHES_TSETMC_CHART_A0');
 assert.equal(x.basis,'RAW_UNADJUSTED');
 assert.equal(x.evidence.overlapCount,12);
 assert.equal(x.evidence.discriminatingCount,8);
 assert.equal(x.evidence.rawMatches,8);
 assert.equal(x.evidence.adjustedMatches,0);
 assert.equal(x.capitalAdjustmentAllowed,false);
 assert.equal(x.sourceAuthenticated,false);
});
test('identifies daily pClosing matching explicitly adjusted chart a=1 series',()=>{
 const x=check(series('ADJUSTED'));
 assert.equal(x.status,'BASIS_MATCHES_TSETMC_CHART_A1');
 assert.equal(x.basis,'CAPITAL_ACTION_ADJUSTED');
 assert.equal(x.evidence.adjustedMatches,8);
 assert.equal(x.evidence.rawMatches,0);
 assert.equal(x.tradingSignalsEnabled,false);
});
test('mixed basis series remains unknown instead of majority-vote classification',()=>{
 const x=check(series('MIXED'));
 assert.equal(x.status,'UNKNOWN_NOT_ATTESTED');
 assert.equal(x.reason,'MIXED_OR_NONMATCHING_SERIES');
 assert.equal(x.basis,null);
});
test('requires enough overlap and dates that actually distinguish a=0 from a=1',()=>{
 assert.equal(check({...series(),minOverlap:20}).reason,'INSUFFICIENT_OVERLAPPING_DATES');
 const same=series();same.chartAdjusted=same.chartRaw.map(x=>({...x}));
 assert.equal(check(same).reason,'INSUFFICIENT_ADJUSTMENT_DISCRIMINATORS');
});
test('rejects malformed, duplicate, invalid-date and non-positive price rows',()=>{
 for(const patch of [
  {dailyHistory:[...series().dailyHistory,series().dailyHistory[0]]},
  {dailyHistory:series().dailyHistory.map((x,i)=>i?x:{...x,dEven:20260230})},
  {chartRaw:series().chartRaw.map((x,i)=>i?x:{...x,close:0})},
  {chartAdjusted:series().chartAdjusted.map((x,i)=>i?x:{...x,date:'20261301'})}
 ]){
  assert.equal(check({...series(),...patch}).status,'UNKNOWN_NOT_ATTESTED');
 }
});
test('preserves all caller-provided daily and chart series',()=>{
 const input=series(),before=JSON.stringify(input);
 check(input);
 assert.equal(JSON.stringify(input),before);
});
