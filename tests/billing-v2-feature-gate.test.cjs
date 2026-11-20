'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
globalThis.crypto ||= webcrypto;
const secret='billing-v2-feature-gate-test-secret-which-is-long-enough-2026';
const origin='https://raminhashemi1.github.io';
function b64(x){return Buffer.from(JSON.stringify(x)).toString('base64url');}
async function token(){
 const now=Math.floor(Date.now()/1000),h=b64({alg:'HS256',typ:'JWT'});
 const p=b64({iss:'sahamban-pilot',aud:'sahamban-api',sub:'user-1',jti:'test-token',iat:now-1,nbf:now-1,exp:now+300});
 const input=h+'.'+p,key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return input+'.'+Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(input))).toString('base64url');
}
test('both Billing V2 order creation and receipt verification remain disabled unless explicitly enabled',async()=>{
 const worker=(await import('../server/worker-api.mjs')).default,t=await token();
 for(const [path,method,body] of [
  ['/api/v2/billing/orders','POST',{planId:'SAHAMBAN_PRO_30D'}],
  ['/api/v2/billing/verify','POST',{orderId:'ord_'+'a'.repeat(32),sku:'sku',token:'purchase-token',
   originalJson:'{}',dataSignature:'AAAAAAAAAAAAAAAA'}]
 ]){
  const response=await worker.fetch(new Request('https://worker.example'+path,{method,
   headers:{Origin:origin,Authorization:'Bearer '+t,'Content-Type':'application/json'},
   body:JSON.stringify(body)}),{PWA_ORIGIN:origin,AUTH_HMAC_SECRET:secret});
  assert.equal(response.status,404);
  assert.deepEqual(await response.json(),{error:'FEATURE_DISABLED'});
 }
});
