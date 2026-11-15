'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createFourChannelVerifier,RESULT,REQUIRED}=
 require('../billing/staging/sahmino-four-provider-boundary.cjs');
const channels=['CAFEBAZAAR','MYKET','GOOGLE_PLAY','WEB_DIRECT'];
const plans=[30,60,90,180,365];
const principal={authenticated:true,subject:'synthetic_user_01'};
function claim(channel,planDays){
 return {channel,planDays,productId:'sahmino_'+planDays,
  purchaseToken:'TEST_ONLY_not_a_real_provider_receipt'};
}
test('all four providers expose distinct, disabled adapters',()=>{
 assert.deepEqual(Object.keys(RESULT),channels);
 for(const channel of channels){
  const a=createFourChannelVerifier({buildChannel:channel});
  assert.equal(a.allowedDays.length,5);
  assert.deepEqual(a.providerFields,REQUIRED[channel]);
  assert.ok(a.providerFields.includes('purchaseId'));
  assert.ok(a.providerFields.includes('productId')||channel==='WEB_DIRECT');
 }
});
test('all 20 provider/plan combinations refuse entitlement',async()=>{
 for(const channel of channels)for(const days of plans){
  const r=await createFourChannelVerifier({buildChannel:channel})
   .check({principal,claim:claim(channel,days)});
  assert.equal(r.reason,RESULT[channel]);
  assert.equal(r.checkoutEnabled,false);
  assert.equal(r.providerVerified,false);
  assert.equal(r.entitlementGranted,false);
  assert.equal(r.realEntitlement,false);
  assert.equal(JSON.stringify(r).includes('TEST_ONLY_not_a_real_provider_receipt'),false);
 }
});
test('cross-channel claims and client-forged verified state are rejected',async()=>{
 for(const channel of channels){
  const a=createFourChannelVerifier({buildChannel:channel});
  const other=channels.find(c=>c!==channel);
  assert.equal((await a.check({principal,claim:claim(other,30)})).reason,
   'CROSS_CHANNEL_OR_MISSING');
  assert.equal((await a.check({principal,claim:{...claim(channel,30),
   providerVerified:true}})).reason,'CLIENT_TRUST_ASSERTION_FORBIDDEN');
 }
});
test('bad plans, unauthenticated claims and unknown channels fail closed',async()=>{
 for(const channel of channels){
  const a=createFourChannelVerifier({buildChannel:channel});
  assert.equal((await a.check({principal,claim:claim(channel,270)})).reason,'INVALID_PLAN');
  assert.equal((await a.check({principal:null,claim:claim(channel,30)})).reason,'UNAUTHENTICATED');
 }
 assert.throws(()=>createFourChannelVerifier({buildChannel:'UNKNOWN'}),/UNKNOWN_BUILD_CHANNEL/);
});
