'use strict';
// Provider-independent, READ-ONLY prepaid subscription overview.
// Caller must supply a verified authentication subject (not a browser userId).
// No checkout, billing credentials, bank data, or purchase activation occurs here.
const SUBJECT=/^[A-Za-z0-9][A-Za-z0-9._:@|/-]{0,255}$/;
const LOOKUP=`SELECT u.id AS user_id, u.status AS account_status, e.paid_until
FROM sahamban_users u
LEFT JOIN prepaid_subscription_entitlements e ON e.user_id=u.id
WHERE u.auth_subject=? LIMIT 1`;
const HISTORY=`SELECT id,plan_id,amount_rial,currency,state,created_at,settled_at
FROM prepaid_subscription_orders WHERE user_id=?
ORDER BY created_at DESC,id DESC LIMIT 20`;
function utc(v){
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v))return null;
 const n=Date.parse(v);
 return Number.isFinite(n)&&new Date(n).toISOString().slice(0,19)===v.slice(0,19)?n:null;
}
const fail=(reason,status)=>({status,reason,proEnabled:false,checkoutEnabled:false});
async function prepaidAccountOverview(db,{authenticatedSubject,now}={}){
 if(typeof authenticatedSubject!=='string'||!SUBJECT.test(authenticatedSubject))
  return fail('NOT_AUTHENTICATED',401);
 const current=utc(now);
 if(current===null)return fail('INVALID_SERVER_TIME',503);
 if(!db||typeof db.prepare!=='function')return fail('DATABASE_UNAVAILABLE',503);
 try{
  const account=await db.prepare(LOOKUP).bind(authenticatedSubject).first();
  if(!account||typeof account.user_id!=='string'||account.account_status!=='ACTIVE')
   return fail('ACCOUNT_NOT_ELIGIBLE',403);
  const until=account.paid_until===null?null:utc(account.paid_until);
  if(account.paid_until!==null&&until===null)return fail('INVALID_ENTITLEMENT',503);
  const results=await db.prepare(HISTORY).bind(account.user_id).all();
  if(results?.success!==true||!Array.isArray(results.results))return fail('HISTORY_UNAVAILABLE',503);
  const items=[];
  for(const order of results.results){
   if(!order||typeof order.id!=='string'||typeof order.plan_id!=='string'||
      !Number.isSafeInteger(order.amount_rial)||order.amount_rial<=0||
      order.currency!=='IRR'||!['PENDING','SETTLED','CANCELLED','EXPIRED','REVIEW_REQUIRED'].includes(order.state)||
      utc(order.created_at)===null||
      (order.settled_at!==null&&utc(order.settled_at)===null))
    return fail('INVALID_ORDER_HISTORY',503);
   items.push({orderId:order.id,planId:order.plan_id,amountRial:order.amount_rial,
    currency:'IRR',state:order.state,createdAt:order.created_at,settledAt:order.settled_at});
  }
  const active=until!==null&&current<until;
  return {status:200,reason:active?'ACTIVE':until===null?'NO_SUBSCRIPTION':'EXPIRED',
   proEnabled:active,paidUntil:account.paid_until,
   remainingSeconds:active?Math.ceil((until-current)/1000):0,
   autoRenew:false,checkoutEnabled:false,orders:items};
 }catch(_){return fail('OVERVIEW_UNAVAILABLE',503);}
}
module.exports=Object.freeze({prepaidAccountOverview,LOOKUP,HISTORY});
