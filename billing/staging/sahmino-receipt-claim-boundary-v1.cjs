'use strict';
// FAIL-CLOSED staging boundary for *unverified claims*, not a receipt verifier.
// Deliberately NEVER turns a client claim into a paid entitlement.
// Provider adapters, credentials, and database access are not implemented here.
const {CHANNELS,PLAN_DAYS}=require('./sahmino-channel-policy-v1.cjs');
const own=(obj,key)=>obj!==null&&typeof obj==='object'&&Object.hasOwn(obj,key);
function validateClaim(claim,authenticatedPrincipal,buildChannel){
 const failure=reason=>Object.freeze({acceptedForVerification:false,
  providerVerified:false,entitlementGranted:false,reason});
 if(!authenticatedPrincipal||typeof authenticatedPrincipal!=='object'||
    authenticatedPrincipal.authenticated!==true||
    typeof authenticatedPrincipal.subject!=='string'||
    !/^[a-zA-Z0-9:_-]{1,128}$/.test(authenticatedPrincipal.subject))
  return failure('UNAUTHENTICATED');
 if(!CHANNELS.includes(buildChannel))return failure('UNKNOWN_BUILD_CHANNEL');
 if(!claim||typeof claim!=='object'||Array.isArray(claim))
  return failure('INVALID_CLAIM');
 // Never let the requester supply trusted result flags or user identity.
 for(const k of ['accountId','userId','subject','paymentVerified','providerVerified',
  'approved','entitlementGranted','isPremium','expiresAtUtc','fixtureResult',
  'amount','price','currency']){
  if(own(claim,k))return failure('CLIENT_TRUST_ASSERTION_FORBIDDEN');
 }
 if(!own(claim,'channel')||claim.channel!==buildChannel)
  return failure('CROSS_CHANNEL_OR_MISSING');
 if(!own(claim,'planDays')||!PLAN_DAYS.includes(claim.planDays))
  return failure('INVALID_PLAN');
 if(!own(claim,'purchaseToken')||
  typeof claim.purchaseToken!=='string'||claim.purchaseToken.length<8||
  claim.purchaseToken.length>4096)
  return failure('INVALID_TOKEN_FORMAT');
 if(!own(claim,'productId')||typeof claim.productId!=='string'||
  !/^[A-Za-z0-9._-]{1,128}$/.test(claim.productId))
  return failure('INVALID_PRODUCT_ID');
 // Even syntactically valid requests are not verified without an independent
 // server-to-provider call AND durable account-bound ledger transaction.
 return failure('PROVIDER_ADAPTER_DISABLED');
}
module.exports=Object.freeze({validateClaim});
