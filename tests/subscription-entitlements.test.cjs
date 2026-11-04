'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {emptyEntitlement,applyVerifiedEvent,accessDecision,addCalendarYear}=require('../server/subscription-entitlements.cjs');
const userId='test-user-1',serverNow='2026-11-04T20:00:00.000Z';
const settled=(eventId='evt-1',paymentId='pay-1',occurredAt='2026-11-04T18:00:00.000Z')=>
 ({type:'PAYMENT_SETTLED',userId,eventId,paymentId,occurredAt});
const verified={verifyProviderEvent:()=>true,now:serverNow};
test('client callback without provider-side verification never activates annual Pro access',()=>{
 const s=emptyEntitlement(userId);
 assert.equal(accessDecision(s,{now:serverNow}).proEnabled,false);
 assert.throws(()=>applyVerifiedEvent(s,settled(),{now:serverNow}),/سمت سرور/);
 assert.throws(()=>applyVerifiedEvent(s,{...settled(),verified:true},{now:serverNow,verifyProviderEvent:()=>false}),/تأیید نشد/);
 assert.equal(accessDecision(s,{now:serverNow}).proEnabled,false);
});
test('verified annual payment grants exactly one year and expires strictly at UTC boundary',()=>{
 const before=emptyEntitlement(userId);
 const output=applyVerifiedEvent(before,settled(),verified);
 assert.equal(output.applied,true);
 assert.equal(before.paidUntil,null);
 assert.equal(output.state.paidUntil,'2027-11-04T18:00:00.000Z');
 assert.equal(accessDecision(output.state,{now:'2027-11-04T17:59:59.000Z'}).proEnabled,true);
 assert.equal(accessDecision(output.state,{now:'2027-11-04T18:00:00.000Z'}).reason,'EXPIRED');
});
test('renewal extends current valid period without double counting payment or event',()=>{
 const first=applyVerifiedEvent(emptyEntitlement(userId),settled(),verified).state;
 const evt=settled('evt-2','pay-2','2026-11-04T19:00:00.000Z');
 const second=applyVerifiedEvent(first,evt,verified).state;
 assert.equal(second.paidUntil,'2028-11-04T18:00:00.000Z');
 const replay=applyVerifiedEvent(second,evt,verified);
 assert.equal(replay.applied,false);
 assert.equal(replay.state.paidUntil,second.paidUntil);
 assert.throws(()=>applyVerifiedEvent(second,settled('evt-3','pay-2'),verified),/قبلاً ثبت شده/);
});
test('refund and chargeback suspend entitlement pending provider reconciliation',()=>{
 for(const kind of ['REFUND_SETTLED','CHARGEBACK_CONFIRMED']){
  const paid=applyVerifiedEvent(emptyEntitlement(userId),settled(),verified).state;
  const refund={...settled('evt-refund','pay-1','2026-11-04T19:00:00.000Z'),type:kind};
  const blocked=applyVerifiedEvent(paid,refund,verified).state;
  assert.equal(accessDecision(blocked,{now:serverNow}).reason,'PAYMENT_REVIEW_REQUIRED');
  assert.throws(()=>applyVerifiedEvent(blocked,settled('evt-next','pay-next'),verified),/تطبیق مالی/);
 }
});
test('cancelling auto renewal keeps already-paid access, never extends it',()=>{
 const paid=applyVerifiedEvent(emptyEntitlement(userId),settled(),verified).state;
 const cancelled=applyVerifiedEvent(paid,{...settled('evt-cancel','pay-1','2026-11-04T19:00:00.000Z'),type:'AUTO_RENEW_CANCELLED'},verified).state;
 assert.equal(cancelled.autoRenewCancelled,true);
 assert.equal(accessDecision(cancelled,{now:serverNow}).proEnabled,true);
 assert.equal(cancelled.paidUntil,paid.paidUntil);
});
test('cross-account, unknown payment, future event and unsupported type fail closed',()=>{
 const before=emptyEntitlement(userId);
 assert.throws(()=>applyVerifiedEvent(before,{...settled(),userId:'other-user'},verified),/حساب دیگری/);
 assert.throws(()=>applyVerifiedEvent(before,{...settled(),type:'REFUND_SETTLED'},verified),/تراکنش پرداخت ثبت‌شده/);
 assert.throws(()=>applyVerifiedEvent(before,{...settled(),type:'ISSUE_FREE_PRO'},verified),/پشتیبانی نمی‌شود/);
 assert.throws(()=>applyVerifiedEvent(before,{...settled(),occurredAt:'2027-01-01T00:00:00Z'},verified),/آینده/);
 assert.throws(()=>applyVerifiedEvent(before,{...settled(),occurredAt:'2026-02-30T18:00:00Z'},verified),/واقعی/);
});
test('calendar renewal handles leap years without inventing February 30',()=>{
 assert.equal(addCalendarYear('2024-02-29T10:30:00.000Z'),'2025-02-28T10:30:00.000Z');
 assert.equal(addCalendarYear('2027-11-04T18:00:00.000Z'),'2028-11-04T18:00:00.000Z');
});
test('event idempotency and payment uniqueness must be persisted, not trusted to browser',()=>{
 const first=applyVerifiedEvent(emptyEntitlement(userId),settled(),verified).state;
 assert.deepEqual(first.processedEventIds,['evt-1']);
 assert.deepEqual(first.settledPaymentIds,['pay-1']);
 assert.throws(()=>accessDecision({...first,settledPaymentIds:['pay-1','pay-1']},{now:serverNow}),/تکراری/);
 assert.throws(()=>accessDecision(first,{now:'2026-02-30T20:00:00Z'}),/واقعی/);
});
