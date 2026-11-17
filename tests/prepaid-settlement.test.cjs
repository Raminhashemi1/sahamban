'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {settleVerifiedPrepaidPayment,EVENT_SQL,ORDER_SQL,ENTITLEMENT_UPSERT_SQL}=require('../server/prepaid-settlement.cjs');
const now='2026-11-12T10:00:00.000Z',orderId='ord_'+'a'.repeat(32),verifyAtProvider=async receipt=>receipt.signatureValid===true;
const payment={signatureValid:true,providerName:'directpsp',providerEventId:'evt-1',providerPaymentId:'pay-1',orderId,planId:'SAHMINO_PRO_30D',amountRial:1500000,currency:'IRR'};
function dbFor({row={user_id:'u1',plan_id:payment.planId,amount_rial:payment.amountRial,currency:'IRR',state:'PENDING',paid_until:null},results}={}){const calls=[];return {calls,prepare(sql){calls.push({sql,values:null});return {bind(...values){calls.at(-1).values=values;return {sql,async first(){return row;}};}};},async batch(stmts){calls.push({batch:stmts});return results||[0,1,2].map(()=>({success:true,meta:{changes:1}}));}};}
test('settlement requires provider verification and exact order match',async()=>{
 assert.equal((await settleVerifiedPrepaidPayment(dbFor(),{...payment,signatureValid:false},{now,verifyAtProvider})).reason,'PROVIDER_VERIFICATION_REQUIRED');
 assert.equal((await settleVerifiedPrepaidPayment(dbFor({row:{user_id:'u1',plan_id:payment.planId,amount_rial:1,currency:'IRR',state:'PENDING'}}),payment,{now,verifyAtProvider})).reason,'ORDER_MISMATCH');
});
test('valid settlement atomically writes event, order and exact day entitlement',async()=>{
 const db=dbFor(),out=await settleVerifiedPrepaidPayment(db,payment,{now,verifyAtProvider});
 assert.deepEqual(out,{ok:true,reason:'SETTLED',orderId,planId:payment.planId,paidUntil:'2026-12-12T10:00:00.000Z'});
 const batch=db.calls.find(x=>x.batch).batch;assert.equal(batch.length,3);
 assert.match(batch[0].sql,/state='PENDING'/);assert.match(batch[1].sql,/state='PENDING'/);
 assert.match(batch[2].sql,/ON CONFLICT\(user_id\) DO UPDATE/);assert.ok(batch[2].sql.includes("base_date,'+'||?||' days'"));
});
test('settlement fails closed on malformed data, DB errors and partial results',async()=>{
 for(const bad of [{...payment,currency:'USD'},{...payment,amountRial:1},{...payment,orderId:'bad'}])assert.equal((await settleVerifiedPrepaidPayment(dbFor(),bad,{now,verifyAtProvider})).ok,false);
 const failed=dbFor({results:[{success:true,meta:{changes:1}},{success:true,meta:{changes:0}},{success:true,meta:{changes:0}}]});
 assert.equal((await settleVerifiedPrepaidPayment(failed,payment,{now,verifyAtProvider})).reason,'SETTLEMENT_NOT_APPLIED');
 const broken=dbFor();broken.batch=async()=>{throw Error('db down');};
 assert.equal((await settleVerifiedPrepaidPayment(broken,payment,{now,verifyAtProvider})).reason,'SETTLEMENT_FAILED');
 assert.equal((await settleVerifiedPrepaidPayment(null,payment,{now,verifyAtProvider})).reason,'DATABASE_UNAVAILABLE');
});
test('settlement SQL binds v2 orders and unique provider events',()=>{
 assert.match(EVENT_SQL,/sahmino_prepaid_payment_events/);assert.match(EVENT_SQL,/state='PENDING'/);
 assert.match(ORDER_SQL,/provider_event_id/);assert.match(ENTITLEMENT_UPSERT_SQL,/sahmino_prepaid_subscription_orders/);
});
