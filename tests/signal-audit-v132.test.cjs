'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const audit=require('../signal-audit-v131.js');
globalThis.SahambanDecisionV129={analyze(q){return {code:q.history.length===60||q.history.length===82?'ENTRY_CANDIDATE':'WAIT',score:88};}};
function history(){const end=new Date(Date.UTC(2026,10,3));return Array.from({length:150},(_,i)=>{const d=new Date(end);d.setUTCDate(d.getUTCDate()-(149-i));return {date:d.toISOString().slice(0,10).replaceAll('-',''),close:1000+i*2};});}
test('cost-aware event study reports gross, net, stress and drawdown consistently',()=>{
 const r=audit.audit({symbol:'نماد',history:history()});
 assert.equal(r.count,2);assert.equal(r.roundTripCostPct,1);
 assert.equal(r.events[0].grossReturnPct,((1142/1122)-1)*100);
 assert.equal(r.events[0].netReturnPct,r.events[0].grossReturnPct-1);
 assert.ok(Math.abs(r.meanNetReturnPct-(r.meanGrossReturnPct-1))<1e-10);
 assert.ok(Math.abs(r.stressMeanNetReturnPct-(r.meanGrossReturnPct-2))<1e-10);
 assert.ok(r.stressNetWinRatePct<=r.netWinRatePct);
 assert.equal(r.adequateSample,false);
});
test('cost assumptions are bounded and drawdown compounds sequential event returns',()=>{
 assert.throws(()=>audit.audit({symbol:'x',history:history()},{roundTripCostPct:-1}),/بین صفر/);
 assert.throws(()=>audit.audit({symbol:'x',history:history()},{roundTripCostPct:6}),/بین صفر/);
 assert.equal(audit.maxDrawdown([10,-20,10]),-20);
});
test('audit refuses to run if the decision engine is unavailable',()=>{
 const engine=globalThis.SahambanDecisionV129;delete globalThis.SahambanDecisionV129;
 try{assert.throws(()=>audit.audit({symbol:'x',history:history()}),/بارگذاری نشده/);}finally{globalThis.SahambanDecisionV129=engine;}
});
