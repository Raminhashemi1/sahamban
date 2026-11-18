import settlement from './settlement.cjs';
const {settle}=settlement;
const PLAN_IDS=['SAHAMBAN_PRO_30D','SAHAMBAN_PRO_60D','SAHAMBAN_PRO_90D','SAHAMBAN_PRO_180D','SAHAMBAN_PRO_365D'];
const PRICES={SAHAMBAN_PRO_30D:1500000,SAHAMBAN_PRO_60D:2850000,SAHAMBAN_PRO_90D:4050000,SAHAMBAN_PRO_180D:7650000,SAHAMBAN_PRO_365D:14600000};
function skuMap(raw){
 try{
  const v=JSON.parse(raw);
  if(!v||Array.isArray(v)||typeof v!=='object'||Object.keys(v).length!==5)return null;
  if(PLAN_IDS.some(k=>typeof v[k]!=='string'||!/^[A-Za-z0-9._-]{1,100}$/.test(v[k])))return null;
  if(new Set(Object.values(v)).size!==5)return null;
  return v;
 }catch(_){return null;}
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
async function verifySubscription(env,{sku,token,orderId,nowMs=Date.now()},fetcher=fetch){
 const pkg=env.BAZAAR_PACKAGE_NAME;
 if(typeof pkg!=='string'||!/^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+$/.test(pkg))throw Error('PACKAGE_NOT_CONFIGURED');
 const bearer=await accessToken(env,fetcher);
 const path=['https://pardakht.cafebazaar.ir/devapi/v2/api/applications',
  encodeURIComponent(pkg),'subscriptions',encodeURIComponent(sku),'purchases',encodeURIComponent(token)].join('/')+'/?access_token='+encodeURIComponent(bearer);
 const response=await fetcher(path,{headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('SUBSCRIPTION_REJECTED');
 const receipt=await response.json();
 const expiryRaw=receipt?.validUntilTimestampMsec;
 const expiryMs=typeof expiryRaw==='string'?Number(expiryRaw):expiryRaw;
 if(!receipt||receipt.kind!=='androidpublisher#subscriptionPurchase'||
    !Number.isSafeInteger(expiryMs)||expiryMs<=nowMs||
    typeof receipt.autoRenewing!=='boolean'||receipt.developerPayload!==orderId)
  throw Error('SUBSCRIPTION_NOT_ACTIVE');
 const expiresAt=new Date(expiryMs).toISOString();
 return {receipt,expiresAt,autoRenewing:receipt.autoRenewing};
}
export async function verifyAndSettle({db,env,subject,body,now,fetcher=fetch}){
 if(env.BILLING_V2_ENABLED!=='true')return {status:404,body:{error:'BILLING_DISABLED'}};
 if(!subject)return {status:401,body:{error:'UNAUTHENTICATED'}};
 if(!body||Object.keys(body).sort().join(',')!=='orderId,sku,token'||
   typeof body.orderId!=='string'||!/^ord_[a-f0-9]{32}$/.test(body.orderId)||
   typeof body.sku!=='string'||typeof body.token!=='string'||body.token.length<8||body.token.length>4096)
  return {status:400,body:{error:'INVALID_SUBSCRIPTION'}};
 const mapping=skuMap(env.BAZAAR_SKU_MAP);
 if(!mapping)return {status:503,body:{error:'BAZAAR_SKU_MAP_NOT_CONFIGURED'}};
 const planId=PLAN_IDS.find(id=>mapping[id]===body.sku);
 if(!planId)return {status:400,body:{error:'UNKNOWN_SUBSCRIPTION_SKU'}};
 try{
  const order=await db.prepare("SELECT id,plan_id,amount_rial,status FROM billing_orders WHERE id=? AND user_id IN (SELECT id FROM sahamban_users WHERE auth_subject=? AND status='ACTIVE') LIMIT 1").bind(body.orderId,subject).first();
  if(!order)return {status:404,body:{error:'ORDER_NOT_FOUND'}};
  if(order.plan_id!==planId||order.amount_rial!==PRICES[planId])return {status:409,body:{error:'ORDER_MISMATCH'}};
  const verified=await verifySubscription(env,{sku:body.sku,token:body.token,orderId:body.orderId,nowMs:Date.parse(now)},fetcher);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.token));
  const tokenHash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const result=await settle(db,{orderId:body.orderId,subject,planId,amountRial:PRICES[planId],
   bazaarOrderId:verified.receipt.orderId||tokenHash,tokenHash,
   verifiedExpiresAt:verified.expiresAt,autoRenewing:verified.autoRenewing,now});
  return result.ok?{status:200,body:{status:'ACTIVE',planId,expiresAt:result.expiresAt,
   autoRenewing:verified.autoRenewing,restored:!!result.restored}}:
   {status:409,body:{error:result.error}};
 }catch(_){return {status:503,body:{error:'SUBSCRIPTION_VERIFICATION_UNAVAILABLE'}};}
}
export {skuMap,verifySubscription};
