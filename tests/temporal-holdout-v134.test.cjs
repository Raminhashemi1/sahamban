'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {evaluate}=require('../temporal-holdout-v134.js');
function history(n=250){
 const d=Date.UTC(2026,10,3);
 return Array.from({length:n},(_,i)=>{const day=new Date(d-(n-1-i)*86400000);return {date:day.toISOString().slice(0,10).replaceAll('-',''),close:1000+i*2};});
}
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
  assert.equal(out.holdout.evidenceStatus,'DIAGNOSTIC_ONLY_NOT_VALIDATED');
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
