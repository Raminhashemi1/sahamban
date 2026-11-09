'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {classifyTsetmcAdjustmentMode:classify}=require('../tsetmc-three-mode-basis-v160.js');
function fixture(selected='NONE'){
 const dates=Array.from({length:14},(_,i)=>{
  const d=new Date(Date.UTC(2026,0,1+i,12));
  return d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate();
 });
 const noneAdjusted=dates.map((date,i)=>({date,close:1000+i*10}));
 const capitalPlusDividends=dates.map((date,i)=>({date,close:i<4?1000+i*10:(1000+i*10)*0.8}));
 const capitalOnly=dates.map((date,i)=>({date,close:i<4?1000+i*10:(1000+i*10)*0.9}));
 const dailyHistory=dates.map((date,i)=>({date,close:
  selected==='NONE'?noneAdjusted[i].close:
  selected==='CAPITAL_PLUS_DIVIDENDS'?capitalPlusDividends[i].close:
  selected==='CAPITAL_ONLY'?capitalOnly[i].close:
  i<9?noneAdjusted[i].close:capitalOnly[i].close}));
 return {dailyHistory,noneAdjusted,capitalPlusDividends,capitalOnly};
}
test('classifies all three adjustment modes independently',()=>{
 for(const mode of ['NONE','CAPITAL_PLUS_DIVIDENDS','CAPITAL_ONLY']){
  const x=classify(fixture(mode));
  assert.equal(x.status,'BASIS_MATCHES_TSETMC_ADJUST_MODE');
  assert.equal(x.basis,mode);
  assert.equal(x.evidence.discriminatingCount,10);
  assert.equal(x.capitalAdjustmentAllowed,false);
  assert.equal(x.sourceAuthenticated,false);
  assert.equal(x.tradingSignalsEnabled,false);
 }
});
test('mixed history never gets a majority-vote classification',()=>{
 const x=classify(fixture('MIXED'));
 assert.equal(x.status,'UNKNOWN_NOT_ATTESTED');
 assert.equal(x.reason,'MIXED_AMBIGUOUS_OR_NONMATCHING_MODES');
 assert.equal(x.basis,null);
});
test('ambiguous candidate modes are rejected even if prices match',()=>{
 const f=fixture('NONE');
 f.capitalOnly=f.noneAdjusted.map(x=>({...x}));
 const x=classify(f);
 assert.equal(x.status,'UNKNOWN_NOT_ATTESTED');
 assert.equal(x.reason,'MIXED_AMBIGUOUS_OR_NONMATCHING_MODES');
 assert.ok(x.evidence.ambiguous>0);
});
test('requires enough shared dates and mode-discriminating observations',()=>{
 assert.equal(classify({...fixture(),minOverlap:20}).reason,'INSUFFICIENT_OVERLAPPING_DATES');
 const f=fixture();f.capitalOnly=f.noneAdjusted.map(x=>({...x}));
 f.capitalPlusDividends=f.noneAdjusted.map(x=>({...x}));
 assert.equal(classify(f).reason,'INSUFFICIENT_MODE_DISCRIMINATORS');
});
test('rejects invalid, duplicate, impossible dates and non-positive prices',()=>{
 const base=fixture();
 const badCases=[
  {dailyHistory:[...base.dailyHistory,base.dailyHistory[0]]},
  {noneAdjusted:base.noneAdjusted.map((x,i)=>i?x:{...x,date:20260230})},
  {capitalPlusDividends:base.capitalPlusDividends.map((x,i)=>i?x:{...x,close:0})},
  {capitalOnly:base.capitalOnly.map((x,i)=>i?x:{...x,date:'14050101'})},
  {dailyHistory:base.dailyHistory.map((x,i)=>i?x:{...x,close:'1000'})},
  {noneAdjusted:base.noneAdjusted.map((x,i)=>i?x:{...x,close:true})},
  {capitalOnly:base.capitalOnly.map((x,i)=>i?x:{...x,close:null})}
 ];
 for(const patch of badCases)assert.equal(classify({...fixture(),...patch}).status,'UNKNOWN_NOT_ATTESTED');
});
test('does not mutate any supplied market series',()=>{
 const f=fixture('CAPITAL_ONLY'),before=JSON.stringify(f);
 classify(f);
 assert.equal(JSON.stringify(f),before);
});
