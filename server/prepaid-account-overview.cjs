'use strict';
// Provider-independent, READ-ONLY subscription overview.
// Reads new Sahmino orders and retained legacy order history; never initiates checkout.
const SUBJECT=/^[A-Za-z0-9][A-Za-z0-9._:@|/-]{0,255}$/;
const LOOKUP=`SELECT u.id AS user_id,u.status AS account_status,
 CASE
  WHEN v2.paid_until IS NOT NULL AND (e.paid_until IS NULL OR v2.paid_until>=e.paid_until)
       AND (le.paid_until IS NULL OR v2.paid_until>=le.paid_until) THEN v2.paid_until
  WHEN e.paid_until IS NOT NULL AND (le.paid_until IS NULL OR e.paid_until>=le.paid_until) THEN e.paid_until
  ELSE le.paid_until
 END AS paid_until,
 COALESCE(le.suspended,0) AS payment_suspended,
 bc.renewal_mode AS renewal_mode,
 bc.lifecycle_state AS subscription_lifecycle_state,
 bc.provider_auto_renewing AS provider_auto_renewing,
 bc.provider_paid_until AS provider_paid_until,
 bc.cancellation_requested_at AS cancellation_requested_at,
 bc.cancellation_confirmed_at AS cancellation_confirmed_at
FROM sahamban_users u
LEFT JOIN sahmino_prepaid_subscription_entitlements v2 ON v2.user_id=u.id
LEFT JOIN prepaid_subscription_entitlements e ON e.user_id=u.id
LEFT JOIN subscription_entitlements le ON le.user_id=u.id
LEFT JOIN (
 SELECT c1.* FROM sahmino_bazaar_subscription_control c1
 WHERE c1.updated_at=(
  SELECT MAX(c2.updated_at) FROM sahmino_bazaar_subscription_control c2
  WHERE c2.user_id=c1.user_id
 )
) bc ON bc.user_id=u.id
WHERE u.auth_subject=? LIMIT 1`;
const LOOKUP_USER=LOOKUP.replace('WHERE u.auth_subject=?','WHERE u.id=?');
const HISTORY=`SELECT id,plan_id,amount_rial,currency,state,created_at,settled_at FROM (
 SELECT id,plan_id,amount_rial,currency,state,created_at,settled_at
 FROM sahmino_prepaid_subscription_orders WHERE user_id=?
 UNION ALL
 SELECT id,plan_id,amount_rial,currency,state,created_at,settled_at
 FROM prepaid_subscription_orders WHERE user_id=?
) ORDER BY created_at DESC,id DESC LIMIT 20`;
function utc(v){
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v))return null;
 const n=Date.parse(v);return Number.isFinite(n)&&new Date(n).toISOString().slice(0,19)===v.slice(0,19)?n:null;
}
const fail=(reason,status)=>({status,reason,proEnabled:false,checkoutEnabled:false});
async function prepaidAccountOverview(db,{authenticatedSubject,authenticatedUserId,now}={}){
 const byUser=typeof authenticatedUserId==='string'&&/^usr_[a-f0-9]{32}$/.test(authenticatedUserId);
 if(!byUser&&(typeof authenticatedSubject!=='string'||!SUBJECT.test(authenticatedSubject)))return fail('NOT_AUTHENTICATED',401);
 const current=utc(now);if(current===null)return fail('INVALID_SERVER_TIME',503);
 if(!db||typeof db.prepare!=='function')return fail('DATABASE_UNAVAILABLE',503);
 try{
  const account=await db.prepare(byUser?LOOKUP_USER:LOOKUP).bind(byUser?authenticatedUserId:authenticatedSubject).first();
  if(!account||typeof account.user_id!=='string'||account.account_status!=='ACTIVE')return fail('ACCOUNT_NOT_ELIGIBLE',403);
  if(account.payment_suspended!==0&&account.payment_suspended!==1)return fail('INVALID_PAYMENT_REVIEW_STATE',503);
  if(account.payment_suspended===1)return fail('PAYMENT_REVIEW_REQUIRED',403);
  const until=account.paid_until===null?null:utc(account.paid_until);
  if(account.paid_until!==null&&until===null)return fail('INVALID_ENTITLEMENT',503);
  const results=await db.prepare(HISTORY).bind(account.user_id,account.user_id).all();
  if(results?.success!==true||!Array.isArray(results.results))return fail('HISTORY_UNAVAILABLE',503);
  const items=[];
  for(const order of results.results){
   if(!order||typeof order.id!=='string'||typeof order.plan_id!=='string'||
    !Number.isSafeInteger(order.amount_rial)||order.amount_rial<=0||order.currency!=='IRR'||
    !['PENDING','SETTLED','CANCELLED','EXPIRED','REVIEW_REQUIRED'].includes(order.state)||
    utc(order.created_at)===null||(order.settled_at!==null&&utc(order.settled_at)===null))
    return fail('INVALID_ORDER_HISTORY',503);
   items.push({orderId:order.id,planId:order.plan_id,amountRial:order.amount_rial,currency:'IRR',
    state:order.state,createdAt:order.created_at,settledAt:order.settled_at});
  }
  const active=until!==null&&current<until;
  return {status:200,reason:active?'ACTIVE':until===null?'NO_SUBSCRIPTION':'EXPIRED',
   proEnabled:active,paidUntil:account.paid_until,remainingSeconds:active?Math.ceil((until-current)/1000):0,
   autoRenew:account.provider_auto_renewing===1,
   renewalMode:account.renewal_mode||null,
   subscriptionLifecycle:account.subscription_lifecycle_state||null,
   providerPaidUntil:account.provider_paid_until||null,
   cancellationRequestedAt:account.cancellation_requested_at||null,
   cancellationConfirmedAt:account.cancellation_confirmed_at||null,
   checkoutEnabled:false,orders:items};
 }catch(_){return fail('OVERVIEW_UNAVAILABLE',503);}
}
module.exports=Object.freeze({prepaidAccountOverview,LOOKUP,LOOKUP_USER,HISTORY});
