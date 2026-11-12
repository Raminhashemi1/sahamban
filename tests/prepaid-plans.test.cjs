'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {
 LAUNCH_PLANS,plan,addCalendarMonths,emptyPrepaidAccess,
 grantVerifiedPrepaid,prepaidAccessDecision
}=require('../server/prepaid-plans.cjs');
const now='2026-11-12T10:00:00.000Z';
const userId='user-1';
const purchase=(planId='SAHAMBAN_PRO_3M',paymentId='pay-1')=>({
 userId,provider:'directpsp',paymentId,planId,
 amountRial:plan(planId).priceRial,currency:'IRR',paidAt:now
});
const opts={now,verifyAtProvider:()=>true};
test('approved four plans have exact IRR prices and fixed discount values',()=>{
 assert.deepEqual(Object.keys(LAUNCH_PLANS),['SAHAMBAN_PRO_3M','SAHAMBAN_PRO_6M','SAHAMBAN_PRO_9M','SAHAMBAN_PRO_12M']);
 assert.deepEqual(Object.values(LAUNCH_PLANS).map(x=>x.months),[3,6,9,12]);
 assert.deepEqual(Object.values(LAUNCH_PLANS).map(x=>x.priceRial),[4500000,8550000,12150000,15300000]);
 assert.deepEqual(Object.values(LAUNCH_PLANS).map(x=>x.discountPercent),[0,5,10,15]);
 assert.throws(()=>plan('BROWSER_PRO'),/پلن/);
});
test('calendar months clamp end of month, preserve UTC time and leap dates',()=>{
 assert.equal(addCalendarMonths('2026-01-31T23:59:00.000Z',3),'2026-04-30T23:59:00.000Z');
 assert.equal(addCalendarMonths('2024-02-29T00:01:00.000Z',12),'2025-02-28T00:01:00.000Z');
 assert.equal(addCalendarMonths('2026-11-12T10:00:00.000Z',9),'2027-08-12T10:00:00.000Z');
 assert.throws(()=>addCalendarMonths(now,0),/ماه/);
});
test('four periods grant exact lengths only after server verification',()=>{
 for(const id of Object.keys(LAUNCH_PLANS)){
  assert.equal(prepaidAccessDecision(emptyPrepaidAccess(userId),{now}).proEnabled,false);
  assert.throws(()=>grantVerifiedPrepaid(emptyPrepaidAccess(userId),purchase(id),{now}),/سمت سرور/);
  const {state}=grantVerifiedPrepaid(emptyPrepaidAccess(userId),purchase(id),opts);
  assert.equal(state.paidUntil,addCalendarMonths(now,plan(id).months));
  assert.equal(prepaidAccessDecision(state,{now}).proEnabled,true);
  assert.equal(prepaidAccessDecision(state,{now:state.paidUntil}).proEnabled,false);
 }
});
test('an early voluntary repurchase extends remaining time, without auto-renewal',()=>{
 const first=grantVerifiedPrepaid(emptyPrepaidAccess(userId),purchase(),opts).state;
 const second=grantVerifiedPrepaid(first,purchase('SAHAMBAN_PRO_6M','pay-2'),
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
 const second=grantVerifiedPrepaid(first,{...purchase('SAHAMBAN_PRO_3M','pay-1'),provider:'myket'},opts);
 assert.equal(second.applied,true);
 assert.equal(second.state.processedReceipts.length,2);
 assert.throws(()=>prepaidAccessDecision({...second.state,processedReceipts:['directpsp:pay-1','directpsp:pay-1']},{now}),/تکراری/);
});
