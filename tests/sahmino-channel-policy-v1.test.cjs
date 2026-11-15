'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {PLAN_DAYS,CHANNELS,CHANNEL_POLICY,channelPolicy,assertBuildChannel,requestCheckout}=
 require('../billing/staging/sahmino-channel-policy-v1.cjs');
test('exact owner-approved durations and four channels',()=>{
 assert.deepEqual(PLAN_DAYS,[30,60,90,180,365]);
 assert.deepEqual(CHANNELS,['CAFEBAZAAR','MYKET','GOOGLE_PLAY','WEB_DIRECT']);
 assert.equal(PLAN_DAYS.includes(270),false);
});
test('each channel remains fail-closed even with a selected plan',()=>{
 for(const channel of CHANNELS)for(const days of PLAN_DAYS){
  const result=requestCheckout(channel,channel,days);
  assert.equal(result.purchaseEnabled,false);
  assert.equal(result.approvedPayment,false);
  assert.equal(result.realEntitlement,false);
 }
});
test('cross-store purchase attempts fail closed',()=>{
 for(const build of CHANNELS)for(const requested of CHANNELS){
  if(requested===build)continue;
  assert.throws(()=>requestCheckout(build,requested,30),/CROSS_CHANNEL_BILLING_DENIED/);
 }
});
test('unknown build channel and prototype chain property names rejected',()=>{
 for(const channel of [null,undefined,'', 'PLAY','__proto__','constructor','prototype']){
  assert.equal(channelPolicy(channel).purchaseEnabled,false);
  assert.throws(()=>assertBuildChannel(channel,channel),/UNKNOWN_BUILD_CHANNEL/);
 }
});
test('unknown subscription duration fails without generating authorization',()=>{
 for(const days of [0,1,29,270,366,'30',NaN,Infinity,null]){
  assert.throws(()=>requestCheckout('MYKET','MYKET',days),/UNSUPPORTED_PLAN_DURATION/);
 }
});
test('policy is immutable and has no enabled verification adapters',()=>{
 assert.equal(Object.isFrozen(CHANNEL_POLICY),true);
 for(const channel of CHANNELS){
  const p=channelPolicy(channel);
  assert.equal(Object.isFrozen(p),true);
  assert.equal(p.providerVerificationEnabled,false);
  assert.equal(p.realEntitlementEnabled,false);
  assert.equal(p.currencyAndPriceVerified,false);
 }
});
test('build identity does not derive from mutable installer or user setting',()=>{
 assert.equal(requestCheckout('WEB_DIRECT','WEB_DIRECT',30).channel,'WEB_DIRECT');
 assert.throws(()=>requestCheckout('WEB_DIRECT','GOOGLE_PLAY',30),/CROSS_CHANNEL_BILLING_DENIED/);
});
