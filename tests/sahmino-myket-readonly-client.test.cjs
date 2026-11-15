'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createMyketReadOnlyClient,asFourChannelQuery}=
 require('../billing/staging/sahmino-myket-readonly-client.cjs');
const {makeProviderConnectionGate}=
 require('../billing/staging/sahmino-provider-connection-gate.cjs');
const pkg='ir.sahmino.test',sku='sahmino_30',purchaseToken='synthetic-myket-purchase-token';
const valid={kind:'androidpublisher#productPurchase',purchaseTime:1492839267000,
 developerPayload:'order_nonce_123',purchaseState:0,consumptionState:0};
function mock(payload=valid,ok=true){
 const requests=[];
 const client=createMyketReadOnlyClient({packageName:pkg,
  getAccessToken:async()=> 'server-secret-test-token',
  fetchImpl:async(url,options)=>{requests.push({url,options});
   return {ok,text:async()=>JSON.stringify(payload)};}});
 return {client,requests};
}
test('official Myket validation uses server POST, X-Access-Token and tokenId',async()=>{
 const {client,requests}=mock();
 const r=await client.query({sku,purchaseToken,expectedPayload:'order_nonce_123'});
 assert.equal(r.status,'SETTLED');
 assert.equal(r.providerVerified,false);assert.equal(r.realEntitlement,false);
 assert.equal(r.entitlementGranted,false);
 assert.equal(r.consumed,false);
 assert.match(r.purchaseId,/^myket_[0-9a-f]{64}$/);
 assert.equal(requests.length,1);
 assert.equal(requests[0].url,'https://developer.myket.ir/api/partners/applications/'+
  pkg+'/purchases/products/'+sku+'/verify');
 assert.equal(requests[0].options.method,'POST');
 assert.equal(requests[0].options.headers['X-Access-Token'],'server-secret-test-token');
 assert.deepEqual(JSON.parse(requests[0].options.body),{tokenId:purchaseToken});
 assert.equal(JSON.stringify(r).includes(purchaseToken),false);
 assert.equal(JSON.stringify(r).includes('server-secret-test-token'),false);
});
test('refuse failed, malformed, non-consumed ambiguity and mismatched payload',async()=>{
 const cases=[
  [{...valid,purchaseState:1},'MYKET_NOT_PURCHASED'],
  [{...valid,purchaseState:'0'},'MYKET_NOT_PURCHASED'],
  [{...valid,kind:'other'},'MYKET_NOT_PURCHASED'],
  [{...valid,purchaseTime:'1492839267000'},'MYKET_PURCHASE_TIME_INVALID'],
  [{...valid,consumptionState:2},'MYKET_CONSUMPTION_UNKNOWN'],
  [null,'MYKET_RESPONSE_INVALID']
 ];
 for(const [payload,reason] of cases)
  assert.equal((await mock(payload).client.query({sku,purchaseToken})).reason,reason);
 assert.equal((await mock().client.query({sku,purchaseToken,expectedPayload:'other_nonce_789'}))
  .reason,'MYKET_PAYLOAD_MISMATCH');
});
test('invalid request never fetches or retrieves merchant token',async()=>{
 let hits=0;
 const client=createMyketReadOnlyClient({packageName:pkg,
  getAccessToken:async()=>{hits++;return 'server-secret-test-token';},
  fetchImpl:async()=>{hits++;throw Error('not allowed');}});
 for(const invalid of ['',null,'short','x'.repeat(4097)])
  assert.equal((await client.query({sku,purchaseToken:invalid})).reason,'INVALID_MYKET_PURCHASE');
 assert.equal(hits,0);
});
test('provider failures fail closed without leaking errors',async()=>{
 assert.equal((await mock(valid,false).client.query({sku,purchaseToken})).reason,'MYKET_REQUEST_NOT_OK');
 const c=createMyketReadOnlyClient({packageName:pkg,
  getAccessToken:async()=>{throw Error('confidential merchant token');},
  fetchImpl:async()=>null});
 const r=await c.query({sku,purchaseToken});
 assert.equal(r.reason,'MYKET_AUTH_UNAVAILABLE');
 assert.equal(JSON.stringify(r).includes('confidential'),false);
});
test('integrates Myket read-only validation into existing four-channel gate',async()=>{
 const bridge=asFourChannelQuery(mock().client);
 const catalog=[30,60,90,180,365].map(days=>({days,sku:'sahmino_'+days,
  priceMinor:10000+days,currency:'IRR'}));
 const gate=makeProviderConnectionGate({channel:'MYKET',catalog,
  merchantApproved:true,queryOfficialProvider:bridge});
 const r=await gate.check({principal:{authenticated:true,subject:'user_1'},
  serverOrder:{channel:'MYKET',accountId:'user_1',planDays:30,sku,
   priceMinor:10030,currency:'IRR'},receipt:purchaseToken});
 assert.equal(r.reason,'PROVIDER_RESPONSE_REQUIRES_DURABLE_REVIEW');
 assert.equal(r.realEntitlement,false);assert.equal(r.providerVerified,false);
 assert.equal((await bridge({channel:'CAFEBAZAAR',sku,receipt:purchaseToken}))
  .reason,'MYKET_CROSS_CHANNEL');
});
test('fail construction without package or server-owned credentials',()=>{
 assert.throws(()=>createMyketReadOnlyClient({packageName:'invalid'}),/INVALID_MYKET_PACKAGE/);
 assert.throws(()=>createMyketReadOnlyClient({packageName:pkg}),/MYKET_SERVER_AUTH_AND_FETCH_REQUIRED/);
});