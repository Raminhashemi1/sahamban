'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseProductMap,getBazaarAccessToken,verifyBazaarReceipt}=require('../server/bazaar-receipt-verification.mjs');

const mapping={
 SAHAMBAN_PRO_30D:'pro_30d',SAHAMBAN_PRO_60D:'pro_60d',
 SAHAMBAN_PRO_90D:'pro_90d',SAHAMBAN_PRO_180D:'pro_180d',
 SAHAMBAN_PRO_365D:'pro_365d'
};
const env={BAZAAR_CLIENT_ID:'client',BAZAAR_CLIENT_SECRET:'secret',
 BAZAAR_REFRESH_TOKEN:'refresh',BAZAAR_PRODUCT_IDS_JSON:JSON.stringify(mapping),
 BAZAAR_PACKAGE_NAME:'ir.sahamban.app',BAZAAR_BILLING_ENABLED:'true'};
test('product mapping requires exactly five unique configured Cafe Bazaar SKUs',()=>{
 assert.deepEqual(parseProductMap(JSON.stringify(mapping)),mapping);
 assert.equal(parseProductMap('{}'),null);
 assert.equal(parseProductMap(JSON.stringify({...mapping,SAHAMBAN_PRO_30D:'same',SAHAMBAN_PRO_60D:'same'})),null);
 assert.equal(parseProductMap('not-json'),null);
});
test('OAuth refresh exchanges server-only Bazaar credentials and never accepts client token',async()=>{
 let seen;
 const token=await getBazaarAccessToken(env,async(url,options)=>{
  seen={url,body:options.body};
  return new Response(JSON.stringify({access_token:'short-lived-access'}),{status:200});
 });
 assert.equal(token,'short-lived-access');
 assert.equal(seen.url,'https://pardakht.cafebazaar.ir/devapi/v2/auth/token/');
 assert.match(seen.body,/grant_type=refresh_token/);
 assert.match(seen.body,/client_secret=secret/);
});
test('receipt verification calls Bazaar API for the exact package, product and token',async()=>{
 const calls=[];
 const fetchImpl=async(url,options={})=>{
  calls.push({url,options});
  if(url.includes('/auth/token/'))return new Response(JSON.stringify({access_token:'server-token'}));
  return new Response(JSON.stringify({purchaseState:0,developerPayload:'ord_'+'a'.repeat(32),
   orderId:'bazaar-order-1',purchaseTime:1795000000000,consumptionState:0}));
 };
 const receipt=await verifyBazaarReceipt({env,packageName:env.BAZAAR_PACKAGE_NAME,
  productId:'pro_30d',purchaseToken:'purchase-token-123',orderId:'ord_'+'a'.repeat(32),fetchImpl});
 assert.equal(receipt.purchaseState,0);
 assert.equal(calls.length,2);
 assert.match(calls[1].url,/ir\.sahamban\.app\/inapp\/pro_30d\/purchases\/purchase-token-123/);
 assert.match(calls[1].url,/access_token=server-token/);
});
test('refunded or wrong-order Bazaar receipts are rejected',async()=>{
 const makeFetch=receipt=>async url=>url.includes('/auth/token/')
  ?new Response(JSON.stringify({access_token:'server-token'}))
  :new Response(JSON.stringify(receipt));
 await assert.rejects(()=>verifyBazaarReceipt({env,packageName:env.BAZAAR_PACKAGE_NAME,
  productId:'pro_30d',purchaseToken:'purchase-token-123',orderId:'ord_'+'a'.repeat(32),
  fetchImpl:makeFetch({purchaseState:1,developerPayload:'ord_'+'a'.repeat(32)})}));
 await assert.rejects(()=>verifyBazaarReceipt({env,packageName:env.BAZAAR_PACKAGE_NAME,
  productId:'pro_30d',purchaseToken:'purchase-token-123',orderId:'ord_'+'a'.repeat(32),
  fetchImpl:makeFetch({purchaseState:0,developerPayload:'ord_'+'b'.repeat(32)})}));
});
test('missing Bazaar secrets fail closed',async()=>{
 await assert.rejects(()=>getBazaarAccessToken({},async()=>{throw Error('must not call');}));
});
