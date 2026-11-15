'use strict';
// Four-channel STORE-EVIDENCE RECONCILIATION for offline/synthetic tests.
// Transport is injected; NO live credentials or real provider calls are present.
// A matching response is *never* payment authority: real grants require official
// provider authentication, merchant config, durable ledger and compliance review.
const {CHANNELS,PLAN_DAYS}=require('./sahmino-channel-policy-v1.cjs');
const REGEX=/^[A-Za-z0-9._-]{1,128}$/;
const fail=(channel,reason)=>Object.freeze({channel,reason,syntheticMatch:false,
 providerVerified:false,entitlementGranted:false,realEntitlement:false});
function createSyntheticProviderReconciler({channel,queryProvider}={}){
 if(!CHANNELS.includes(channel))throw new TypeError('INVALID_PROVIDER_CHANNEL');
 if(typeof queryProvider!=='function')throw new TypeError('PROVIDER_QUERY_REQUIRED');
 return Object.freeze({async reconcile({principal,expected,purchaseToken}={}){
  if(!principal||principal.authenticated!==true||
     typeof principal.subject!=='string'||principal.subject.length===0)
   return fail(channel,'UNAUTHENTICATED');
  if(!expected||typeof expected!=='object'||expected.channel!==channel||
     !PLAN_DAYS.includes(expected.planDays)||!REGEX.test(expected.productId||'')||
     !REGEX.test(expected.packageId||'')||
     typeof expected.accountId!=='string'||!REGEX.test(expected.accountId)||
     expected.accountId!==principal.subject)
   return fail(channel,'INVALID_SERVER_ORDER');
  if(typeof purchaseToken!=='string'||purchaseToken.length<8||purchaseToken.length>4096)
   return fail(channel,'INVALID_RECEIPT');
  if(channel==='WEB_DIRECT'&&(!REGEX.test(expected.orderId||'')||
     !Number.isSafeInteger(expected.amountMinor)||
     expected.amountMinor<=0||typeof expected.currency!=='string'||
     !/^[A-Z]{3}$/.test(expected.currency)))
   return fail(channel,'INVALID_SERVER_PRICE');
  let evidence;
  try{
   // The injected function is a test stub until an independently reviewed
   // provider-specific signed API client authenticates the evidence.
   evidence=await queryProvider({channel,productId:expected.productId,
    packageId:expected.packageId,purchaseToken});
  }catch{return fail(channel,'PROVIDER_QUERY_UNAVAILABLE');}
  if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))
   return fail(channel,'MALFORMED_PROVIDER_EVIDENCE');
  if(evidence.channel!==channel||evidence.packageId!==expected.packageId||
     evidence.productId!==expected.productId||
     typeof evidence.purchaseId!=='string'||!REGEX.test(evidence.purchaseId))
   return fail(channel,'RECEIPT_IDENTITY_MISMATCH');
  // Contradictory synthetic lifecycle flags must never pass comparison,
  // even if an injected mock reports SETTLED. This is not provider verification.
  // If a lifecycle flag is present, only an explicit boolean false is safe.
  // Strings, numbers, null, and true are ambiguous and fail closed.
  const negativeFlags=['refunded','revoked','chargeback','cancelled','pending'];
  if(evidence.status!=='SETTLED'||
     negativeFlags.some(flag=>Object.hasOwn(evidence,flag)&&evidence[flag]!==false))
   return fail(channel,'NOT_SETTLED');
  if(channel==='WEB_DIRECT'&&
    (evidence.orderId!==expected.orderId||
     evidence.amountMinor!==expected.amountMinor||
     evidence.currency!==expected.currency))
   return fail(channel,'WEB_AMOUNT_OR_ORDER_MISMATCH');
  // Evidence comparison is not an official provider verification. Never issue
  // a trusted verification marker that could be confused with real entitlement.
  return Object.freeze({channel,reason:'SYNTHETIC_MATCH_NOT_VERIFICATION',
   syntheticMatch:true,providerVerified:false,entitlementGranted:false,
   realEntitlement:false});
 }});
}
module.exports=Object.freeze({createSyntheticProviderReconciler});
