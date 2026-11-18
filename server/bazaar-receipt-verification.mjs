import {settleVerifiedPrepaidPayment} from './prepaid-settlement.cjs';

const PLANS=Object.freeze({
 SAHAMBAN_PRO_30D:1500000,
 SAHAMBAN_PRO_60D:2850000,
 SAHAMBAN_PRO_90D:4050000,
 SAHAMBAN_PRO_180D:7650000,
 SAHAMBAN_PRO_365D:14600000
});
const enc=new TextEncoder();
const json=(body,status)=>new Response(JSON.stringify(body),{status,headers:{
 'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0',
 'X-Content-Type-Options':'nosniff'
}});
const validId=v=>typeof v==='string'&&/^ord_[a-f0-9]{32}$/.test(v);
function parseProductMap(raw){
 if(typeof raw!=='string'||raw.length>4096)return null;
 try{
  const parsed=JSON.parse(raw);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return null;
  const keys=Object.keys(parsed);
  if(keys.length!==5||keys.some(k=>!Object.hasOwn(PLANS,k)))return null;
  const values=Object.values(parsed);
  if(values.some(v=>typeof v!=='string'||!/^[A-Za-z0-9._-]{1,100}$/.test(v))||new Set(values).size!==5)return null;
  return parsed;
 }catch(_){return null;}
}
async function sha256Hex(value){
 const digest=await crypto.subtle.digest('SHA-256',enc.encode(value));
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
async function getBazaarAccessToken(env,fetchImpl=fetch){
 const {BAZAAR_CLIENT_ID:id,BAZAAR_CLIENT_SECRET:secret,BAZAAR_REFRESH_TOKEN:refresh}=env||{};
 if(![id,secret,refresh].every(x=>typeof x==='string'&&x.length>0&&x.length<4096))throw Error('BAZAAR_CREDENTIALS_MISSING');
 const form=new URLSearchParams({grant_type:'refresh_token',client_id:id,client_secret:secret,refresh_token:refresh});
 const response=await fetchImpl('https://pardakht.cafebazaar.ir/devapi/v2/auth/token/',{
  method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form.toString()
 });
 if(!response.ok)throw Error('BAZAAR_TOKEN_REQUEST_FAILED');
 const data=await response.json();
 if(!data||typeof data.access_token!=='string'||!data.access_token||data.access_token.length>8192)
  throw Error('BAZAAR_TOKEN_RESPONSE_INVALID');
 return data.access_token;
}
async function verifyBazaarReceipt({env,packageName,productId,purchaseToken,orderId,fetchImpl=fetch}){
 const token=await getBazaarAccessToken(env,fetchImpl);
 const path=['https://pardakht.cafebazaar.ir/devapi/v2/api/validate',
  encodeURIComponent(packageName),'inapp',encodeURIComponent(productId),'purchases',
  encodeURIComponent(purchaseToken)].join('/')+'/?access_token='+encodeURIComponent(token);
 const response=await fetchImpl(path,{method:'GET',headers:{'Accept':'application/json'}});
 if(!response.ok)throw Error('BAZAAR_RECEIPT_REJECTED');
 const receipt=await response.json();
 if(!receipt||receipt.purchaseState!==0||receipt.consumptionState!==0||
   receipt.developerPayload!==orderId||typeof receipt.orderId!=='string'||!receipt.orderId)
  throw Error('BAZAAR_RECEIPT_NOT_VALID');
 return receipt;
}
export {parseProductMap,getBazaarAccessToken,verifyBazaarReceipt};
export async function verifyAndSettleBazaarPurchase({db,env,subject,body,now,fetchImpl=fetch}){
 if(typeof subject!=='string'||!subject)return json({error:'NOT_AUTHENTICATED'},401);
 if(!db||typeof db.prepare!=='function'||typeof db.batch!=='function')return json({error:'DATABASE_UNAVAILABLE'},503);
 if(env?.BAZAAR_BILLING_ENABLED!=='true')return json({error:'FEATURE_DISABLED'},404);
 const mapping=parseProductMap(env?.BAZAAR_PRODUCT_IDS_JSON);
 const packageName=env?.BAZAAR_PACKAGE_NAME;
 if(!mapping||typeof packageName!=='string'||!/^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+$/.test(packageName))
  return json({error:'BAZAAR_CONFIGURATION_INCOMPLETE'},503);
 if(!body||typeof body!=='object'||Array.isArray(body)||
   Object.keys(body).sort().join(',')!=='orderId,productId,purchaseToken'||
   !validId(body.orderId)||typeof body.productId!=='string'||
   typeof body.purchaseToken!=='string'||body.purchaseToken.length<8||body.purchaseToken.length>4096)
  return json({error:'INVALID_REQUEST'},400);
 const planId=Object.keys(mapping).find(k=>mapping[k]===body.productId);
 if(!planId)return json({error:'UNKNOWN_PRODUCT'},400);
 try{
  const order=await db.prepare(`SELECT o.id,o.user_id,o.plan_id,o.amount_rial,o.currency,o.state
   FROM prepaid_subscription_orders o JOIN sahamban_users u ON u.id=o.user_id
   WHERE o.id=? AND u.auth_subject=? AND u.status='ACTIVE' LIMIT 1`).bind(body.orderId,subject).first();
  if(!order)return json({error:'ORDER_NOT_FOUND'},404);
  if(order.state!=='PENDING'||order.plan_id!==planId||order.amount_rial!==PLANS[planId]||order.currency!=='IRR')
   return json({error:'ORDER_MISMATCH'},409);
  const receipt=await verifyBazaarReceipt({env,packageName,productId:body.productId,
   purchaseToken:body.purchaseToken,orderId:body.orderId,fetchImpl});
  const eventId=await sha256Hex(body.purchaseToken);
  const result=await settleVerifiedPrepaidPayment(db,{
   verified:true,providerName:'CAFE_BAZAAR',providerEventId:eventId,
   providerPaymentId:receipt.orderId,orderId:body.orderId,planId,
   amountRial:PLANS[planId],currency:'IRR'
  },{now});
  if(!result.ok)return json({error:result.reason},409);
  return json({status:'SETTLED',planId,paidUntil:result.paidUntil},200);
 }catch(_){
  // Do not leak provider credentials, access tokens, purchase tokens or raw responses.
  return json({error:'PURCHASE_VERIFICATION_UNAVAILABLE'},503);
 }
}
