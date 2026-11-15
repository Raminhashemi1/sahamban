'use strict';
// Official Myket server-to-server purchase-check endpoint, READ ONLY.
// Ref: https://myket.ir/docs/technical/services/purchase-validation/
// Server X-Access-Token MUST come from authorized secret storage.
// No consumption, durable grant or real entitlement is issued here.
const {createHash}=require('node:crypto');
const BASE='https://developer.myket.ir/api/partners/applications/';
const PACKAGE=/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/;
const SKU=/^[A-Za-z0-9._-]{3,128}$/;
const result=(reason,extra={})=>Object.freeze({channel:'MYKET',
 status:'NOT_VERIFIED',providerVerified:false,realEntitlement:false,
 entitlementGranted:false,reason,...extra});
function createMyketReadOnlyClient({packageName,getAccessToken,fetchImpl}={}){
 if(typeof packageName!=='string'||!PACKAGE.test(packageName))
  throw new TypeError('INVALID_MYKET_PACKAGE');
 if(typeof getAccessToken!=='function'||typeof fetchImpl!=='function')
  throw new TypeError('MYKET_SERVER_AUTH_AND_FETCH_REQUIRED');
 return Object.freeze({async query({sku,purchaseToken,expectedPayload}={}){
  if(typeof sku!=='string'||!SKU.test(sku)||
    typeof purchaseToken!=='string'||purchaseToken.length<8||
    purchaseToken.length>4096||(
     expectedPayload!==undefined&&(typeof expectedPayload!=='string'||
      expectedPayload.length<8||expectedPayload.length>256)))
   return result('INVALID_MYKET_PURCHASE');
  let token;
  try{token=await getAccessToken();}
  catch{return result('MYKET_AUTH_UNAVAILABLE');}
  if(typeof token!=='string'||token.length<12||token.length>8192)
   return result('MYKET_AUTH_UNAVAILABLE');
  const url=BASE+encodeURIComponent(packageName)+'/purchases/products/'+
   encodeURIComponent(sku)+'/verify';
  let response;
  try{
   const http=await fetchImpl(url,{method:'POST',redirect:'error',
    headers:{'X-Access-Token':token,'Content-Type':'application/json',
     Accept:'application/json'},
    body:JSON.stringify({tokenId:purchaseToken}),
    signal:AbortSignal.timeout(10000)});
   if(!http||http.ok!==true)return result('MYKET_REQUEST_NOT_OK');
   const raw=await http.text();
   if(typeof raw!=='string'||raw.length>65536)return result('MYKET_RESPONSE_TOO_LARGE');
   response=JSON.parse(raw);
  }catch{return result('MYKET_QUERY_FAILED');}
  if(!response||typeof response!=='object'||Array.isArray(response))
   return result('MYKET_RESPONSE_INVALID');
  if(response.kind!=='androidpublisher#productPurchase'||
     response.purchaseState!==0)
   return result('MYKET_NOT_PURCHASED');
  if(!Number.isSafeInteger(response.purchaseTime)||response.purchaseTime<=0)
   return result('MYKET_PURCHASE_TIME_INVALID');
  if(response.consumptionState!==0&&response.consumptionState!==1)
   return result('MYKET_CONSUMPTION_UNKNOWN');
  if(expectedPayload!==undefined&&response.developerPayload!==expectedPayload)
   return result('MYKET_PAYLOAD_MISMATCH');
  // Official Myket sample does NOT return orderId/productId. The server
  // request binds sku+package; token digest is only an idempotency candidate.
  // A read-only response cannot independently bind the account or grant access.
  const tokenFingerprint=createHash('sha256').update(packageName+'\0'+sku+'\0'+purchaseToken)
   .digest('hex');
  return result('MYKET_READ_ONLY_DURABLE_REVIEW_REQUIRED',{
   status:'SETTLED',sku,purchaseId:'myket_'+tokenFingerprint,
   consumed:response.consumptionState===1});
 }});
}
function asFourChannelQuery(client){
 if(!client||typeof client.query!=='function')throw new TypeError('MYKET_CLIENT_REQUIRED');
 return async ({channel,sku,receipt}={})=>
  channel==='MYKET'?client.query({sku,purchaseToken:receipt}):
   result('MYKET_CROSS_CHANNEL');
}
module.exports=Object.freeze({createMyketReadOnlyClient,asFourChannelQuery});