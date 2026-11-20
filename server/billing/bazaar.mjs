import settlement from './settlement.cjs';
const {settle}=settlement;
const PLAN_IDS=['SAHAMBAN_PRO_30D','SAHAMBAN_PRO_60D','SAHAMBAN_PRO_90D','SAHAMBAN_PRO_180D','SAHAMBAN_PRO_365D'];
function skuMap(raw){
 try{
  const v=JSON.parse(raw);
  if(!v||Array.isArray(v)||typeof v!=='object'||Object.keys(v).length!==5)return null;
  if(PLAN_IDS.some(k=>typeof v[k]!=='string'||!/^[A-Za-z0-9._-]{1,100}$/.test(v[k])))return null;
  if(new Set(Object.values(v)).size!==5)return null;
  return v;
 }catch(_){return null;}
}
function decodeBase64(value){
 if(typeof value!=='string'||!value||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('INVALID_BASE64');
 const raw=atob(value);
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
async function verifySignedPurchase(env,{originalJson,dataSignature,orderId,sku,token}){
 const keyRaw=env.BAZAAR_RSA_PUBLIC_KEY;
 if(typeof keyRaw!=='string'||!keyRaw)throw Error('BAZAAR_PUBLIC_KEY_MISSING');
 const signed=JSON.parse(originalJson);
 if(signed.developerPayload!==orderId||signed.productId!==sku||
    signed.packageName!==env.BAZAAR_PACKAGE_NAME||signed.purchaseToken!==token||
    signed.purchaseState!==0)throw Error('SIGNED_PURCHASE_MISMATCH');
 const key=await crypto.subtle.importKey('spki',decodeBase64(keyRaw),
  {name:'RSASSA-PKCS1-v1_5',hash:'SHA-1'},false,['verify']);
 const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,
  decodeBase64(dataSignature),new TextEncoder().encode(originalJson));
 if(!valid)throw Error('PURCHASE_SIGNATURE_INVALID');
 return signed;
}
async function accessToken(env,fetcher){
 const {BAZAAR_CLIENT_ID,BAZAAR_CLIENT_SECRET,BAZAAR_REFRESH_TOKEN}=env;
 if(!BAZAAR_CLIENT_ID||!BAZAAR_CLIENT_SECRET||!BAZAAR_REFRESH_TOKEN)throw Error('BAZAAR_CREDENTIALS_MISSING');
 const body=new URLSearchParams({grant_type:'refresh_token',client_id:BAZAAR_CLIENT_ID,
  client_secret:BAZAAR_CLIENT_SECRET,refresh_token:BAZAAR_REFRESH_TOKEN});
 const response=await fetcher('https://pardakht.cafebazaar.ir/devapi/v2/auth/token/',{
  method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()
 });
 if(!response.ok)throw Error('BAZAAR_AUTH_FAILED');
 const json=await response.json();
 if(typeof json.access_token!=='string'||!json.access_token)throw Error('BAZAAR_AUTH_INVALID');
 return json.access_token;
}
async function verifyInAppPurchase(env,{sku,token,nowMs=Date.now(),allowConsumed=false},fetcher=fetch){
 const pkg=env.BAZAAR_PACKAGE_NAME;
 if(typeof pkg!=='string'||!/^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+$/.test(pkg))throw Error('PACKAGE_NOT_CONFIGURED');
 const bearer=await accessToken(env,fetcher);
 const path=['https://pardakht.cafebazaar.ir/devapi/v2/api/validate',
  encodeURIComponent(pkg),'inapp',encodeURIComponent(sku),'purchases',encodeURIComponent(token)].join('/')+'/?access_token='+encodeURIComponent(bearer);
 const response=await fetcher(path,{headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('INAPP_PURCHASE_REJECTED');
 const receipt=await response.json();
 const purchaseTimeRaw=receipt?.purchaseTimeMillis;
 const purchaseTimeMs=typeof purchaseTimeRaw==='string'?Number(purchaseTimeRaw):purchaseTimeRaw;
 if(!receipt||receipt.kind!=='androidpublisher#productPurchase'||
    receipt.purchaseState!==0||(!allowConsumed&&receipt.consumptionState!==0)||
    !Number.isSafeInteger(purchaseTimeMs)||purchaseTimeMs<=0||
    purchaseTimeMs>nowMs+5*60*1000)
   throw Error('INAPP_PURCHASE_NOT_VALID');
 return {receipt,purchaseTime:new Date(purchaseTimeMs).toISOString()};
}
export async function verifyAndSettle({db,env,subject,body,now,fetcher=fetch}){
 if(env.BILLING_V2_ENABLED!=='true')return {status:404,body:{error:'BILLING_DISABLED'}};
 if(!subject)return {status:401,body:{error:'UNAUTHENTICATED'}};
 if(!body||Object.keys(body).sort().join(',')!=='dataSignature,orderId,originalJson,sku,token'||
   typeof body.orderId!=='string'||!/^ord_[a-f0-9]{32}$/.test(body.orderId)||
   typeof body.sku!=='string'||typeof body.token!=='string'||body.token.length<8||body.token.length>4096||
   typeof body.originalJson!=='string'||body.originalJson.length<2||body.originalJson.length>8192||
   typeof body.dataSignature!=='string'||body.dataSignature.length<16||body.dataSignature.length>4096)
  return {status:400,body:{error:'INVALID_PURCHASE'}};
 const mapping=skuMap(env.BAZAAR_SKU_MAP);
 if(!mapping)return {status:503,body:{error:'BAZAAR_SKU_MAP_NOT_CONFIGURED'}};
 const planId=PLAN_IDS.find(id=>mapping[id]===body.sku);
 if(!planId)return {status:400,body:{error:'UNKNOWN_PRODUCT_SKU'}};
 try{
  const order=await db.prepare("SELECT id,plan_id,status,created_at,paid_at,bazaar_order_id,purchase_token_hash FROM billing_orders WHERE id=? AND user_id IN (SELECT id FROM sahamban_users WHERE auth_subject=? AND status='ACTIVE') LIMIT 1").bind(body.orderId,subject).first();
  if(!order)return {status:404,body:{error:'ORDER_NOT_FOUND'}};
  if(order.plan_id!==planId)return {status:409,body:{error:'ORDER_MISMATCH'}};
  await verifySignedPurchase(env,body);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.token));
  const tokenHash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  // A previously settled consumable may already have consumptionState=1.
  // Confirm the same signed token against the durable order before querying Bazaar again.
  if(order.status==='PAID'){
   if(order.purchase_token_hash!==tokenHash)return {status:409,body:{error:'ORDER_ALREADY_SETTLED'}};
   // Re-check current Bazaar state on replay: a previously valid purchase may since
   // have been refunded/reversed. Consumed state is expected for a settled consumable.
   const current=await verifyInAppPurchase(env,{sku:body.sku,token:body.token,
    nowMs:Date.parse(now),allowConsumed:true},fetcher);
   if(current.purchaseTime!==order.paid_at||
      (current.receipt.orderId&&order.bazaar_order_id&&order.bazaar_order_id!==tokenHash&&
       current.receipt.orderId!==order.bazaar_order_id))
    return {status:409,body:{error:'PURCHASE_STATE_MISMATCH'}};
   const restored=await settle(db,{orderId:body.orderId,subject,planId,
    bazaarOrderId:order.bazaar_order_id||tokenHash,tokenHash,
    purchaseTime:order.paid_at,now});
   return restored.ok?{status:200,body:{status:'ACTIVE',planId,expiresAt:restored.expiresAt,
    renewalMode:'MANUAL',daysAdded:0,restored:true}}:
    {status:409,body:{error:restored.error}};
  }
  if(order.status!=='CREATED')return {status:409,body:{error:'ORDER_NOT_PENDING'}};
  const verified=await verifyInAppPurchase(env,{sku:body.sku,token:body.token,nowMs:Date.parse(now)},fetcher);
  if(Date.parse(verified.purchaseTime)<Date.parse(order.created_at)-5*60*1000)return {status:409,body:{error:'PURCHASE_PRECEDES_ORDER'}};
  const result=await settle(db,{orderId:body.orderId,subject,planId,
   bazaarOrderId:verified.receipt.orderId||tokenHash,tokenHash,
   purchaseTime:verified.purchaseTime,now});
  return result.ok?{status:200,body:{status:'ACTIVE',planId,expiresAt:result.expiresAt,
   renewalMode:'MANUAL',daysAdded:result.daysAdded,restored:!!result.restored}}:
   {status:409,body:{error:result.error}};
 }catch(error){
  if(error?.message==='INAPP_PURCHASE_NOT_VALID')return {status:409,body:{error:'PURCHASE_NOT_VALID'}};
  return {status:503,body:{error:'PURCHASE_VERIFICATION_UNAVAILABLE'}};
 }
}
export {skuMap,verifyInAppPurchase,verifySignedPurchase};
