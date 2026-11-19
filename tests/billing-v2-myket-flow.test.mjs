import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, webcrypto } from 'node:crypto';
import { verifyAndSettleMyket } from '../server/billing/myket.mjs';

const now='2026-01-01T00:00:00.000Z';
const orderId='ord_'+'e'.repeat(32);
const token='opaque-myket-token';
const {publicKey:publicKeyDer,privateKey}=generateKeyPairSync('rsa',{
 modulusLength:2048,
 publicKeyEncoding:{type:'spki',format:'der'},
 privateKeyEncoding:{type:'pkcs8',format:'pem'}
});
const publicKeyBase64=publicKeyDer.toString('base64');
const originalJson=JSON.stringify({
 orderId:'myket-order-e2e',packageName:'ir.sahmino.app',productId:'myket_30d',
 purchaseTime:Date.parse(now),purchaseState:0,developerPayload:orderId,purchaseToken:token
});
const signature=sign('RSA-SHA1',Buffer.from(originalJson),privateKey).toString('base64');

function db(order){
 return {
  prepare(sql){return {sql,bind(...values){return {sql,values,async first(){
   if(sql.includes('SELECT expires_at FROM billing_access'))return {expires_at:order.expires_at};
   return order;
  }};}}},
  async batch(statements){
   const [update]=statements;
   assert.match(update.sql,/store='MYKET'/);
   order.status='PAID';
   order.store_order_id='myket-order-e2e';
   order.purchase_token_hash=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
   const days=statements[2].values[4];
   order.expires_at=new Date(Date.parse(now)+days*86400000).toISOString();
   return statements.map(()=>({success:true,meta:{changes:1}}));
  }
 };
}

test('Myket signed receipt verifies and settles into the canonical Billing V2 entitlement',async()=>{
 const order={id:orderId,user_id:'u1',status:'CREATED',plan_id:'SAHAMBAN_PRO_30D',
  store:'MYKET',store_product_id:'myket_30d',store_order_id:null,purchase_token_hash:null,
  created_at:now,expires_at:null};
 const result=await verifyAndSettleMyket({
  db:db(order),env:{BILLING_V2_ENABLED:'true',MYKET_PUBLIC_KEY:publicKeyBase64,
   MYKET_PACKAGE_NAME:'ir.sahmino.app'},subject:'pilot-subject',
  body:{orderId,originalJson,signature},now
 });
 assert.equal(result.status,200);
 assert.deepEqual(result.body,{status:'ACTIVE',planId:'SAHAMBAN_PRO_30D',
  expiresAt:'2026-01-31T00:00:00.000Z',renewalMode:'MANUAL',daysAdded:30,restored:false});
});

test('Myket route service rejects an altered signed receipt before entitlement settlement',async()=>{
 const order={id:orderId,user_id:'u1',status:'CREATED',plan_id:'SAHAMBAN_PRO_30D',
  store:'MYKET',store_product_id:'myket_30d',store_order_id:null,purchase_token_hash:null,
  created_at:now,expires_at:null};
 const altered=originalJson.replace('myket_30d','other_sku');
 const result=await verifyAndSettleMyket({
  db:db(order),env:{BILLING_V2_ENABLED:'true',MYKET_PUBLIC_KEY:publicKeyBase64,
   MYKET_PACKAGE_NAME:'ir.sahmino.app'},subject:'pilot-subject',
  body:{orderId,originalJson:altered,signature},now
 });
 assert.equal(result.status,409);
 assert.equal(result.body.error,'INVALID_PURCHASE_SIGNATURE');
 assert.equal(order.status,'CREATED');
});
