import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {verifyAndSettle,skuMap,verifySignedPurchase} from '../server/billing/bazaar.mjs';

const pair=await webcrypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-1'},true,['sign','verify']);
const publicKey=Buffer.from(await webcrypto.subtle.exportKey('spki',pair.publicKey)).toString('base64');
const originalJson=JSON.stringify({developerPayload:'ord_'+'a'.repeat(32),productId:'pro30',
 packageName:'ir.sahamban.app',purchaseToken:'token-123',purchaseState:0});
const dataSignature=Buffer.from(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,
 new TextEncoder().encode(originalJson))).toString('base64');
const env={
 BILLING_V2_ENABLED:'true',BAZAAR_RSA_PUBLIC_KEY:publicKey,
 BAZAAR_CLIENT_ID:'client',BAZAAR_CLIENT_SECRET:'secret',BAZAAR_REFRESH_TOKEN:'refresh',
 BAZAAR_PACKAGE_NAME:'ir.sahamban.app',
 BAZAAR_SKU_MAP:JSON.stringify({SAHAMBAN_PRO_30D:'pro30',SAHAMBAN_PRO_60D:'pro60',
  SAHAMBAN_PRO_90D:'pro90',SAHAMBAN_PRO_180D:'pro180',SAHAMBAN_PRO_365D:'pro365'})
};
const validBody={orderId:'ord_'+'a'.repeat(32),sku:'pro30',token:'token-123',originalJson,dataSignature};

test('SKU map requires exactly five unique valid subscription products',()=>{
 assert.ok(skuMap(env.BAZAAR_SKU_MAP));
 assert.equal(skuMap('{}'),null);
 assert.equal(skuMap(JSON.stringify({a:'same'})),null);
});
test('server verifies signed developer payload, SKU, package and token',async()=>{
 assert.equal(await verifySignedPurchase(env,validBody).then(()=>true),true);
 await assert.rejects(()=>verifySignedPurchase(env,{...validBody,orderId:'ord_'+'b'.repeat(32)}));
 await assert.rejects(()=>verifySignedPurchase(env,{...validBody,sku:'other'}));
 await assert.rejects(()=>verifySignedPurchase(env,{...validBody,dataSignature:'AA=='}));
});
test('subscription validation checks server identity and signed receipt before contacting Bazaar',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('unexpected');};
 const db={prepare(){return {bind(){return {first:async()=>({id:'order',plan_id:'SAHAMBAN_PRO_30D'})}}}}};
 const base={db,env,body:validBody,now:'2026-01-01T00:00:00.000Z',fetcher};
 assert.equal((await verifyAndSettle({...base,subject:null})).status,401);
 assert.equal((await verifyAndSettle({...base,body:{...validBody,extra:true},subject:'u'})).status,400);
 assert.equal(calls,0);
});
test('provider expiry and renewal flag become authoritative access data',async()=>{
 const now='2026-01-01T00:00:00.000Z';
 let validateUrl='';
 const fetcher=async(url)=>{
  if(String(url).includes('/auth/token/'))return new Response(JSON.stringify({access_token:'access'}),{status:200});
  validateUrl=String(url);
  return new Response(JSON.stringify({kind:'androidpublisher#subscriptionPurchase',
   validUntilTimestampMsec:Date.parse('2026-02-01T00:00:00.000Z'),
   autoRenewing:true,orderId:'bazaar-order'}),{status:200});
 };
 const db={prepare(q){return {bind(){return {first:async()=>({id:'order',plan_id:'SAHAMBAN_PRO_30D',status:'CREATED'})},run:async()=>({success:true,meta:{changes:1}})}}},batch:async statements=>statements.map(()=>({success:true,meta:{changes:1}}))};
 const result=await verifyAndSettle({db,env,subject:'user',body:validBody,now,fetcher});
 assert.ok(validateUrl.includes('/subscriptions/pro30/purchases/token-123/'), validateUrl);
 assert.equal(result.status,200);
 assert.equal(result.body.status,'ACTIVE');
 assert.equal(result.body.expiresAt,'2026-02-01T00:00:00.000Z');
 assert.equal(result.body.autoRenewing,true);
});
test('expired provider entitlement fails closed',async()=>{
 const now='2026-01-01T00:00:00.000Z';
 const fetcher=async(url)=>{
  if(String(url).includes('/auth/token/'))return new Response(JSON.stringify({access_token:'access'}),{status:200});
  return new Response(JSON.stringify({kind:'androidpublisher#subscriptionPurchase',
   validUntilTimestampMsec:Date.parse('2025-12-01T00:00:00.000Z'),autoRenewing:false}),{status:200});
 };
 const result=await verifyAndSettle({db:{prepare(){return {bind(){return {first:async()=>({id:'order',plan_id:'SAHAMBAN_PRO_30D'})}}}}},env,
  subject:'user',body:validBody,now,fetcher});
 assert.equal(result.status,503);
});
