'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {
 LAUNCH_PLANS,plan,addPlanDays,emptyPrepaidAccess,
 grantVerifiedPrepaid,prepaidAccessDecision
}=require('../server/prepaid-plans.cjs');
const now='2026-11-12T10:00:00.000Z';
const userId='user-1';
const purchase=(planId='SAHAMBAN_PRO_30D',paymentId='pay-1')=>({
 userId,provider:'directpsp',paymentId,planId,
 amountRial:plan(planId).priceRial,currency:'IRR',paidAt:now
});
const opts={now,verifyAtProvider:()=>true};
test('approved five approved fixed-day plans have exact IRR prices',()=>{
 assert.deepEqual(Object.keys(LAUNCH_PLANS),['SAHAMBAN_PRO_30D','SAHAMBAN_PRO_60D','SAHAMBAN_PRO_90D','SAHAMBAN_PRO_180D','SAHAMBAN_PRO_365D']);
 assert.deepEqual(Object.values(LAUNCH_PLANS).map(x=>x.days),[30,60,90,180,365]);
 assert.deepEqual(Object.values(LAUNCH_PLANS).map(x=>x.priceRial),[1500000,2850000,4050000,7650000,14600000]);
 assert.deepEqual(Object.values(LAUNCH_PLANS));
 assert.throws(()=>plan('BROWSER_PRO'),/پلن/);
});
test('fixed day periods preserve UTC time and exact elapsed days',()=>{
 assert.equal(addPlanDays('2026-01-31T23:59:00.000Z',3),'2026-04-30T23:59:00.000Z');
 assert.equal(addPlanDays('2024-02-29T00:01:00.000Z',12),'2025-02-28T00:01:00.000Z');
 assert.equal(addPlanDays('2026-11-12T10:00:00.000Z',9),'2027-08-12T10:00:00.000Z');
 assert.throws(()=>addPlanDays(now,0),/ماه/);
});
test('five approved periods grant exact day lengths only after server verification',()=>{
 for(const id of Object.keys(LAUNCH_PLANS)){
  assert.equal(prepaidAccessDecision(emptyPrepaidAccess(userId),{now}).proEnabled,false);
  assert.throws(()=>grantVerifiedPrepaid(emptyPrepaidAccess(userId),purchase(id),{now}),/سمت سرور/);
  const {state}=grantVerifiedPrepaid(emptyPrepaidAccess(userId),purchase(id),opts);
  assert.equal(state.paidUntil,addPlanDays(now,plan(id).months));
  assert.equal(prepaidAccessDecision(state,{now}).proEnabled,true);
  assert.equal(prepaidAccessDecision(state,{now:state.paidUntil}).proEnabled,false);
 }
});
test('an early voluntary repurchase extends remaining time, without auto-renewal',()=>{
 const first=grantVerifiedPrepaid(emptyPrepaidAccess(userId),purchase(),opts).state;
 const second=grantVerifiedPrepaid(first,purchase('SAHAMBAN_PRO_60D','pay-2'),
  {...opts,now:'2026-12-12T10:00:00.000Z'}).state;
 assert.equal(first.paidUntil,'2027-02-12T10:00:00.000Z');
 assert.equal(second.paidUntil,'2027-08-12T10:00:00.000Z');
});
test('provider verification, account, amount, currency and future time fail closed',()=>{
 const s=emptyPrepaidAccess(userId);
 const variants=[
  {...purchase(),userId:'other'},
  {...purchase(),amountRial:1},
  {...purchase(),currency:'IRT'},
  {...purchase(),planId:'BAD'},
  {...purchase(),paidAt:'2027-12-12T10:00:00.000Z'}
 ];
 for(const p of variants)assert.throws(()=>grantVerifiedPrepaid(s,p,opts));
 assert.throws(()=>grantVerifiedPrepaid(s,purchase(),{now,verifyAtProvider:()=>false}),/تأیید/);
 assert.equal(s.paidUntil,null);
});
test('replay cannot extend prepaid access again, and other providers use independent receipt keys',()=>{
 const first=grantVerifiedPrepaid(emptyPrepaidAccess(userId),purchase(),opts).state;
 const replay=grantVerifiedPrepaid(first,purchase(),opts);
 assert.equal(replay.applied,false);
 assert.equal(replay.state.paidUntil,first.paidUntil);
 const second=grantVerifiedPrepaid(first,{...purchase('SAHAMBAN_PRO_30D','pay-1'),provider:'myket'},opts);
 assert.equal(second.applied,true);
 assert.equal(second.state.processedReceipts.length,2);
 assert.throws(()=>prepaidAccessDecision({...second.state,processedReceipts:['directpsp:pay-1','directpsp:pay-1']},{now}),/تکراری/);
});
