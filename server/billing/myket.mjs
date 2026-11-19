import verifier from './settlement.cjs';
const {settleMyket}=verifier;
import {verifyMyketPurchase} from './myket-verifier.mjs';

export async function verifyAndSettleMyket({db,env,subject,body,now}) {
 if(env.BILLING_V2_ENABLED!=='true')return {status:404,body:{error:'BILLING_DISABLED'}};
 if(!subject)return {status:401,body:{error:'UNAUTHENTICATED'}};
 if(!body||Object.keys(body).sort().join(',')!=='orderId,originalJson,signature'||
   typeof body.orderId!=='string'||!/^ord_[a-f0-9]{32}$/.test(body.orderId)||
   typeof body.originalJson!=='string'||body.originalJson.length<2||body.originalJson.length>16384||
   typeof body.signature!=='string'||body.signature.length<16||body.signature.length>4096)
  return {status:400,body:{error:'INVALID_PURCHASE'}};
 try {
  const order=await db.prepare("SELECT id,plan_id,status,store,store_product_id,store_order_id,purchase_token_hash,created_at FROM billing_orders WHERE id=? AND user_id IN (SELECT id FROM sahamban_users WHERE auth_subject=? AND status='ACTIVE') LIMIT 1").bind(body.orderId,subject).first();
  if(!order)return {status:404,body:{error:'ORDER_NOT_FOUND'}};
  const verified=await verifyMyketPurchase({
   order,
   evidence:{originalJson:body.originalJson,signature:body.signature},
   config:{publicKeyBase64:env.MYKET_PUBLIC_KEY,packageName:env.MYKET_PACKAGE_NAME}
  });
  if(!verified.verified)return {status:409,body:{error:verified.reason}};
  const result=await settleMyket(db,{
   orderId:order.id,subject,planId:order.plan_id,storeOrderId:verified.storeOrderId,
   tokenHash:verified.purchaseTokenHash,purchaseTime:verified.purchaseTime,now
  });
  return result.ok?{status:200,body:{status:'ACTIVE',planId:order.plan_id,
   expiresAt:result.expiresAt,renewalMode:'MANUAL',daysAdded:result.daysAdded,
   restored:!!result.restored}}:{status:409,body:{error:result.error}};
 } catch (_) {
  return {status:503,body:{error:'PURCHASE_VERIFICATION_UNAVAILABLE'}};
 }
}
