'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createGooglePlayReadOnlyClient,asFourChannelQuery}=require('../billing/staging/sahmino-google-play-readonly-client.cjs');
const pkg='ir.sahmino.test';
const token='synthetic-test-token';
const sku='sahmino_30';
const evidence={purchaseStateContext:{purchaseState:'PURCHASED'},
 productLineItem:[{productId:sku,productOfferDetails:{quantity:1}}],
 orderId:'GPA.1234-5678-9012-34567'};
function client(body=evidence,ok=true){
 const calls=[];
 const c=createGooglePlayReadOnlyClient({packageName:pkg,
  getAccessToken:async()=> 'synthetic-access-token-123',
  fetchImpl:async(url,options)=>{calls.push({url,options});
   return {ok,text:async()=>JSON.stringify(body)};}});
 return {c,calls};
}
test('Google Play productsv2 uses official v3 endpoint and bearer on server',async()=>{
 const {c,calls}=client();
 const result=await c.query({purchaseToken:token,sku});
 assert.equal(result.status,'SETTLED');
 assert.equal(result.reason,'PLAY_API_READ_ONLY_DURABLE_LEDGER_REQUIRED');
 assert.equal(result.purchaseId,evidence.orderId);
 assert.equal(result.providerVerified,false);
 assert.equal(result.realEntitlement,false);
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'+
  pkg+'/purchases/productsv2/tokens/'+token);
 assert.equal(calls[0].options.method,'GET');
 assert.equal(calls[0].options.redirect,'error');
 assert.match(calls[0].options.headers.Authorization,/^Bearer /);
 assert.equal(JSON.stringify(result).includes(token),false);
});
test('pending, cancelled, mismatched products, quantity and missing order fail closed',async()=>{
 const invalid=[
  [{...evidence,purchaseStateContext:{purchaseState:'PENDING'}},'PLAY_NOT_PURCHASED'],
  [{...evidence,purchaseStateContext:{purchaseState:'CANCELLED'}},'PLAY_NOT_PURCHASED'],
  [{...evidence,productLineItem:[{productId:'other'}]},'PLAY_PRODUCT_MISMATCH'],
  [{...evidence,productLineItem:[{productId:sku},{productId:sku}]},'PLAY_PRODUCT_MISMATCH'],
  [{...evidence,productLineItem:[{productId:sku,productOfferDetails:{quantity:2}}]},'PLAY_UNSUPPORTED_QUANTITY'],
  [{...evidence,productLineItem:[{productId:sku,productOfferDetails:{quantity:1,refundableQuantity:0}}]},'PLAY_REFUND_OR_QUANTITY_REVIEW_REQUIRED'],
  [{...evidence,productLineItem:[{productId:sku,productOfferDetails:{quantity:1,refundableQuantity:2}}]},'PLAY_REFUND_OR_QUANTITY_REVIEW_REQUIRED'],
  [{...evidence,orderId:undefined},'PLAY_ORDER_MISSING']
 ];
 for(const [response,reason] of invalid){
  const result=await client(response).c.query({purchaseToken:token,sku});
  assert.equal(result.reason,reason);
  assert.equal(result.providerVerified,false);
 }
});
test('invalid receipts prevent any credential or HTTP request',async()=>{
 let requested=0;
 const c=createGooglePlayReadOnlyClient({packageName:pkg,
  getAccessToken:async()=>{requested++;return 'synthetic-access-token-123';},
  fetchImpl:async()=>{throw Error('unexpected network');}});
 for(const purchaseToken of [null,'short','x'.repeat(4097)]){
  const r=await c.query({purchaseToken,sku});
  assert.equal(r.reason,'INVALID_PLAY_PURCHASE');
 }
 assert.equal(requested,0);
});
test('fail closed on provider HTTP errors, auth errors and malformed JSON',async()=>{
 const reject=createGooglePlayReadOnlyClient({packageName:pkg,
  getAccessToken:async()=>{throw Error('private secret');},
  fetchImpl:async()=>{throw Error('should not call');}});
 const x=await reject.query({purchaseToken:token,sku});
 assert.equal(x.reason,'PLAY_AUTH_UNAVAILABLE');
 assert.equal(JSON.stringify(x).includes('private secret'),false);
 const http=await client(evidence,false).c.query({purchaseToken:token,sku});
 assert.equal(http.reason,'PLAY_REQUEST_NOT_OK');
 const bad=createGooglePlayReadOnlyClient({packageName:pkg,
  getAccessToken:async()=> 'synthetic-access-token-123',
  fetchImpl:async()=>({ok:true,text:async()=>'{bad json'})});
 assert.equal((await bad.query({purchaseToken:token,sku})).reason,'PLAY_QUERY_FAILED');
});
test('client configuration requires explicit backend package and token source',()=>{
 assert.throws(()=>createGooglePlayReadOnlyClient({packageName:'fake',getAccessToken:async()=>{},fetchImpl:async()=>{}}),/INVALID_PLAY_PACKAGE/);
 assert.throws(()=>createGooglePlayReadOnlyClient({packageName:pkg}),/PLAY_SERVER_AUTH_AND_FETCH_REQUIRED/);
});

test('read-only Google client bridges to existing four-channel gate without granting access',async()=>{
 const {makeProviderConnectionGate}=require('../billing/staging/sahmino-provider-connection-gate.cjs');
 const c=client().c;
 const bridge=asFourChannelQuery(c);
 const catalog=[30,60,90,180,365].map(days=>({days,sku:'sahmino_'+days,
  priceMinor:50000+days,currency:'IRR'}));
 const gate=makeProviderConnectionGate({channel:'GOOGLE_PLAY',catalog,
  merchantApproved:true,queryOfficialProvider:bridge});
 const result=await gate.check({principal:{authenticated:true,subject:'user_7'},
  serverOrder:{channel:'GOOGLE_PLAY',accountId:'user_7',planDays:30,sku,
   priceMinor:50030,currency:'IRR'},receipt:token});
 assert.equal(result.reason,'PROVIDER_RESPONSE_REQUIRES_DURABLE_REVIEW');
 assert.equal(result.providerVerified,false);assert.equal(result.realEntitlement,false);
 const cross=await bridge({channel:'MYKET',sku,receipt:token});
 assert.equal(cross.reason,'PLAY_CROSS_CHANNEL');
});
