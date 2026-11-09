'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {evaluate}=require('../temporal-holdout-v134.js');
function history(n=250){
 const d=Date.UTC(2026,10,3);
 return Array.from({length:n},(_,i)=>{const day=new Date(d-(n-1-i)*86400000);return {date:day.toISOString().slice(0,10).replaceAll('-',''),close:1000+i*2};});
}
test('holdout refuses unverified or missing historical price basis',()=>{assert.throws(()=>evaluate({symbol:'x',history:history(),historyPriceBasisEvidence:'NOT_ESTABLISHED'}),/مبنای تعدیل/);assert.throws(()=>evaluate({symbol:'x',history:history()}),/مبنای تعدیل/);});
test('chronological 60/40 split only uses history available on signal date',()=>{
 const seen=[],old=globalThis.SahambanDecisionV129;
 globalThis.SahambanDecisionV129={analyze(q,{today}){const last=q.history.at(-1);assert.equal(today,last.date);seen.push(q.history.length);return {code:q.history.length%17===0?'ENTRY_CANDIDATE':'WAIT'};}};
 try{
  const out=evaluate({symbol:'تست',history:history()});
  assert.equal(out.splitIndex,150);assert.equal(out.splitDate,history()[150].date);
  assert.ok(out.training.count>0);assert.ok(out.holdout.count>0);
  assert.ok(out.training.events.every(e=>e.exitIndex<out.splitIndex));
  assert.ok(out.holdout.events.every(e=>e.signalIndex>=out.splitIndex));
  assert.ok(out.embargoedSignalDays>0);
  assert.ok(seen.every(n=>n>=60&&n<=239));
  assert.equal(out.sufficientToClaimSkill,false);
  for(const part of [out.training,out.holdout]){
   assert.ok(part.events.every(e=>Math.abs(e.netReturnPct-(e.grossReturnPct-1))<1e-8));
  }
 }finally{globalThis.SahambanDecisionV129=old;}
});
test('holdout fails closed on too-short, unordered or malformed histories',()=>{
 const old=globalThis.SahambanDecisionV129;globalThis.SahambanDecisionV129={analyze(){return {code:'WAIT'};}};
 try{
  assert.throws(()=>evaluate({symbol:'نماد',history:history(150)}),/۲۰۰/);
  const duplicate=history();duplicate[40].date=duplicate[39].date;
  assert.throws(()=>evaluate({symbol:'نماد',history:duplicate}),/نامعتبر/);
  const zero=history();zero[70].close=0;assert.throws(()=>evaluate({symbol:'نماد',history:zero}),/نامعتبر/);
  assert.throws(()=>evaluate({symbol:'نماد',history:history()},{costPct:8}),/بین صفر/);
  assert.throws(()=>evaluate({symbol:'نماد',history:history()},{trainingShare:.8}),/۶۰/);
 }finally{globalThis.SahambanDecisionV129=old;}
});
test('no candidate signals yield explicit null metrics, not fabricated zero profitability',()=>{
 const old=globalThis.SahambanDecisionV129;globalThis.SahambanDecisionV129={analyze(){return {code:'WAIT'};}};
 try{
  const r=evaluate({symbol:'نماد',history:history()});
  assert.equal(r.holdout.count,0);assert.equal(r.holdout.meanNetReturnPct,null);assert.equal(r.holdout.netPositivePct,null);assert.equal(r.holdout.adequateSample,false);
 }finally{globalThis.SahambanDecisionV129=old;}
});

test('independent holdout exposes higher-cost stress without claiming predictive skill',()=>{
 const old=globalThis.SahambanDecisionV129;
 globalThis.SahambanDecisionV129={analyze(){return {code:'ENTRY_CANDIDATE'};}};
 try{
  const out=evaluate({symbol:'نماد',history:history(480)},{costPct:1});
  assert.ok(out.holdout.count>=10);
  assert.equal(out.holdout.stressCostPct,2);
  assert.ok(Math.abs(out.holdout.stressMeanNetReturnPct-(out.holdout.meanNetReturnPct-1))<1e-10);
  assert.ok(['FRAGILE_TO_COSTS','NONPOSITIVE_NET_RETURN','DIAGNOSTIC_ONLY_NOT_VALIDATED'].includes(out.holdout.evidenceStatus));
  assert.equal(out.sufficientToClaimSkill,false);
  const extra=evaluate({symbol:'نماد',history:history(480)},{costPct:4.5});
  assert.equal(extra.holdout.stressCostPct,5);
  assert.equal(extra.sufficientToClaimSkill,false);
 }finally{globalThis.SahambanDecisionV129=old;}
});
test('zero trade holdout stays null under stress rather than displaying invented returns',()=>{
 const old=globalThis.SahambanDecisionV129;
 globalThis.SahambanDecisionV129={analyze(){return {code:'WAIT'};}};
 try{
  const out=evaluate({symbol:'نماد',history:history(260)});
  assert.equal(out.holdout.evidenceStatus,'INSUFFICIENT_EVENTS');
  assert.equal(out.holdout.stressMeanNetReturnPct,null);
  assert.equal(out.holdout.stressPositivePct,null);
 }finally{globalThis.SahambanDecisionV129=old;}
});

test('fixed-grid passive benchmark ignores signal timing and stays in holdout',()=>{
 const old=globalThis.SahambanDecisionV129;
 try{
  globalThis.SahambanDecisionV129={analyze(q){return {code:q.history.length%19===0?'ENTRY_CANDIDATE':'WAIT'};}};
  const a=evaluate({symbol:'TEST',history:history(480)},{costPct:1});
  globalThis.SahambanDecisionV129={analyze(){return {code:'WAIT'};}};
  const b=evaluate({symbol:'TEST',history:history(480)},{costPct:1});
  assert.deepEqual(a.passiveComparison.events,b.passiveComparison.events);
  assert.ok(a.passiveComparison.count>0);
  assert.ok(a.passiveComparison.events.every(x=>x.entryIndex>a.splitIndex&&x.exitIndex<480));
  assert.equal(b.passiveComparison.excessMeanNetReturnPct,null);
  assert.ok(a.passiveComparison.excessMeanNetReturnPct!==null);
  assert.match(a.passiveComparison.method,/different market exposure/);
  assert.equal(a.sufficientToClaimSkill,false);
 }finally{globalThis.SahambanDecisionV129=old;}
});
test('passive benchmark returns match fixed windows and stated round-trip cost',()=>{
 const old=globalThis.SahambanDecisionV129;
 globalThis.SahambanDecisionV129={analyze(){return {code:'ENTRY_CANDIDATE'};}};
 try{
  const q={symbol:'نماد',history:history(480)},out=evaluate(q,{costPct:1.5});
  const e=out.passiveComparison.events[0];
  assert.ok(Math.abs(e.grossReturnPct-(q.history[e.exitIndex].close/q.history[e.entryIndex].close-1)*100)<1e-10);
  assert.ok(Math.abs(e.netReturnPct-(e.grossReturnPct-1.5))<1e-10);
  assert.ok(out.passiveComparison.events.every((x,i,a)=>i===0||x.entryIndex>a[i-1].exitIndex));
 }finally{globalThis.SahambanDecisionV129=old;}
});

test('descriptive Wilson uncertainty is null for no events and bounded for small samples',()=>{
 const old=globalThis.SahambanDecisionV129;
 try{
  globalThis.SahambanDecisionV129={analyze(){return {code:'WAIT'};}};
  const none=evaluate({symbol:'نماد',history:history(260)});
  assert.equal(none.holdout.positiveRateUncertainty.lowerPct,null);
  assert.equal(none.holdout.positiveRateUncertainty.upperPct,null);
  globalThis.SahambanDecisionV129={analyze(){return {code:'ENTRY_CANDIDATE'};}};
  const many=evaluate({symbol:'نماد',history:history(480)},{costPct:1});
  const part=many.holdout,range=part.positiveRateUncertainty;
  assert.ok(part.count>=10);
  assert.ok(range.lowerPct>=0&&range.upperPct<=100);
  assert.ok(range.lowerPct<=part.netPositivePct&&range.upperPct>=part.netPositivePct);
  assert.ok(range.lowerPct<range.upperPct);
  assert.match(range.method,/NON_IID_NOT_VALIDATED/);
  assert.equal(many.sufficientToClaimSkill,false);
  assert.equal(many.training.positiveRateUncertainty.method,range.method);
  assert.equal(many.passiveComparison.positiveRateUncertainty.method,range.method);
 }finally{globalThis.SahambanDecisionV129=old;}
});
test('Wilson interval for a single positive result never claims certainty',()=>{
 const old=globalThis.SahambanDecisionV129;
 try{
  globalThis.SahambanDecisionV129={analyze(q){return {code:q.history.length===200?'ENTRY_CANDIDATE':'WAIT'};}};
  const result=evaluate({symbol:'نماد',history:history(250)},{costPct:0});
  assert.equal(result.holdout.count,1);
  assert.equal(result.holdout.netPositivePct,100);
  assert.ok(result.holdout.positiveRateUncertainty.lowerPct<25);
  assert.equal(result.holdout.positiveRateUncertainty.upperPct,100);
  assert.equal(result.holdout.evidenceStatus,'INSUFFICIENT_EVENTS');
 }finally{globalThis.SahambanDecisionV129=old;}
});
