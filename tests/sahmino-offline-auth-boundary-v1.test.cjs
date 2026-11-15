'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createOfflineReceiptBoundary}=require('../billing/staging/sahmino-offline-auth-boundary-v1.cjs');
const authToken='synthetic-test-session';
const claim={channel:'MYKET',planDays:30,productId:'sahmino_30',purchaseToken:'SYNTHETIC_purchase_not_real'};
const create=(verifier)=>createOfflineReceiptBoundary({verifySession:verifier,buildChannel:'MYKET'});
test('requires an injected, server-owned verifier',()=>{
 assert.throws(()=>createOfflineReceiptBoundary(),/SERVER_OWNED_AUTH_CONFIGURATION_REQUIRED/);
 assert.throws(()=>createOfflineReceiptBoundary({verifySession:'accept',buildChannel:'MYKET'}),/SERVER_OWNED_AUTH_CONFIGURATION_REQUIRED/);
});
test('missing authorization is rejected before verifier is reached',async()=>{
 let calls=0;
 const s=create(async()=>{calls++;return {authenticated:true,subject:'user1'};});
 const r=await s.evaluate({claim});
 assert.equal(calls,0);assert.equal(r.realEntitlement,false);
 assert.equal(r.reason,'NO_VALID_AUTHORIZATION');
});
test('rejected or malformed verifier results never approve payment',async()=>{
 for(const response of [null,false,{}, {authenticated:false,subject:'user1'}, {authenticated:true}]){
  const result=await create(async()=>response).evaluate({authorization:authToken,claim});
  assert.equal(result.reason,'SESSION_VERIFICATION_FAILED');
  assert.equal(result.providerVerified,false);
 }
});
test('verifier exceptions fail closed without returning secret data',async()=>{
 const s=create(async()=>{throw Error('secret-token-and-provider-stacktrace');});
 const r=await s.evaluate({authorization:authToken,claim});
 assert.equal(r.reason,'SESSION_VERIFICATION_FAILED');
 assert.equal(JSON.stringify(r).includes('secret'),false);
});
test('successful synthetic authentication never turns into payment verification',async()=>{
 const s=create(async token=>token===authToken?{authenticated:true,subject:'user1'}:null);
 const r=await s.evaluate({authorization:authToken,claim});
 assert.equal(r.reason,'PROVIDER_ADAPTER_DISABLED');
 assert.equal(r.providerVerified,false);assert.equal(r.realEntitlement,false);
 assert.equal(Object.hasOwn(r,'accountId'),false);
 assert.equal(JSON.stringify(r).includes(claim.purchaseToken),false);
});
test('verified session does not permit forged client claims or other store',async()=>{
 const s=create(async()=>({authenticated:true,subject:'user1'}));
 for(const invalid of [{...claim,providerVerified:true},{...claim,accountId:'other'},
  {...claim,channel:'GOOGLE_PLAY'},{...claim,planDays:270}]){
  const r=await s.evaluate({authorization:authToken,claim:invalid});
  assert.equal(r.realEntitlement,false);
  assert.notEqual(r.reason,'PROVIDER_ADAPTER_DISABLED');
 }
});
