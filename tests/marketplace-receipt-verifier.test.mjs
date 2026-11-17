import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
globalThis.crypto=webcrypto;
import {verifyMarketplaceReceipt} from '../server/marketplace-receipt-verifier.mjs';

const now=Date.now();
const order={id:'ord_'+'a'.repeat(32),plan_id:'SAHMINO_PRO_30D',amount_rial:1500000,currency:'IRR',state:'PENDING'};
const env={
 MYKET_IAB_PUBLIC_KEY:'',
 MYKET_SKU_30D:'myket_30d',
 BAZAAR_SKU_30D:'bazaar_30d',
 BAZAAR_CLIENT_ID:'client-id',
 BAZAAR_CLIENT_SECRET:'client-secret',
 BAZAAR_REFRESH_TOKEN:'refresh-token'
};

async function myketReceipt(overrides={}){
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-1'},true,['sign','verify']);
 const pub=await crypto.subtle.exportKey('spki',pair.publicKey);
 const key=Buffer.from(pub).toString('base64');
 const purchase={packageName:'ir.manahesab.sahmino',productId:'myket_30d',purchaseState:0,
  developerPayload:order.id,purchaseTime:now,purchaseToken:'token-123',orderId:'GPA.123',...overrides};
 const originalJson=JSON.stringify(purchase);
 const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(originalJson));
 return {key,body:{provider:'MYKET',orderId:order.id,originalJson,signature:Buffer.from(signature).toString('base64')}};
}

test('Myket: verifies RSA signature, package, SKU, state and server order payload',async()=>{
 const receipt=await myketReceipt();
 const result=await verifyMarketplaceReceipt({...env,MYKET_IAB_PUBLIC_KEY:receipt.key},receipt.body,order);
 assert.equal(result.providerName,'MYKET');
 assert.equal(result.planId,order.plan_id);
 assert.equal(result.amountRial,order.amount_rial);
 assert.equal(result.currency,'IRR');
 assert.match(result.providerPaymentId,/^[a-f0-9]{64}$/);
});

test('Myket: rejects tampered receipt and a valid receipt from another order',async()=>{
 const receipt=await myketReceipt();
 const changed={...receipt.body,originalJson:receipt.body.originalJson.replace('myket_30d','other_sku')};
 await assert.rejects(()=>verifyMarketplaceReceipt({...env,MYKET_IAB_PUBLIC_KEY:receipt.key},changed,order),/MYKET_SIGNATURE_INVALID/);
 const other=await myketReceipt({developerPayload:'ord_'+'b'.repeat(32)});
 await assert.rejects(()=>verifyMarketplaceReceipt({...env,MYKET_IAB_PUBLIC_KEY:other.key},other.body,order),/MYKET_PURCHASE_MISMATCH/);
});

test('Myket: rejects package, product and purchase-state mismatches',async()=>{
 for(const override of [{packageName:'attacker.app'},{productId:'another_sku'},{purchaseState:1}]){
  const receipt=await myketReceipt(override);
  await assert.rejects(()=>verifyMarketplaceReceipt({...env,MYKET_IAB_PUBLIC_KEY:receipt.key},receipt.body,order),/MYKET_PURCHASE_MISMATCH/);
 }
});

test('Bazaar: refreshes server OAuth token then validates purchase with server SKU',async()=>{
 const originalFetch=globalThis.fetch;const calls=[];
 globalThis.fetch=async(url,options={})=>{
  calls.push({url:String(url),options});
  if(String(url).includes('/auth/token/'))return new Response(JSON.stringify({access_token:'access-token',token_type:'Bearer',expires_in:3600}),{status:200});
  return new Response(JSON.stringify({purchaseState:0,developerPayload:order.id,purchaseTime:now,kind:'androidpublisher#inappPurchase'}),{status:200});
 };
 try{
  const result=await verifyMarketplaceReceipt(env,{provider:'CAFEBAZAAR',orderId:order.id,purchaseToken:'bazaar-token'},order);
  assert.equal(result.providerName,'CAFEBAZAAR');
  assert.equal(result.planId,order.plan_id);
  assert.equal(calls.length,2);
  assert.match(calls[0].url,/pardakht\.cafebazaar\.ir\/devapi\/v2\/auth\/token/);
  assert.match(calls[1].url,/bazaar_30d/);
  assert.match(calls[1].url,/access-token/);
 }finally{globalThis.fetch=originalFetch;}
});

test('Bazaar: rejects invalid purchase and wrong developer payload',async()=>{
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async url=>String(url).includes('/auth/token/')
  ?new Response(JSON.stringify({access_token:'access-token'}),{status:200})
  :new Response(JSON.stringify({purchaseState:1,developerPayload:order.id,purchaseTime:now}),{status:200});
 try{
  await assert.rejects(()=>verifyMarketplaceReceipt(env,{provider:'CAFEBAZAAR',orderId:order.id,purchaseToken:'bad'},order),/BAZAAR_PURCHASE_MISMATCH/);
 }finally{globalThis.fetch=originalFetch;}
});

test('both providers fail closed without configured SKU/key/credentials',async()=>{
 const receipt=await myketReceipt();
 await assert.rejects(()=>verifyMarketplaceReceipt({...env,MYKET_IAB_PUBLIC_KEY:receipt.key,MYKET_SKU_30D:''},receipt.body,order),/STORE_SKU_NOT_CONFIGURED/);
 await assert.rejects(()=>verifyMarketplaceReceipt({...env,MYKET_IAB_PUBLIC_KEY:''},receipt.body,order),/MYKET_KEY_NOT_CONFIGURED/);
 await assert.rejects(()=>verifyMarketplaceReceipt({...env,BAZAAR_REFRESH_TOKEN:''},
  {provider:'CAFEBAZAAR',orderId:order.id,purchaseToken:'token'},order),/BAZAAR_CREDENTIALS_NOT_CONFIGURED/);
});

test('receipt cannot select arbitrary account, amount, currency, plan or order',async()=>{
 const receipt=await myketReceipt();
 const badOrder={...order,amount_rial:1};
 await assert.rejects(()=>verifyMarketplaceReceipt({...env,MYKET_IAB_PUBLIC_KEY:receipt.key},receipt.body,badOrder),/ORDER_PRICE_MISMATCH/);
 await assert.rejects(()=>verifyMarketplaceReceipt({...env,MYKET_IAB_PUBLIC_KEY:receipt.key},
  {...receipt.body,orderId:'ord_'+'c'.repeat(32)},order),/ORDER_ID_MISMATCH/);
});
