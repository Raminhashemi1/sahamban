'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {verifyBazaarSubscription,verifyBazaarSignature,validReceipt,SKU_BY_PLAN}=require('../server/bazaar-subscription-verifier.cjs');
const now='2026-11-18T10:00:00.000Z';
const order={id:'ord_'+'a'.repeat(32),user_id:'usr_'+'b'.repeat(32),plan_id:'SAHMINO_PRO_30D',amount_rial:1500000,currency:'IRR',state:'PENDING'};
const packageName='ir.manahesab.sahmino';
const purchase={orderId:'GPA.1234-5678-9012-34567',purchaseToken:'tok_1234567890abcdef',payload:order.id,
 packageName,productId:SKU_BY_PLAN[order.plan_id],purchaseTime:Date.parse('2026-11-18T09:59:00.000Z'),purchaseState:0};
async function signedFixture(overrides={}){
 const key=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,
  publicExponent:new Uint8Array([1,0,1]),hash:'SHA-1'},true,['sign','verify']);
 const raw={orderId:purchase.orderId,purchaseToken:purchase.purchaseToken,developerPayload:purchase.payload,
  packageName:purchase.packageName,purchaseState:purchase.purchaseState,purchaseTime:purchase.purchaseTime,
  productId:purchase.productId};
 const originalJson=JSON.stringify(raw);
 const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key.privateKey,new TextEncoder().encode(originalJson));
 const publicBytes=new Uint8Array(await crypto.subtle.exportKey('spki',key.publicKey));
 const publicKey='-----BEGIN PUBLIC KEY-----\n'+btoa(String.fromCharCode(...publicBytes))+'\n-----END PUBLIC KEY-----';
 return {publicKey,key,receipt:{...purchase,originalJson,dataSignature:btoa(String.fromCharCode(...new Uint8Array(signature))),...overrides}};
}
test('server verifies signed payload, OAuth token and Bazaar subscription expiry',async()=>{
 const fixture=await signedFixture(),calls=[];
 const fetchImpl=async(url,options)=>{calls.push({url,options});return calls.length===1
  ?{ok:true,json:async()=>({access_token:'access-token',expires_in:3600})}
  :{ok:true,json:async()=>({initiationTimestampMsec:Date.parse('2026-11-18T09:59:00.000Z'),
    validUntilTimestampMsec:Date.parse('2026-12-18T09:59:00.000Z'),autoRenewing:false})};};
 const result=await verifyBazaarSubscription({...fixture,order,packageName,clientId:'client',clientSecret:'secret',
  refreshToken:'refresh',now,fetchImpl});
 assert.equal(result.ok,true);assert.equal(result.verified.providerName,'cafebazaar');
 assert.equal(result.verified.orderId,order.id);assert.equal(result.verified.planId,order.plan_id);
 assert.equal(result.verified.amountRial,order.amount_rial);assert.equal(result.verified.validUntilTimestampMsec,Date.parse('2026-12-18T09:59:00.000Z'));
 assert.equal(result.verified.autoRenewing,false);assert.equal(calls.length,2);
 assert.match(calls[0].url,/devapi\/v2\/auth\/token/);
 assert.match(calls[1].url,/subscriptions\/sahmino_pro_30d\/purchases/);
 assert.match(calls[0].options.body,/grant_type=refresh_token/);
});
test('client cannot change account order payload, SKU or package',async()=>{
 const fixture=await signedFixture();
 assert.equal(validReceipt({...fixture.receipt,payload:'ord_'+'c'.repeat(32)},order,packageName,SKU_BY_PLAN[order.plan_id]),false);
 assert.equal(validReceipt({...fixture.receipt,productId:'sahmino_pro_365d'},order,packageName,SKU_BY_PLAN[order.plan_id]),false);
 assert.equal(validReceipt({...fixture.receipt,packageName:'other.app'},order,packageName,SKU_BY_PLAN[order.plan_id]),false);
});
test('invalid signature is rejected before any Bazaar API call',async()=>{
 const fixture=await signedFixture(),bad={...fixture.receipt,dataSignature:btoa('forged')};
 let calls=0;
 const result=await verifyBazaarSubscription({receipt:bad,order,packageName,clientId:'client',clientSecret:'secret',
  refreshToken:'refresh',publicKey:fixture.publicKey,now,fetchImpl:async()=>{calls++;throw Error('must not call');}});
 assert.equal(result.reason,'RECEIPT_SIGNATURE_INVALID');assert.equal(calls,0);
});
test('expired Bazaar subscription is rejected and no entitlement evidence is returned',async()=>{
 const fixture=await signedFixture();
 let n=0;
 const result=await verifyBazaarSubscription({...fixture,order,packageName,clientId:'client',clientSecret:'secret',
  refreshToken:'refresh',now,fetchImpl:async()=>++n===1
   ?{ok:true,json:async()=>({access_token:'access-token',expires_in:3600})}
   :{ok:true,json:async()=>({initiationTimestampMsec:Date.parse('2026-11-18T09:59:00.000Z'),
     validUntilTimestampMsec:Date.parse('2026-11-17T09:59:00.000Z'),autoRenewing:false})}});
 assert.equal(result.reason,'BAZAAR_SUBSCRIPTION_INVALID');
});
test('missing configuration and provider failures fail closed',async()=>{
 const fixture=await signedFixture();
 assert.equal((await verifyBazaarSubscription({receipt:fixture.receipt,order,packageName,now})).reason,'BAZAAR_VERIFIER_NOT_CONFIGURED');
 const oauth=await verifyBazaarSubscription({...fixture,order,packageName,clientId:'client',clientSecret:'secret',
  refreshToken:'refresh',now,fetchImpl:async()=>({ok:false})});
 assert.equal(oauth.reason,'BAZAAR_OAUTH_FAILED');
});
