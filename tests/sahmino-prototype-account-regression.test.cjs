'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {simulatePurchase,newSyntheticState}=require('../billing/sahmino-subscription-simulation-v1.cjs');
const nowUtc='2026-11-15T00:00:00.000Z';
function buy(state,accountId,purchaseId){
 return simulatePurchase({state,accountId,channel:'MYKET',planDays:30,purchaseId,nowUtc});
}
test('accepted object-prototype-like IDs get isolated synthetic expiry',()=>{
 let state=newSyntheticState();
 for(const [i,id] of ['toString','valueOf','hasOwnProperty','__defineGetter__','isPrototypeOf'].entries()){
  let result=buy(state,id,'purchase'+i);
  assert.equal(result.applied,true);
  assert.equal(result.expiresAtUtc,'2026-12-15T00:00:00.000Z');
  assert.equal(result.state.expiries[id],result.expiresAtUtc);
  assert.equal(Object.getPrototypeOf(result.state.expiries),null);
  state=result.state;
 }
 assert.equal(Object.keys(state.expiries).length,5);
});
test('replay for accepted prototype-like ID remains idempotent',()=>{
 const first=buy(newSyntheticState(),'toString','id1');
 const replay=buy(first.state,'toString','id1');
 assert.equal(replay.applied,false);
 assert.equal(replay.state,first.state);
});
test('unsafe prototype pollution names remain rejected',()=>{
 for(const name of ['__proto__','constructor','prototype']) {
  assert.throws(()=>buy(newSyntheticState(),name,'id1'),/INVALID_SYNTHETIC_PURCHASE/);
 }
});
