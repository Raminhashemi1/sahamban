'use strict';
// Isolated synthetic staging policy. Not wired into app or production backend.
// Every channel remains disabled regardless of caller inputs or environment.
const PLAN_DAYS=Object.freeze([30,60,90,180,365]);
const CHANNELS=Object.freeze(['CAFEBAZAAR','MYKET','GOOGLE_PLAY','WEB_DIRECT']);
const CHANNEL_POLICY=Object.freeze(Object.fromEntries(CHANNELS.map(channel=>[
 channel,Object.freeze({
  channel,
  purchaseEnabled:false,
  realEntitlementEnabled:false,
  providerVerificationEnabled:false,
  currencyAndPriceVerified:false,
  availablePlanDays:PLAN_DAYS,
  stage:'RESEARCH_AND_SYNTHETIC_TEST_ONLY'
 })
])));
function channelPolicy(channel){
 if(typeof channel!=='string'||!Object.hasOwn(CHANNEL_POLICY,channel))
  return Object.freeze({allowed:false,purchaseEnabled:false,reason:'UNKNOWN_BUILD_CHANNEL'});
 return CHANNEL_POLICY[channel];
}
function assertBuildChannel(buildChannel,requestedChannel){
 const policy=channelPolicy(buildChannel);
 if(!policy.channel)throw new Error('UNKNOWN_BUILD_CHANNEL');
 if(requestedChannel!==buildChannel)throw new Error('CROSS_CHANNEL_BILLING_DENIED');
 return Object.freeze({channel:buildChannel,allowed:true,purchaseEnabled:false,
  reason:'STAGING_BILLING_DISABLED'});
}
function requestCheckout(buildChannel,requestedChannel,planDays){
 const check=assertBuildChannel(buildChannel,requestedChannel);
 if(!PLAN_DAYS.includes(planDays))throw new Error('UNSUPPORTED_PLAN_DURATION');
 return Object.freeze({...check,planDays,approvedPayment:false,realEntitlement:false});
}
module.exports=Object.freeze({PLAN_DAYS,CHANNELS,CHANNEL_POLICY,channelPolicy,assertBuildChannel,requestCheckout});
