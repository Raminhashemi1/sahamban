'use strict';
// Read-only Google Play Developer API v3 /purchases/productsv2 verifier.
// No billing client SDK, checkout, acknowledgement, consumption or entitlement grant.
// OAuth token is injected by a server-owned credential provider, never stored here.
// Source: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.productsv2/getproductpurchasev2
const API='https://androidpublisher.googleapis.com/androidpublisher/v3/applications/';
const PACKAGE=/^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
const SKU=/^[A-Za-z0-9._-]{3,128}$/;
function createGooglePlayReadOnlyClient({packageName,getAccessToken,fetchImpl}={}){
 if(typeof packageName!=='string'||!PACKAGE.test(packageName))
  throw new TypeError('INVALID_PLAY_PACKAGE');
 if(typeof getAccessToken!=='function'||typeof fetchImpl!=='function')
  throw new TypeError('PLAY_SERVER_AUTH_AND_FETCH_REQUIRED');
 const fail=reason=>Object.freeze({channel:'GOOGLE_PLAY',status:'NOT_VERIFIED',
  providerVerified:false,realEntitlement:false,reason});
 return Object.freeze({async query({purchaseToken,sku}={}){
  if(typeof sku!=='string'||!SKU.test(sku)||
   typeof purchaseToken!=='string'||purchaseToken.length<8||purchaseToken.length>4096)
   return fail('INVALID_PLAY_PURCHASE');
  let accessToken;
  try{accessToken=await getAccessToken();}
  catch{return fail('PLAY_AUTH_UNAVAILABLE');}
  if(typeof accessToken!=='string'||accessToken.length<12||accessToken.length>8192)
   return fail('PLAY_AUTH_UNAVAILABLE');
  const endpoint=API+encodeURIComponent(packageName)+'/purchases/productsv2/tokens/'+
   encodeURIComponent(purchaseToken);
  let data;
  try{
   const response=await fetchImpl(endpoint,{method:'GET',redirect:'error',
    headers:{Authorization:'Bearer '+accessToken,Accept:'application/json'},
    signal:AbortSignal.timeout(10000)});
   if(!response||response.ok!==true)return fail('PLAY_REQUEST_NOT_OK');
   const raw=await response.text();
   if(raw.length>65536)return fail('PLAY_RESPONSE_TOO_LARGE');
   data=JSON.parse(raw);
  }catch{return fail('PLAY_QUERY_FAILED');}
  if(!data||typeof data!=='object'||Array.isArray(data))
   return fail('PLAY_RESPONSE_INVALID');
  if(data.purchaseStateContext?.purchaseState!=='PURCHASED')
   return fail('PLAY_NOT_PURCHASED');
  const items=data.productLineItem;
  if(!Array.isArray(items)||items.length!==1||items[0]?.productId!==sku)
   return fail('PLAY_PRODUCT_MISMATCH');
  if(items[0].productOfferDetails?.quantity!==undefined&&
     items[0].productOfferDetails.quantity!==1)
   return fail('PLAY_UNSUPPORTED_QUANTITY');
  if(typeof data.orderId!=='string'||data.orderId.length<5||
     data.orderId.length>128||!/^[A-Za-z0-9._-]+$/.test(data.orderId))
   return fail('PLAY_ORDER_MISSING');
  // The backend caller must still bind the verified order to its own account,
  // persist a unique provider-qualified purchase and reconcile voided purchases.
  // This query never acknowledges, consumes or credits a subscription.
  return Object.freeze({channel:'GOOGLE_PLAY',status:'SETTLED',sku,
   purchaseId:data.orderId,providerVerified:false,realEntitlement:false,
   reason:'PLAY_API_READ_ONLY_DURABLE_LEDGER_REQUIRED'});
 }});
}
function asFourChannelQuery(client){
 if(!client||typeof client.query!=='function')throw new TypeError('PLAY_CLIENT_REQUIRED');
 return async ({channel,sku,receipt}={})=>{
  if(channel!=='GOOGLE_PLAY')return Object.freeze({status:'NOT_VERIFIED',channel:'GOOGLE_PLAY',
   providerVerified:false,realEntitlement:false,reason:'PLAY_CROSS_CHANNEL'});
  return client.query({sku,purchaseToken:receipt});
 };
}
module.exports=Object.freeze({createGooglePlayReadOnlyClient,asFourChannelQuery});