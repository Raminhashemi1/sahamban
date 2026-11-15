'use strict';
// Four-channel provider boundary, isolated synthetic staging only.
// NO actual SDK/merchant credentials, checkout, provider network or grants.
// Adapter inputs are server-owned and never come from an HTTP request body.
const {CHANNELS,PLAN_DAYS}=require('./sahmino-channel-policy-v1.cjs');
const {validateClaim}=require('./sahmino-receipt-claim-boundary-v1.cjs');
const RESULT=Object.freeze({
 CAFEBAZAAR:'BAZAAR_VERIFY_NOT_CONNECTED',
 MYKET:'MYKET_VERIFY_NOT_CONNECTED',
 GOOGLE_PLAY:'PLAY_VERIFY_NOT_CONNECTED',
 WEB_DIRECT:'WEB_PSP_VERIFY_NOT_CONNECTED'
});
const REQUIRED=Object.freeze({
 CAFEBAZAAR:Object.freeze(['receiptStatus','packageId','productId','purchaseId']),
 MYKET:Object.freeze(['receiptStatus','packageId','productId','purchaseId']),
 GOOGLE_PLAY:Object.freeze(['purchaseState','packageId','productId','purchaseId']),
 WEB_DIRECT:Object.freeze(['paymentStatus','merchantOrderId','amountMinor','currency','purchaseId'])
});
function response(channel,reason){
 return Object.freeze({channel:CHANNELS.includes(channel)?channel:null,
  checkoutEnabled:false,providerVerified:false,realEntitlement:false,
  entitlementGranted:false,reason});
}
function createFourChannelVerifier({buildChannel}={}){
 if(!CHANNELS.includes(buildChannel))throw new TypeError('UNKNOWN_BUILD_CHANNEL');
 return Object.freeze({
  async check({claim,principal}={}){
   const valid=validateClaim(claim,principal,buildChannel);
   if(valid.reason!=='PROVIDER_ADAPTER_DISABLED')
    return response(buildChannel,valid.reason);
   // The response is *always* denial until a separately reviewed real provider
   // adapter, authenticated account, server-priced catalog and durable grant exist.
   return response(buildChannel,RESULT[buildChannel]);
  },
  providerFields:REQUIRED[buildChannel],
  allowedDays:PLAN_DAYS
 });
}
module.exports=Object.freeze({createFourChannelVerifier,RESULT,REQUIRED});
