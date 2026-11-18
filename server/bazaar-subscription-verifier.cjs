'use strict';
// Trusted CafeBazaar Subscription verifier. Never accepts client-supplied price,
// plan or account identity; those values come from the authenticated D1 order.
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const ORDER=/^ord_[a-f0-9]{32}$/;
const TOKEN=/^[^\s]{16,4096}$/;
const SKU=/^[A-Za-z0-9._-]{1,128}$/;
const PACKAGE=/^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+){1,}$/;
const SKU_BY_PLAN=Object.freeze({SAHMINO_PRO_30D:'sahmino_pro_30d',SAHMINO_PRO_60D:'sahmino_pro_60d',SAHMINO_PRO_90D:'sahmino_pro_90d',SAHMINO_PRO_180D:'sahmino_pro_180d',SAHMINO_PRO_365D:'sahmino_pro_365d'});
function decodeBase64(value){
 if(typeof value!=='string'||!value||value.length>16384||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('INVALID_BASE64');
 const raw=atob(value);return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function publicKeyBytes(pem){
 if(typeof pem!=='string'||pem.length>8192)throw Error('INVALID_PUBLIC_KEY');
 const body=pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g,'');
 return decodeBase64(body);
}
function validReceipt(receipt,order,packageName,productId){
 if(!receipt||typeof receipt!=='object'||Array.isArray(receipt)||
  !receipt.orderId||!ID.test(receipt.orderId)||typeof receipt.purchaseToken!=='string'||!TOKEN.test(receipt.purchaseToken)||
  receipt.payload!==order.id||receipt.packageName!==packageName||receipt.productId!==productId||
  !Number.isSafeInteger(receipt.purchaseTime)||receipt.purchaseTime<=0||
  receipt.purchaseState!==0||typeof receipt.originalJson!=='string'||receipt.originalJson.length>16384||
  typeof receipt.dataSignature!=='string'||receipt.dataSignature.length>8192)return false;
 let raw;try{raw=JSON.parse(receipt.originalJson);}catch(_){return false;}
 return raw&&raw.orderId===receipt.orderId&&raw.purchaseToken===receipt.purchaseToken&&
  raw.developerPayload===order.id&&raw.packageName===packageName&&raw.productId===productId&&
  raw.purchaseState===0&&raw.purchaseTime===receipt.purchaseTime;
}
async function verifyBazaarSignature(receipt,publicKey){
 try{
  const key=await crypto.subtle.importKey('spki',publicKeyBytes(publicKey),
   {name:'RSASSA-PKCS1-v1_5',hash:'SHA-1'},false,['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,
   decodeBase64(receipt.dataSignature),new TextEncoder().encode(receipt.originalJson));
 }catch(_){return false;}
}
async function sha256Hex(value){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
async function verifyBazaarSubscription({receipt,order,packageName,clientId,clientSecret,refreshToken,publicKey,now,fetchImpl=fetch}={}){
 if(!order||typeof order!=='object'||order.state!=='PENDING'||typeof order.id!=='string'||!ORDER.test(order.id)||
  typeof order.plan_id!=='string'||!SKU_BY_PLAN[order.plan_id]||!Number.isSafeInteger(order.amount_rial)||order.amount_rial<=0||
  order.currency!=='IRR'||typeof packageName!=='string'||!PACKAGE.test(packageName)||
  typeof clientId!=='string'||!clientId||typeof clientSecret!=='string'||!clientSecret||
  typeof refreshToken!=='string'||!refreshToken||typeof publicKey!=='string'||!publicKey||
  !Number.isFinite(Date.parse(now)))return {ok:false,reason:'BAZAAR_VERIFIER_NOT_CONFIGURED'};
 const productId=SKU_BY_PLAN[order.plan_id];
 if(!validReceipt(receipt,order,packageName,productId))return {ok:false,reason:'RECEIPT_ORDER_MISMATCH'};
 if(!await verifyBazaarSignature(receipt,publicKey))return {ok:false,reason:'RECEIPT_SIGNATURE_INVALID'};
 try{
  const form=new URLSearchParams({grant_type:'refresh_token',client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken});
  const tokenResponse=await fetchImpl('https://pardakht.cafebazaar.ir/devapi/v2/auth/token/',{
   method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form.toString()
  });
  if(!tokenResponse?.ok)return {ok:false,reason:'BAZAAR_OAUTH_FAILED'};
  const tokenBody=await tokenResponse.json();
  if(!tokenBody||typeof tokenBody.access_token!=='string'||!tokenBody.access_token||
   !Number.isSafeInteger(tokenBody.expires_in)||tokenBody.expires_in<=0)return {ok:false,reason:'BAZAAR_OAUTH_INVALID'};
  const url='https://pardakht.cafebazaar.ir/devapi/v2/api/applications/'+
   encodeURIComponent(packageName)+'/subscriptions/'+encodeURIComponent(productId)+
   '/purchases/'+encodeURIComponent(receipt.purchaseToken)+'/?access_token='+encodeURIComponent(tokenBody.access_token);
  const response=await fetchImpl(url,{method:'GET',headers:{'Accept':'application/json'}});
  if(!response?.ok)return {ok:false,reason:'BAZAAR_VALIDATION_FAILED'};
  const body=await response.json();
  const expiry=body?.validUntilTimestampMsec,started=body?.initiationTimestampMsec;
  if(!Number.isSafeInteger(expiry)||expiry<=Date.parse(now)||!Number.isSafeInteger(started)||
   started<=0||started>expiry||typeof body.autoRenewing!=='boolean')
   return {ok:false,reason:'BAZAAR_SUBSCRIPTION_INVALID'};
  const providerPaymentId=await sha256Hex(receipt.purchaseToken);
  return {ok:true,verified:{
   providerName:'cafebazaar',providerEventId:receipt.orderId,providerPaymentId,
   orderId:order.id,planId:order.plan_id,amountRial:order.amount_rial,currency:'IRR',
   validUntilTimestampMsec:expiry,autoRenewing:body.autoRenewing,
   initiationTimestampMsec:started
  }};
 }catch(_){return {ok:false,reason:'BAZAAR_VALIDATION_UNAVAILABLE'};}
}
module.exports=Object.freeze({verifyBazaarSubscription,verifyBazaarSignature,validReceipt,decodeBase64,SKU_BY_PLAN});
