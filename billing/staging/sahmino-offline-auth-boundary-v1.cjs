'use strict';
// SYNTHETIC ONLY: in-process request handler demonstration, never exposed as an API.
// Trust is injected by a SERVER-OWNED verifier. No network, no provider SDK.
// No verification success, no money, no entitlement, no persistent state.
const {validateClaim}=require('./sahmino-receipt-claim-boundary-v1.cjs');
function createOfflineReceiptBoundary({verifySession,buildChannel}={}){
 if(typeof verifySession!=='function'||typeof buildChannel!=='string')
  throw new TypeError('SERVER_OWNED_AUTH_CONFIGURATION_REQUIRED');
 return Object.freeze({
  async evaluate({authorization,claim}={}){
   const denied=(reason)=>Object.freeze({status:'DENIED',providerVerified:false,
    realEntitlement:false,reason});
   if(typeof authorization!=='string'||authorization.length>4096||authorization.length<8)
    return denied('NO_VALID_AUTHORIZATION');
   let principal;
   try {
    principal=await verifySession(authorization);
   } catch {
    return denied('SESSION_VERIFICATION_FAILED');
   }
   if(!principal||typeof principal!=='object'||principal.authenticated!==true||
      typeof principal.subject!=='string')
    return denied('SESSION_VERIFICATION_FAILED');
   const result=validateClaim(claim,principal,buildChannel);
   return denied(result.reason);
  }
 });
}
module.exports=Object.freeze({createOfflineReceiptBoundary});
