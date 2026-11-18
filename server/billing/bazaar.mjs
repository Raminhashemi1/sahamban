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
async function verifyReceipt(env,{sku,token,orderId},fetcher=fetch){
 const pkg=env.BAZAAR_PACKAGE_NAME;
 if(typeof pkg!=='string'||!/^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+$/.test(pkg))throw Error('PACKAGE_NOT_CONFIGURED');
 const bearer=await accessToken(env,fetcher);
 const url='https://pardakht.cafebazaar.ir/devapi/v2/api/validate/'+
  [pkg,'inapp',sku,'purchases',token].map(encodeURIComponent).join('/')+'/?access_token='+encodeURIComponent(bearer);
 const response=await fetcher(url,{headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('RECEIPT_REJECTED');
 const receipt=await response.json();
 if(receipt?.purchaseState!==0||receipt?.consumptionState!==0||
    receipt?.developerPayload!==orderId||typeof receipt.orderId!=='string'||!receipt.orderId)
  throw Error('RECEIPT_INVALID');
 return receipt;
}
export async function verifyAndSettle({db,env,subject,body,now,fetcher=fetch}){
 if(env.BILLING_V2_ENABLED!=='true')return {status:404,body:{error:'BILLING_DISABLED'}};
 if(!subject)return {status:401,body:{error:'UNAUTHENTICATED'}};
 if(!body||Object.keys(body).sort().join(',')!=='orderId,sku,token'||
   typeof body.orderId!=='string'||!/^ord_[a-f0-9]{32}$/.test(body.orderId)||
   typeof body.sku!=='string'||typeof body.token!=='string'||body.token.length<8||body.token.length>4096)
  return {status:400,body:{error:'INVALID_PURCHASE'}};
 const mapping=skuMap(env.BAZAAR_SKU_MAP);
 if(!mapping)return {status:503,body:{error:'BAZAAR_SKU_MAP_NOT_CONFIGURED'}};
 const planId=PLAN_IDS.find(id=>mapping[id]===body.sku);
 if(!planId)return {status:400,body:{error:'UNKNOWN_SKU'}};
 try{
  const receipt=await verifyReceipt(env,{sku:body.sku,token:body.token,orderId:body.orderId},fetcher);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.token));
  const tokenHash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const result=await settle(db,{orderId:body.orderId,subject,planId,
   amountRial:({SAHAMBAN_PRO_30D:1500000,SAHAMBAN_PRO_60D:2850000,SAHAMBAN_PRO_90D:4050000,SAHAMBAN_PRO_180D:7650000,SAHAMBAN_PRO_365D:14600000})[planId],
   bazaarOrderId:receipt.orderId,tokenHash,now});
  return result.ok?{status:200,body:{status:'PAID',planId,expiresAt:result.expiresAt,restored:!!result.restored}}:
   {status:409,body:{error:result.error}};
 }catch(_){return {status:503,body:{error:'RECEIPT_VERIFICATION_UNAVAILABLE'}};}
}
