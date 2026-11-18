'use strict';
const {getPlan,nextExpiry}=require('./catalog.cjs');
async function settle(db,{orderId,subject,planId,amountRial,bazaarOrderId,tokenHash,now}={}){
 const plan=getPlan(planId);
 if(!plan||amountRial!==plan.priceRial||!subject||!orderId||!bazaarOrderId||!tokenHash)
  return {ok:false,error:'INVALID_VERIFIED_PURCHASE'};
 try{
  const order=await db.prepare("SELECT o.id,o.user_id,o.status,o.plan_id,o.amount_rial,a.expires_at FROM billing_orders o JOIN sahamban_users u ON u.id=o.user_id LEFT JOIN billing_access a ON a.user_id=o.user_id WHERE o.id=? AND u.auth_subject=? AND u.status='ACTIVE' LIMIT 1").bind(orderId,subject).first();
  if(!order)return {ok:false,error:'ORDER_NOT_FOUND'};
  if(order.status==='PAID'){
   const access=await db.prepare('SELECT expires_at FROM billing_access WHERE user_id=?').bind(order.user_id).first();
   return {ok:true,restored:true,expiresAt:access?.expires_at||null};
  }
  if(order.status!=='CREATED'||order.plan_id!==planId||order.amount_rial!==amountRial)return {ok:false,error:'ORDER_MISMATCH'};
  const expiresAt=nextExpiry(order.expires_at,now,plan.days);
  const result=await db.batch([
   db.prepare("UPDATE billing_orders SET status='PAID',paid_at=?,bazaar_order_id=?,purchase_token_hash=? WHERE id=? AND status='CREATED'").bind(now,bazaarOrderId,tokenHash,orderId),
   db.prepare("INSERT INTO billing_access(user_id,expires_at,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET expires_at=excluded.expires_at,updated_at=excluded.updated_at").bind(order.user_id,expiresAt,now),
   db.prepare("INSERT INTO billing_events(event_id,order_id,event_type,created_at) VALUES(?,?,'PURCHASE_VERIFIED',?)").bind(tokenHash,orderId,now)
  ]);
  if(!Array.isArray(result)||result.length!==3||result.some(x=>x?.success!==true||x?.meta?.changes!==1))return {ok:false,error:'SETTLEMENT_FAILED'};
  return {ok:true,restored:false,expiresAt};
 }catch(_){return {ok:false,error:'SETTLEMENT_FAILED'};}
}
module.exports={settle};
