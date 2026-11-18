'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {settleVerifiedPrepaidPayment,EVENT_SQL,ORDER_SQL,ENTITLEMENT_UPSERT_SQL,bazaarExpiry}=require('../server/prepaid-settlement.cjs');
const now='2026-11-12T10:00:00.000Z',orderId='ord_'+'a'.repeat(32);
const expiry=Date.parse('2026-12-22T10:00:00.000Z');
const verifyAtProvider=async receipt=>receipt.signatureValid===true?{
 providerName:receipt.providerName,providerEventId:receipt.providerEventId,
 providerPaymentId:receipt.providerPaymentId,orderId:receipt.orderId,
 planId:receipt.planId,amountRial:receipt.amountRial,currency:receipt.currency,
 validUntilTimestampMsec:receipt.validUntilTimestampMsec
}:false;
const payment={signatureValid:true,providerName:'cafebazaar',providerEventId:'evt-1',
 providerPaymentId:'pay-1',orderId,planId:'SAHMINO_PRO_30D',amountRial:1500000,
 currency:'IRR',validUntilTimestampMsec:expiry};
function dbFor({row={user_id:'u1',plan_id:payment.planId,amount_rial:payment.amountRial,
 currency:'IRR',state:'PENDING',paid_until:null},results}={}){
 const calls=[];return {calls,prepare(sql){calls.push({sql,values:null});return {
  bind(...values){calls.at(-1).values=values;return {sql,async first(){return row;}};}
 };},async batch(stmts){calls.push({batch:stmts});return results||[0,1,2].map(()=>({success:true,meta:{changes:1}}));}};
}
test('Bazaar expiry parser accepts only a future exact millisecond timestamp',()=>{
 assert.equal(bazaarExpiry(expiry,now),'2026-12-22T10:00:00.000Z');
 assert.equal(bazaarExpiry(now?Date.parse(now):0,now),null);
 assert.equal(bazaarExpiry('2026-12-22',now),null);
 assert.equal(bazaarExpiry(Number.MAX_SAFE_INTEGER,now),null);
});
test('settlement requires provider verification and exact order match',async()=>{
 assert.equal((await settleVerifiedPrepaidPayment(dbFor(),{...payment,signatureValid:false},{now,verifyAtProvider})).reason,'PROVIDER_VERIFICATION_REQUIRED');
 assert.equal((await settleVerifiedPrepaidPayment(dbFor({row:{user_id:'u1',plan_id:payment.planId,
 amount_rial:1,currency:'IRR',state:'PENDING'}}),payment,{now,verifyAtProvider})).reason,'ORDER_MISMATCH');
});
test('valid settlement uses Bazaar expiry, not plan-day arithmetic',async()=>{
 const db=dbFor(),out=await settleVerifiedPrepaidPayment(db,payment,{now,verifyAtProvider});
 assert.deepEqual(out,{ok:true,reason:'SETTLED',orderId,planId:payment.planId,paidUntil:'2026-12-22T10:00:00.000Z'});
 const batch=db.calls.find(x=>x.batch).batch;assert.equal(batch.length,3);
 assert.match(batch[0].sql,/state='PENDING'/);assert.match(batch[1].sql,/state='PENDING'/);
 assert.match(batch[2].sql,/ON CONFLICT\\(user_id\\) DO UPDATE/);
 assert.doesNotMatch(batch[2].sql,/\+'\\|\+'\|\?\|\' days/);
 assert.deepEqual(batch[2].values,[orderId,'cafebazaar','pay-1','2026-12-22T10:00:00.000Z',now]);
});
test('existing later paid-through date is never shortened by a provider response',async()=>{
 const later='2027-01-10T10:00:00.000Z';
 const db=dbFor({row:{user_id:'u1',plan_id:payment.planId,amount_rial:payment.amountRial,
 currency:'IRR',state:'PENDING',paid_until:later}});
 const out=await settleVerifiedPrepaidPayment(db,payment,{now,verifyAtProvider});
 assert.equal(out.paidUntil,later);
});
test('expired or malformed Bazaar expiry is rejected before DB writes',async()=>{
 for(const value of [Date.parse(now),Date.parse('2026-02-30T00:00:00Z'),0,'not-a-time']){
  const db=dbFor(),out=await settleVerifiedPrepaidPayment(db,{...payment,validUntilTimestampMsec:value},{now,verifyAtProvider});
  assert.equal(out.reason,'INVALID_PROVIDER_EXPIRY');assert.equal(db.calls.length,0);
 }
});
test('settlement fails closed on malformed data, DB errors and partial results',async()=>{
 for(const bad of [{...payment,currency:'USD'},{...payment,amountRial:1},{...payment,orderId:'bad'}])
  assert.equal((await settleVerifiedPrepaidPayment(dbFor(),bad,{now,verifyAtProvider})).ok,false);
 const failed=dbFor({results:[{success:true,meta:{changes:1}},{success:true,meta:{changes:0}},{success:true,meta:{changes:0}}]});
 assert.equal((await settleVerifiedPrepaidPayment(failed,payment,{now,verifyAtProvider})).reason,'SETTLEMENT_NOT_APPLIED');
 const broken=dbFor();broken.batch=async()=>{throw Error('db down');};
 assert.equal((await settleVerifiedPrepaidPayment(broken,payment,{now,verifyAtProvider})).reason,'SETTLEMENT_FAILED');
 assert.equal((await settleVerifiedPrepaidPayment(null,payment,{now,verifyAtProvider})).reason,'DATABASE_UNAVAILABLE');
});
test('settlement SQL binds Bazaar verified expiry and a unique provider event',()=>{
 assert.match(EVENT_SQL,/sahmino_prepaid_payment_events/);assert.match(EVENT_SQL,/state='PENDING'/);
 assert.match(ORDER_SQL,/provider_event_id/);assert.match(ENTITLEMENT_UPSERT_SQL,/sahmino_prepaid_subscription_orders/);
 assert.match(ENTITLEMENT_UPSERT_SQL,/paid_until>excluded\.paid_until/);
 assert.doesNotMatch(ENTITLEMENT_UPSERT_SQL,/\+'\\|\+'\|\?\|\' days/);
});
