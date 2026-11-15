'use strict';
// Server-owned provider connector boundary. No live merchant API or entitlement grant.
// queryOfficialProvider must be an independently reviewed authenticated backend client.
const {CHANNELS,PLAN_DAYS}=require('./sahmino-channel-policy-v1.cjs');
const ID=/^[A-Za-z0-9._-]{3,128}$/;
const ACCOUNT=/^[A-Za-z0-9:_-]{1,128}$/;
const deny=(channel,reason)=>Object.freeze({channel,reason,connected:false,
 providerVerified:false,entitlementGranted:false,realEntitlement:false,checkoutEnabled:false});
function makeProviderConnectionGate({channel,catalog,merchantApproved=false,queryOfficialProvider}={}){
 if(!CHANNELS.includes(channel))throw new TypeError('UNKNOWN_CHANNEL');
 if(!Array.isArray(catalog)||catalog.length!==PLAN_DAYS.length)throw new TypeError('INVALID_CATALOG');
 const byDay=new Map(),skus=new Set();
 for(const item of catalog){
  if(!item||!PLAN_DAYS.includes(item.days)||byDay.has(item.days)||
    typeof item.sku!=='string'||!ID.test(item.sku)||skus.has(item.sku)||
    !Number.isSafeInteger(item.priceMinor)||item.priceMinor<=0||
    typeof item.currency!=='string'||!/^[A-Z]{3}$/.test(item.currency))
   throw new TypeError('INVALID_CATALOG');
  byDay.set(item.days,Object.freeze({...item}));skus.add(item.sku);
 }
 if(PLAN_DAYS.some(days=>!byDay.has(days)))throw new TypeError('INVALID_CATALOG');
 if(queryOfficialProvider!==undefined&&typeof queryOfficialProvider!=='function')
  throw new TypeError('INVALID_PROVIDER_CLIENT');
 return Object.freeze({channel,planDays:PLAN_DAYS,async check({principal,serverOrder,receipt}={}){
  if(!principal||principal.authenticated!==true||!ACCOUNT.test(principal.subject||'')||
   ['__proto__','constructor','prototype'].includes(principal.subject))
   return deny(channel,'AUTH_REQUIRED');
  if(!serverOrder||typeof serverOrder!=='object'||Array.isArray(serverOrder)||
   serverOrder.channel!==channel||serverOrder.accountId!==principal.subject||
   !PLAN_DAYS.includes(serverOrder.planDays))
   return deny(channel,'INVALID_SERVER_ORDER');
  const product=byDay.get(serverOrder.planDays);
  if(!product||serverOrder.sku!==product.sku||
   serverOrder.priceMinor!==product.priceMinor||serverOrder.currency!==product.currency)
   return deny(channel,'SERVER_CATALOG_MISMATCH');
  if(channel==='WEB_DIRECT'&&(!ID.test(serverOrder.orderId||'')||
   !ID.test(serverOrder.merchantId||'')))
   return deny(channel,'INVALID_WEB_ORDER');
  if(typeof receipt!=='string'||receipt.length<8||receipt.length>4096)
   return deny(channel,'INVALID_RECEIPT');
  if(merchantApproved!==true||!queryOfficialProvider)
   return deny(channel,'OFFICIAL_PROVIDER_NOT_CONFIGURED');
  let evidence;
  try{evidence=await queryOfficialProvider(Object.freeze({channel,sku:product.sku,
   receipt,orderId:channel==='WEB_DIRECT'?serverOrder.orderId:undefined}));}
  catch{return deny(channel,'OFFICIAL_PROVIDER_QUERY_FAILED');}
  // A matching callback alone is NEVER proof of provider authenticity.
  if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))
   return deny(channel,'INVALID_PROVIDER_RESPONSE');
  if(evidence.status!=='SETTLED'||evidence.channel!==channel||
   evidence.sku!==product.sku||typeof evidence.purchaseId!=='string'||
   !ID.test(evidence.purchaseId)||
   ['refunded','revoked','pending','chargeback'].some(flag=>
    Object.hasOwn(evidence,flag)&&evidence[flag]!==false))
   return deny(channel,'PROVIDER_RESPONSE_NOT_ACCEPTED');
  if(channel==='WEB_DIRECT'&&(evidence.orderId!==serverOrder.orderId||
    evidence.priceMinor!==product.priceMinor||evidence.currency!==product.currency))
   return deny(channel,'WEB_ORDER_NOT_VERIFIED');
  return Object.freeze({...deny(channel,'PROVIDER_RESPONSE_REQUIRES_DURABLE_REVIEW'),
   evidenceMatched:true});
 }});
}
module.exports=Object.freeze({makeProviderConnectionGate});