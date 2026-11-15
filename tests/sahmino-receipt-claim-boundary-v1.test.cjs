'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {validateClaim}=require('../billing/staging/sahmino-receipt-claim-boundary-v1.cjs');
const principal=Object.freeze({authenticated:true,subject:'verified-session-subject'});
const valid={channel:'MYKET',planDays:30,productId:'sahmino_30',purchaseToken:'synthetic-not-a-real-token'};
const inspect=(claim=valid,auth=principal,channel='MYKET')=>validateClaim(claim,auth,channel);
test('syntactically valid claim is NOT verified or granted when adapters disabled',()=>{
 const r=inspect();
 assert.equal(r.reason,'PROVIDER_ADAPTER_DISABLED');
 assert.equal(r.providerVerified,false);
 assert.equal(r.entitlementGranted,false);
 assert.equal(r.acceptedForVerification,false);
 assert.equal(Object.hasOwn(r,'purchaseToken'),false);
 assert.equal(Object.hasOwn(r,'subject'),false);
});
test('all four channels and five durations remain disabled, not a mock approval',()=>{
 for(const channel of ['CAFEBAZAAR','MYKET','GOOGLE_PLAY','WEB_DIRECT'])
  for(const planDays of [30,60,90,180,365]){
   const r=inspect({...valid,channel,planDays},principal,channel);
   assert.equal(r.reason,'PROVIDER_ADAPTER_DISABLED');
   assert.equal(r.entitlementGranted,false);
  }
});
test('rejects unauthenticated and forged identities',()=>{
 assert.equal(inspect(valid,null).reason,'UNAUTHENTICATED');
 assert.equal(inspect(valid,{authenticated:false,subject:'alice'}).reason,'UNAUTHENTICATED');
 assert.equal(inspect(valid,{authenticated:true,subject:''}).reason,'UNAUTHENTICATED');
 for(const key of ['accountId','userId','subject','isPremium','paymentVerified',
  'providerVerified','approved','entitlementGranted','expiresAtUtc','fixtureResult',
  'amount','price','currency']){
  assert.equal(inspect({...valid,[key]:key==='paymentVerified'?true:'forged'}).reason,
   'CLIENT_TRUST_ASSERTION_FORBIDDEN');
 }
});
test('cross-channel request and unknown channel fail closed',()=>{
 assert.equal(inspect({...valid,channel:'GOOGLE_PLAY'}).reason,'CROSS_CHANNEL_OR_MISSING');
 assert.equal(inspect(valid,principal,'UNKNOWN').reason,'UNKNOWN_BUILD_CHANNEL');
 assert.equal(inspect({...valid,channel:'__proto__'}).reason,'CROSS_CHANNEL_OR_MISSING');
});
test('rejects malformed plan, token, and product ID',()=>{
 for(const planDays of [270,0,1,'30',null,366]){
  assert.equal(inspect({...valid,planDays}).reason,'INVALID_PLAN');
 }
 for(const purchaseToken of ['x',null,{},'x'.repeat(4097)]){
  assert.equal(inspect({...valid,purchaseToken}).reason,'INVALID_TOKEN_FORMAT');
 }
 for(const productId of ['','bad path /',null,{},'x'.repeat(129)]){
  assert.equal(inspect({...valid,productId}).reason,'INVALID_PRODUCT_ID');
 }
});
test('does not echo purchase tokens or claim verification outcome',()=>{
 const token='synthetic-not-a-real-token';
 const r=inspect({...valid,purchaseToken:token,providerVerified:true});
 assert.equal(r.entitlementGranted,false);
 assert.equal(r.providerVerified,false);
 assert.equal(JSON.stringify(r).includes(token),false);
});
