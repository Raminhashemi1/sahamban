'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {initialState,syntheticBuy,syntheticRefund,syntheticBalance}=require('../billing/sahmino-synthetic-ledger-v1.cjs');
const t='2026-11-15T00:00:00.000Z';
const buy=(state,purchaseId='p1',accountId='alice',channel='CAFEBAZAAR',planDays=30,atUtc=t,fixtureResult='APPROVED')=>
 syntheticBuy({state,purchaseId,accountId,channel,planDays,atUtc,fixtureResult});
const refund=(state,purchaseId='p1',accountId='alice',channel='CAFEBAZAAR',atUtc='2026-11-16T00:00:00.000Z')=>
 syntheticRefund({state,purchaseId,accountId,channel,atUtc});
test('four channels and five durations remain synthetic',()=>{
 for(const ch of ['CAFEBAZAAR','MYKET','GOOGLE_PLAY','WEB_DIRECT'])for(const d of [30,60,90,180,365]){
  const result=buy(initialState(),'p1','alice',ch,d);
  assert.equal(result.applied,true);assert.equal(syntheticBalance(result.state,'alice',t).realEntitlement,false);
 }
 assert.throws(()=>buy(initialState(),'p1','alice','MYKET',270),/INVALID_PURCHASE/);
});
test('declined fixtures never grant',()=>{
 const r=buy(initialState(),'p1','alice','MYKET',30,t,'DECLINED');
 assert.equal(r.applied,false);assert.equal(syntheticBalance(r.state,'alice',t).syntheticActive,false);
});
test('replay is idempotent, mismatched purchaser or term conflicts',()=>{
 const a=buy(initialState(),'p1');
 assert.equal(buy(a.state,'p1').applied,false);
 assert.throws(()=>buy(a.state,'p1','bob'),/PURCHASE_KEY_CONFLICT/);
 assert.throws(()=>buy(a.state,'p1','alice','CAFEBAZAAR',60),/PURCHASE_KEY_CONFLICT/);
 assert.equal(a.state.events.length,1);
});
test('same ID from different channels is distinct',()=>{
 const a=buy(initialState(),'p1'),b=buy(a.state,'p1','alice','MYKET',60);
 assert.equal(b.state.events.length,2);
});
test('refund removes synthetic grant and duplicate refund is idempotent',()=>{
 const a=buy(initialState(),'p1');
 const b=refund(a.state);
 assert.equal(syntheticBalance(b.state,'alice','2026-11-17T00:00:00.000Z').syntheticActive,false);
 assert.equal(refund(b.state).applied,false);
 assert.equal(b.state.events.length,2);
});
test('refund recomputes stacked validity without shifting an unrelated user',()=>{
 const a=buy(initialState(),'p1');
 const b=buy(a.state,'p2','alice','CAFEBAZAAR',60,'2026-11-16T00:00:00.000Z');
 const c=buy(b.state,'p3','bob');
 const d=refund(c.state,'p1');
 assert.equal(syntheticBalance(d.state,'alice','2026-11-17T00:00:00.000Z').expiresAtUtc,'2027-01-15T00:00:00.000Z');
 assert.equal(syntheticBalance(d.state,'bob','2026-11-17T00:00:00.000Z').syntheticActive,true);
});
test('rejects wrong account, unknown purchase and refund before purchase',()=>{
 const a=buy(initialState());
 assert.throws(()=>refund(a.state,'missing'),/UNKNOWN_FIXTURE_PURCHASE/);
 assert.throws(()=>refund(a.state,'p1','bob'),/ACCOUNT_CONFLICT/);
 assert.throws(()=>refund(a.state,'p1','alice','CAFEBAZAAR','2026-11-14T00:00:00.000Z'),/REFUND_BEFORE_PURCHASE/);
});
test('rejects unsafe identifiers and invalid dates',()=>{
 assert.throws(()=>buy(initialState(),'p1','__proto__'),/INVALID_PURCHASE/);
 assert.throws(()=>buy(initialState(),'p1','alice','MYKET',30,'2026-02-30T00:00:00.000Z'),/INVALID_UTC/);
});
test('synthetic state cannot be used as real proof',()=>{
 const a=buy(initialState());
 assert.equal(a.state.events[0].source,'SYNTHETIC_APPROVAL_NOT_PROVIDER_VERIFIED');
 assert.equal(Object.hasOwn(a,'paymentVerified'),false);
 assert.equal(syntheticBalance(a.state,'alice',t).realEntitlement,false);
});
