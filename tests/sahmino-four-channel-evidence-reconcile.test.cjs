'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createSyntheticProviderReconciler}=require('../billing/staging/sahmino-four-channel-evidence-reconcile.cjs');
const channels=['CAFEBAZAAR','MYKET','GOOGLE_PLAY','WEB_DIRECT'];
const principal={authenticated:true,subject:'account_1'};
function fixture(channel,days=30){
 const expected={channel,planDays:days,accountId:'account_1',
  productId:'sahmino_30',packageId:'ir.sahmino.future',
  ...(channel==='WEB_DIRECT'?{orderId:'order_123',amountMinor:450000,currency:'IRR'}:{})};
 const evidence={channel,status:'SETTLED',productId:expected.productId,
  packageId:expected.packageId,purchaseId:'synthetic_purchase_1',
  ...(channel==='WEB_DIRECT'?{orderId:expected.orderId,amountMinor:450000,currency:'IRR'}:{})};
 return {expected,evidence};
}
const evaluate=(channel,expected,evidence,account=principal)=>createSyntheticProviderReconciler({
 channel,queryProvider:async()=>evidence
}).reconcile({principal:account,expected,purchaseToken:'synthetic-not-a-real-receipt'});
test('all four matching synthetic provider responses still deny entitlement',async()=>{
 for(const channel of channels){
  const {expected,evidence}=fixture(channel);
  const r=await evaluate(channel,expected,evidence);
  assert.equal(r.syntheticMatch,true);
  assert.equal(r.reason,'SYNTHETIC_MATCH_NOT_VERIFICATION');
  assert.equal(r.providerVerified,false);assert.equal(r.entitlementGranted,false);
  assert.equal(r.realEntitlement,false);
  assert.equal(JSON.stringify(r).includes('synthetic-not-a-real-receipt'),false);
 }
});
test('all four channels reject cross-channel and product or package mismatch',async()=>{
 for(const channel of channels){
  const {expected,evidence}=fixture(channel);
  for(const changed of [{channel:'NOT_THIS_CHANNEL'},{productId:'other'},
   {packageId:'other'}]){
   const r=await evaluate(channel,expected,{...evidence,...changed});
   assert.equal(r.syntheticMatch,false);
   assert.equal(r.reason,'RECEIPT_IDENTITY_MISMATCH');
  }
 }
});
test('pending, cancelled, refunded, unknown and missing provider responses deny',async()=>{
 for(const channel of channels){
  const {expected,evidence}=fixture(channel);
  for(const status of ['PENDING','CANCELLED','REFUNDED','REVOKED','UNKNOWN']){
   assert.equal((await evaluate(channel,expected,{...evidence,status})).reason,'NOT_SETTLED');
  }
  assert.equal((await evaluate(channel,expected,null)).reason,'MALFORMED_PROVIDER_EVIDENCE');
 }
});
test('provider timeouts fail closed and hide exception details',async()=>{
 for(const channel of channels){
  const {expected}=fixture(channel);
  const reconciler=createSyntheticProviderReconciler({channel,
   queryProvider:async()=>{throw Error('merchant-secret=do-not-leak');}});
  const r=await reconciler.reconcile({principal,expected,purchaseToken:'fake-token-12345'});
  assert.equal(r.reason,'PROVIDER_QUERY_UNAVAILABLE');
  assert.equal(JSON.stringify(r).includes('merchant-secret'),false);
 }
});
test('web PSP order, amount and currency must all match server-owned order',async()=>{
 const {expected,evidence}=fixture('WEB_DIRECT');
 for(const update of [{orderId:'other'},{amountMinor:1},{currency:'USD'}]){
  assert.equal((await evaluate('WEB_DIRECT',expected,{...evidence,...update})).reason,
   'WEB_AMOUNT_OR_ORDER_MISMATCH');
 }
 for(const update of [{orderId:''},{amountMinor:0},{currency:'invalid'}]){
  assert.equal((await evaluate('WEB_DIRECT',{...expected,...update},evidence)).reason,
   'INVALID_SERVER_PRICE');
 }
});
test('server account, channel and five fixed days must be valid',async()=>{
 for(const channel of channels){
  const {expected,evidence}=fixture(channel);
  assert.equal((await evaluate(channel,{...expected,planDays:270},evidence)).reason,'INVALID_SERVER_ORDER');
  assert.equal((await evaluate(channel,{...expected,accountId:'another'},evidence)).reason,'INVALID_SERVER_ORDER');
  assert.equal((await evaluate(channel,{...expected,channel:'MYKET'===channel?'CAFEBAZAAR':'MYKET'},evidence)).reason,'INVALID_SERVER_ORDER');
  assert.equal((await evaluate(channel,expected,evidence,null)).reason,'UNAUTHENTICATED');
 }
});
test('provider adapter is explicit and cannot be enabled by request fields',()=>{
 assert.throws(()=>createSyntheticProviderReconciler({channel:'INVALID',queryProvider:async()=>null}),
 /INVALID_PROVIDER_CHANNEL/);
 assert.throws(()=>createSyntheticProviderReconciler({channel:'MYKET'}),/PROVIDER_QUERY_REQUIRED/);
});
