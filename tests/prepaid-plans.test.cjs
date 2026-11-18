'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {LAUNCH_PLANS,plan,addDays,emptyPrepaidAccess,grantVerifiedPrepaid,prepaidAccessDecision}=require('../server/prepaid-plans.cjs');
const now='2026-11-12T10:00:00.000Z',userId='user-1';
const purchase=(planId='SAHAMBAN_PRO_30D',paymentId='pay-1')=>({
 userId,provider:'myket',paymentId,planId,amountRial:plan(planId).priceRial,currency:'IRR',paidAt:now
});
const opts={now,verifyAtProvider:()=>true};
test('five approved fixed-day plans have exact IRR prices',()=>{
 assert.deepEqual(Object.keys(LAUNCH_PLANS),['SAHAMBAN_PRO_30D','SAHAMBAN_PRO_60D','SAHAMBAN_PRO_90D','SAHAMBAN_PRO_180D','SAHAMBAN_PRO_365D']);
 assert.deepEqual(Object.values(LAUNCH_PLANS).map(x=>x.days),[30,60,90,180,365]);
 assert.deepEqual(Object.values(LAUNCH_PLANS).map(x=>x.priceRial),[1500000,2850000,4050000,7650000,14600000]);
 assert.throws(()=>plan('SAHAMBAN_PRO_3M'),/پلن/);
});
test('periods are exact elapsed 24-hour days, including leap-year boundaries',()=>{
 assert.equal(addDays(now,30),'2026-12-12T10:00:00.000Z');
 assert.equal(addDays('2024-02-29T00:01:00.000Z',365),'2025-02-28T00:01:00.000Z');
 assert.equal(addDays('2026-11-12T10:00:00.000Z',60),'2027-01-11T10:00:00.000Z');
 assert.throws(()=>addDays(now,0),/روز/);
});
test('all five periods grant access only after trusted verification',()=>{
 for(const id of Object.keys(LAUNCH_PLANS)){
  assert.equal(prepaidAccessDecision(emptyPrepaidAccess(userId),{now}).proEnabled,false);
  assert.throws(()=>grantVerifiedPrepaid(emptyPrepaidAccess(userId),purchase(id),{now}),/سمت سرور/);
  const {state}=grantVerifiedPrepaid(emptyPrepaidAccess(userId),purchase(id),opts);
  assert.equal(state.paidUntil,addDays(now,plan(id).days));
  assert.equal(prepaidAccessDecision(state,{now}).proEnabled,true);
  assert.equal(prepaidAccessDecision(state,{now:state.paidUntil}).proEnabled,false);
 }
});
test('early voluntary repurchase adds exact days to remaining entitlement without auto-renewal',()=>{
 const first=grantVerifiedPrepaid(emptyPrepaidAccess(userId),purchase(),opts).state;
 const second=grantVerifiedPrepaid(first,purchase('SAHAMBAN_PRO_60D','pay-2'),{...opts,now:'2026-11-20T10:00:00.000Z'}).state;
 assert.equal(first.paidUntil,'2026-12-12T10:00:00.000Z');
 assert.equal(second.paidUntil,'2027-02-10T10:00:00.000Z');
});
test('account, amount, currency, plan, time and provider verification fail closed',()=>{
 const s=emptyPrepaidAccess(userId);
 for(const p of [{...purchase(),userId:'other'},{...purchase(),amountRial:1},{...purchase(),currency:'IRT'},
  {...purchase(),planId:'BAD'},{...purchase(),paidAt:'2027-12-12T10:00:00.000Z'}])assert.throws(()=>grantVerifiedPrepaid(s,p,opts));
 assert.throws(()=>grantVerifiedPrepaid(s,purchase(),{now,verifyAtProvider:()=>false}),/تأیید/);
 assert.equal(s.paidUntil,null);
});
test('receipt replay never grants days twice; provider namespaces remain isolated',()=>{
 const first=grantVerifiedPrepaid(emptyPrepaidAccess(userId),purchase(),opts).state;
 const replay=grantVerifiedPrepaid(first,purchase(),opts);
 assert.equal(replay.applied,false);assert.equal(replay.state.paidUntil,first.paidUntil);
 const other=grantVerifiedPrepaid(first,{...purchase('SAHAMBAN_PRO_30D','pay-1'),provider:'cafebazaar'},opts);
 assert.equal(other.applied,true);assert.equal(other.state.processedReceipts.length,2);
 assert.throws(()=>prepaidAccessDecision({...other.state,processedReceipts:['myket:pay-1','myket:pay-1']},{now}),/تکراری/);
});
