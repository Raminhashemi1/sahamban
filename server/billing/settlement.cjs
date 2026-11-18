'use strict';
const {getPlan}=require('./catalog.cjs');
function validExpiry(value,now){
 if(typeof value!=='string')return false;
 const ms=Date.parse(value),n=Date.parse(now);
 return Number.isFinite(ms)&&Number.isFinite(n)&&new Date(ms).toISOString()===value&&ms>n;
}
/**
 * Settle only against a provider-verified subscription response.
 * Provider expiry is authoritative; never calculate subscription expiry locally.
 */
async function settle(db,{orderId,subject,planId,bazaarOrderId,tokenHash,verifiedExpiresAt,autoRenewing,now}={}){
 const plan=getPlan(planId);
 if(!plan||!subject||!orderId||!bazaarOrderId||
   !tokenHash||!validExpiry(verifiedExpiresAt,now)||typeof autoRenewing!=='boolean')
  return {ok:false,error:'INVALID_VERIFIED_SUBSCRIPTION'};
 try{
  const order=await db.prepare("SELECT o.id,o.user_id,o.status,o.plan_id,o.purchase_token_hash,a.expires_at FROM billing_orders o JOIN sahamban_users u ON u.id=o.user_id LEFT JOIN billing_access a ON a.user_id=o.user_id WHERE o.id=? AND u.auth_subject=? AND u.status='ACTIVE' LIMIT 1").bind(orderId,subject).first();
  if(!order)return {ok:false,error:'ORDER_NOT_FOUND'};
  if(order.plan_id!==planId)return {ok:false,error:'ORDER_MISMATCH'};
  if(order.status==='PAID'){
   const current=order.expires_at&&Date.parse(order.expires_at);
   const verified=Date.parse(verifiedExpiresAt);
   if(!Number.isFinite(current))return {ok:false,error:'ACCESS_STATE_INVALID'};
   // The same signed developerPayload binds subsequent Bazaar renewal receipts
   // to this original order. Each new provider token is recorded exactly once.
   if(order.purchase_token_hash!==tokenHash){
    const renewed=await db.batch([
     db.prepare("UPDATE billing_orders SET bazaar_order_id=?,purchase_token_hash=? WHERE id=? AND status='PAID'").bind(bazaarOrderId,tokenHash,orderId),
     db.prepare("UPDATE billing_access SET expires_at=?,auto_renewing=?,updated_at=? WHERE user_id=?").bind(verified>current?verifiedExpiresAt:order.expires_at,autoRenewing?1:0,now,order.user_id),
     db.prepare("INSERT INTO billing_events(event_id,order_id,event_type,created_at) VALUES(?,?,'PURCHASE_VERIFIED',?)").bind(tokenHash,orderId,now)
    ]);
    if(!Array.isArray(renewed)||renewed.length!==3||renewed.some(x=>x?.success!==true||x?.meta?.changes!==1))
     return {ok:false,error:'RENEWAL_RECORD_FAILED'};
   }else if(verified>current){
    const updated=await db.prepare("UPDATE billing_access SET expires_at=?,auto_renewing=?,updated_at=? WHERE user_id=?")
     .bind(verifiedExpiresAt,autoRenewing?1:0,now,order.user_id).run();
    if(updated?.success!==true||updated?.meta?.changes!==1)return {ok:false,error:'ACCESS_REFRESH_FAILED'};
   }
   return {ok:true,restored:true,expiresAt:verified>current?verifiedExpiresAt:order.expires_at};
  }
  if(order.status!=='CREATED')return {ok:false,error:'ORDER_NOT_PENDING'};
  const result=await db.batch([
   db.prepare("UPDATE billing_orders SET status='PAID',paid_at=?,bazaar_order_id=?,purchase_token_hash=? WHERE id=? AND status='CREATED'").bind(now,bazaarOrderId,tokenHash,orderId),
   db.prepare("INSERT INTO billing_access(user_id,expires_at,auto_renewing,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET expires_at=excluded.expires_at,auto_renewing=excluded.auto_renewing,updated_at=excluded.updated_at").bind(order.user_id,verifiedExpiresAt,autoRenewing?1:0,now),
   db.prepare("INSERT INTO billing_events(event_id,order_id,event_type,created_at) VALUES(?,?,'PURCHASE_VERIFIED',?)").bind(tokenHash,orderId,now)
  ]);
  if(!Array.isArray(result)||result.length!==3||result.some(x=>x?.success!==true||x?.meta?.changes!==1))
   return {ok:false,error:'SETTLEMENT_FAILED'};
  return {ok:true,restored:false,expiresAt:verifiedExpiresAt};
 }catch(_){return {ok:false,error:'SETTLEMENT_FAILED'};}
}
module.exports={settle};
