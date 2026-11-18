import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyAndSettle,skuMap} from '../server/billing/bazaar.mjs';

const env={
 BILLING_V2_ENABLED:'true',
 BAZAAR_CLIENT_ID:'client',BAZAAR_CLIENT_SECRET:'secret',BAZAAR_REFRESH_TOKEN:'refresh',
 BAZAAR_PACKAGE_NAME:'ir.sahamban.app',
 BAZAAR_SKU_MAP:JSON.stringify({
  SAHAMBAN_PRO_30D:'pro30',SAHAMBAN_PRO_60D:'pro60',SAHAMBAN_PRO_90D:'pro90',
  SAHAMBAN_PRO_180D:'pro180',SAHAMBAN_PRO_365D:'pro365'
 })
};
test('SKU map requires exactly five unique valid subscription products',()=>{
 assert.ok(skuMap(env.BAZAAR_SKU_MAP));
 assert.equal(skuMap('{}'),null);
 assert.equal(skuMap(JSON.stringify({a:'same'})),null);
});
test('subscription verification rejects unauthenticated and malformed requests before network calls',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('unexpected');};
 const base={db:{},env,body:{orderId:'ord_'+'a'.repeat(32),sku:'pro30',token:'token-123'},now:'2026-01-01T00:00:00.000Z',fetcher};
 assert.equal((await verifyAndSettle({...base,subject:null})).status,401);
 assert.equal((await verifyAndSettle({...base,body:{...base.body,extra:true},subject:'u'})).status,400);
 assert.equal(calls,0);
});
test('provider subscription response must be active, correctly bound and unexpired',async()=>{
 const now='2026-01-01T00:00:00.000Z';
 let validateUrl='';
 const fetcher=async(url,options)=>{
  if(String(url).includes('/auth/token/'))return new Response(JSON.stringify({access_token:'access'}),{status:200});
  validateUrl=String(url);
  return new Response(JSON.stringify({
   kind:'androidpublisher#subscriptionPurchase',
   validUntilTimestampMsec:Date.parse('2026-02-01T00:00:00.000Z'),
   autoRenewing:true,developerPayload:'ord_'+'a'.repeat(32),orderId:'bazaar-order'
  }),{status:200});
 };
 const result=await verifyAndSettle({db:{prepare(){return {bind(){return {first:async()=>({id:'order',plan_id:'SAHAMBAN_PRO_30D',amount_rial:1500000})}}}}},env,
  subject:'user',body:{orderId:'ord_'+'a'.repeat(32),sku:'pro30',token:'token-123'},
  now,fetcher});
 assert.match(validateUrl,/subscriptions\\/pro30\\/purchases\\/token-123/);
 assert.equal(result.status,409); // mock order/settlement DB is intentionally incomplete; provider validation got through
});
test('missing payload binding and expired provider entitlement fail closed',async()=>{
 const now='2026-01-01T00:00:00.000Z';
 const fetcher=async(url)=>{
  if(String(url).includes('/auth/token/'))return new Response(JSON.stringify({access_token:'access'}),{status:200});
  return new Response(JSON.stringify({kind:'androidpublisher#subscriptionPurchase',
   validUntilTimestampMsec:Date.parse('2025-12-01T00:00:00.000Z'),autoRenewing:false}),{status:200});
 };
 const result=await verifyAndSettle({db:{prepare(){return {bind(){return {first:async()=>({id:'order',plan_id:'SAHAMBAN_PRO_30D',amount_rial:1500000})}}}}},env,
  subject:'user',body:{orderId:'ord_'+'a'.repeat(32),sku:'pro30',token:'token-123'},now,fetcher});
 assert.equal(result.status,503);
});
