'use strict';
const {getPlan}=require('./catalog.cjs');
function validIso(value){
 if(typeof value!=='string')return false;
 const ms=Date.parse(value);
 return Number.isFinite(ms)&&new Date(ms).toISOString()===value;
}
/**
 * Grant a fixed-duration entitlement only after the Bazaar in-app product
 * purchase has been verified server-side. Renewal is always user-initiated.
 */
async function settle(db,{orderId,subject,planId,bazaarOrderId,tokenHash,purchaseTime,now}={}){
 const plan=getPlan(planId),nowMs=Date.parse(now),purchaseMs=Date.parse(purchaseTime);
 if(!plan||!subject||!orderId||!bazaarOrderId||!tokenHash||
   !validIso(now)||!validIso(purchaseTime)||!Number.isFinite(nowMs)||
   purchaseMs>nowMs+5*60*1000)
  return {ok:false,error:'INVALID_VERIFIED_PURCHASE'};
 try{
  const order=await db.prepare("SELECT o.id,o.user_id,o.status,o.plan_id,o.purchase_token_hash,o.created_at,a.expires_at FROM billing_orders o JOIN sahamban_users u ON u.id=o.user_id LEFT JOIN billing_access a ON a.user_id=o.user_id WHERE o.id=? AND u.auth_subject=? AND u.status='ACTIVE' LIMIT 1").bind(orderId,subject).first();
  if(!order)return {ok:false,error:'ORDER_NOT_FOUND'};
  if(order.plan_id!==planId)return {ok:false,error:'ORDER_MISMATCH'};
  if(purchaseMs<Date.parse(order.created_at)-5*60*1000)return {ok:false,error:'PURCHASE_PRECEDES_ORDER'};
  if(order.status==='PAID'){
   if(order.purchase_token_hash!==tokenHash)return {ok:false,error:'ORDER_ALREADY_SETTLED'};
   if(!validIso(order.expires_at))return {ok:false,error:'ACCESS_STATE_INVALID'};
   return {ok:true,restored:true,expiresAt:order.expires_at,daysAdded:0,renewalMode:'MANUAL'};
  }
  if(order.status!=='CREATED')return {ok:false,error:'ORDER_NOT_PENDING'};
  const currentMs=order.expires_at===null?NaN:Date.parse(order.expires_at);
  if(order.expires_at!==null&&!Number.isFinite(currentMs))return {ok:false,error:'ACCESS_STATE_INVALID'};
  const baseMs=Number.isFinite(currentMs)&&currentMs>nowMs?currentMs:nowMs;
  const expiresAt=new Date(baseMs+plan.days*24*60*60*1000).toISOString();
  const result=await db.batch([
   db.prepare("UPDATE billing_orders SET status='PAID',paid_at=?,bazaar_product_id=?,bazaar_order_id=?,purchase_token_hash=? WHERE id=? AND status='CREATED'").bind(purchaseTime,planId,bazaarOrderId,tokenHash,orderId),
   db.prepare("INSERT INTO billing_access(user_id,expires_at,auto_renewing,updated_at) VALUES(?,?,0,?) ON CONFLICT(user_id) DO UPDATE SET expires_at=excluded.expires_at,auto_renewing=0,updated_at=excluded.updated_at").bind(order.user_id,expiresAt,now),
   db.prepare("INSERT INTO billing_events(event_id,order_id,event_type,created_at) VALUES(?,?,'PURCHASE_VERIFIED',?)").bind(tokenHash,orderId,now)
  ]);
  if(!Array.isArray(result)||result.length!==3||result.some(x=>x?.success!==true||x?.meta?.changes!==1))
   return {ok:false,error:'SETTLEMENT_FAILED'};
  return {ok:true,restored:false,expiresAt,daysAdded:plan.days,renewalMode:'MANUAL'};
 }catch(_){return {ok:false,error:'SETTLEMENT_FAILED'};}
}
module.exports={settle};
