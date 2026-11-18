import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {verifyAndSettle,skuMap,verifySignedPurchase,verifyInAppPurchase} from '../server/billing/bazaar.mjs';

const pair=await webcrypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-1'},true,['sign','verify']);
const publicKey=Buffer.from(await webcrypto.subtle.exportKey('spki',pair.publicKey)).toString('base64');
const now='2026-01-01T00:00:00.000Z';
const orderId='ord_'+'a'.repeat(32);
const originalJson=JSON.stringify({developerPayload:orderId,productId:'pro30',
 packageName:'ir.sahmino.app',purchaseToken:'token-123',purchaseState:0});
const dataSignature=Buffer.from(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,
 new TextEncoder().encode(originalJson))).toString('base64');
const env={
 BILLING_V2_ENABLED:'true',BAZAAR_RSA_PUBLIC_KEY:publicKey,
 BAZAAR_CLIENT_ID:'client',BAZAAR_CLIENT_SECRET:'secret',BAZAAR_REFRESH_TOKEN:'refresh',
 BAZAAR_PACKAGE_NAME:'ir.sahmino.app',
 BAZAAR_SKU_MAP:JSON.stringify({SAHAMBAN_PRO_30D:'pro30',SAHAMBAN_PRO_60D:'pro60',
  SAHAMBAN_PRO_90D:'pro90',SAHAMBAN_PRO_180D:'pro180',SAHAMBAN_PRO_365D:'pro365'})
};
const validBody={orderId,sku:'pro30',token:'token-123',originalJson,dataSignature};
const receipt={kind:'androidpublisher#productPurchase',purchaseState:0,consumptionState:0,
 purchaseTimeMillis:Date.parse(now),orderId:'bazaar-order'};
function fakeDb(order){
 return {prepare(sql){return {bind(...values){return {first:async()=>{
   if(sql.includes("SELECT expires_at FROM billing_access"))return {expires_at:order.settledExpiresAt||order.expires_at};
   return order;
  }}}}},
  batch:async statements=>{
   const values=statements[2].values,nowValue=values[1],days=values[4];
   const existing=order.expires_at;
   const base=existing&&Date.parse(existing)>Date.parse(nowValue)?existing:nowValue;
   order.settledExpiresAt=new Date(Date.parse(base)+days*86400000).toISOString();
   return statements.map(()=>({success:true,meta:{changes:1}}));
  }
 };
}

test('SKU map requires exactly five unique valid in-app products',()=>{
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
test('product validation calls Bazaar in-app purchase endpoint and rejects consumed/refunded items',async()=>{
 let url='';
 const fetcher=async u=>{
  if(String(u).includes('/auth/token/'))return new Response(JSON.stringify({access_token:'access'}),{status:200});
  url=String(u);return new Response(JSON.stringify(receipt),{status:200});
 };
 const result=await verifyInAppPurchase(env,{sku:'pro30',token:'token-123',nowMs:Date.parse(now)},fetcher);
 assert.ok(url.includes('/validate/ir.sahmino.app/inapp/pro30/purchases/token-123/'),url);
 assert.equal(result.purchaseTime,now);
 const bad=async u=>{
  if(String(u).includes('/auth/token/'))return new Response(JSON.stringify({access_token:'access'}),{status:200});
  return new Response(JSON.stringify({...receipt,consumptionState:1}),{status:200});
 };
 await assert.rejects(()=>verifyInAppPurchase(env,{sku:'pro30',token:'token-123',nowMs:Date.parse(now)},bad));
});
test('manual purchase is verified then settles fixed duration with no auto-renewal',async()=>{
 const db=fakeDb({id:'order',plan_id:'SAHAMBAN_PRO_30D',status:'CREATED',user_id:'u1',created_at:now,expires_at:null});
 const fetcher=async u=>{
  if(String(u).includes('/auth/token/'))return new Response(JSON.stringify({access_token:'access'}),{status:200});
  return new Response(JSON.stringify(receipt),{status:200});
 };
 const result=await verifyAndSettle({db,env,subject:'user',body:validBody,now,fetcher});
 assert.equal(result.status,200);
 assert.equal(result.body.status,'ACTIVE');
 assert.equal(result.body.renewalMode,'MANUAL');
 assert.equal(result.body.daysAdded,30);
 assert.equal(result.body.expiresAt,'2026-01-31T00:00:00.000Z');
});
test('verification rejects unauthenticated, malformed and wrong-account orders before provider calls',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('unexpected');};
 const db=fakeDb({id:'order',plan_id:'SAHAMBAN_PRO_30D',status:'CREATED',user_id:'u1',expires_at:null});
 const base={db,env,body:validBody,now,fetcher};
 assert.equal((await verifyAndSettle({...base,subject:null})).status,401);
 assert.equal((await verifyAndSettle({...base,body:{...validBody,extra:true},subject:'u'})).status,400);
 assert.equal(calls,0);
});

test('replayed settled purchase remains idempotent after Bazaar marks the consumable as consumed',async()=>{
 const tokenHash=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(validBody.token))).toString('hex');
 const expiresAt='2026-01-31T00:00:00.000Z';
 const db=fakeDb({id:'order',plan_id:'SAHAMBAN_PRO_30D',status:'PAID',user_id:'u1',
  created_at:now,paid_at:now,bazaar_order_id:'bazaar-order',purchase_token_hash:tokenHash,expires_at:expiresAt});
 let providerCalls=0;
 const fetcher=async u=>{
  providerCalls++;
  if(String(u).includes('/auth/token/'))return new Response(JSON.stringify({access_token:'access'}),{status:200});
  return new Response(JSON.stringify({...receipt,consumptionState:1}),{status:200});
 };
 const result=await verifyAndSettle({db,env,subject:'user',body:validBody,now,fetcher});
 assert.equal(result.status,200);
 assert.equal(result.body.status,'ACTIVE');
 assert.equal(result.body.expiresAt,expiresAt);
 assert.equal(result.body.daysAdded,0);
 assert.equal(result.body.restored,true);
 assert.equal(providerCalls,2);
});

test('replayed settled purchase cannot restore access after Bazaar reports a refund',async()=>{
 const tokenHash=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(validBody.token))).toString('hex');
 const expiresAt='2026-01-31T00:00:00.000Z';
 const db=fakeDb({id:'order',plan_id:'SAHAMBAN_PRO_30D',status:'PAID',user_id:'u1',
  created_at:now,paid_at:now,bazaar_order_id:'bazaar-order',purchase_token_hash:tokenHash,expires_at:expiresAt});
 const fetcher=async u=>{
  if(String(u).includes('/auth/token/'))return new Response(JSON.stringify({access_token:'access'}),{status:200});
  return new Response(JSON.stringify({...receipt,purchaseState:1,consumptionState:1}),{status:200});
 };
 const result=await verifyAndSettle({db,env,subject:'user',body:validBody,now,fetcher});
 assert.equal(result.status,409);
 assert.equal(result.body.error,'PURCHASE_NOT_VALID');
});
