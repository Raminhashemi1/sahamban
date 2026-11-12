'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {settleVerifiedPrepaidPayment,EVENT_SQL,ORDER_SQL,ENTITLEMENT_UPSERT_SQL}=
 require('../server/prepaid-settlement.cjs');
const now='2026-11-12T10:00:00.000Z',orderId='ord_'+'a'.repeat(32);
const payment={verified:true,providerName:'directpsp',providerEventId:'evt-1',
 providerPaymentId:'pay-1',orderId,planId:'SAHAMBAN_PRO_3M',amountRial:4500000,currency:'IRR'};
function dbFor({row={user_id:'u1',plan_id:payment.planId,amount_rial:payment.amountRial,currency:'IRR',state:'PENDING',paid_until:null},results}={}){
 const calls=[];
 return {
  calls,
  prepare(sql){
   calls.push({sql,values:null});
   return {bind(...values){
    calls.at(-1).values=values;
    return {async first(){return row;}};
   }};
  },
  async batch(stmts){
   calls.push({batch:stmts});
   return results||[0,1,2].map(()=>({success:true,meta:{changes:1}}));
  }
 };
}
test('settlement requires a provider-verified server result and exact order match',async()=>{
 assert.equal((await settleVerifiedPrepaidPayment(dbFor(),{...payment,verified:false},{now})).reason,'PROVIDER_VERIFICATION_REQUIRED');
 const mismatch=dbFor({row:{user_id:'u1',plan_id:payment.planId,amount_rial:1,currency:'IRR',state:'PENDING'}});
 assert.equal((await settleVerifiedPrepaidPayment(mismatch,payment,{now})).reason,'ORDER_MISMATCH');
});
test('valid settlement uses one D1 batch for event, order and entitlement',async()=>{
 const db=dbFor(),out=await settleVerifiedPrepaidPayment(db,payment,{now});
 assert.deepEqual(out,{ok:true,reason:'SETTLED',orderId,planId:payment.planId,paidUntil:'2027-02-12T10:00:00.000Z'});
 const batch=db.calls.find(x=>x.batch).batch;
 assert.equal(batch.length,3);
 assert.match(batch[0].sql,/state='PENDING'/);
 assert.match(batch[1].sql,/state='PENDING'/);
 assert.ok(batch[2].sql.includes('ON CONFLICT(user_id) DO UPDATE'));
 assert.match(batch[2].sql,/base_date/);
});
test('settlement fails closed on malformed data, DB errors and partial results',async()=>{
 for(const bad of [{...payment,currency:'USD'},{...payment,amountRial:1},{...payment,orderId:'bad'}]){
  assert.equal((await settleVerifiedPrepaidPayment(dbFor(),bad,{now})).ok,false);
 }
 const failed=dbFor({results:[{success:true,meta:{changes:1}},{success:true,meta:{changes:0}},{success:true,meta:{changes:0}}]});
 assert.equal((await settleVerifiedPrepaidPayment(failed,payment,{now})).reason,'SETTLEMENT_NOT_APPLIED');
 const broken=dbFor();broken.batch=async()=>{throw Error('db down')};
 assert.equal((await settleVerifiedPrepaidPayment(broken,payment,{now})).reason,'SETTLEMENT_FAILED');
 assert.equal((await settleVerifiedPrepaidPayment(null,payment,{now})).reason,'DATABASE_UNAVAILABLE');
});
test('settlement SQL preserves provider-event deduplication and exact order binding',()=>{
 assert.match(EVENT_SQL,/PAYMENT_SETTLED/);
 assert.match(EVENT_SQL,/state='PENDING'/);
 assert.match(ORDER_SQL,/provider_event_id/);
 assert.match(ENTITLEMENT_UPSERT_SQL,/ON CONFLICT\(user_id\) DO UPDATE/);
 assert.match(ENTITLEMENT_UPSERT_SQL,/strftime/);
});
