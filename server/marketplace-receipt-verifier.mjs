'use strict';
// Server-only CafeBazaar/Myket receipt verification. No client-supplied price,
// account ID, entitlement, or provider "success" flag is trusted.
import prepaidModule from './prepaid-plans.cjs';
const {plan}=prepaidModule;
const PACKAGE='ir.manahesab.sahmino';
const PROVIDERS=Object.freeze({MYKET:'MYKET',CAFEBAZAAR:'CAFEBAZAAR'});
const PLAN_SUFFIX=Object.freeze({
 SAHMINO_PRO_30D:'30D',SAHMINO_PRO_60D:'60D',SAHMINO_PRO_90D:'90D',
 SAHMINO_PRO_180D:'180D',SAHMINO_PRO_365D:'365D'
});
function decodeBase64(value){
 if(typeof value!=='string'||value.length>8192||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw new Error('INVALID_BASE64');
 const raw=atob(value);
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function encodeHex(bytes){
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
async function digest(value){
 return encodeHex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
}
function expectedSku(env,provider,planId){
 const suffix=PLAN_SUFFIX[planId],key=provider+'_SKU_'+suffix;
 const value=env?.[key];
 if(typeof value!=='string'||!value.trim()||value.length>128||/[\s]/.test(value))throw new Error('STORE_SKU_NOT_CONFIGURED');
 return value.trim();
}
function parsePurchaseTime(value){
 let n;
 if(typeof value==='number'&&Number.isSafeInteger(value))n=value;
 else if(typeof value==='string'&&value.length<=64)n=Date.parse(value);
 else return null;
 if(!Number.isFinite(n)||n<=0||n>Date.now()+300000)return null;
 return new Date(n).toISOString();
}
async function verifyMyket(env,body,order){
 const publicKey=env?.MYKET_IAB_PUBLIC_KEY;
 if(typeof publicKey!=='string'||publicKey.length<100||publicKey.length>4096)throw new Error('MYKET_KEY_NOT_CONFIGURED');
 if(typeof body.originalJson!=='string'||!body.originalJson||body.originalJson.length>16384||
    typeof body.signature!=='string'||!body.signature||body.signature.length>8192)throw new Error('INVALID_MYKET_RECEIPT');
 let purchase;
 try{purchase=JSON.parse(body.originalJson);}catch(_){throw new Error('INVALID_MYKET_JSON');}
 if(!purchase||typeof purchase!=='object'||Array.isArray(purchase))throw new Error('INVALID_MYKET_JSON');
 const publicBytes=decodeBase64(publicKey.trim());
 const key=await crypto.subtle.importKey('spki',publicBytes,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-1'},false,['verify']);
 const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decodeBase64(body.signature),new TextEncoder().encode(body.originalJson));
 if(!valid)throw new Error('MYKET_SIGNATURE_INVALID');
 const sku=expectedSku(env,PROVIDERS.MYKET,order.plan_id);
 if(purchase.packageName!==PACKAGE||purchase.productId!==sku||purchase.purchaseState!==0||
    purchase.developerPayload!==order.id)throw new Error('MYKET_PURCHASE_MISMATCH');
 const paidAt=parsePurchaseTime(purchase.purchaseTime);
 if(!paidAt)throw new Error('MYKET_PURCHASE_TIME_INVALID');
 const rawPayment=typeof purchase.purchaseToken==='string'&&purchase.purchaseToken?
  purchase.purchaseToken:(typeof purchase.orderId==='string'&&purchase.orderId?purchase.orderId:null);
 if(!rawPayment||rawPayment.length>2048)throw new Error('MYKET_PAYMENT_ID_MISSING');
 const paymentId=await digest('MYKET:'+rawPayment);
 return {providerName:PROVIDERS.MYKET,providerEventId:await digest('MYKET:event:'+rawPayment),
  providerPaymentId:paymentId,orderId:order.id,planId:order.plan_id,
  amountRial:order.amount_rial,currency:'IRR',paidAt};
}
async function verifyBazaar(env,body,order){
 const clientId=env?.BAZAAR_CLIENT_ID,clientSecret=env?.BAZAAR_CLIENT_SECRET,refreshToken=env?.BAZAAR_REFRESH_TOKEN;
 if([clientId,clientSecret,refreshToken].some(v=>typeof v!=='string'||!v.trim()))throw new Error('BAZAAR_CREDENTIALS_NOT_CONFIGURED');
 if(typeof body.purchaseToken!=='string'||!body.purchaseToken||body.purchaseToken.length>4096)throw new Error('INVALID_BAZAAR_TOKEN');
 const sku=expectedSku(env,PROVIDERS.CAFEBAZAAR,order.plan_id);
 const form=new URLSearchParams({grant_type:'refresh_token',client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken});
 const tokenResponse=await fetch('https://pardakht.cafebazaar.ir/devapi/v2/auth/token/',{
  method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form
 });
 if(!tokenResponse.ok)throw new Error('BAZAAR_TOKEN_REFRESH_FAILED');
 const tokenBody=await tokenResponse.json().catch(()=>null);
 if(!tokenBody||typeof tokenBody.access_token!=='string'||!tokenBody.access_token||
    (typeof tokenBody.token_type==='string'&&tokenBody.token_type.toLowerCase()!=='bearer'))throw new Error('BAZAAR_TOKEN_INVALID');
 const path='https://pardakht.cafebazaar.ir/devapi/v2/api/validate/'+
  encodeURIComponent(PACKAGE)+'/inapp/'+encodeURIComponent(sku)+'/purchases/'+
  encodeURIComponent(body.purchaseToken)+'/?access_token='+encodeURIComponent(tokenBody.access_token);
 const response=await fetch(path,{method:'GET',headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error('BAZAAR_PURCHASE_LOOKUP_FAILED');
 const purchase=await response.json().catch(()=>null);
 if(!purchase||purchase.purchaseState!==0||purchase.developerPayload!==order.id)
  throw new Error('BAZAAR_PURCHASE_MISMATCH');
 const paidAt=parsePurchaseTime(purchase.purchaseTime);
 if(!paidAt)throw new Error('BAZAAR_PURCHASE_TIME_INVALID');
 const paymentId=await digest('CAFEBAZAAR:'+body.purchaseToken);
 return {providerName:PROVIDERS.CAFEBAZAAR,providerEventId:await digest('CAFEBAZAAR:event:'+body.purchaseToken),
  providerPaymentId:paymentId,orderId:order.id,planId:order.plan_id,
  amountRial:order.amount_rial,currency:'IRR',paidAt};
}
async function verifyMarketplaceReceipt(env,body,order){
 if(!body||typeof body!=='object'||Array.isArray(body)||!order||
    typeof order.id!=='string'||typeof order.plan_id!=='string'||
    !Number.isSafeInteger(order.amount_rial)||order.currency!=='IRR'||order.state!=='PENDING')
  throw new Error('INVALID_ORDER');
 const selected=plan(order.plan_id);
 if(selected.priceRial!==order.amount_rial)throw new Error('ORDER_PRICE_MISMATCH');
 if(body.provider===PROVIDERS.MYKET&&Object.keys(body).sort().join(',')==='originalJson,provider,signature')
  return verifyMyket(env,body,order);
 if(body.provider===PROVIDERS.CAFEBAZAAR&&Object.keys(body).sort().join(',')==='provider,purchaseToken')
  return verifyBazaar(env,body,order);
 throw new Error('INVALID_RECEIPT_REQUEST');
}
export {verifyMarketplaceReceipt,PROVIDERS,expectedSku};
