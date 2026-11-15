'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {PLAN_DAYS,CHANNELS,newSyntheticState,simulatePurchase}=require('../billing/sahmino-subscription-simulation-v1.cjs');
const clock='2026-11-15T00:00:00.000Z';
function pay(state,accountId='alice',channel='CAFEBAZAAR',planDays=30,purchaseId='purchase1',nowUtc=clock){
 return simulatePurchase({state,accountId,channel,planDays,purchaseId,nowUtc});
}
test('exact five user-approved day durations, four channels, no 270',()=>{
 assert.deepEqual(PLAN_DAYS,[30,60,90,180,365]);
 assert.deepEqual(CHANNELS,['CAFEBAZAAR','MYKET','GOOGLE_PLAY','WEB_DIRECT']);
 for(const n of PLAN_DAYS){
  const result=pay(newSyntheticState(),'alice','MYKET',n,'p'+n);
  assert.equal(result.expiresAtUtc,new Date(Date.parse(clock)+n*86400000).toISOString());
  assert.equal(result.simulationOnly,true);
 }
 assert.throws(()=>pay(newSyntheticState(),'alice','MYKET',270),/INVALID_SYNTHETIC_PURCHASE/);
});
test('replay is idempotent and never extends the simulated account',()=>{
 const one=pay(newSyntheticState()),again=pay(one.state);
 assert.equal(again.applied,false);assert.equal(again.state,one.state);
 assert.equal(again.state.ledger.length,1);
});
test('replayed purchase for another account or plan is rejected',()=>{
 const one=pay(newSyntheticState());
 assert.throws(()=>pay(one.state,'bob'),/REPLAY_OR_CONFLICT/);
 assert.throws(()=>pay(one.state,'alice','CAFEBAZAAR',60),/REPLAY_OR_CONFLICT/);
});
test('other channel same purchase ID is a distinct synthetic event',()=>{
 const a=pay(newSyntheticState()),b=pay(a.state,'alice','MYKET',60);
 assert.equal(b.state.ledger.length,2);assert.equal(b.applied,true);
 assert.equal(b.expiresAtUtc,'2027-02-13T00:00:00.000Z');
});
test('renewal stacks from later of current expiry and synthetic purchase time',()=>{
 const a=pay(newSyntheticState()),b=pay(a.state,'alice','CAFEBAZAAR',60,'p2','2026-11-16T00:00:00.000Z');
 assert.equal(b.expiresAtUtc,new Date(Date.parse(clock)+90*86400000).toISOString());
 const c=pay(b.state,'alice','CAFEBAZAAR',30,'p3','2028-01-01T00:00:00.000Z');
 assert.equal(c.expiresAtUtc,'2028-01-31T00:00:00.000Z');
});
test('account balances are isolated',()=>{
 const a=pay(newSyntheticState()),b=pay(a.state,'bob','CAFEBAZAAR',365,'other');
 assert.equal(b.state.expiries.alice,a.expiresAtUtc);
 assert.equal(b.state.expiries.bob,new Date(Date.parse(clock)+365*86400000).toISOString());
});
test('rejects malformed context and forged non-synthetic state',()=>{
 assert.throws(()=>pay({ledger:[],expiries:{}}),/NOT_SYNTHETIC_STATE/);
 assert.throws(()=>pay(newSyntheticState(),'alice','UNKNOWN'),/INVALID_SYNTHETIC_PURCHASE/);
 assert.throws(()=>pay(newSyntheticState(),'alice','MYKET',30,'p1','2026-11-15'),/INVALID_UTC/);
 assert.throws(()=>pay(newSyntheticState(),'alice','MYKET',30,'p1','2026-13-15T00:00:00.000Z'),/INVALID_UTC/);
});
test('never issues provider receipt, real grant, or payment authorization',()=>{
 const r=pay(newSyntheticState());
 assert.equal(r.state.ledger[0].source,'SYNTHETIC_FIXTURE_NOT_PROVIDER_VERIFIED');
 assert.equal(Object.hasOwn(r,'paymentVerified'),false);
 assert.equal(Object.hasOwn(r,'entryEligible'),false);
 assert.equal(Object.hasOwn(r,'tradingSignalsEnabled'),false);
});

test('rejects unsafe account identifiers and invalid calendar timestamps',()=>{
 for(const unsafe of ['__proto__','constructor','prototype']){
  assert.throws(()=>pay(newSyntheticState(),unsafe),/INVALID_SYNTHETIC_PURCHASE/);
 }
 assert.throws(()=>pay(newSyntheticState(),'alice','CAFEBAZAAR',30,'p1','2026-02-30T00:00:00.000Z'),/INVALID_UTC/);
});
