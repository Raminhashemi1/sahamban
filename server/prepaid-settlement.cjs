'use strict';
// Settlement primitive for a trusted payment-provider adapter only.
// Call ONLY after independently verifying the provider transaction server-to-server.
// D1 batch executes these statements transactionally. No browser callback is trusted.
const {plan}=require('./prepaid-plans.cjs');
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const ORDER=/^ord_[a-f0-9]{32}$/;
function validUTC(v){
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v))return false;
 const n=Date.parse(v);return Number.isFinite(n)&&new Date(n).toISOString()===v;
}
const EVENT_SQL=`INSERT INTO prepaid_payment_events
(provider_name,provider_event_id,provider_payment_id,order_id,event_type,verified_at)
SELECT ?,?,?,o.id,'PAYMENT_SETTLED',?
FROM prepaid_subscription_orders o
WHERE o.id=? AND o.state='PENDING' AND o.plan_id=? AND o.amount_rial=? AND o.currency='IRR'`;
const ORDER_SQL=`UPDATE prepaid_subscription_orders
SET state='SETTLED',settled_at=?,provider_name=?,provider_payment_id=?
WHERE id=? AND state='PENDING' AND plan_id=? AND amount_rial=? AND currency='IRR'
AND EXISTS(SELECT 1 FROM prepaid_payment_events e
 WHERE e.provider_name=? AND e.provider_event_id=? AND e.provider_payment_id=?
 AND e.order_id=prepaid_subscription_orders.id AND e.event_type='PAYMENT_SETTLED')`;
const ENTITLEMENT_UPSERT_SQL=`WITH base AS (
 SELECT o.user_id,o.id,
  CASE WHEN e.paid_until>? THEN e.paid_until ELSE ? END AS base_date
 FROM prepaid_subscription_orders o
 LEFT JOIN prepaid_subscription_entitlements e ON e.user_id=o.user_id
 WHERE o.id=? AND o.state='SETTLED' AND o.provider_name=? AND o.provider_payment_id=?
)
INSERT INTO prepaid_subscription_entitlements(user_id,paid_until,updated_at)
SELECT user_id,
 strftime('%Y-%m-%dT%H:%M:%fZ',
  date(base_date,'start of month','+'||?||' months',
   printf('+%d days',min(CAST(strftime('%d',base_date) AS INTEGER)-1,
    CAST(strftime('%d',date(base_date,'start of month','+'||?||' months','+1 month','-1 day')) AS INTEGER)-1)))
  || ' ' || strftime('%H:%M:%f',base_date)), ?
FROM base
ON CONFLICT(user_id) DO UPDATE SET paid_until=excluded.paid_until,updated_at=excluded.updated_at`;
async function settleVerifiedPrepaidPayment(db,verified,{now}={}){
 if(!verified||typeof verified!=='object'||verified.verified!==true)return {ok:false,reason:'PROVIDER_VERIFICATION_REQUIRED'};
 const {providerName,providerEventId,providerPaymentId,orderId,planId,amountRial,currency}=verified;
 if(![providerName,providerEventId,providerPaymentId].every(x=>typeof x==='string'&&ID.test(x))||
   typeof orderId!=='string'||!ORDER.test(orderId)||currency!=='IRR'||!Number.isSafeInteger(amountRial)||!validUTC(now))
  return {ok:false,reason:'INVALID_VERIFIED_PAYMENT'};
 let selected;try{selected=plan(planId);}catch(_){return {ok:false,reason:'INVALID_PLAN'};}
 if(selected.priceRial!==amountRial)return {ok:false,reason:'AMOUNT_MISMATCH'};
 if(!db||typeof db.prepare!=='function'||typeof db.batch!=='function')return {ok:false,reason:'DATABASE_UNAVAILABLE'};
 try{
  // First fetch existing entitlement base date and pending order inside the same
  // D1 batch is essential. For concurrency, statements are guarded by pending
  // state + unique event/payment constraints. The batch rolls back on constraint errors.
  const lookup=await db.prepare(`SELECT o.user_id,o.plan_id,o.amount_rial,o.currency,o.state,
   e.paid_until FROM prepaid_subscription_orders o
   LEFT JOIN prepaid_subscription_entitlements e ON e.user_id=o.user_id WHERE o.id=? LIMIT 1`).bind(orderId).first();
  if(!lookup)return {ok:false,reason:'ORDER_NOT_FOUND'};
  if(lookup.state!=='PENDING')return {ok:false,reason:'ORDER_NOT_PENDING'};
  if(lookup.plan_id!==planId||lookup.amount_rial!==amountRial||lookup.currency!=='IRR')
   return {ok:false,reason:'ORDER_MISMATCH'};
  const statements=[
   db.prepare(EVENT_SQL).bind(providerName,providerEventId,providerPaymentId,now,orderId,planId,amountRial),
   db.prepare(ORDER_SQL).bind(now,providerName,providerPaymentId,orderId,planId,amountRial,providerName,providerEventId,providerPaymentId),
   db.prepare(ENTITLEMENT_UPSERT_SQL).bind(now,now,orderId,providerName,providerPaymentId,selected.months,selected.months,now)
  ];
  const results=await db.batch(statements);
  if(!Array.isArray(results)||results.length!==3||results.some(x=>x?.success!==true))return {ok:false,reason:'SETTLEMENT_FAILED'};
  if(results[0]?.meta?.changes!==1||results[1]?.meta?.changes!==1||results[2]?.meta?.changes!==1)
   return {ok:false,reason:'SETTLEMENT_NOT_APPLIED'};
  return {ok:true,reason:'SETTLED',orderId,planId,paidUntil:null};
 }catch(_){return {ok:false,reason:'SETTLEMENT_FAILED'};}
}
module.exports=Object.freeze({settleVerifiedPrepaidPayment,EVENT_SQL,ORDER_SQL,ENTITLEMENT_UPSERT_SQL});
