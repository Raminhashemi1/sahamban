'use strict';
// RELEASE-BLOCKING CONTRACT: four channels, exactly five fixed durations.
// This test does not activate payment or approve shipment.
const test=require('node:test');
const assert=require('node:assert/strict');
const {CHANNELS,PLAN_DAYS,requestCheckout,CHANNEL_POLICY}=require('../billing/staging/sahmino-channel-policy-v1.cjs');
const {validateClaim}=require('../billing/staging/sahmino-receipt-claim-boundary-v1.cjs');
const {createStagingServer}=require('../server/sahmino-staging-server.cjs');
const approved=['CAFEBAZAAR','MYKET','GOOGLE_PLAY','WEB_DIRECT'];
const durations=[30,60,90,180,365];
test('release matrix has exactly four channels and exactly five fixed-day plans',()=>{
 assert.deepEqual(CHANNELS,approved);
 assert.deepEqual(PLAN_DAYS,durations);
 assert.equal(PLAN_DAYS.includes(270),false);
});
test('all 20 channel-plan entries remain synthetically fail-closed',()=>{
 for(const channel of approved)for(const planDays of durations){
  const result=requestCheckout(channel,channel,planDays);
  assert.equal(result.purchaseEnabled,false);
  assert.equal(result.approvedPayment,false);
  assert.equal(result.realEntitlement,false);
  assert.equal(CHANNEL_POLICY[channel].providerVerificationEnabled,false);
 }
});
test('a channel cannot charge through another channel',()=>{
 for(const source of approved)for(const target of approved){
  if(source!==target)
   assert.throws(()=>requestCheckout(source,target,30),/CROSS_CHANNEL_BILLING_DENIED/);
 }
});
test('unverified receipt never grants access even with plausible claim',()=>{
 const principal={authenticated:true,subject:'synthetic-only'};
 for(const channel of approved){
  const r=validateClaim({channel,planDays:30,productId:'synthetic30',
   purchaseToken:'synthetic-not-a-real-receipt'},principal,channel);
  assert.equal(r.entitlementGranted,false);
  assert.equal(r.providerVerified,false);
  assert.equal(r.reason,'PROVIDER_ADAPTER_DISABLED');
 }
});
test('test server can never change the release gate into a payment approval',async()=>{
 const server=createStagingServer({buildChannel:'WEB_DIRECT',
  verifySession:async()=>({authenticated:true,subject:'synthetic-only'})});
 assert.equal(server.listening,false);
 assert.throws(()=>server.listen(0,'0.0.0.0'),/STAGING_LOOPBACK_ONLY/);
});
